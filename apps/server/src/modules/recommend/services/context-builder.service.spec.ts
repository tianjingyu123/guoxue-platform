import { Test } from "@nestjs/testing";
import { ContextBuilderService } from "./context-builder.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { RecommendScene } from "../recommend.dto";

const mockPrisma = {
  article: { findUnique: jest.fn() },
  course: { findUnique: jest.fn() },
  product: { findUnique: jest.fn() },
};

const mockRedis = {
  getJson: jest.fn(),
  setJson: jest.fn(),
};

describe("ContextBuilderService", () => {
  let svc: ContextBuilderService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ContextBuilderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(ContextBuilderService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("resolveTags", () => {
    it("无 contentId 返回空数组", async () => {
      const result = await svc.resolveTags(undefined);
      expect(result).toEqual([]);
    });

    it("缓存命中直接返回", async () => {
      mockRedis.getJson.mockResolvedValue(["八字", "命理"]);
      const result = await svc.resolveTags("a1");
      expect(result).toEqual(["八字", "命理"]);
      expect(mockPrisma.article.findUnique).not.toHaveBeenCalled();
    });

    it("ARTICLE_DETAIL 场景从 article 解析标签", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue({ tags: ["风水", "入门"] });

      const result = await svc.resolveTags("a1", RecommendScene.ARTICLE_DETAIL);
      expect(result).toEqual(["风水", "入门"]);
      expect(mockRedis.setJson).toHaveBeenCalledWith(expect.stringContaining("a1"), ["风水", "入门"], 600);
    });

    it("COURSE_DETAIL 场景从 course 解析标签", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue({ tags: ["八字进阶"] });

      const result = await svc.resolveTags("c1", RecommendScene.COURSE_DETAIL);
      expect(result).toEqual(["八字进阶"]);
    });

    it("PRODUCT_DETAIL 场景从 product 解析标签", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue({ tags: ["开运物"] });

      const result = await svc.resolveTags("p1", RecommendScene.PRODUCT_DETAIL);
      expect(result).toEqual(["开运物"]);
    });

    it("无 scene 时依次尝试 article→course→product", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue({ tags: ["八字"] });
      mockPrisma.product.findUnique.mockResolvedValue({ tags: ["不应查到"] });

      const result = await svc.resolveTags("x1");
      expect(result).toEqual(["八字"]);
      // 找到后不再查 product
      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
    });

    it("所有模型都查不到时返回空数组", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await svc.resolveTags("x1");
      expect(result).toEqual([]);
    });
  });

  describe("build", () => {
    it("构建完整的 RecommendContext", async () => {
      mockRedis.getJson.mockResolvedValue(["入门"]);
      mockPrisma.article.findUnique.mockResolvedValue({ tags: ["入门"] });

      const ctx = await svc.build({
        scene: RecommendScene.ARTICLE_DETAIL,
        userId: "u1",
        contentId: "a1",
        page: 1,
        pageSize: 10,
        orderItemIds: ["oi1"],
        excludeIds: ["x1"],
      });

      expect(ctx.scene).toBe(RecommendScene.ARTICLE_DETAIL);
      expect(ctx.userId).toBe("u1");
      expect(ctx.contentId).toBe("a1");
      expect(ctx.targetTags).toEqual(["入门"]);
      expect(ctx.orderItemIds).toEqual(["oi1"]);
      expect(ctx.excludeIds).toEqual(["x1"]);
      expect(ctx.page).toBe(1);
      expect(ctx.pageSize).toBe(10);
    });
  });
});
