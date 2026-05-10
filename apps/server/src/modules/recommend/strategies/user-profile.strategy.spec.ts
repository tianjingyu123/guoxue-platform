import { Test } from "@nestjs/testing";
import { UserProfileStrategy } from "./user-profile.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  userInterest: { findMany: jest.fn() },
  course: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
  circle: { findMany: jest.fn() },
  article: { findMany: jest.fn() },
};

describe("UserProfileStrategy", () => {
  let svc: UserProfileStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [UserProfileStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(UserProfileStrategy);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("supports", () => {
    it("支持支付成功、猜你喜欢、排盘、课程学习", () => {
      expect(svc.supports(RecommendScene.PAYMENT_SUCCESS)).toBe(true);
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(true);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(true);
      expect(svc.supports(RecommendScene.COURSE_LEARN)).toBe(true);
    });
  });

  describe("recommend", () => {
    it("无 userId 返回空数组", async () => {
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("用户无兴趣标签返回空数组", async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([]);
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, userId: "u1", page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("根据兴趣标签推荐各类型内容", async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([
        { tag: "八字", score: 10 },
        { tag: "命理", score: 5 },
        { tag: "风水", score: 3 },
      ]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "八字入门", cover: null, intro: null, tags: ["八字", "入门"], price: 0, studentCount: 200 },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([
        { id: "a1", title: "八字命理", cover: null, excerpt: null, tags: ["八字", "命理"], viewCount: 100, likeCount: 20 },
      ]);

      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, userId: "u1", page: 1, pageSize: 10 });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.strategies.includes("user-profile"))).toBe(true);
      expect(result.every((r) => r.reason === "根据你的兴趣推荐")).toBe(true);
    });

    it("多标签内容获得更高加权分", async () => {
      mockPrisma.userInterest.findMany.mockResolvedValue([
        { tag: "八字", score: 10 },
        { tag: "入门", score: 8 },
      ]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "八字入门", cover: null, intro: null, tags: ["八字", "入门"], price: 0, studentCount: 100 },
        { id: "c2", title: "仅八字", cover: null, intro: null, tags: ["八字"], price: 0, studentCount: 100 },
      ]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.circle.findMany.mockResolvedValue([]);
      mockPrisma.article.findMany.mockResolvedValue([]);

      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, userId: "u1", page: 1, pageSize: 10 });
      // 双标签的内容分数应高于单标签
      const dbl = result.find((r) => r.id === "c1");
      const sgl = result.find((r) => r.id === "c2");
      expect(dbl!.score).toBeGreaterThan(sgl!.score);
    });
  });
});
