import { Test } from "@nestjs/testing";
import { OperationEngineService } from "./operation-engine.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ContentGenerationService } from "../content-generation/content-generation.service";

const mockPrisma = {
  content: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  configSystem: { findUnique: jest.fn(), upsert: jest.fn() },
  user: { findUnique: jest.fn(), count: jest.fn() },
  circle: { count: jest.fn() },
  $queryRawUnsafe: jest.fn(),
};

const mockContentGeneration = {
  autoFillEmptyCategories: jest.fn(),
  generateForCategory: jest.fn(),
};

describe("OperationEngineService", () => {
  let svc: OperationEngineService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OperationEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ContentGenerationService, useValue: mockContentGeneration },
      ],
    }).compile();
    svc = mod.get(OperationEngineService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ═══════════ rotateHomepageContent ═══════════
  describe("rotateHomepageContent", () => {
    it("选取近7天优质内容随机20条存入config", async () => {
      const contents = Array.from({ length: 30 }, (_, i) => ({
        id: `c-${i}`,
        title: `内容${i}`,
        likeCount: i,
        viewCount: i * 10,
      }));
      mockPrisma.content.findMany.mockResolvedValue(contents);
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      await svc.rotateHomepageContent();

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) }),
      );
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { configKey: "homepage_recommendations" } }),
      );
    });
  });

  // ═══════════ detectEmptyCategories ═══════════
  describe("detectEmptyCategories", () => {
    it("检测到空品类时写入config", async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { level1: "国学经典", level2: "儒家经典", count: BigInt(1) },
        { level1: "中医养生", level2: "中医基础", count: BigInt(5) },
      ]);
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      await svc.detectEmptyCategories();

      expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { configKey: "empty_category_alerts" },
          create: expect.objectContaining({
            configValue: expect.stringContaining("国学经典"),
          }),
        }),
      );
    });

    it("全部品类充足时不写config", async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { level1: "国学经典", level2: "儒家经典", count: BigInt(10) },
        { level1: "中医养生", level2: "中医基础", count: BigInt(8) },
      ]);
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      await svc.detectEmptyCategories();

      const calls = mockPrisma.configSystem.upsert.mock.calls.filter(
        (c: any[]) => c[0]?.where?.configKey === "empty_category_alerts",
      );
      expect(calls).toHaveLength(0);
    });
  });

  // ═══════════ fillEmptyCategories ═══════════
  describe("fillEmptyCategories", () => {
    it("委托到contentGeneration.autoFillEmptyCategories", async () => {
      mockContentGeneration.autoFillEmptyCategories.mockResolvedValue(undefined);

      const result = await svc.fillEmptyCategories();

      expect(mockContentGeneration.autoFillEmptyCategories).toHaveBeenCalled();
      expect(result).toEqual({ message: "空品类内容填充已触发" });
    });
  });

  // ═══════════ markHotContent ═══════════
  describe("markHotContent", () => {
    it("评分≥30的内容标记为热门", async () => {
      mockPrisma.content.findMany.mockResolvedValue([
        { id: "c-1", title: "热文", likeCount: 15, viewCount: 100 },
        { id: "c-2", title: "冷文", likeCount: 1, viewCount: 5 },
      ]);
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      const result = await svc.markHotContent();

      expect(result!.hotContentCount).toBe(1);
      expect(result!.contentIds).toEqual(["c-1"]);
    });

    it("无热门内容时返回空数组", async () => {
      mockPrisma.content.findMany.mockResolvedValue([
        { id: "c-1", title: "冷文", likeCount: 0, viewCount: 5 },
      ]);
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      const result = await svc.markHotContent();
      expect(result!.hotContentCount).toBe(0);
      expect(result!.contentIds).toEqual([]);
    });
  });

  // ═══════════ getRelatedRecommendations ═══════════
  describe("getRelatedRecommendations", () => {
    it("按品类获取关联内容", async () => {
      const items = [
        { id: "r-1", title: "相关1", excerpt: "e1", cover: "c1.jpg", categoryLevel1: "国学经典", categoryLevel2: "儒家经典", viewCount: 100, likeCount: 50 },
      ];
      mockPrisma.content.findMany.mockResolvedValue(items);

      const result = await svc.getRelatedRecommendations("国学经典", "儒家经典", 6);

      expect(result.category).toBe("国学经典");
      expect(result.recommendations).toHaveLength(1);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED", categoryLevel1: "国学经典", categoryLevel2: "儒家经典" } }),
      );
    });
  });

  // ═══════════ getPersonalizedRecommendations ═══════════
  describe("getPersonalizedRecommendations", () => {
    it("按用户兴趣品类推荐", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ interestCategories: ["国学经典", "中医养生"] });
      mockPrisma.content.findMany.mockResolvedValue([
        { id: "r-1", title: "国学相关", excerpt: null, cover: null, categoryLevel1: "国学经典", viewCount: 100, likeCount: 50 },
        { id: "r-2", title: "中医相关", excerpt: null, cover: null, categoryLevel1: "中医养生", viewCount: 80, likeCount: 30 },
      ]);

      const result = await svc.getPersonalizedRecommendations("user-1", 10);

      expect(result.userId).toBe("user-1");
      expect(result.interests).toEqual(["国学经典", "中医养生"]);
      expect(result.results).toHaveLength(2);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED", categoryLevel1: { in: ["国学经典", "中医养生"] } } }),
      );
    });

    it("用户无兴趣时返回空", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ interestCategories: [] });

      const result = await svc.getPersonalizedRecommendations("user-2", 10);

      expect(result.results).toEqual([]);
    });

    it("用户不存在时返回空", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await svc.getPersonalizedRecommendations("user-3", 10);

      expect(result.interests).toEqual([]);
      expect(result.results).toEqual([]);
    });
  });

  // ═══════════ generateWeeklyBrief ═══════════
  describe("generateWeeklyBrief", () => {
    it("生成运营周报并存入config", async () => {
      mockPrisma.content.count.mockResolvedValue(42);
      mockPrisma.user.count.mockResolvedValue(15);
      mockPrisma.content.aggregate.mockResolvedValue({ _sum: { likeCount: 300, viewCount: 5000 } });
      mockPrisma.configSystem.upsert.mockResolvedValue({});

      const result = await svc.generateWeeklyBrief();

      expect(result.newContent).toBe(42);
      expect(result.newUsers).toBe(15);
      expect(result.totalLikes).toBe(300);
      expect(result.totalViews).toBe(5000);
      expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { configKey: "weekly_operation_brief" } }),
      );
    });
  });

  // ═══════════ getOverview ═══════════
  describe("getOverview", () => {
    it("返回运营概览数据", async () => {
      mockPrisma.content.count.mockResolvedValue(200);
      mockPrisma.user.count.mockResolvedValue(500);
      mockPrisma.circle.count.mockResolvedValue(30);
      // content.count called twice: total + recent
      mockPrisma.content.count.mockResolvedValueOnce(200).mockResolvedValueOnce(25);

      const result = await svc.getOverview();

      expect(result).toHaveProperty("totalContent");
      expect(result).toHaveProperty("totalUsers");
      expect(result).toHaveProperty("totalCircles");
      expect(result).toHaveProperty("recentContent");
    });
  });
});
