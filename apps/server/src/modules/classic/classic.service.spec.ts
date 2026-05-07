import { Test } from "@nestjs/testing";
import { ClassicService } from "./classic.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  classicBook: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn() },
  classicChapter: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  readingProgress: { findUnique: jest.fn(), upsert: jest.fn() },
  bookmark: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
};

describe("ClassicService", () => {
  let svc: ClassicService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [ClassicService, { provide: PrismaService, useValue: mockPrisma }],
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
      mockPrisma.classicBook.findUnique.mockResolvedValue({ id: "b1", title: "论语", chapters: [] });
      mockPrisma.classicBook.update.mockResolvedValue({});
      const result = await svc.getBook("b1");
      expect(result!.title).toBe("论语");
      expect(mockPrisma.classicBook.update).toHaveBeenCalledWith(
        { where: { id: "b1" }, data: { viewCount: { increment: 1 } } },
      );
    });
    it("书籍不存在返回 null", async () => {
      mockPrisma.classicBook.findUnique.mockResolvedValue(null);
      const result = await svc.getBook("invalid");
      expect(result).toBeNull();
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
      mockPrisma.classicBook.update.mockResolvedValue({ id: "b1", title: "新标题" });
      const result = await svc.updateBook("b1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });
  });

  describe("deleteBook", () => {
    it("删除书籍成功", async () => {
      mockPrisma.classicBook.delete.mockResolvedValue({ id: "b1" });
      const result = await svc.deleteBook("b1");
      expect(result.id).toBe("b1");
    });
  });

  describe("getChapter", () => {
    it("返回章节详情（含所属书籍信息）", async () => {
      mockPrisma.classicChapter.findUnique.mockResolvedValue({ id: "ch-1", title: "学而篇", book: { id: "b1", title: "论语" } });
      const result = await svc.getChapter("ch-1");
      expect(result!.book.title).toBe("论语");
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
    it("章节不存在时删除仍调用 delete", async () => {
      mockPrisma.classicChapter.findUnique.mockResolvedValue(null);
      mockPrisma.classicChapter.delete.mockResolvedValue({ id: "ch-1" });
      const result = await svc.deleteChapter("ch-1");
      expect(result.id).toBe("ch-1");
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
    it("返回用户书签列表", async () => {
      mockPrisma.bookmark.findMany.mockResolvedValue([{ id: "bm-1", position: 100, book: { title: "论语" }, chapter: { title: "学而篇" } }]);
      const result = await svc.listBookmarks("user-1");
      expect(result).toHaveLength(1);
    });
    it("按书籍过滤书签", async () => {
      mockPrisma.bookmark.findMany.mockResolvedValue([]);
      const result = await svc.listBookmarks("user-1", "b1");
      expect(result).toEqual([]);
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
      mockPrisma.bookmark.delete.mockResolvedValue({ id: "bm-1" });
      const result = await svc.deleteBookmark("bm-1");
      expect(result.id).toBe("bm-1");
    });
  });
});
