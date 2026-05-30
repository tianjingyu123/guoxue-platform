import { Test } from "@nestjs/testing";
import { ScoringService } from "./scoring.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendItem } from "../strategies/base.strategy";

const mockPrisma = { user: { findUnique: jest.fn() } };

describe("ScoringService", () => {
  let svc: ScoringService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ScoringService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(ScoringService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getUserLevelBoost", () => {
    it("无 userId 返回 1.0", async () => {
      expect(await svc.getUserLevelBoost()).toBe(1.0);
    });

    it("NONE 会员返回 1.0", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE" });
      expect(await svc.getUserLevelBoost("u1")).toBe(1.0);
    });

    it("GOLD 会员返回 1.1", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "GOLD" });
      expect(await svc.getUserLevelBoost("u1")).toBe(1.1);
    });

    it("DIAMOND 会员返回 1.3", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "DIAMOND" });
      expect(await svc.getUserLevelBoost("u1")).toBe(1.3);
    });

    it("用户不存在返回 1.0", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await svc.getUserLevelBoost("u1")).toBe(1.0);
    });
  });

  describe("applyMemberBoost", () => {
    const items: RecommendItem[] = [
      { id: "a1", type: "ARTICLE", title: "t1", score: 100, reason: "", strategies: [] },
    ];

    it("levelBoost=1.0 不做加权", () => {
      const result = svc.applyMemberBoost(items, 1.0);
      expect(result[0].score).toBe(100);
    });

    it("DIAMOND 会员加权 1.3 倍", () => {
      const result = svc.applyMemberBoost(items, 1.3);
      expect(result[0].score).toBe(130);
      expect(result[0].strategies).toContain("member-boost");
    });
  });

  describe("normalize", () => {
    it("空数组不做处理", () => {
      expect(svc.normalize([])).toEqual([]);
    });

    it("单一元素归一化为 500", () => {
      const result = svc.normalize([{ id: "a1", type: "ARTICLE", title: "t1", score: 100, reason: "", strategies: [] }]);
      expect(result[0].score).toBe(500);
    });

    it("分数归一化到 0-1000", () => {
      const items: RecommendItem[] = [
        { id: "a1", type: "ARTICLE", title: "t1", score: 0, reason: "", strategies: [] },
        { id: "a2", type: "ARTICLE", title: "t2", score: 100, reason: "", strategies: [] },
      ];
      const result = svc.normalize(items);
      expect(result[0].score).toBe(0);
      expect(result[1].score).toBe(1000);
    });
  });

  describe("freshnessDecay", () => {
    it("今天创建的内容衰减接近 1", () => {
      const decay = ScoringService.freshnessDecay(new Date());
      expect(decay).toBeGreaterThan(0.95);
    });

    it("30天前的内容衰减约 0.5", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const decay = ScoringService.freshnessDecay(thirtyDaysAgo);
      expect(decay).toBeCloseTo(0.5, 1);
    });

    it("无 createdAt 返回 0.9", () => {
      expect(ScoringService.freshnessDecay()).toBe(0.9);
    });
  });

  describe("applyFreshnessBoost", () => {
    it("新内容分数几乎不变", () => {
      const items: RecommendItem[] = [
        { id: "a1", type: "ARTICLE", title: "t1", score: 100, reason: "", strategies: [], createdAt: new Date() },
      ];
      const result = svc.applyFreshnessBoost(items);
      expect(result[0].score).toBeGreaterThan(90);
    });

    it("旧内容分数衰减", () => {
      const oldDate = new Date(Date.now() - 90 * 24 * 3600 * 1000);
      const items: RecommendItem[] = [
        { id: "a1", type: "ARTICLE", title: "t1", score: 100, reason: "", strategies: [], createdAt: oldDate },
      ];
      const result = svc.applyFreshnessBoost(items);
      expect(result[0].score).toBeLessThan(100);
      expect(result[0].strategies).toContain("freshness-boost");
    });

    it("无 createdAt 的内容分数小幅衰减", () => {
      const items: RecommendItem[] = [
        { id: "a1", type: "ARTICLE", title: "t1", score: 100, reason: "", strategies: [] },
      ];
      const result = svc.applyFreshnessBoost(items);
      expect(result[0].score).toBe(90);
    });
  });

  describe("score", () => {
    it("综合评分流水线", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "GOLD" });
      const items: RecommendItem[] = [
        { id: "a1", type: "ARTICLE", title: "t1", score: 0, reason: "", strategies: [] },
        { id: "a2", type: "ARTICLE", title: "t2", score: 100, reason: "", strategies: [] },
      ];
      const result = await svc.score(items, "u1");
      expect(result).toHaveLength(2);
      expect(result[1].score).toBe(1000); // 最高分归一化
    });
  });
});
