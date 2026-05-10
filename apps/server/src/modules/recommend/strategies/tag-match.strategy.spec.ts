import { Test } from "@nestjs/testing";
import { TagMatchStrategy } from "./tag-match.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  course: { findMany: jest.fn(), findUnique: jest.fn() },
  product: { findMany: jest.fn(), findUnique: jest.fn() },
  circle: { findMany: jest.fn() },
  article: { findMany: jest.fn(), findUnique: jest.fn() },
};

describe("TagMatchStrategy", () => {
  let svc: TagMatchStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [TagMatchStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(TagMatchStrategy);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("supports", () => {
    it("所有场景都支持", () => {
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(true);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(true);
      expect(svc.supports(RecommendScene.ARTICLE_DETAIL)).toBe(true);
    });
  });

  describe("recommend", () => {
    it("无标签且无 contentId 返回空数组", async () => {
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, targetTags: [], page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("有 targetTags 时按标签查询各类型内容", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, targetTags: ["八字", "命理"], page: 1, pageSize: 10 });
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tags: { hasSome: ["八字", "命理"] } }) }));
      expect(mockPrisma.article.findMany).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("有 contentId 时自动解析标签", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ tags: ["风水"] });
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      await svc.recommend({ scene: RecommendScene.ARTICLE_DETAIL, contentId: "a1", page: 1, pageSize: 10 });
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "a1" } }));
    });

    it("返回标签匹配的课程和文章", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ tags: ["入门"] });
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "入门课", cover: null, intro: null, tags: ["入门"], price: 0, studentCount: 100 },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([
        { id: "a2", title: "入门文章", cover: null, excerpt: null, tags: ["入门"], viewCount: 50, likeCount: 10 },
      ]);

      const result = await svc.recommend({ scene: RecommendScene.ARTICLE_DETAIL, contentId: "a1", page: 1, pageSize: 10 });
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((r) => r.type === "COURSE")).toBe(true);
      expect(result.some((r) => r.type === "ARTICLE")).toBe(true);
      expect(result.every((r) => r.strategies.includes("tag-match"))).toBe(true);
    });

    it("排除 contentId 自身", async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ tags: ["八字"] });
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      await svc.recommend({ scene: RecommendScene.ARTICLE_DETAIL, contentId: "a1", page: 1, pageSize: 10 });
      // article.findMany 的 where 应包含 id: { not: "a1" }
      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.where.id).toEqual({ not: "a1" });
    });
  });
});
