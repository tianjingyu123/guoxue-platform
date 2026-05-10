import { Test, TestingModule } from "@nestjs/testing";
import { MiniService } from "./mini.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { RecommendService } from "../recommend/recommend.service";

describe("MiniService", () => {
  let svc: MiniService;
  let prisma: {
    content: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
    article: { findMany: jest.Mock };
    circle: { findMany: jest.Mock };
    course: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    station: { findUnique: jest.Mock };
  };
  let redis: {
    getJson: jest.Mock;
    setJson: jest.Mock;
    mgetJson: jest.Mock;
  };
  let systemService: { getPublicConfigs: jest.Mock };

  beforeEach(async () => {
    prisma = {
      content: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      article: { findMany: jest.fn() },
      circle: { findMany: jest.fn() },
      course: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      station: { findUnique: jest.fn() },
    };
    redis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      mgetJson: jest.fn().mockResolvedValue([null, null, null, null, null]),
    };
    systemService = {
      getPublicConfigs: jest.fn().mockResolvedValue({
        home_banners: JSON.stringify([{ url: "/banner1.jpg", link: "/course/1" }]),
        home_notice: "欢迎来到国学平台",
      }),
    };
    const recommendService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiniService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: SystemService, useValue: systemService },
        { provide: RecommendService, useValue: recommendService as any },
      ],
    }).compile();

    svc = module.get<MiniService>(MiniService);
  });

  describe("getHome", () => {
    it("返回首页聚合数据", async () => {
      prisma.content.findMany.mockResolvedValue([{ id: "c1", title: "论语导读" }]);
      prisma.article.findMany.mockResolvedValue([{ id: "a1", title: "国学心得" }]);
      prisma.circle.findMany.mockResolvedValue([{ id: "cir1", name: "书法圈" }]);

      const result = await svc.getHome({});

      expect(result.hotContents.length).toBe(1);
      expect(result.recentArticles.length).toBe(1);
      expect(result.activeCircles.length).toBe(1);
      expect(result.banners).toEqual([{ url: "/banner1.jpg", link: "/course/1" }]);
      expect(result.notice).toBe("欢迎来到国学平台");
    });

    it("命中缓存直接返回", async () => {
      const cachedBanners = { home_banners: '[{"url":"/b1.jpg","link":"/c1"}]', home_notice: "公告" };
      const cachedHot = [{ id: "a1", title: "热门", type: "ARTICLE" }];
      const cachedArticles = [{ id: "a2", title: "文章", excerpt: null }];
      const cachedCircles = [{ id: "c1", name: "圈子" }];
      const cachedStation = null;

      redis.mgetJson.mockResolvedValueOnce([cachedBanners, cachedHot, cachedArticles, cachedCircles, cachedStation]);

      const result = await svc.getHome({});
      expect(result.hotContents).toHaveLength(1);
      expect(result.recentArticles).toHaveLength(1);
      expect(result.activeCircles).toHaveLength(1);
      expect(prisma.content.findMany).not.toHaveBeenCalled();
    });

    it("带 stationId 时查询分站数据", async () => {
      prisma.content.findMany.mockResolvedValue([]);
      prisma.article.findMany.mockResolvedValue([]);
      prisma.circle.findMany.mockResolvedValue([]);
      prisma.station.findUnique.mockResolvedValue({
        id: "s1", name: "北京分站", logo: null, themeColor: null, intro: null,
      });

      const result = await svc.getHome({ stationId: "s1" });
      expect(result.station).toBeDefined();
      expect(result.station.name).toBe("北京分站");
    });
  });

  describe("getContents", () => {
    it("分页返回内容流", async () => {
      prisma.content.findMany.mockResolvedValue([
        { id: "c1", title: "诗经赏析" },
        { id: "c2", title: "易经入门" },
      ]);
      prisma.content.count.mockResolvedValue(10);
      const result = await svc.getContents({ page: 1, pageSize: 2 });
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it("按类型过滤", async () => {
      prisma.content.findMany.mockResolvedValue([]);
      prisma.content.count.mockResolvedValue(0);
      await svc.getContents({ type: "POETRY", page: 1, pageSize: 10 });
      expect(prisma.content.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ type: "POETRY" }),
      }));
    });
  });

  describe("getContentDetail", () => {
    it("返回内容详情", async () => {
      prisma.content.findUnique.mockResolvedValue({
        id: "c1", title: "诗经赏析", type: "POETRY", author: "佚名",
        dynasty: "先秦", body: "<p>关关雎鸠</p>", tags: ["诗经"],
      });
      const result = await svc.getContentDetail("c1");
      expect(result).toHaveProperty("title", "诗经赏析");
    });

    it("内容不存在返回 null", async () => {
      prisma.content.findUnique.mockResolvedValue(null);
      const result = await svc.getContentDetail("notexist");
      expect(result).toBeNull();
    });
  });

  describe("getShareConfig", () => {
    it("CONTENT 类型返回分享配置", async () => {
      prisma.content.findUnique.mockResolvedValue({ title: "诗经赏析", cover: "/cover.jpg" });
      const result = await svc.getShareConfig({ targetType: "CONTENT", targetId: "c1" });
      expect(result.title).toBe("诗经赏析");
      expect(result.imageUrl).toBe("/cover.jpg");
    });

    it("未知类型使用默认标题", async () => {
      const result = await svc.getShareConfig({ targetType: "OTHER" as any, targetId: "x" });
      expect(result.title).toBe("国学传统文化");
    });
  });
});
