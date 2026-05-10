import { Test } from "@nestjs/testing";
import { VectorRecallStrategy, VectorRecallProvider } from "./vector-recall.strategy";
import { RecommendScene } from "../recommend.dto";

describe("VectorRecallStrategy", () => {
  let svc: VectorRecallStrategy;
  let mockProvider: jest.Mocked<VectorRecallProvider>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [VectorRecallStrategy],
    }).compile();
    svc = mod.get(VectorRecallStrategy);
  });

  beforeEach(() => {
    mockProvider = {
      embed: jest.fn(),
      search: jest.fn(),
      buildUserVector: jest.fn(),
    };
  });

  describe("supports", () => {
    it("provider 为 null 时返回 false", () => {
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(false);
    });

    it("setProvider 后返回 true", () => {
      svc.setProvider(mockProvider);
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(true);
    });
  });

  describe("recommend", () => {
    it("provider 为 null 时返回空数组", async () => {
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, userId: "u1", page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("无 userId 时返回空数组", async () => {
      svc.setProvider(mockProvider);
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("有 contentId 时基于内容向量召回", async () => {
      svc.setProvider(mockProvider);
      mockProvider.embed.mockResolvedValue([[0.1, 0.2, 0.3]]);
      mockProvider.search.mockResolvedValue([
        { id: "a1", type: "ARTICLE", score: 0.95 },
        { id: "c1", type: "COURSE", score: 0.88 },
      ]);

      const result = await svc.recommend({
        scene: RecommendScene.ARTICLE_DETAIL,
        userId: "u1",
        contentId: "a-ref",
        page: 1,
        pageSize: 10,
      });

      expect(mockProvider.embed).toHaveBeenCalledWith(["a-ref"]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a1");
      expect(result[0].strategies).toContain("vector-recall");
    });

    it("无 contentId 时基于用户画像向量召回", async () => {
      svc.setProvider(mockProvider);
      mockProvider.buildUserVector.mockResolvedValue([0.1, 0.2]);
      mockProvider.search.mockResolvedValue([{ id: "c1", type: "COURSE", score: 0.9 }]);

      const result = await svc.recommend({
        scene: RecommendScene.GUESS_LIKE,
        userId: "u1",
        page: 1,
        pageSize: 10,
      });

      expect(mockProvider.buildUserVector).toHaveBeenCalledWith("u1");
      expect(result).toHaveLength(1);
    });

    it("用户画像向量为空时返回空数组", async () => {
      svc.setProvider(mockProvider);
      mockProvider.buildUserVector.mockResolvedValue(null);

      const result = await svc.recommend({
        scene: RecommendScene.GUESS_LIKE,
        userId: "u1",
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual([]);
    });

    it("传递 excludeIds 给 search", async () => {
      svc.setProvider(mockProvider);
      mockProvider.embed.mockResolvedValue([[0.1]]);
      mockProvider.search.mockResolvedValue([]);

      await svc.recommend({
        scene: RecommendScene.ARTICLE_DETAIL,
        userId: "u1",
        contentId: "a1",
        excludeIds: ["x1", "x2"],
        page: 1,
        pageSize: 10,
      });

      expect(mockProvider.search).toHaveBeenCalledWith(
        [0.1], 10, { excludeIds: ["x1", "x2"] },
      );
    });
  });
});
