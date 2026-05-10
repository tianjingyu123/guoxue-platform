import { Test } from "@nestjs/testing";
import { SearchHotStrategy } from "./search-hot.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  userBehavior: { findMany: jest.fn() },
};

describe("SearchHotStrategy", () => {
  let svc: SearchHotStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [SearchHotStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(SearchHotStrategy);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("supports", () => {
    it("仅支持 SEARCH_EMPTY 场景", () => {
      expect(svc.supports(RecommendScene.SEARCH_EMPTY)).toBe(true);
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(false);
      expect(svc.supports(RecommendScene.ARTICLE_DETAIL)).toBe(false);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(false);
    });
  });

  describe("recommend", () => {
    it("无搜索行为时返回空数组", async () => {
      mockPrisma.userBehavior.findMany.mockResolvedValue([]);
      const result = await svc.recommend({ scene: RecommendScene.SEARCH_EMPTY, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("按搜索频次聚合热门词", async () => {
      mockPrisma.userBehavior.findMany.mockResolvedValue([
        { targetId: "八字" }, { targetId: "八字" }, { targetId: "八字" },
        { targetId: "风水" }, { targetId: "风水" },
        { targetId: "奇门" },
      ]);
      const result = await svc.recommend({ scene: RecommendScene.SEARCH_EMPTY, page: 1, pageSize: 10 });
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("八字");
      expect(result[0].score).toBe(30); // 3 * 10
      expect(result[1].title).toBe("风水");
      expect(result[1].score).toBe(20);
      expect(result[2].title).toBe("奇门");
    });

    it("最多返回 10 个热门词", async () => {
      const behaviors = Array.from({ length: 100 }, (_, i) => ({
        targetId: `词${i}`,
      }));
      mockPrisma.userBehavior.findMany.mockResolvedValue(behaviors);
      const result = await svc.recommend({ scene: RecommendScene.SEARCH_EMPTY, page: 1, pageSize: 10 });
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("返回项类型为 CONTENT 且含 search-hot 策略标记", async () => {
      mockPrisma.userBehavior.findMany.mockResolvedValue([{ targetId: "命理" }]);
      const result = await svc.recommend({ scene: RecommendScene.SEARCH_EMPTY, page: 1, pageSize: 10 });
      expect(result[0].type).toBe("CONTENT");
      expect(result[0].strategies).toContain("search-hot");
      expect(result[0].reason).toBe("热门搜索");
      expect(result[0].metadata).toHaveProperty("searchWord", "命理");
    });
  });
});
