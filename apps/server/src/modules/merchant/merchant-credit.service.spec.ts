import { Test } from "@nestjs/testing";
import {
  MerchantCreditService,
  MERCHANT_CREDIT_WEIGHTS,
  MERCHANT_GRADE_BENEFITS,
  creditGradeOf,
} from "./merchant-credit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

const DAY_MS = 86_400_000;

const mockRedis = {
  runExclusive: jest.fn(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

const mockPrisma: any = {
  merchant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  merchantMetric: { findMany: jest.fn() },
  merchantCreditLog: { findMany: jest.fn(), create: jest.fn() },
};

describe("MerchantCreditService", () => {
  let svc: MerchantCreditService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MerchantCreditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(MerchantCreditService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.merchant.update.mockResolvedValue({ id: "m1" });
    mockPrisma.merchantCreditLog.create.mockResolvedValue({ id: "cl1" });
  });

  // ── 用例一：算分公式可复算（六因子逐项手算对账） ──
  describe("computeScore 公式可复算", () => {
    it("给定 30 日指标，六因子分数与总分可手工复算", () => {
      const now = new Date("2026-07-06T02:00:00+08:00");
      const openedAt = new Date(now.getTime() - 400 * DAY_MS); // 开店超 12 个月 → 经营时长满分
      const rows = [
        { ordersCount: 10, shipOnTimeRate: 0.9, refundRate: 0.1, returnRate: 0, avgRating: 4.5, complaintCount: 1 },
        { ordersCount: 30, shipOnTimeRate: 1, refundRate: 0.2, returnRate: 0, avgRating: null, complaintCount: 0 },
      ];

      const r = svc.computeScore(rows as any, { openedAt, createdAt: openedAt }, now);
      const f = r.factors.factors;

      // 发货时效 25：mean(0.9, 1)=0.95 → 25×0.95=23.75
      expect(f.ship.value).toBe(0.95);
      expect(f.ship.score).toBe(23.75);
      // 退款退货 20：加权 (0.1×10+0.2×30)/40=0.175 → 20×(1-0.175/0.3)=8.33
      expect(f.refundReturn.value).toBe(0.175);
      expect(f.refundReturn.score).toBe(8.33);
      // 评价 20：有值天简单平均 4.5 → 20×(4.5-1)/4=17.5
      expect(f.rating.value).toBe(4.5);
      expect(f.rating.score).toBe(17.5);
      // 投诉 15：1/40=0.025 → 15×(1-0.025/0.1)=11.25
      expect(f.complaint.value).toBe(0.025);
      expect(f.complaint.score).toBe(11.25);
      // 抽检 10：数据源二期·满分中性
      expect(f.qc.score).toBe(MERCHANT_CREDIT_WEIGHTS.qc);
      expect(f.qc.neutral).toBe(true);
      // 经营时长 10：>12 个月 → 满分
      expect(f.tenure.score).toBe(10);

      // 总分 = round(23.75+8.33+17.5+11.25+10+10) = 81 → B
      expect(r.score).toBe(81);
      expect(r.grade).toBe("B");
      expect(r.factors.observation).toBe(false);
      expect(r.factors.windowDays).toBe(30);
    });
  });

  // ── 用例二：等级边界（A≥85 / B70-84 / C55-69 / D<55） ──
  describe("等级边界", () => {
    it.each([
      [100, "A"], [85, "A"],
      [84, "B"], [70, "B"],
      [69, "C"], [55, "C"],
      [54, "D"], [0, "D"],
    ] as Array<[number, string]>)("分数 %i → %s 级", (score, grade) => {
      expect(creditGradeOf(score)).toBe(grade);
    });

    it("等级权益映射与设计一致：A 严选标+T+3，D 结算延长", () => {
      expect(MERCHANT_GRADE_BENEFITS.A.selectedBadge).toBe(true);
      expect(MERCHANT_GRADE_BENEFITS.A.settlementCycleDays).toBe(3);
      expect(MERCHANT_GRADE_BENEFITS.B.settlementCycleDays).toBe(7);
      expect(MERCHANT_GRADE_BENEFITS.D.settlementCycleDays).toBeGreaterThan(7);
      expect(MERCHANT_GRADE_BENEFITS.B.selectedBadge).toBe(false);
    });
  });

  // ── 用例三：缺数据中性处理（全新商家无任何指标 → 60 分起评·观察期） ──
  describe("缺数据中性处理", () => {
    it("30 日无任何指标数据：率类因子按权重×0.6 中性、抽检满分中性、时长下限 0.2 → 恰 60 分", () => {
      const now = new Date("2026-07-06T02:00:00+08:00");
      const r = svc.computeScore([], { openedAt: null, createdAt: now }, now);
      const f = r.factors.factors;

      expect(f.ship).toMatchObject({ value: null, score: 15, neutral: true }); // 25×0.6
      expect(f.refundReturn).toMatchObject({ value: null, score: 12, neutral: true }); // 20×0.6
      expect(f.rating).toMatchObject({ value: null, score: 12, neutral: true }); // 20×0.6
      expect(f.complaint).toMatchObject({ value: null, score: 9, neutral: true }); // 15×0.6
      expect(f.qc).toMatchObject({ value: null, score: 10, neutral: true }); // 满分中性（系统缺数据源）
      expect(f.tenure.score).toBe(2); // 10×0.2 下限

      expect(r.score).toBe(60); // 对齐设计「新商家 60 分起评」
      expect(r.grade).toBe("C"); // 60 分按边界表落 C（默认列 B 为设计拍板的起始待遇，周更后按分数换算）
      expect(r.factors.observation).toBe(true); // 开店 <30 天 → 观察期（不参与流量加权）
    });
  });

  // ── 用例四：周更幂等（同周重跑：分数覆写、log 不重复） ──
  describe("recalcAll 周更幂等", () => {
    it("同周第二次重跑：merchant 分数照常覆写（结果一致），MerchantCreditLog 不再新增", async () => {
      const now = new Date("2026-07-06T02:00:00+08:00"); // 周一
      const merchant = { id: "m1", creditScore: 60, openedAt: new Date(now.getTime() - 400 * DAY_MS), createdAt: new Date(now.getTime() - 400 * DAY_MS) };
      mockPrisma.merchant.findMany.mockResolvedValue([merchant]);
      mockPrisma.merchantMetric.findMany.mockResolvedValue([
        { merchantId: "m1", ordersCount: 10, shipOnTimeRate: 0.9, refundRate: 0.1, returnRate: 0, avgRating: 4.5, complaintCount: 1 },
        { merchantId: "m1", ordersCount: 30, shipOnTimeRate: 1, refundRate: 0.2, returnRate: 0, avgRating: null, complaintCount: 0 },
      ]);

      // 第一次：本周尚无 log → 写 log
      mockPrisma.merchantCreditLog.findMany.mockResolvedValueOnce([]);
      const r1 = await svc.recalcAll(now);
      expect(r1).toEqual({ weekKey: "2026-07-06", merchants: 1, updated: 1, logs: 1 });

      const update = mockPrisma.merchant.update.mock.calls[0][0];
      expect(update.data).toEqual({ creditScore: 81, creditGrade: "B" });
      const log = mockPrisma.merchantCreditLog.create.mock.calls[0][0].data;
      expect(log.merchantId).toBe("m1");
      expect(log.oldScore).toBe(60);
      expect(log.newScore).toBe(81);
      expect(log.factors.weekKey).toBe("2026-07-06");
      expect(log.factors.factors.ship.score).toBe(23.75);

      // 第二次（同周重跑）：本周已有 log → 只覆写分数，不重复写 log
      mockPrisma.merchantCreditLog.findMany.mockResolvedValueOnce([{ merchantId: "m1" }]);
      const r2 = await svc.recalcAll(now);
      expect(r2.logs).toBe(0);
      expect(r2.updated).toBe(1);
      expect(mockPrisma.merchantCreditLog.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.merchant.update).toHaveBeenCalledTimes(2);
    });

    it("周键取所在周周一（Asia/Shanghai）：周日晚仍归属本周一", () => {
      expect(svc.weekKeyOf(new Date("2026-07-06T02:00:00+08:00"))).toBe("2026-07-06"); // 周一
      expect(svc.weekKeyOf(new Date("2026-07-12T23:30:00+08:00"))).toBe("2026-07-06"); // 周日深夜
      expect(svc.weekKeyOf(new Date("2026-07-13T00:30:00+08:00"))).toBe("2026-07-13"); // 下周一凌晨
    });

    it("无 ACTIVE 商家时直接返回不落库", async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      const r = await svc.recalcAll(new Date("2026-07-06T02:00:00+08:00"));
      expect(r).toEqual({ weekKey: "2026-07-06", merchants: 0, updated: 0, logs: 0 });
      expect(mockPrisma.merchant.update).not.toHaveBeenCalled();
    });
  });

  // ── 附加：商家侧查询 ──
  describe("getMyCredit", () => {
    it("返回分数/等级/权益/观察期与近 12 条 log", async () => {
      const openedAt = new Date(Date.now() - 400 * DAY_MS);
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: "m1", creditScore: 88, creditGrade: "A", openedAt, createdAt: openedAt });
      mockPrisma.merchantCreditLog.findMany.mockResolvedValue([
        { id: "cl1", oldScore: 81, newScore: 88, factors: { weekKey: "2026-07-06" }, createdAt: new Date() },
      ]);

      const r = await svc.getMyCredit("m1");
      expect(r.creditScore).toBe(88);
      expect(r.creditGrade).toBe("A");
      expect(r.observation).toBe(false);
      expect(r.benefits.selectedBadge).toBe(true);
      expect(r.benefits.settlementCycleDays).toBe(3);
      expect(r.logs).toHaveLength(1);
      expect(mockPrisma.merchantCreditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: "m1" }, take: 12 }),
      );
    });

    it("商家不存在抛出异常", async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      await expect(svc.getMyCredit("no")).rejects.toThrow(BusinessException);
    });
  });
});
