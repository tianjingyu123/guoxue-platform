import { Test } from "@nestjs/testing";
import { CrossSellStrategy } from "./cross-sell.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  order: { findMany: jest.fn() },
  course: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
};

describe("CrossSellStrategy", () => {
  let svc: CrossSellStrategy;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [CrossSellStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(CrossSellStrategy);
  });

  beforeEach(() => { jest.resetAllMocks(); });

  describe("supports", () => {
    it("支持成交相关场景", () => {
      expect(svc.supports(RecommendScene.COURSE_DETAIL)).toBe(true);
      expect(svc.supports(RecommendScene.PRODUCT_DETAIL)).toBe(true);
      expect(svc.supports(RecommendScene.PAIPAN_RESULT)).toBe(true);
      expect(svc.supports(RecommendScene.PAYMENT_SUCCESS)).toBe(true);
    });

    it("不支持搜索、文章等场景", () => {
      expect(svc.supports(RecommendScene.ARTICLE_DETAIL)).toBe(false);
      expect(svc.supports(RecommendScene.SEARCH_EMPTY)).toBe(false);
      expect(svc.supports(RecommendScene.GUESS_LIKE)).toBe(false);
    });
  });

  describe("recommend", () => {
    it("无 contentId 且无 orderItemIds 返回空", async () => {
      const result = await svc.recommend({ scene: RecommendScene.COURSE_DETAIL, page: 1, pageSize: 10 });
      expect(result).toEqual([]);
    });

    it("基于 contentId 查询共现订单并召回课程", async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }, { userId: "u1" }])
        .mockResolvedValueOnce([
          { targetId: "c2" }, { targetId: "c2" }, { targetId: "c2" },
          { targetId: "c3" }, { targetId: "c3" },
        ]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c2", title: "进阶课", cover: null, intro: null, tags: [], price: 99, studentCount: 50 },
        { id: "c3", title: "高级课", cover: null, intro: null, tags: [], price: 199, studentCount: 30 },
      ]);

      const result = await svc.recommend({
        scene: RecommendScene.COURSE_DETAIL,
        contentId: "c1",
        page: 1,
        pageSize: 10,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((r) => r.type === "COURSE")).toBe(true);
      expect(result.every((r) => r.strategies.includes("cross-sell"))).toBe(true);
      expect(result[0].id).toBe("c2");
    });

    it("基于 orderItemIds 查询交叉推荐", async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ userId: "u1" }])
        .mockResolvedValueOnce([{ targetId: "c2" }])
        .mockResolvedValueOnce([{ userId: "u2" }])
        .mockResolvedValueOnce([{ targetId: "c3" }]);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c2", title: "课2", cover: null, intro: null, tags: [], price: 99, studentCount: 50 },
        { id: "c3", title: "课3", cover: null, intro: null, tags: [], price: 199, studentCount: 30 },
      ]);

      const result = await svc.recommend({
        scene: RecommendScene.COURSE_DETAIL,
        orderItemIds: ["oi1", "oi2"],
        page: 1,
        pageSize: 10,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("购买用户为空时返回空", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await svc.recommend({
        scene: RecommendScene.COURSE_DETAIL,
        contentId: "c1",
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual([]);
    });

    it("PRODUCT_DETAIL 场景查询商品", async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ userId: "u1" }])
        .mockResolvedValueOnce([{ targetId: "p2" }]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "p2", title: "商品2", images: [], intro: null, tags: [], price: 88, salesCount: 20 },
      ]);

      const result = await svc.recommend({
        scene: RecommendScene.PRODUCT_DETAIL,
        contentId: "p1",
        page: 1,
        pageSize: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PRODUCT");
      expect(result[0].reason).toBe("经常一起购买");
    });

    it("结果截断到 pageSize * 2", async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ userId: "u1" }])
        .mockResolvedValueOnce(
          Array.from({ length: 20 }, (_, i) => ({ targetId: `c${i}` })),
        );
      mockPrisma.course.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `c${i}`, title: `课${i}`, cover: null, intro: null, tags: [], price: 99, studentCount: 50,
        })),
      );

      const result = await svc.recommend({
        scene: RecommendScene.COURSE_DETAIL,
        contentId: "c1",
        page: 1,
        pageSize: 3,
      });

      expect(result.length).toBeLessThanOrEqual(6);
    });
  });
});
