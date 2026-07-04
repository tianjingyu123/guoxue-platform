import { Test } from "@nestjs/testing";
import { MerchantMetricService, MERCHANT_ALERT_TYPES } from "./merchant-metric.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const mockRedis = {
  setNX: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(undefined),
  runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const mockNotification = {
  send: jest.fn().mockResolvedValue({ id: "n1" }),
};

const mockPrisma: any = {
  merchant: { findMany: jest.fn() },
  order: { groupBy: jest.fn(), findMany: jest.fn() },
  productReview: { findMany: jest.fn() },
  report: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
  merchantMetric: { upsert: jest.fn(), findMany: jest.fn() },
  riskAlert: { create: jest.fn() },
  $queryRaw: jest.fn(),
};

describe("MerchantMetricService", () => {
  let svc: MerchantMetricService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantMetricService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(MerchantMetricService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockNotification.send.mockResolvedValue({ id: "n1" });
    mockPrisma.riskAlert.create.mockResolvedValue({ id: "a1" });
    mockPrisma.merchantMetric.upsert.mockResolvedValue({ id: "mm1" });
  });

  // ── 用例一：日聚合幂等（date upsert·重复执行不产生重复行·指标计算正确） ──
  describe("aggregateDate", () => {
    it("聚合幂等：同日重复执行均走 merchantId_date 唯一键 upsert，且指标计算正确", async () => {
      const date = "2026-07-05";
      const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();

      const setup = () => {
        mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);
        // 当日 4 单支付
        mockPrisma.order.groupBy.mockResolvedValue([{ merchantId: "m1", _count: { _all: 4 } }]);
        // 当日发货 2 单：时效 24h（准时）与 60h（超 48h）
        mockPrisma.order.findMany.mockResolvedValue([
          { merchantId: "m1", paidAt: new Date(dayStart - 20 * HOUR_MS), shippedAt: new Date(dayStart + 4 * HOUR_MS) },
          { merchantId: "m1", paidAt: new Date(dayStart - 55 * HOUR_MS), shippedAt: new Date(dayStart + 5 * HOUR_MS) },
        ]);
        // 当日退款申请 1 条、退货 0 条
        mockPrisma.$queryRaw.mockResolvedValue([{ merchantId: "m1", type: "refund", count: 1 }]);
        // 当日 2 条评价：5 星 + 3 星
        mockPrisma.productReview.findMany.mockResolvedValue([
          { rating: 5, product: { userId: "u1" } },
          { rating: 3, product: { userId: "u1" } },
        ]);
        mockPrisma.report.findMany.mockResolvedValue([]);
        mockPrisma.product.findMany.mockResolvedValue([]);
      };

      setup();
      const r1 = await svc.aggregateDate(date);
      expect(r1).toEqual({ date, merchants: 1, upserts: 1 });

      // 第二次执行（模拟 cron 重跑）——仍是 upsert 同一唯一键，幂等不产生重复行
      setup();
      const r2 = await svc.aggregateDate(date);
      expect(r2.upserts).toBe(1);

      expect(mockPrisma.merchantMetric.upsert).toHaveBeenCalledTimes(2);
      for (const call of mockPrisma.merchantMetric.upsert.mock.calls) {
        expect(call[0].where).toEqual({ merchantId_date: { merchantId: "m1", date } });
      }
      const payload = mockPrisma.merchantMetric.upsert.mock.calls[0][0].create;
      expect(payload.ordersCount).toBe(4);
      expect(payload.shipOnTimeRate).toBe(0.5); // 2 单发货 1 单 ≤48h
      expect(payload.avgShipHours).toBe(42); // (24+60)/2
      expect(payload.refundRate).toBe(0.25); // 1/4
      expect(payload.returnRate).toBe(0);
      expect(payload.avgRating).toBe(4); // (5+3)/2
      expect(payload.complaintCount).toBe(0);
      expect(payload.qcPassRate).toBeNull(); // 无抽检数据源·诚实 null
    });

    it("无 ACTIVE 商家时直接返回不落库", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      const r = await svc.aggregateDate("2026-07-05");
      expect(r).toEqual({ date: "2026-07-05", merchants: 0, upserts: 0 });
      expect(mockPrisma.merchantMetric.upsert).not.toHaveBeenCalled();
    });
  });

  // ── 用例二：发货超时预警触发（48h 提醒商家 + 72h 升级 admin 工单） ──
  describe("checkShipTimeout", () => {
    it("超 48h 站内信提醒商家，超 72h 升级 RiskAlert 工单", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o-50h", merchantId: "m1", paidAt: new Date(now.getTime() - 50 * HOUR_MS) },
        { id: "o-80h", merchantId: "m1", paidAt: new Date(now.getTime() - 80 * HOUR_MS) },
      ]);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      const created = await svc.checkShipTimeout(now);

      // 72h 升级工单：仅含 80h 的订单
      expect(created).toBe(1);
      expect(mockPrisma.riskAlert.create).toHaveBeenCalledTimes(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(MERCHANT_ALERT_TYPES.SHIP_TIMEOUT_ESCALATE);
      expect(alert.level).toBe("DANGER");
      expect(alert.targetType).toBe("MERCHANT");
      expect(alert.targetId).toBe("m1");
      expect(alert.detail.orderIds).toEqual(["o-80h"]);

      // 48h 提醒：商家站内信（Notification 兜底通道）
      expect(mockNotification.send).toHaveBeenCalledTimes(1);
      const [userId, dto] = mockNotification.send.mock.calls[0];
      expect(userId).toBe("u1");
      expect(dto.type).toBe("SYSTEM");
      expect(dto.targetType).toBe("MERCHANT_ALERT");
    });

    it("仅超 48h 未超 72h 时只提醒商家，不升级工单", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o-50h", merchantId: "m1", paidAt: new Date(now.getTime() - 50 * HOUR_MS) },
      ]);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      const created = await svc.checkShipTimeout(now);
      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
      expect(mockNotification.send).toHaveBeenCalledTimes(1);
    });
  });

  // ── 用例三：退款率环比翻倍触发 ──
  describe("checkRefundAnomaly", () => {
    it("7 日退款率未超 15% 但环比翻倍 → 触发 RiskAlert 工单", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ merchantId: "m1", _count: { _all: 20 } }]) // 本 7 日订单
        .mockResolvedValueOnce([{ merchantId: "m1", _count: { _all: 25 } }]); // 前 7 日订单
      // 本 7 日退款 2（率 0.1）·前 7 日退款 1（率 0.04）→ 0.1 ≥ 0.04×2 环比翻倍
      mockPrisma.$queryRaw.mockResolvedValue([{ merchantId: "m1", cur: 2, prev: 1 }]);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      const created = await svc.checkRefundAnomaly(now);

      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(MERCHANT_ALERT_TYPES.REFUND_ANOMALY);
      expect(alert.detail.reason).toBe("SURGE");
      expect(alert.detail.refundRate7d).toBe(0.1);
      expect(alert.detail.prevRefundRate7d).toBe(0.04);
    });

    it("退款率超 15% 阈值 → 触发 DANGER 工单", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ merchantId: "m1", _count: { _all: 10 } }])
        .mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ merchantId: "m1", cur: 2, prev: 0 }]); // 率 0.2 > 0.15
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      const created = await svc.checkRefundAnomaly(now);
      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.level).toBe("DANGER");
      expect(alert.detail.reason).toBe("OVER_THRESHOLD");
    });

    it("率正常且未翻倍不触发", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ merchantId: "m1", _count: { _all: 20 } }])
        .mockResolvedValueOnce([{ merchantId: "m1", _count: { _all: 20 } }]);
      mockPrisma.$queryRaw.mockResolvedValue([{ merchantId: "m1", cur: 1, prev: 1 }]); // 0.05 vs 0.05
      const created = await svc.checkRefundAnomaly(now);
      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
    });
  });

  // ── 用例四：预警 24h 去重（redis setNX 抢不到键则不重复发） ──
  describe("预警 24h 去重", () => {
    it("同商家同类预警 24h 内已发过（setNX=false）→ 不再创建工单/不再提醒", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockRedis.setNX.mockResolvedValue(false); // 模拟 24h 去重键已存在
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o-80h", merchantId: "m1", paidAt: new Date(now.getTime() - 80 * HOUR_MS) },
      ]);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      const created = await svc.checkShipTimeout(now);

      expect(created).toBe(0);
      expect(mockPrisma.riskAlert.create).not.toHaveBeenCalled();
      expect(mockNotification.send).not.toHaveBeenCalled();
      // 去重键按「类型:商家」维度
      expect(mockRedis.setNX).toHaveBeenCalledWith(
        `merchant-alert:${MERCHANT_ALERT_TYPES.SHIP_TIMEOUT_ESCALATE}:m1`,
        "1",
        86_400,
      );
    });

    it("差评聚集同样受 24h 去重约束（首次发，二次窗口内不发）", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      const reviews = [
        { id: "r1", rating: 1, product: { userId: "u1" } },
        { id: "r2", rating: 2, product: { userId: "u1" } },
        { id: "r3", rating: 1, product: { userId: "u1" } },
      ];
      mockPrisma.productReview.findMany.mockResolvedValue(reviews);
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);

      mockRedis.setNX.mockResolvedValueOnce(true);
      expect(await svc.checkBadReviewCluster(now)).toBe(1);
      expect(mockPrisma.riskAlert.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.riskAlert.create.mock.calls[0][0].data.type).toBe(MERCHANT_ALERT_TYPES.BAD_REVIEW_CLUSTER);

      // 一小时后再次扫描：去重键仍在 → 不重复发
      mockRedis.setNX.mockResolvedValueOnce(false);
      expect(await svc.checkBadReviewCluster(new Date(now.getTime() + HOUR_MS))).toBe(0);
      expect(mockPrisma.riskAlert.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 附加：投诉即工单 ──
  describe("checkComplaints", () => {
    it("近 1h 商品/商家举报合并为一张投诉工单", async () => {
      const now = new Date("2026-07-05T10:00:00+08:00");
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: "m1", userId: "u1" }]);
      mockPrisma.report.findMany
        .mockResolvedValueOnce([{ id: "rp1", targetId: "p1" }]) // targetType=PRODUCT
        .mockResolvedValueOnce([{ id: "rp2", targetId: "u1" }]); // targetType=USER
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1", userId: "u1" }]);

      const created = await svc.checkComplaints(now);
      expect(created).toBe(1);
      const alert = mockPrisma.riskAlert.create.mock.calls[0][0].data;
      expect(alert.type).toBe(MERCHANT_ALERT_TYPES.COMPLAINT);
      expect(alert.detail.reportIds).toEqual(["rp1", "rp2"]);
    });
  });

  // ── 附加：商家侧查询 ──
  describe("getMyMetrics", () => {
    it("返回近 N 日逐日指标与汇总（退款率按订单数加权）", async () => {
      mockPrisma.merchantMetric.findMany.mockResolvedValue([
        { date: "2026-07-03", ordersCount: 10, shipOnTimeRate: 0.9, avgShipHours: 20, refundRate: 0.1, returnRate: 0, avgRating: 4.5, complaintCount: 1, qcPassRate: null },
        { date: "2026-07-04", ordersCount: 30, shipOnTimeRate: 1, avgShipHours: 10, refundRate: 0.2, returnRate: null, avgRating: null, complaintCount: 0, qcPassRate: null },
      ]);
      const r = await svc.getMyMetrics("m1", 7);
      expect(r.days).toBe(7);
      expect(r.items).toHaveLength(2);
      expect(r.summary.ordersCount).toBe(40);
      expect(r.summary.refundRate).toBe(0.175); // (0.1*10+0.2*30)/40
      expect(r.summary.shipOnTimeRate).toBe(0.95); // 有值天数简单平均
      expect(r.summary.avgRating).toBe(4.5);
      expect(r.summary.complaintCount).toBe(1);
      expect(r.summary.qcPassRate).toBeNull();
    });

    it("days 越界钳制到 1-30", async () => {
      mockPrisma.merchantMetric.findMany.mockResolvedValue([]);
      const r = await svc.getMyMetrics("m1", "999");
      expect(r.days).toBe(30);
    });
  });
});
