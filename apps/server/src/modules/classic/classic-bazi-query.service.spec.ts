import { Test } from "@nestjs/testing";
import { BaziClassicQueryService } from "./classic-bazi-query.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  classicBook: { findMany: jest.fn() },
  classicChapter: { findMany: jest.fn(), count: jest.fn() },
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn(),
};

describe("BaziClassicQueryService", () => {
  let svc: BaziClassicQueryService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BaziClassicQueryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(BaziClassicQueryService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe("queryByTags", () => {
    it("通过标签查询命理古籍章节", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "滴天髓", author: "刘基", dynasty: "明" },
        { id: "b2", title: "三命通会", author: "万民英", dynasty: "明" },
      ]);
      mockPrisma.classicChapter.findMany.mockResolvedValue([
        {
          id: "ch1", bookId: "b1", title: "通神论",
          content: "欲识三元万法宗...", translation: null,
          tags: ["日主", "用神"], sortOrder: 1,
        },
      ]);

      const result = await svc.queryByTags({
        tags: ["日主", "用神"],
        dayMaster: "甲",
      });

      expect(result).toHaveLength(1);
      expect(result[0].bookTitle).toBe("滴天髓");
      expect(result[0].chapters[0].matchScore).toBeGreaterThanOrEqual(0);
    });

    it("日主自动展开五行标签", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "穷通宝鉴", author: null, dynasty: null },
      ]);
      mockPrisma.classicChapter.findMany.mockResolvedValue([
        { id: "ch1", bookId: "b1", title: "甲木", content: "...", translation: null, tags: ["甲木"], sortOrder: 1 },
      ]);

      await svc.queryByTags({ tags: [], dayMaster: "丙" });
      // 日主"丙"应展开为"丙火"标签
      const callArgs = mockPrisma.classicChapter.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
    });

    it("命中缓存时直接返回", async () => {
      const cached = [{ bookId: "b1", bookTitle: "缓存书", author: null, dynasty: null, chapters: [] }];
      mockRedis.getJson.mockResolvedValueOnce(cached);
      const result = await svc.queryByTags({ tags: ["日主"] });
      expect(result).toEqual(cached);
      expect(mockPrisma.classicBook.findMany).not.toHaveBeenCalled();
    });

    it("关键词搜索增加匹配分数", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "渊海子平", author: null, dynasty: null },
      ]);
      mockPrisma.classicChapter.findMany.mockResolvedValue([
        { id: "ch1", bookId: "b1", title: "论五行", content: "五行相生相克...", translation: null, tags: ["五行"], sortOrder: 1 },
      ]);

      const result = await svc.queryByTags({
        tags: ["五行"],
        keyword: "相生",
      });
      expect(result[0].chapters[0].matchScore).toBeGreaterThan(0);
    });

    it("没有命理书籍时返回空数组", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      const result = await svc.queryByTags({ tags: ["日主"] });
      expect(result).toHaveLength(0);
    });
  });

  describe("searchBaziClassics", () => {
    it("全文搜索命理古籍", async () => {
      mockPrisma.classicChapter.findMany.mockResolvedValue([
        {
          id: "ch1", title: "正官格", content: "正官者...",
          translation: "正官格...", tags: ["格局"],
          book: { id: "b1", title: "子平真诠", author: "沈孝瞻", dynasty: "清" },
        },
      ]);
      mockPrisma.classicChapter.count.mockResolvedValue(5);

      const result = await svc.searchBaziClassics("正官");
      expect(result.chapters).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });

  describe("listBaziBooks", () => {
    it("列出所有命理古籍", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "滴天髓", author: "刘基", dynasty: "明", intro: null, cover: null, chapterCount: 4, source: "殆知阁" },
      ]);
      const result = await svc.listBaziBooks();
      expect(result).toHaveLength(1);
      expect(mockPrisma.classicBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: "命", status: "PUBLISHED" } }),
      );
    });
  });

  describe("listAvailableTags", () => {
    it("返回去重排序的标签列表", async () => {
      mockPrisma.classicChapter.findMany.mockResolvedValue([
        { tags: ["日主", "用神"] },
        { tags: ["用神", "格局"] },
      ]);
      const result = await svc.listAvailableTags();
      expect(result).toEqual(["日主", "格局", "用神"]);
    });

    it("缓存命中时直接返回", async () => {
      mockRedis.getJson.mockResolvedValueOnce(["日主", "用神"]);
      const result = await svc.listAvailableTags();
      expect(result).toEqual(["日主", "用神"]);
      expect(mockPrisma.classicChapter.findMany).not.toHaveBeenCalled();
    });
  });
});
