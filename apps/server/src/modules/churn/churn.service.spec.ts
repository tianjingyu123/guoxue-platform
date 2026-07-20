import { Test, TestingModule } from "@nestjs/testing";
import { ChurnService } from "./churn.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import { MarketingService } from "../marketing/marketing.service";

const mockPrisma = {
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  userBehavior: { groupBy: jest.fn() },
  order: { groupBy: jest.fn() },
  comment: { groupBy: jest.fn() },
  trackEvent: { groupBy: jest.fn() },
  churnPrediction: { upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn(), count: jest.fn() },
  churnRule: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  churnAction: { createMany: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};
const mockSms = {
  sendRetentionMessage: jest.fn(),
};
const mockMarketing = {
  grantCoupon: jest.fn(),
};

describe("ChurnService", () => {
  let svc: ChurnService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ChurnService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) } },
        { provide: SmsService, useValue: mockSms },
        { provide: MarketingService, useValue: mockMarketing },
      ],
    }).compile();
    svc = mod.get(ChurnService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.churnRule.findMany.mockResolvedValue([]);
    mockPrisma.churnAction.findMany.mockResolvedValue([]);
    mockPrisma.churnAction.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockSms.sendRetentionMessage.mockResolvedValue({ ok: true, disposition: "SENT", message: "召回短信已发送" });
  });

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
        .mockResolvedValueOnce([{ id: "u1", createdAt: new Date() }])
        .mockResolvedValueOnce([]);
      mockPrisma.userBehavior.groupBy.mockResolvedValue([]);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.comment.groupBy.mockResolvedValue([]);
      mockPrisma.trackEvent.groupBy.mockResolvedValue([]);
      await svc.dailyChurnCalculation();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("用行为日志而不是资料更新时间计算最近活跃", async () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const activeAt = new Date();
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ id: "u1", createdAt }])
        .mockResolvedValueOnce([]);
      mockPrisma.userBehavior.groupBy.mockResolvedValue([]);
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.comment.groupBy.mockResolvedValue([]);
      mockPrisma.trackEvent.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: "u1", _max: { occurredAt: activeAt } }]);

      await svc.dailyChurnCalculation();

      const upsert = mockPrisma.churnPrediction.upsert.mock.calls[0][0];
      expect(upsert.create.lastActiveAt).toEqual(activeAt);
      expect(upsert.create.daysSinceActive).toBe(0);
      expect(upsert.create.riskLevel).toBe("LOW");
      expect(mockPrisma.churnAction.createMany).not.toHaveBeenCalled();
    });
  });

  describe("规则阈值与冷却", () => {
    const candidate = {
      userId: "u1",
      riskLevel: "CRITICAL",
      activityScore: 8,
      daysSinceActive: 30,
    };

    it("评分或天数未达到规则条件时不创建动作", async () => {
      mockPrisma.churnRule.findMany.mockResolvedValue([{
        id: "r1", riskLevel: "CRITICAL", scoreThreshold: 5, daysThreshold: 40,
        actionType: "SMS", actionConfig: { cooldownDays: 7 },
      }]);

      await (svc as unknown as { batchTriggerActions: (items: unknown[]) => Promise<void> })
        .batchTriggerActions([candidate]);

      expect(mockPrisma.churnAction.createMany).not.toHaveBeenCalled();
    });

    it("同一规则仍在冷却期时不重复创建动作", async () => {
      mockPrisma.churnRule.findMany.mockResolvedValue([{
        id: "r1", riskLevel: "CRITICAL", scoreThreshold: 10, daysThreshold: 14,
        actionType: "SMS", actionConfig: { cooldownDays: 7 },
      }]);
      mockPrisma.churnAction.findMany.mockResolvedValue([{
        userId: "u1", actionType: "SMS", actionData: { _ruleId: "r1" },
        createdAt: new Date(Date.now() - 86400000),
      }]);

      await (svc as unknown as { batchTriggerActions: (items: unknown[]) => Promise<void> })
        .batchTriggerActions([candidate]);

      expect(mockPrisma.churnAction.createMany).not.toHaveBeenCalled();
    });

    it("满足条件且冷却已结束时创建带规则来源的动作", async () => {
      mockPrisma.churnRule.findMany.mockResolvedValue([{
        id: "r1", riskLevel: "CRITICAL", scoreThreshold: 10, daysThreshold: 14,
        actionType: "SMS", actionConfig: { cooldownDays: 7, templateParams: [] },
      }]);

      await (svc as unknown as { batchTriggerActions: (items: unknown[]) => Promise<void> })
        .batchTriggerActions([candidate]);

      expect(mockPrisma.churnAction.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({
          userId: "u1",
          actionData: expect.objectContaining({ _ruleId: "r1", _cooldownDays: 7 }),
        })],
      });
    });

    it("同一用户命中多条同通道规则时只创建一个动作", async () => {
      mockPrisma.churnRule.findMany.mockResolvedValue([
        {
          id: "r1", riskLevel: "CRITICAL", scoreThreshold: 10, daysThreshold: 14,
          actionType: "SMS", actionConfig: { cooldownDays: 7 }, createdAt: new Date("2026-01-01"),
        },
        {
          id: "r2", riskLevel: "CRITICAL", scoreThreshold: 10, daysThreshold: 14,
          actionType: "SMS", actionConfig: { cooldownDays: 7 }, createdAt: new Date("2026-01-02"),
        },
      ]);

      await (svc as unknown as { batchTriggerActions: (items: unknown[]) => Promise<void> })
        .batchTriggerActions([candidate]);

      const payload = mockPrisma.churnAction.createMany.mock.calls[0][0];
      expect(payload.data).toHaveLength(1);
      expect(payload.data[0].actionData._ruleId).toBe("r1");
    });
  });

  describe("合规召回执行", () => {
    const pendingAction = {
      id: "a1", userId: "u1", actionType: "SMS",
      actionData: { _cooldownDays: 7 }, status: "PENDING", createdAt: new Date(),
    };

    it("用户未主动同意营销短信时转人工且不发送", async () => {
      mockPrisma.churnAction.findMany.mockResolvedValue([pendingAction]);
      mockPrisma.user.findUnique.mockResolvedValue({
        phone: "13800138000", notifySettings: { marketingSms: false },
      });

      await (svc as unknown as { _processChurnActions: () => Promise<void> })._processChurnActions();

      expect(mockSms.sendRetentionMessage).not.toHaveBeenCalled();
      expect(mockPrisma.churnAction.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_MANUAL" }),
      }));
    });

    it("用户主动同意后才调用专用召回发送器并标记完成", async () => {
      mockPrisma.churnAction.findMany.mockResolvedValue([pendingAction]);
      mockPrisma.user.findUnique.mockResolvedValue({
        phone: "13800138000", notifySettings: { marketingSms: true },
      });

      await (svc as unknown as { _processChurnActions: () => Promise<void> })._processChurnActions();

      expect(mockSms.sendRetentionMessage).toHaveBeenCalledWith("13800138000", [], 7);
      expect(mockPrisma.churnAction.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED", result: "召回短信已发送" }),
      }));
    });
  });
});
