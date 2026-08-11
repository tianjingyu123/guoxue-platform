import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ClassicService } from "./classic.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

const mockRedis = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn(), del: jest.fn().mockResolvedValue(1), delByPattern: jest.fn() };

const mockPrisma = {
  classicBook: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn(), groupBy: jest.fn() },
  classicChapter: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  readingProgress: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  bookmark: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
  classicReadingNote: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  classicAnnotation: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
};

const mockJwt = { sign: jest.fn().mockReturnValue("mock-token") };

const mockGateway = { chat: jest.fn() };

describe("ClassicService", () => {
  let svc: ClassicService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ClassicService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(ClassicService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("listBooks", () => {
    it("返回分页书籍列表", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([{ id: "b1", title: "论语" }]);
      mockPrisma.classicBook.count.mockResolvedValue(1);
      const result = await svc.listBooks({});
      expect(result.books).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
    it("按分类过滤", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      mockPrisma.classicBook.count.mockResolvedValue(0);
      const result = await svc.listBooks({ category: "道家" });
      expect(result.total).toBe(0);
    });
  });

  describe("getBook", () => {
    it("返回书籍详情并增加浏览量", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", chapters: [], copyrights: [] });
      mockPrisma.classicBook.update.mockResolvedValue({});
      const result = await svc.getBook("b1");
      expect(result!.title).toBe("论语");
      expect(mockPrisma.classicBook.update).toHaveBeenCalledWith(
        { where: { id: "b1" }, data: { viewCount: { increment: 1 } } },
      );
    });
    it("书籍不存在抛出异常", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue(null);
      await expect(svc.getBook("invalid")).rejects.toThrow("书籍不存在");
    });
  });

  describe("createBook", () => {
    it("创建书籍成功", async () => {
      mockPrisma.classicBook.create.mockResolvedValue({ id: "b1", title: "道德经" });
      const result = await svc.createBook({ title: "道德经", author: "老子" });
      expect(result.id).toBe("b1");
    });
  });

  describe("updateBook", () => {
    it("更新书籍成功", async () => {
      mockPrisma.classicBook.findUnique.mockResolvedValue({ id: "b1", title: "论语" });
      mockPrisma.classicBook.update.mockResolvedValue({ id: "b1", title: "新标题" });
      const result = await svc.updateBook("b1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
  });

  describe("deleteBook", () => {
    it("删除书籍成功", async () => {
      mockPrisma.classicBook.findUnique.mockResolvedValue({ id: "b1", title: "论语" });
      mockPrisma.classicBook.delete.mockResolvedValue({ id: "b1" });
      const result = await svc.deleteBook("b1");
      expect(result.id).toBe("b1");
    });
  });

  describe("getChapter", () => {
    it("返回章节详情（含所属书籍信息）", async () => {
      mockPrisma.classicChapter.findFirst.mockResolvedValue({ id: "ch-1", title: "学而篇", book: { id: "b1", title: "论语", copyrights: [] } });
      const result = await svc.getChapter("ch-1");
      expect(result!.book.title).toBe("论语");
    });
    it("章节不存在抛出异常", async () => {
      mockPrisma.classicChapter.findFirst.mockResolvedValue(null);
      await expect(svc.getChapter("invalid")).rejects.toThrow("章节不存在");
    });
  });

  describe("createChapter", () => {
    it("创建章节成功并增加书籍章节数", async () => {
      mockPrisma.classicChapter.create.mockResolvedValue({ id: "ch-1", title: "第一章" });
      mockPrisma.classicBook.update.mockResolvedValue({});
      const result = await svc.createChapter("b1", { title: "第一章", content: "内容..." });
      expect(result.id).toBe("ch-1");
      expect(mockPrisma.classicBook.update).toHaveBeenCalledWith(
        { where: { id: "b1" }, data: { chapterCount: { increment: 1 } } },
      );
    });
  });

  describe("updateChapter", () => {
    it("更新章节成功", async () => {
      mockPrisma.classicChapter.findUnique.mockResolvedValue({ id: "ch-1", title: "学而篇" });
      mockPrisma.classicChapter.update.mockResolvedValue({ id: "ch-1", title: "新标题" });
      const result = await svc.updateChapter("ch-1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
  });

  describe("deleteChapter", () => {
    it("删除章节成功并减少书籍章节数", async () => {
      mockPrisma.classicChapter.findUnique.mockResolvedValue({ id: "ch-1", bookId: "b1" });
      mockPrisma.classicChapter.delete.mockResolvedValue({ id: "ch-1" });
      mockPrisma.classicBook.update.mockResolvedValue({});
      await svc.deleteChapter("ch-1");
      expect(mockPrisma.classicBook.update).toHaveBeenCalledWith(
        { where: { id: "b1" }, data: { chapterCount: { increment: -1 } } },
      );
    });
    it("章节不存在抛出异常", async () => {
      mockPrisma.classicChapter.findUnique.mockResolvedValue(null);
      await expect(svc.deleteChapter("ch-1")).rejects.toThrow("章节不存在");
    });
  });

  describe("getProgress", () => {
    it("返回阅读进度", async () => {
      mockPrisma.readingProgress.findUnique.mockResolvedValue({ userId: "u1", bookId: "b1", chapterId: "ch-1", progress: 50 });
      const result = await svc.getProgress("u1", "b1");
      expect(result!.progress).toBe(50);
    });
    it("无进度时返回 null", async () => {
      mockPrisma.readingProgress.findUnique.mockResolvedValue(null);
      const result = await svc.getProgress("u1", "b1");
      expect(result).toBeNull();
    });
  });

  describe("updateProgress", () => {
    it("更新或创建阅读进度（upsert）", async () => {
      mockPrisma.readingProgress.upsert.mockResolvedValue({ userId: "u1", bookId: "b1", chapterId: "ch-1", progress: 50 });
      const result = await svc.updateProgress("u1", "b1", { chapterId: "ch-1", progress: 50 });
      expect(result.progress).toBe(50);
    });
  });

  describe("listBookmarks", () => {
    it("返回用户书签列表（分页）", async () => {
      mockPrisma.bookmark.findMany.mockResolvedValue([{ id: "bm-1", position: 100, book: { title: "论语" }, chapter: { title: "学而篇" } }]);
      mockPrisma.bookmark.count.mockResolvedValue(1);
      const result = await svc.listBookmarks("user-1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
    it("按书籍过滤书签", async () => {
      mockPrisma.bookmark.findMany.mockResolvedValue([]);
      mockPrisma.bookmark.count.mockResolvedValue(0);
      const result = await svc.listBookmarks("user-1", "b1");
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("createBookmark", () => {
    it("创建书签成功", async () => {
      mockPrisma.bookmark.create.mockResolvedValue({ id: "bm-1", userId: "u1", bookId: "b1", chapterId: "ch-1", position: 100 });
      const result = await svc.createBookmark("u1", "b1", { chapterId: "ch-1", position: 100 });
      expect(result.id).toBe("bm-1");
    });
    it("创建带笔记的书签", async () => {
      mockPrisma.bookmark.create.mockResolvedValue({ id: "bm-2", note: "重要" });
      const result = await svc.createBookmark("u1", "b1", { chapterId: "ch-1", position: 50, note: "重要" });
      expect(result.id).toBe("bm-2");
    });
  });

  describe("deleteBookmark", () => {
    it("删除书签成功", async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue({ id: "bm-1", userId: "u1" });
      mockPrisma.bookmark.delete.mockResolvedValue({ id: "bm-1" });
      const result = await svc.deleteBookmark("bm-1", "u1");
      expect(result.id).toBe("bm-1");
    });
    it("书签不存在抛出异常", async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);
      await expect(svc.deleteBookmark("bm-1")).rejects.toThrow("书签不存在");
    });
  });

  describe("createNote", () => {
    it("保存原句与段落锚点", async () => {
      mockPrisma.classicReadingNote.create.mockResolvedValue({
        id: "n-1",
        userId: "u1",
        bookId: "b1",
        chapterId: "ch-1",
        content: "这里值得反复读。",
        position: 3,
        originalText: "学而时习之，不亦说乎？",
      });
      await svc.createNote("u1", "b1", {
        chapterId: "ch-1",
        content: "这里值得反复读。",
        position: 3,
        originalText: "学而时习之，不亦说乎？",
      });
      expect(mockPrisma.classicReadingNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          position: 3,
          originalText: "学而时习之，不亦说乎？",
        }),
      });
    });
  });

  describe("dictionaryLookup", () => {
    it("返回AI字典查询结果", async () => {
      mockGateway.chat.mockResolvedValue({
        content: '{"word":"仁","pinyin":"rén","radicals":"亻","meanings":["仁爱","仁德"],"classicalUsages":["论语·学而——孝弟也者，其为仁之本与"],"commonPhrases":["仁义","仁政"],"explanation":"儒家核心概念"}',
      });
      const result = await svc.dictionaryLookup("仁");
      expect(result.word).toBe("仁");
      expect(result.pinyin).toBe("rén");
    });
    it("AI返回非法JSON时降级", async () => {
      mockGateway.chat.mockResolvedValue({ content: "这是关于仁的解释..." });
      const result = await svc.dictionaryLookup("仁");
      expect(result.word).toBe("仁");
      expect(result.explanation).toBeTruthy();
    });
  });

  describe("translateClassical", () => {
    it("返回白话翻译结果", async () => {
      mockGateway.chat.mockResolvedValue({
        content: '{"original":"学而时习之","translation":"学习并且经常温习","notes":["习：温习、练习"],"source":"论语·学而篇"}',
      });
      const result = await svc.translateClassical({ text: "学而时习之" });
      expect(result.translation).toBeTruthy();
      expect(result.notes).toHaveLength(1);
    });
    it("带上下文翻译", async () => {
      mockGateway.chat.mockResolvedValue({
        content: '{"original":"道可道","translation":"道如果可以言说","notes":[],"source":"道德经"}',
      });
      const result = await svc.translateClassical({ text: "道可道", context: "道德经·第一章" });
      expect(result.source).toBe("道德经");
    });
  });

  describe("getContinueReading", () => {
    it("返回最近阅读记录", async () => {
      mockPrisma.readingProgress.findMany.mockResolvedValue([
        { userId: "u1", bookId: "b1", progress: 50,
          book: { id: "b1", title: "论语", author: "孔子", cover: null, category: "经" },
          chapter: { id: "ch-1", title: "学而篇", sortOrder: 1 },
          updatedAt: new Date() },
      ]);
      const result = await svc.getContinueReading("u1", 10);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].book.title).toBe("论语");
    });
  });

  describe("getReadingStats", () => {
    it("返回阅读统计数据", async () => {
      mockPrisma.readingProgress.count.mockResolvedValueOnce(5).mockResolvedValueOnce(12);
      mockPrisma.readingProgress.findMany.mockResolvedValue([
        { updatedAt: new Date(), bookId: "b1" },
        { updatedAt: new Date(), bookId: "b2" },
      ]);
      mockPrisma.classicBook.groupBy.mockResolvedValue([
        { category: "经", _count: { id: 2 } },
        { category: "子", _count: { id: 1 } },
      ]);
      const result = await svc.getReadingStats("u1");
      expect(result.totalBooksRead).toBe(5);
      expect(result.totalChaptersRead).toBe(12);
      expect(result.mostReadCategories).toBeDefined();
      expect(result.recentActivity).toBeDefined();
    });
  });

  // ── 注疏标记 ──
  describe("listAnnotations", () => {
    it("返回书籍注疏列表（分页）", async () => {
      mockPrisma.classicAnnotation.findMany.mockResolvedValue([
        { id: "a1", bookId: "b1", type: "注疏", startPos: 0, endPos: 5, content: "注疏内容", author: "朱熹", dynasty: "宋" },
      ]);
      mockPrisma.classicAnnotation.count.mockResolvedValue(1);
      const result = await svc.listAnnotations("b1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("按章节过滤注疏", async () => {
      mockPrisma.classicAnnotation.findMany.mockResolvedValue([]);
      mockPrisma.classicAnnotation.count.mockResolvedValue(0);
      const result = await svc.listAnnotations("b1", "ch1");
      expect(result.items).toEqual([]);
    });
  });

  describe("createAnnotation", () => {
    it("创建注疏标记", async () => {
      mockPrisma.classicAnnotation.create.mockResolvedValue({
        id: "a1", bookId: "b1", type: "注疏", startPos: 0, endPos: 10, content: "古注原文",
      });
      const result = await svc.createAnnotation("b1", {
        startPos: 0, endPos: 10, content: "古注原文", author: "郑玄",
      });
      expect(result.id).toBe("a1");
    });
  });

  describe("deleteAnnotation", () => {
    it("删除注疏标记", async () => {
      mockPrisma.classicAnnotation.findUnique.mockResolvedValue({ id: "a1" });
      mockPrisma.classicAnnotation.delete.mockResolvedValue({ id: "a1" });
      const result = await svc.deleteAnnotation("a1");
      expect(result.id).toBe("a1");
    });
    it("注疏不存在抛出异常", async () => {
      mockPrisma.classicAnnotation.findUnique.mockResolvedValue(null);
      await expect(svc.deleteAnnotation("a1")).rejects.toThrow("注疏不存在");
    });
  });

  // ── 版本管理 ──
  describe("getBookVersions", () => {
    it("返回同书其他版本", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue({
        title: "论语", author: "孔子", dynasty: "春秋",
      });
      mockPrisma.classicBook.findMany.mockResolvedValue([
        { id: "b2", title: "论语集注", author: "朱熹", dynasty: "宋", category: "经", cover: null, source: "宋刻本" },
      ]);
      const result = await svc.getBookVersions("b1");
      expect(result.current.title).toBe("论语");
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].title).toBe("论语集注");
    });
  });

  // ── 引用生成 ──
  describe("generateCitation", () => {
    it("生成 GB/T 7714 格式引用", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子", dynasty: "春秋", source: "宋刻本",
      });
      const result = await svc.generateCitation("b1", "gbt7714");
      expect(result.book.title).toBe("论语");
      expect(result.citations.gbt7714).toContain("论语");
      expect(result.citations.gbt7714).toContain("孔子");
    });

    it("生成所有格式引用", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子", dynasty: "春秋", source: "宋刻本",
      });
      const result = await svc.generateCitation("b1", "all");
      expect(Object.keys(result.citations)).toHaveLength(4);
      expect(result.citations.chicago).toBeTruthy();
      expect(result.citations.mla).toBeTruthy();
      expect(result.citations.apa).toBeTruthy();
    });

    it("含章节摘录的引用", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子", dynasty: "春秋", source: "宋刻本",
      });
      mockPrisma.classicChapter.findUnique
        .mockResolvedValueOnce({ title: "学而篇", sortOrder: 1 })  // 第一次调用：章节信息
        .mockResolvedValueOnce({ content: "子曰：学而时习之，不亦说乎" }); // 第二次调用：摘录
      const result = await svc.generateCitation("b1", "gbt7714", "ch1", 0, 5);
      expect(result.chapter!.title).toBe("学而篇");
      expect(result.citations.gbt7714).toContain("学而篇");
    });

    it("书籍不存在抛出异常", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue(null);
      await expect(svc.generateCitation("invalid")).rejects.toThrow("书籍不存在");
    });
  });

  describe("分页入参加固（P2-4）", () => {
    it("listBooks 非法 page 不产生 NaN skip", async () => {
      mockPrisma.classicBook.findMany.mockResolvedValue([]);
      mockPrisma.classicBook.count.mockResolvedValue(0);
      await svc.listBooks({ page: "abc" as any });
      const arg = mockPrisma.classicBook.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });
});
