import { Test } from "@nestjs/testing";
import { SearchService } from "./search.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  $queryRaw: jest.fn().mockResolvedValue([]),
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  searchHistory: {
    groupBy: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  configSystem: { findUnique: jest.fn() },
};

describe("SearchService", () => {
  let svc: SearchService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(SearchService);
  });

  beforeEach(() => { jest.clearAllMocks(); mockPrisma.$queryRaw.mockResolvedValue([]); mockPrisma.$queryRawUnsafe.mockResolvedValue([]); });

  describe("search", () => {
    it("无 type 时搜索所有类型", async () => {
      const result = await svc.search({ q: "论语" });
      expect(result).toHaveProperty("articles");
      expect(result).toHaveProperty("courses");
      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("circles");
      expect(result).toHaveProperty("videos");
      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("classics");
      expect(result).toHaveProperty("contents");
    });

    it("指定 type 只搜索对应类型（全文搜索排名）", async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: "a1", title: "论语", rank: 0.8 }]);
      const result = await svc.search({ q: "论语", type: "article" });
      expect(result.articles).toHaveLength(1);
      expect(result.courses).toBeUndefined();
    });

    it("空查询返回空结果", async () => {
      const result = await svc.search({ q: "" });
      expect(result).toEqual({ q: "", type: undefined });
    });

    it("支持分页参数", async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.search({ q: "国学", type: "article", page: 2, pageSize: 10 });
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe("getHotSearches", () => {
    it("有搜索历史时返回热门词", async () => {
      mockPrisma.searchHistory.groupBy.mockResolvedValue([
        { keyword: "论语", _count: { keyword: 10 } },
        { keyword: "易经", _count: { keyword: 5 } },
      ]);
      const result = await svc.getHotSearches();
      expect(result).toHaveLength(2);
      expect(result[0].keyword).toBe("论语");
    });

    it("搜索历史为空时从配置读取兜底", async () => {
      mockPrisma.searchHistory.groupBy.mockResolvedValue([]);
      mockPrisma.configSystem.findUnique.mockResolvedValue({
        configValue: JSON.stringify([{ keyword: "默认热词", count: 1 }]),
      });
      const result = await svc.getHotSearches();
      expect(result).toHaveLength(1);
    });

    it("搜索历史和兜底都为空时返回空数组", async () => {
      mockPrisma.searchHistory.groupBy.mockResolvedValue([]);
      mockPrisma.configSystem.findUnique.mockResolvedValue(null);
      const result = await svc.getHotSearches();
      expect(result).toEqual([]);
    });
  });

  describe("saveHistory", () => {
    it("保存搜索历史", async () => {
      mockPrisma.searchHistory.create.mockResolvedValue({});
      await svc.saveHistory("user-1", "论语");
      expect(mockPrisma.searchHistory.create).toHaveBeenCalled();
    });

    it("空关键字不保存", async () => {
      await svc.saveHistory("user-1", "  ");
      expect(mockPrisma.searchHistory.create).not.toHaveBeenCalled();
    });
  });

  describe("suggest", () => {
    it("返回搜索建议（全文搜索）", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: "a1", title: "论语注解" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const result = await svc.suggest("论语");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("article");
    });

    it("空关键字返回空数组", async () => {
      const result = await svc.suggest("");
      expect(result).toEqual([]);
    });
  });

  describe("clearHistory", () => {
    it("清除搜索历史", async () => {
      mockPrisma.searchHistory.deleteMany.mockResolvedValue({ count: 5 });
      const result = await svc.clearHistory("user-1");
      expect(result.success).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("返回用户搜索历史", async () => {
      mockPrisma.searchHistory.findMany.mockResolvedValue([
        { id: "h1", keyword: "论语", createdAt: new Date() },
      ]);
      const result = await svc.getHistory("user-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getStats", () => {
    it("返回搜索统计数据", async () => {
      mockPrisma.searchHistory.count.mockResolvedValueOnce(100).mockResolvedValueOnce(5);
      mockPrisma.searchHistory.groupBy.mockResolvedValue([]);
      mockPrisma.searchHistory.findMany.mockResolvedValue([]);
      const result = await svc.getStats();
      expect(result).toHaveProperty("totalSearches");
      expect(result).toHaveProperty("todaySearches");
      expect(result).toHaveProperty("hotKeywords");
      expect(result.totalSearches).toBe(100);
    });
  });
});
