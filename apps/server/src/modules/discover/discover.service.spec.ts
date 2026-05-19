import { Test } from "@nestjs/testing";
import { DiscoverService } from "./discover.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  content: { findMany: jest.fn(), count: jest.fn() },
  course: { findMany: jest.fn(), count: jest.fn() },
  product: { findMany: jest.fn(), count: jest.fn() },
  classicBook: { findMany: jest.fn(), count: jest.fn() },
  botConfig: { findMany: jest.fn(), count: jest.fn() },
  configSystem: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

const contentRows = [
  { id: "c-1", title: "论语精讲", cover: "covers/1.jpg", excerpt: "儒家经典导读", tags: ["儒家"], categoryLevel1: "国学经典", categoryLevel2: "儒家经典", viewCount: 1000, likeCount: 500 },
  { id: "c-2", title: "道德经新解", cover: "covers/2.jpg", excerpt: "道家思想入门", tags: ["道家"], categoryLevel1: "国学经典", categoryLevel2: "道家典籍", viewCount: 800, likeCount: 300 },
];

const courseRows = [
  { id: "co-1", title: "围棋入门", cover: "covers/co1.jpg", intro: "从零开始学围棋", tags: ["围棋"], categoryLevel1: "棋艺", categoryLevel2: "围棋", price: 9900, studentCount: 200 },
];

const productRows = [
  { id: "p-1", title: "宣纸套装", images: ["imgs/p1.jpg"], intro: "优质宣纸", tags: ["文房"], categoryLevel1: "传统艺术", categoryLevel2: "书法", price: 12800, salesCount: 50 },
];

const classicRows = [
  { id: "cl-1", title: "道德经", cover: "books/1.jpg", intro: "老子著", author: "老子", category: "道家典籍", viewCount: 5000 },
];

const botRows = [
  { id: "b-1", name: "孔子AI", avatar: "bots/1.png", intro: "与孔子对话", type: "国学问答", sortOrder: 1, isFree: true, price: null },
  { id: "b-2", name: "茶道助手", avatar: "bots/2.png", intro: "茶道文化咨询", type: "生活美学", sortOrder: 2, isFree: false, price: 500 },
];

describe("DiscoverService", () => {
  let svc: DiscoverService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DiscoverService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(DiscoverService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // ═══════════ getDiscover (聚合模式) ═══════════
  describe("getDiscover (aggregate mode)", () => {
    it("返回5个区块", async () => {
      mockPrisma.content.findMany.mockResolvedValue(contentRows.slice(0, 2));
      mockPrisma.content.count.mockResolvedValue(10);
      mockPrisma.course.findMany.mockResolvedValue(courseRows);
      mockPrisma.course.count.mockResolvedValue(5);
      mockPrisma.product.findMany.mockResolvedValue(productRows);
      mockPrisma.product.count.mockResolvedValue(8);
      mockPrisma.classicBook.findMany.mockResolvedValue(classicRows);
      mockPrisma.classicBook.count.mockResolvedValue(15);
      mockPrisma.botConfig.findMany.mockResolvedValue(botRows);
      mockPrisma.botConfig.count.mockResolvedValue(3);

      const result = await svc.getDiscover({ page: 1, pageSize: 20 }) as any;
      expect(result.sections).toHaveLength(5);
      expect(result.sections.map((s: any) => s.type)).toEqual(["content", "course", "product", "classic", "bot"]);
      expect(result.sections[0].total).toBe(10);
    });

    it("分页正确", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      mockPrisma.classicBook.count.mockResolvedValue(0);
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      mockPrisma.botConfig.count.mockResolvedValue(0);

      await svc.getDiscover({ page: 3, pageSize: 20 });
      const skip = 40, take = 4;
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip, take }));
    });

    it("品类筛选传递到 content/course/product", async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      mockPrisma.classicBook.count.mockResolvedValue(0);
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      mockPrisma.botConfig.count.mockResolvedValue(0);

      await svc.getDiscover({ page: 1, pageSize: 10, categoryLevel1: "国学经典" });
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryLevel1: "国学经典" }) }),
      );
    });

    it("content item映射正确", async () => {
      mockPrisma.content.findMany.mockResolvedValue([contentRows[0]]);
      mockPrisma.content.count.mockResolvedValue(1);
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      mockPrisma.classicBook.count.mockResolvedValue(0);
      mockPrisma.botConfig.findMany.mockResolvedValue([]);
      mockPrisma.botConfig.count.mockResolvedValue(0);

      const result = await svc.getDiscover({ page: 1, pageSize: 10 }) as any;
      const item = result.sections[0].items[0];
      expect(item).toMatchObject({ id: "c-1", title: "论语精讲", type: "content", stats: { viewCount: 1000, likeCount: 500 } });
    });
  });

  // ═══════════ getDiscover (类型模式) ═══════════
  describe("getDiscover (typed mode)", () => {
    it("type=content 只返回content", async () => {
      mockPrisma.content.findMany.mockResolvedValue(contentRows);
      mockPrisma.content.count.mockResolvedValue(2);
      const result = await svc.getDiscover({ page: 1, pageSize: 10, type: "content" }) as any;
      expect(result.type).toBe("content");
      expect(result.items).toHaveLength(2);
      expect(mockPrisma.course.findMany).not.toHaveBeenCalled();
    });

    it("type=unknown返回空", async () => {
      const result = await svc.getDiscover({ page: 1, pageSize: 10, type: "unknown" });
      expect(result).toEqual({ page: 1, pageSize: 10, type: "unknown", items: [], total: 0 });
    });
  });

  // ═══════════ getCategoryTree ═══════════
  describe("getCategoryTree", () => {
    it("从configSystem解析", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "category_tree",
        configValue: JSON.stringify({ "自定义": ["子类A"] }),
      });
      expect(await svc.getCategoryTree()).toEqual({ "自定义": ["子类A"] });
    });

    it("config为null时用默认树", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      const tree = await svc.getCategoryTree();
      expect(tree).toHaveProperty("国学经典");
      expect(tree).toHaveProperty("中医养生");
    });

    it("解析失败时用默认树", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "category_tree", configValue: "bad json" });
      const tree = await svc.getCategoryTree();
      expect(tree).toHaveProperty("国学经典");
    });
  });

  // ═══════════ getHotContent ═══════════
  describe("getHotContent", () => {
    it("热池ID排序保持", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configKey: "hot_content_pool",
        configValue: JSON.stringify({ contentIds: ["c-3", "c-1", "c-2"] }),
      });
      const allRows = [...contentRows, { ...contentRows[0], id: "c-3" }];
      mockPrisma.content.findMany.mockImplementation(({ where }: any) =>
        allRows.filter(r => where.id.in.includes(r.id)));
      const result = await svc.getHotContent(1, 2);
      expect(result.items[0].id).toBe("c-3");
      expect(result.items[1].id).toBe("c-1");
    });

    it("热池空时回退实时查询", async () => {
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configKey: "hot_content_pool", configValue: JSON.stringify({ contentIds: [] }) });
      mockPrisma.content.findMany.mockResolvedValue(contentRows);
      mockPrisma.content.count.mockResolvedValue(2);
      const result = await svc.getHotContent(1, 10);
      expect(result.items).toHaveLength(2);
      expect(mockPrisma.content.count).toHaveBeenCalled();
    });
  });

  // ═══════════ getRecommendations ═══════════
  describe("getRecommendations", () => {
    const hotItems = [
      { id: "pop-1", title: "热门", cover: null, excerpt: "热", tags: [], categoryLevel1: "国学经典", categoryLevel2: null, viewCount: 9999, likeCount: 999 },
    ];

    it("无userId返回通用热门", async () => {
      mockPrisma.content.findMany.mockResolvedValue(hotItems);
      mockPrisma.content.count.mockResolvedValue(1);
      const result = await svc.getRecommendations(undefined, 1, 10);
      expect(result.personalized).toBe(false);
      expect(result.interests).toEqual([]);
    });

    it("有userId且有兴趣时按兴趣筛选", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ interestCategories: ["国学经典", "诗词歌赋"] });
      mockPrisma.content.findMany.mockResolvedValue(contentRows);
      mockPrisma.content.count.mockResolvedValue(2);

      const result = await svc.getRecommendations("user-1", 1, 10);
      expect(result.personalized).toBe(true);
      expect(result.interests).toEqual(["国学经典", "诗词歌赋"]);
      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED", categoryLevel1: { in: ["国学经典", "诗词歌赋"] } } }),
      );
    });

    it("兴趣结果不足时用热门补齐", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ interestCategories: ["国学经典"] });
      const interestItem = [{ id: "int-1", title: "兴趣", cover: null, excerpt: "int", tags: [], categoryLevel1: "国学经典", categoryLevel2: null, viewCount: 100, likeCount: 50 }];
      const fallbackItem = [{ id: "fb-1", title: "补齐", cover: null, excerpt: "fb", tags: [], categoryLevel1: "传统艺术", categoryLevel2: null, viewCount: 500, likeCount: 200 }];
      mockPrisma.content.findMany.mockResolvedValueOnce(interestItem).mockResolvedValueOnce(fallbackItem);
      mockPrisma.content.count.mockResolvedValue(1);

      const result = await svc.getRecommendations("user-1", 1, 3);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("int-1");
      expect(result.items[1].id).toBe("fb-1");
    });
  });
});
