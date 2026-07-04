import { Test } from "@nestjs/testing";
import { AfterSaleSlaService, AFTER_SALE_SLA_HOURS, SLA_ESCALATION_TARGET_TYPE } from "./after-sale-sla.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const mockRedis = {
  runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const mockPrisma: any = {
  afterSale: { findMany: jest.fn(), count: jest.fn() },
  ledgerEntry: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  notification: { findMany: jest.fn(), createMany: jest.fn() },
  userRole: { findMany: jest.fn() },
};

/** 造一条售后单行（仅覆盖 service 用到的字段） */
function afterSaleRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "as1",
    orderId: "o1",
    userId: "u1",
    type: "refund",
    reason: "商品损坏",
    status: "PENDING",
    amount: null,
    logistics: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("AfterSaleSlaService（F5 投诉 SLA）", () => {
  let svc: AfterSaleSlaService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AfterSaleSlaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(AfterSaleSlaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ledgerEntry.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.userRole.findMany.mockResolvedValue([]);
  });

  // ── SLA 推导（不动 schema·createdAt+24h） ──
  describe("enrich", () => {
    it("PENDING 单推导 slaDueAt=createdAt+24h；超时置 slaOverdue=true", async () => {
      const created = new Date(Date.now() - 30 * HOUR_MS); // 30h 前 → 已超时
      const [row] = await svc.enrich([afterSaleRow({ createdAt: created }) as any]);
      expect(row.slaDueAt?.getTime()).toBe(created.getTime() + AFTER_SALE_SLA_HOURS * HOUR_MS);
      expect(row.slaOverdue).toBe(true);
    });

    it("未超 24h 的 PENDING 单 slaOverdue=false；非 PENDING 单（已首响）slaDueAt=null", async () => {
      const rows = await svc.enrich([
        afterSaleRow({ id: "as1", createdAt: new Date(Date.now() - 2 * HOUR_MS) }) as any,
        afterSaleRow({ id: "as2", status: "APPROVED", createdAt: new Date(Date.now() - 100 * HOUR_MS) }) as any,
      ]);
      expect(rows[0].slaOverdue).toBe(false);
      expect(rows[0].slaDueAt).not.toBeNull();
      expect(rows[1].slaDueAt).toBeNull();
      expect(rows[1].slaOverdue).toBe(false);
      expect(rows[1].fastRefundEligible).toBe(false);
    });

    it("订单存在 PENDING 分账记录（结算缓冲期内·钱在平台）→ fastRefundEligible=true", async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([{ refId: "o1", status: "PENDING" }]);
      const [row] = await svc.enrich([afterSaleRow() as any]);
      expect(row.fastRefundEligible).toBe(true);
      // 只读标注：不产生任何写操作
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("分账已全部 SETTLED（钱已结给商家）→ 不可快速退款", async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([{ refId: "o1", status: "SETTLED" }]);
      const [row] = await svc.enrich([afterSaleRow() as any]);
      expect(row.fastRefundEligible).toBe(false);
    });

    it("无分账记录的旧订单按 paidAt T+7 兜底：7 日内可快速退款，超期不可", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", paidAt: new Date(Date.now() - 2 * DAY_MS) },
        { id: "o2", paidAt: new Date(Date.now() - 10 * DAY_MS) },
      ]);
      const rows = await svc.enrich([
        afterSaleRow({ id: "as1", orderId: "o1" }) as any,
        afterSaleRow({ id: "as2", orderId: "o2" }) as any,
      ]);
      expect(rows[0].fastRefundEligible).toBe(true);
      expect(rows[1].fastRefundEligible).toBe(false);
    });
  });

  // ── 超时升级（cron 每小时·Notification 去重只升一次） ──
  describe("escalateOverdue", () => {
    it("超 24h 未首响 → 给全部 SUPER_ADMIN 发升级站内信（targetType=AFTER_SALE_SLA）", async () => {
      const now = new Date();
      mockPrisma.afterSale.findMany.mockResolvedValue([
        { id: "as1", orderId: "o1", type: "refund", createdAt: new Date(now.getTime() - 26 * HOUR_MS) },
      ]);
      mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin1" }, { userId: "admin2" }]);

      const n = await svc.escalateOverdue(now);

      expect(n).toBe(1);
      const { data } = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(data).toHaveLength(2); // 两个超管各一条
      expect(data[0]).toMatchObject({ userId: "admin1", targetType: SLA_ESCALATION_TARGET_TYPE, targetId: "as1" });
      expect(data[0].content).toContain("26 小时未首响");
    });

    it("已升级过的单去重不再发；全部已发时不产生写操作", async () => {
      const now = new Date();
      mockPrisma.afterSale.findMany.mockResolvedValue([
        { id: "as1", orderId: "o1", type: "refund", createdAt: new Date(now.getTime() - 26 * HOUR_MS) },
        { id: "as2", orderId: "o2", type: "return", createdAt: new Date(now.getTime() - 48 * HOUR_MS) },
      ]);
      mockPrisma.notification.findMany.mockResolvedValue([{ targetId: "as2" }]); // as2 已升级过
      mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin1" }]);

      const n = await svc.escalateOverdue(now);

      expect(n).toBe(1);
      const { data } = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(data).toHaveLength(1);
      expect(data[0].targetId).toBe("as1");
    });

    it("无 SUPER_ADMIN 时跳过且不写去重（下轮重试）", async () => {
      const now = new Date();
      mockPrisma.afterSale.findMany.mockResolvedValue([
        { id: "as1", orderId: "o1", type: "refund", createdAt: new Date(now.getTime() - 26 * HOUR_MS) },
      ]);
      mockPrisma.userRole.findMany.mockResolvedValue([]);

      const n = await svc.escalateOverdue(now);

      expect(n).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("cron 入口走 runExclusive 分布式锁", async () => {
      mockPrisma.afterSale.findMany.mockResolvedValue([]);
      await svc.slaEscalationCron();
      expect(mockRedis.runExclusive).toHaveBeenCalledWith("after_sale_sla_escalation", 3300, expect.any(Function));
    });
  });

  // ── admin 列表增强 ──
  describe("listWithSla", () => {
    it("分页列表行均带 SLA 字段；status 过滤透传", async () => {
      mockPrisma.afterSale.findMany.mockResolvedValue([afterSaleRow()]);
      mockPrisma.afterSale.count.mockResolvedValue(1);

      const res = await svc.listWithSla(1, 20, "PENDING");

      expect(mockPrisma.afterSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PENDING" }, skip: 0, take: 20 }),
      );
      expect(res.total).toBe(1);
      expect(res.items[0]).toHaveProperty("slaDueAt");
      expect(res.items[0]).toHaveProperty("fastRefundEligible");
    });
  });
});
