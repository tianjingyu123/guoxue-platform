import { Test } from "@nestjs/testing";
import { RuleService } from "./rule.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

const mockPrisma = {
  recommendRule: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockRedis = { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn() };

describe("RuleService", () => {
  let svc: RuleService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        RuleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(RuleService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getActiveRules", () => {
    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue([{ id: "r1", scene: "ALL", ruleType: "PIN", targetType: "COURSE", targetId: "c1", priority: 10 }]);
      const rules = await svc.getActiveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].ruleType).toBe("PIN");
      expect(mockPrisma.recommendRule.findMany).not.toHaveBeenCalled();
    });

    it("缓存未命中时查询数据库", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.recommendRule.findMany.mockResolvedValue([
        { id: "r1", scene: "ALL", targetType: "COURSE", targetId: "c1", ruleType: "PIN", ruleValue: null, priority: 10, conditionJson: null, startAt: null, endAt: null, createdBy: "admin", remark: null, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const rules = await svc.getActiveRules();
      expect(rules).toHaveLength(1);
      expect(mockRedis.setJson).toHaveBeenCalled();
    });
  });

  describe("applyRules", () => {
    const items = [
      { id: "a1", type: "ARTICLE", score: 100 },
      { id: "c1", type: "COURSE", score: 200 },
      { id: "p1", type: "PRODUCT", score: 150 },
    ];

    it("BAN 规则过滤禁推内容", () => {
      const rules = [
        { id: "r1", scene: "ALL", targetType: "ARTICLE", targetId: "a1", ruleType: "BAN", ruleValue: null, priority: 10 },
      ];
      const result = svc.applyRules(items, "guess_like", rules as any);
      expect(result).toHaveLength(2);
      expect(result.find((i) => i.id === "a1")).toBeUndefined();
    });

    it("BOOST 规则加权内容", () => {
      const rules = [
        { id: "r1", scene: "ALL", targetType: "COURSE", targetId: "c1", ruleType: "BOOST", ruleValue: 3, priority: 10 },
      ];
      const result = svc.applyRules(items, "guess_like", rules as any);
      const boosted = result.find((i) => i.id === "c1");
      expect(boosted!.score).toBe(600); // 200 * 3
    });

    it("MUTE 规则降权内容", () => {
      const rules = [
        { id: "r1", scene: "ALL", targetType: "PRODUCT", targetId: "p1", ruleType: "MUTE", ruleValue: 0.2, priority: 10 },
      ];
      const result = svc.applyRules(items, "guess_like", rules as any);
      const muted = result.find((i) => i.id === "p1");
      expect(muted!.score).toBe(30); // 150 * 0.2
    });

    it("场景专属规则只在该场景生效", () => {
      const rules = [
        { id: "r1", scene: "course_detail", targetType: "ARTICLE", targetId: "a1", ruleType: "BAN", ruleValue: null, priority: 10 },
      ];
      const result = svc.applyRules(items, "guess_like", rules as any);
      expect(result).toHaveLength(3); // a1 在 guess_like 中未被 BAN
    });

    it("ALL 规则在所有场景生效", () => {
      const rules = [
        { id: "r1", scene: "ALL", targetType: "ARTICLE", targetId: "a1", ruleType: "BAN", ruleValue: null, priority: 10 },
      ];
      const result = svc.applyRules(items, "course_detail", rules as any);
      expect(result).toHaveLength(2);
    });

    it("多个规则叠加：BAN + BOOST + MUTE 同时生效", () => {
      const rules = [
        { id: "r1", scene: "ALL", targetType: "ARTICLE", targetId: "a1", ruleType: "BAN", ruleValue: null, priority: 10 },
        { id: "r2", scene: "ALL", targetType: "COURSE", targetId: "c1", ruleType: "BOOST", ruleValue: 2, priority: 5 },
        { id: "r3", scene: "ALL", targetType: "PRODUCT", targetId: "p1", ruleType: "MUTE", ruleValue: 0.5, priority: 3 },
      ];
      const result = svc.applyRules(items, "guess_like", rules as any);
      expect(result).toHaveLength(2); // a1 被 BAN 移除
      const boosted = result.find((i) => i.id === "c1");
      const muted = result.find((i) => i.id === "p1");
      expect(boosted!.score).toBe(400); // 200 * 2
      expect(muted!.score).toBe(75);   // 150 * 0.5
    });
  });

  describe("clearCache", () => {
    it("删除运营规则缓存", async () => {
      await svc.clearCache();
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:rules:active");
    });
  });

  describe("CRUD", () => {
    it("listRules — 返回所有规则按创建时间降序", async () => {
      const mockRules = [{ id: "r1", scene: "ALL", ruleType: "BOOST", priority: 10 }];
      mockPrisma.recommendRule.findMany.mockResolvedValue(mockRules);
      const result = await svc.listRules();
      expect(result).toEqual(mockRules);
      expect(mockPrisma.recommendRule.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    });

    it("getRule — 根据ID查找规则", async () => {
      const mockRule = { id: "r1", scene: "ALL", ruleType: "BOOST" };
      mockPrisma.recommendRule.findUniqueOrThrow.mockResolvedValue(mockRule);
      const result = await svc.getRule("r1");
      expect(result).toEqual(mockRule);
    });

    it("createRule — 创建规则并清除缓存", async () => {
      const mockRule = { id: "r1", scene: "ALL", ruleType: "BOOST" };
      mockPrisma.recommendRule.create.mockResolvedValue(mockRule);
      const result = await svc.createRule({
        targetType: "COURSE", targetId: "c1", ruleType: "BOOST", ruleValue: 2,
      } as any);
      expect(result).toEqual(mockRule);
      expect(mockPrisma.recommendRule.create).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:rules:active");
    });

    it("updateRule — 更新规则并清除缓存", async () => {
      const mockRule = { id: "r1", scene: "GUESS_LIKE", ruleType: "BOOST", priority: 5 };
      mockPrisma.recommendRule.update.mockResolvedValue(mockRule);
      const result = await svc.updateRule("r1", { scene: "GUESS_LIKE" } as any);
      expect(result).toEqual(mockRule);
      expect(mockPrisma.recommendRule.update).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:rules:active");
    });

    it("deleteRule — 删除规则并清除缓存", async () => {
      mockPrisma.recommendRule.delete.mockResolvedValue(undefined);
      await svc.deleteRule("r1");
      expect(mockPrisma.recommendRule.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
      expect(mockRedis.del).toHaveBeenCalledWith("recommend:rules:active");
    });
  });
});
