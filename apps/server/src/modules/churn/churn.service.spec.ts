import { Test, TestingModule } from "@nestjs/testing";
import { ChurnService } from "./churn.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  user: { findMany: jest.fn() },
  userBehavior: { groupBy: jest.fn() },
  order: { groupBy: jest.fn() },
  comment: { groupBy: jest.fn() },
  userBehaviorLog: { groupBy: jest.fn() },
  churnPrediction: { upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn(), count: jest.fn() },
  churnRule: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  churnAction: { createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

describe("ChurnService", () => {
  let svc: ChurnService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ChurnService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) } },
      ],
    }).compile();
    svc = mod.get(ChurnService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getPredictions", () => {
    it("分页返回流失预测", async () => {
      mockPrisma.churnPrediction.findMany.mockResolvedValue([{ userId: "u1", riskLevel: "HIGH", activityScore: 15 }]);
      mockPrisma.churnPrediction.count.mockResolvedValue(1);
      const result = await svc.getPredictions(1, 20, "HIGH");
      expect(result.predictions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("page 传非数字串不产生 NaN skip（P2-4 分页加固）", async () => {
      mockPrisma.churnPrediction.findMany.mockResolvedValue([]);
      mockPrisma.churnPrediction.count.mockResolvedValue(0);
      await svc.getPredictions("abc" as any, 20);
      const arg = mockPrisma.churnPrediction.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  describe("getStats", () => {
    it("返回流失风险分布", async () => {
      mockPrisma.churnPrediction.count
        .mockResolvedValueOnce(50).mockResolvedValueOnce(30).mockResolvedValueOnce(15).mockResolvedValueOnce(5);
      const stats = await svc.getStats();
      expect(stats.low).toBe(50);
      expect(stats.medium).toBe(30);
      expect(stats.high).toBe(15);
      expect(stats.critical).toBe(5);
    });
  });

  describe("listRules", () => {
    it("返回流失干预规则", async () => {
      mockPrisma.churnRule.findMany.mockResolvedValue([{ id: "r1", riskLevel: "HIGH", actionType: "PUSH_NOTIFICATION" }]);
      const rules = await svc.listRules();
      expect(rules).toHaveLength(1);
    });
  });

  describe("createRule", () => {
    it("创建干预规则", async () => {
      mockPrisma.churnRule.create.mockResolvedValue({ id: "r1", riskLevel: "HIGH", actionType: "SEND_COUPON" });
      const result = await svc.createRule({ riskLevel: "HIGH", actionType: "SEND_COUPON" });
      expect(result.id).toBe("r1");
    });
  });

  describe("updateRule", () => {
    it("更新干预规则", async () => {
      mockPrisma.churnRule.update.mockResolvedValue({ id: "r1", actionType: "PUSH_NOTIFICATION" });
      const result = await svc.updateRule("r1", { actionType: "PUSH_NOTIFICATION" });
      expect(result.actionType).toBe("PUSH_NOTIFICATION");
    });
  });

  describe("deleteRule", () => {
    it("删除干预规则", async () => {
      mockPrisma.churnRule.delete.mockResolvedValue({ id: "r1" });
      const result = await svc.deleteRule("r1");
      expect(result.id).toBe("r1");
    });
  });

  describe("listActions", () => {
    it("分页返回干预动作", async () => {
      mockPrisma.churnAction.findMany.mockResolvedValue([{ id: "a1", actionType: "PUSH_NOTIFICATION", status: "PENDING" }]);
      mockPrisma.churnAction.count.mockResolvedValue(1);
      const result = await svc.listActions(1, 20);
      expect(result.actions).toHaveLength(1);
    });
  });

  describe("dailyChurnCalculation", () => {
    it("空用户列表快速返回", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await svc.dailyChurnCalculation();
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it("处理一批用户", async () => {
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ id: "u1", updatedAt: new Date() }])
        .mockResolvedValueOnce([]);
      mockPrisma.userBehavior.groupBy.mockResolvedValue([]);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.comment.groupBy.mockResolvedValue([]);
      mockPrisma.userBehaviorLog.groupBy.mockResolvedValue([]);
      await svc.dailyChurnCalculation();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
