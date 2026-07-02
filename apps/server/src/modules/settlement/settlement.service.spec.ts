import { Test } from "@nestjs/testing";
import { SettlementService } from "./settlement.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  settlementRule: { findUnique: jest.fn() },
  ledgerEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
};

const QUESTION_RULE = {
  scene: "QUESTION",
  enabled: true,
  bufferDays: 7,
  requireApproval: true,
  approvalThreshold: 2000,
  splits: [
    { role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" },
    { role: "PLATFORM", rate: 0.2, basis: "GROSS", category: "PLATFORM" },
  ],
};

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    scene: "QUESTION",
    refType: "QUESTION",
    refId: "q-1",
    amount: 100,
    payerId: "payer-1",
    parties: { PROVIDER: { type: "USER" as const, id: "u-1", userId: "u-1" } },
    ...overrides,
  };
}

describe("SettlementService", () => {
  let svc: SettlementService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [SettlementService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(SettlementService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ledgerEntry.createMany.mockResolvedValue({ count: 0 });
  });

  describe("settle — 铁律与分账", () => {
    it("L2：无交易凭据拒绝入账", async () => {
      await expect(svc.settle(baseParams({ refId: "" }))).rejects.toThrow(BusinessException);
      await expect(svc.settle(baseParams({ amount: 0 }))).rejects.toThrow(BusinessException);
    });

    it("L1：推广计酬超过两级的规则拒绝执行", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        ...QUESTION_RULE,
        splits: [
          { role: "STATION", rate: 0.3, basis: "GROSS", category: "COMMISSION" },
          { role: "OPERATOR", rate: 0.12, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
          { role: "CIRCLE_OWNER", rate: 0.05, basis: "GROSS", category: "COMMISSION" },
        ],
      });
      await expect(svc.settle(baseParams())).rejects.toThrow(/超过两级/);
      expect(mockPrisma.ledgerEntry.createMany).not.toHaveBeenCalled();
    });

    it("正常分账：GROSS 比例计算+缓冲期 availableAt+PLATFORM 主体自动补全", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(QUESTION_RULE);
      mockPrisma.ledgerEntry.findMany
        .mockResolvedValueOnce([]) // 幂等检查
        .mockResolvedValueOnce([{ id: "l1" }, { id: "l2" }]);
      const before = Date.now();
      await svc.settle(baseParams());
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(2);
      const provider = rows.find((r: any) => r.role === "PROVIDER");
      const platform = rows.find((r: any) => r.role === "PLATFORM");
      expect(provider.amount).toBe(80);
      expect(provider.status).toBe("PENDING");
      expect(platform.beneficiaryType).toBe("PLATFORM");
      expect(platform.amount).toBe(20);
      // 缓冲期：availableAt ≈ now + 7d
      const diffDays = (provider.availableAt.getTime() - before) / 86_400_000;
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it("PARENT_SPLIT：管理奖按站长佣金为基数计算", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        ...QUESTION_RULE,
        scene: "COURSE_ORDER",
        splits: [
          { role: "STATION", rate: 0.3, basis: "GROSS", category: "COMMISSION" },
          { role: "OPERATOR", rate: 0.12, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
        ],
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await svc.settle(
        baseParams({
          scene: "COURSE_ORDER",
          parties: {
            STATION: { type: "STATION", id: "st-1", userId: "st-user" },
            OPERATOR: { type: "OPERATOR", id: "op-1", userId: "op-user" },
          },
        }),
      );
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows.find((r: any) => r.role === "STATION").amount).toBe(30); // 100×30%
      expect(rows.find((r: any) => r.role === "OPERATOR").amount).toBe(3.6); // 30×12%
    });

    it("L3：自买自卖拦佣金放服务", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        ...QUESTION_RULE,
        splits: [
          { role: "PROVIDER", rate: 0.5, basis: "GROSS", category: "SERVICE" },
          { role: "STATION", rate: 0.3, basis: "GROSS", category: "COMMISSION" },
        ],
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await svc.settle(
        baseParams({
          payerId: "same-user",
          parties: {
            PROVIDER: { type: "USER", id: "same-user", userId: "same-user" },
            STATION: { type: "STATION", id: "st-1", userId: "same-user" },
          },
        }),
      );
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows.find((r: any) => r.role === "STATION")).toBeUndefined(); // 佣金拦截
      expect(rows.find((r: any) => r.role === "PROVIDER").amount).toBe(50); // 服务放行
    });

    it("rateOverride：过渡期以调用方传入比例为准（总账与实付一致）", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        ...QUESTION_RULE,
        scene: "COURSE_ORDER",
        splits: [
          { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION", selfDeal: "ALLOW_FLAG" },
          { role: "OPERATOR", rate: 0.1, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
        ],
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await svc.settle(
        baseParams({
          scene: "COURSE_ORDER",
          parties: {
            STATION: { type: "STATION", id: "st-1", userId: "st-user", rateOverride: 0.3 },
            OPERATOR: { type: "OPERATOR", id: "op-1", userId: "op-user", rateOverride: 0.12 },
          },
        }),
      );
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows.find((r: any) => r.role === "STATION").amount).toBe(30); // 100×override 30%
      expect(rows.find((r: any) => r.role === "OPERATOR").amount).toBe(3.6); // 30×override 12%
    });

    it("L3-ALLOW_FLAG：自购返佣场景照常入账但打标", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        ...QUESTION_RULE,
        splits: [{ role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION", selfDeal: "ALLOW_FLAG" }],
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await svc.settle(
        baseParams({
          payerId: "same-user",
          parties: { STATION: { type: "STATION", id: "st-1", userId: "same-user" } },
        }),
      );
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(1);
      expect(rows[0].amount).toBe(20);
      expect(rows[0].reason).toContain("SELF_PURCHASE");
    });

    it("L4：单笔达到阈值冻结待复核", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(QUESTION_RULE);
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await svc.settle(baseParams({ amount: 3000 })); // PROVIDER 得 2400 ≥ 2000
      const rows = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(rows.find((r: any) => r.role === "PROVIDER").status).toBe("FROZEN");
      expect(rows.find((r: any) => r.role === "PLATFORM").status).toBe("PENDING"); // 600 < 2000
    });

    it("幂等：同凭据同场景已入账则返回既有记录不重复分账", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(QUESTION_RULE);
      mockPrisma.ledgerEntry.findMany.mockResolvedValueOnce([{ id: "existing" }]);
      const result = await svc.settle(baseParams());
      expect(result).toEqual([{ id: "existing" }]);
      expect(mockPrisma.ledgerEntry.createMany).not.toHaveBeenCalled();
    });

    it("场景未配置或未启用时静默跳过", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      expect(await svc.settle(baseParams())).toEqual([]);
      mockPrisma.settlementRule.findUnique.mockResolvedValue({ ...QUESTION_RULE, enabled: false });
      expect(await svc.settle(baseParams())).toEqual([]);
    });
  });

  describe("reverse — L5 冲正", () => {
    it("对全部正向分账生成负向冲正并标记 REVERSED", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        { id: "l1", scene: "QUESTION", beneficiaryType: "USER", beneficiaryId: "u-1", role: "PROVIDER", category: "SERVICE", amount: 80, rate: 0.8 },
        { id: "l2", scene: "QUESTION", beneficiaryType: "PLATFORM", beneficiaryId: "PLATFORM", role: "PLATFORM", category: "PLATFORM", amount: 20, rate: 0.2 },
      ]);
      const result = await svc.reverse("QUESTION", "q-1", "退款");
      expect(result).toEqual({ reversed: true, count: 2 });
      const negatives = mockPrisma.ledgerEntry.createMany.mock.calls[0][0].data;
      expect(negatives.map((n: any) => n.amount)).toEqual([-80, -20]);
      expect(mockPrisma.ledgerEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "REVERSED", reason: "退款" } }),
      );
    });

    it("已冲正则幂等跳过", async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue({ id: "neg", amount: -80 });
      const result = await svc.reverse("QUESTION", "q-1", "退款");
      expect(result).toEqual({ reversed: false, count: 0 });
      expect(mockPrisma.ledgerEntry.createMany).not.toHaveBeenCalled();
    });
  });

  describe("settlePending — L4 缓冲期批处理", () => {
    it("只结算过期的 PENDING", async () => {
      mockPrisma.ledgerEntry.updateMany.mockResolvedValue({ count: 3 });
      const result = await svc.settlePending();
      expect(result).toEqual({ settled: 3 });
      const arg = mockPrisma.ledgerEntry.updateMany.mock.calls[0][0];
      expect(arg.where.status).toBe("PENDING");
      expect(arg.where.availableAt.lte).toBeInstanceOf(Date);
      expect(arg.data).toEqual({ status: "SETTLED" });
    });
  });
});
