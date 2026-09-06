import { Test, TestingModule } from "@nestjs/testing";
import { MiniService } from "./mini.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { RecommendService } from "../recommend/recommend.service";

describe("MiniService", () => {
  let svc: MiniService;
  let prisma: {
    content: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; count: jest.Mock };
    article: { findMany: jest.Mock; findFirst: jest.Mock };
    circle: { findMany: jest.Mock };
    course: { findUnique: jest.Mock; findFirst: jest.Mock };
    product: { findUnique: jest.Mock; findFirst: jest.Mock };
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
      content: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
      article: { findMany: jest.fn(), findFirst: jest.fn() },
      circle: { findMany: jest.fn() },
      course: { findUnique: jest.fn(), findFirst: jest.fn() },
      product: { findUnique: jest.fn(), findFirst: jest.fn() },
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

    it("page 为非法字符串时 skip 不为 NaN", async () => {
      prisma.content.findMany.mockResolvedValue([]);
      prisma.content.count.mockResolvedValue(0);
      await svc.getContents({ page: "abc" as any, pageSize: 10 });
      const findManyArg = prisma.content.findMany.mock.calls[0][0];
      expect(Number.isNaN(findManyArg.skip)).toBe(false);
    });
  });

  describe("getContentDetail", () => {
    it("返回内容详情", async () => {
      prisma.content.findFirst.mockResolvedValue({
        id: "c1", title: "诗经赏析", type: "POETRY", author: "佚名",
        dynasty: "先秦", body: "<p>关关雎鸠</p>", tags: ["诗经"],
      });
      const result = await svc.getContentDetail("c1");
      expect(result).toHaveProperty("title", "诗经赏析");
    });

    it("内容不存在返回 null", async () => {
      prisma.content.findFirst.mockResolvedValue(null);
      const result = await svc.getContentDetail("notexist");
      expect(result).toBeNull();
    });
  });

  describe("getShareConfig", () => {
    it.each([
      ["ARTICLE", "article", "/pkg-circle/articles/detail"],
      ["COURSE", "course", "/pkg-course/detail/index"],
      ["PRODUCT", "product", "/pkg-mall/product/detail"],
    ] as const)("%s 保留真实标题、封面和同内容落点", async (targetType, model, route) => {
      prisma[model].findFirst.mockResolvedValue({ title: "真实标题", cover: "/cover.jpg", images: ["/product.jpg"] });
      const result = await svc.getShareConfig({ targetType, targetId: "item-id" });
      expect(result).toEqual({ targetType, targetId: "item-id", title: "真实标题", imageUrl: "/cover.jpg", path: `${route}?id=item-id` });
    });

    it.each(["CONTENT", "OTHER", "__proto__", "constructor"])("未实现的 %s 不编造首页或借用另一类型的详情", async targetType => {
      await expect(svc.getShareConfig({ targetType, targetId: "item-id" })).rejects.toMatchObject({ status: 400 });
      expect(prisma.content.findUnique).not.toHaveBeenCalled();
    });

    it.each(["ARTICLE", "COURSE", "PRODUCT"])("%s 不存在或已被可见性过滤时返回404，不泄露标题", async targetType => {
      const model = targetType.toLowerCase() as "article" | "course" | "product";
      prisma[model].findFirst.mockResolvedValue(null);
      await expect(svc.getShareConfig({ targetType, targetId: "hidden-id" })).rejects.toMatchObject({ status: 404 });
    });

    it("文章仅查询未删除、已审核、平台公开、已到发布时间且圈子有效的内容", async () => {
      prisma.article.findFirst.mockResolvedValue({ title: "公开文章" });
      await svc.getShareConfig({ targetType: "ARTICLE", targetId: "id" });
      expect(prisma.article.findFirst).toHaveBeenCalledWith({
        where: {
          id: "id", deletedAt: null, auditStatus: "APPROVED", visibility: "PLATFORM",
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: expect.any(Date) } }],
          circle: { status: "ACTIVE", deletedAt: null },
        }, select: { title: true, cover: true },
      });
    });

    it("课程保留上下架时窗和所属圈子门禁；只取公开元信息，不取付费章节", async () => {
      prisma.course.findFirst.mockResolvedValue({ title: "公开课程" });
      await svc.getShareConfig({ targetType: "COURSE", targetId: "id" });
      const query = prisma.course.findFirst.mock.calls[0][0];
      expect(query.where).toMatchObject({ deletedAt: null, auditStatus: "APPROVED", visibility: "PLATFORM" });
      expect(query.where.AND).toEqual([
        { OR: [{ scheduledOnAt: null }, { scheduledOnAt: { lte: expect.any(Date) } }] },
        { OR: [{ scheduledOffAt: null }, { scheduledOffAt: { gt: expect.any(Date) } }] },
        { OR: [{ circleId: null }, { circle: { status: "ACTIVE", deletedAt: null } }] },
      ]);
      expect(query.select).toEqual({ title: true, cover: true });
    });

    it("商品必须在售，封面使用真实首图，分站配置不得改写到外部或首页", async () => {
      prisma.product.findFirst.mockResolvedValue({ title: "真实商品", images: ["/product.jpg"] });
      prisma.station.findUnique.mockResolvedValue({ miniPages: { share: "https://evil.invalid", home: "/pages/index/index" } });
      const result = await svc.getShareConfig({ targetType: "PRODUCT", targetId: "p1", stationId: "station" });
      expect(result.imageUrl).toBe("/product.jpg");
      expect(result.path).toBe("/pkg-mall/product/detail?id=p1");
      expect(prisma.product.findFirst.mock.calls[0][0].where).toMatchObject({ status: "ON_SALE", deletedAt: null });
      expect(prisma.station.findUnique).not.toHaveBeenCalled();
    });

    it("数据库故障向上传递失败，不伪造可分享内容", async () => {
      prisma.article.findFirst.mockRejectedValue(new Error("database-unavailable"));
      await expect(svc.getShareConfig({ targetType: "ARTICLE", targetId: "id" })).rejects.toThrow("database-unavailable");
    });
    it("空标识失败，查询参数不能把落点变成另一个URL", async () => {
      await expect(svc.getShareConfig({ targetType: "ARTICLE", targetId: " " })).rejects.toMatchObject({ status: 400 });
      prisma.article.findFirst.mockResolvedValue({ title: "真实文章" });
      const result = await svc.getShareConfig({ targetType: "ARTICLE", targetId: "id&redirect=x" });
      expect(result.path).toBe("/pkg-circle/articles/detail?id=id%26redirect%3Dx");
    });
  });

  it("旧详情缓存即使含已下架正文，也不能绕过实时公开查询", async () => {
    redis.getJson.mockResolvedValue({ id: "draft", status: "PUBLISHED", body: "已下架的旧正文" });
    prisma.content.findFirst.mockResolvedValue(null);
    expect(await svc.getContentDetail("draft")).toBeNull();
    expect(redis.getJson).not.toHaveBeenCalled();
    expect(redis.setJson).not.toHaveBeenCalled();
    expect(prisma.content.findFirst.mock.calls[0][0].where).toEqual({
      id: "draft", status: "PUBLISHED", deletedAt: null,
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: expect.any(Date) } }],
    });
  });
});
