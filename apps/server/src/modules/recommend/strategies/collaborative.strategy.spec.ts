import { Test } from "@nestjs/testing";
import { CollaborativeStrategy } from "./collaborative.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  course: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
};
const mockRedis = { getJson: jest.fn() };

describe("CollaborativeStrategy", () => {
  let svc: CollaborativeStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CollaborativeStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(CollaborativeStrategy);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("supports", () => {
    it("支持课程详情、商品详情、排盘、猜你喜欢、课程学习", () => {
      expect(svc.supports(RecommendScene.COURSE_DETAIL)).toBe(true);
      expect(svc.supports(RecommendScene.PRODUCT_DETAIL)).toBe(true);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(true);
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(true);
      expect(svc.supports(RecommendScene.COURSE_LEARN)).toBe(true);
    });

    it("不支持空状态、搜索为空等场景", () => {
      expect(svc.supports(RecommendScene.EMPTY_STATE)).toBe(false);
      expect(svc.supports(RecommendScene.SEARCH_EMPTY)).toBe(false);
    });
  });

  describe("recommend", () => {
    it("无 contentId 返回空数组", async () => {
      const result = await svc.recommend({ scene: RecommendScene.GUESS_LIKE, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("Redis 无相似数据时返回空数组", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      const result = await svc.recommend({ scene: RecommendScene.COURSE_DETAIL, contentId: "c1", page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("从 Redis 读取相似度矩阵并返回课程详情", async () => {
      mockRedis.getJson.mockResolvedValue([
        { simItemId: "c2", simItemType: "COURSE", score: 0.8 },
        { simItemId: "c3", simItemType: "COURSE", score: 0.5 },
      ]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c2", title: "进阶课", cover: null, intro: null, tags: ["八字"], price: 99, studentCount: 200 },
        { id: "c3", title: "高阶课", cover: null, intro: null, tags: ["八字"], price: 199, studentCount: 50 },
      ]);

      const result = await svc.recommend({ scene: RecommendScene.COURSE_DETAIL, contentId: "c1", page: 1, pageSize: 10 });
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].strategies).toContain("collaborative");
      expect(result[0].reason).toBe("喜欢此内容的人也喜欢");
    });

    it("按相似度分数降序排序", async () => {
      mockRedis.getJson.mockResolvedValue([
        { simItemId: "c2", simItemType: "COURSE", score: 0.3 },
        { simItemId: "c3", simItemType: "COURSE", score: 0.9 },
      ]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c2", title: "低分课", cover: null, intro: null, tags: [], price: 9, studentCount: 10 },
        { id: "c3", title: "高分课", cover: null, intro: null, tags: [], price: 99, studentCount: 100 },
      ]);

      const result = await svc.recommend({ scene: RecommendScene.COURSE_DETAIL, contentId: "c1", page: 1, pageSize: 10 });
      expect(result[0].id).toBe("c3"); // 高分在前
    });

    it("商品详情场景推断类型为 PRODUCT", async () => {
      mockRedis.getJson.mockResolvedValue([
        { simItemId: "p2", simItemType: "PRODUCT", score: 0.7 },
      ]);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "p2", title: "相关商品", images: [], intro: null, tags: [], price: 50, salesCount: 30 },
      ]);

      const result = await svc.recommend({ scene: RecommendScene.PRODUCT_DETAIL, contentId: "p1", page: 1, pageSize: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PRODUCT");
    });
  });
});
