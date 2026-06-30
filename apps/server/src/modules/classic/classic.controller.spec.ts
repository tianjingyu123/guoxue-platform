import { Test } from "@nestjs/testing";
import { ClassicController } from "./classic.controller";
import { ClassicService } from "./classic.service";
import { ClassicLibrarySeeder } from "./classic-library-seeder.service";
import { ClassicDaizhigeSeeder } from "./classic-daizhige-seeder.service";
import { ClassicCompanionService } from "./classic-companion.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockClassicSvc = {
  listBooks: jest.fn().mockResolvedValue({ books: [{ id: "b1", title: "论语" }], total: 1, page: 1, pageSize: 20 }),
  getBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语", author: "孔子" }),
  getChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "学而篇", content: "..." }),
  createBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语" }),
  updateBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语集注" }),
  deleteBook: jest.fn().mockResolvedValue({ success: true }),
  listChaptersByBook: jest.fn().mockResolvedValue([{ id: "ch1", title: "第一章" }]),
  createChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "新章节" }),
  updateChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "更新章节" }),
  deleteChapter: jest.fn().mockResolvedValue({ success: true }),
  getProgress: jest.fn().mockResolvedValue({ bookId: "b1", progress: 0.5 }),
  updateProgress: jest.fn().mockResolvedValue({ bookId: "b1", progress: 0.8 }),
  listBookmarks: jest.fn().mockResolvedValue({ items: [{ id: "bm1", chapterId: "ch1" }], total: 1, page: 1, pageSize: 20 }),
  createBookmark: jest.fn().mockResolvedValue({ id: "bm1" }),
  deleteBookmark: jest.fn().mockResolvedValue({ success: true }),
  generateDownloadUrl: jest.fn().mockResolvedValue({ url: "https://cdn.example.com/book1.epub" }),
  getDownloads: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  dictionaryLookup: jest.fn().mockResolvedValue({ word: "仁", pinyin: "rén", explanation: "仁爱" }),
  translateClassical: jest.fn().mockResolvedValue({ original: "学而时习之", translation: "学习并经常温习", notes: [], source: "" }),
  getContinueReading: jest.fn().mockResolvedValue({ items: [{ book: { title: "论语" }, progress: 50 }], total: 1 }),
  getReadingStats: jest.fn().mockResolvedValue({ totalBooksRead: 5, totalChaptersRead: 12, totalReadingTime: 36, readingStreak: 3, mostReadCategories: [], recentActivity: [] }),
  listAnnotations: jest.fn().mockResolvedValue({ items: [{ id: "a1", type: "注疏", content: "..." }], total: 1, page: 1, pageSize: 20 }),
  createAnnotation: jest.fn().mockResolvedValue({ id: "a1", type: "注疏", content: "古注原文" }),
  deleteAnnotation: jest.fn().mockResolvedValue({ success: true }),
  getBookVersions: jest.fn().mockResolvedValue({ current: { title: "论语" }, versions: [{ id: "b2", title: "论语集注" }] }),
  generateCitation: jest.fn().mockResolvedValue({
    book: { id: "b1", title: "论语", author: "孔子", dynasty: "春秋" },
    chapter: null, excerpt: "",
    citations: { gbt7714: "孔子（春秋），《论语》，国学传统文化平台，2026." },
  }),
};

const mockSeeder = { seed: jest.fn().mockResolvedValue({ created: 5, skipped: 0 }),
  syncToKnowledge: jest.fn().mockResolvedValue(3),
  vectorizeUnindexed: jest.fn().mockResolvedValue(10) };

const mockDaizhigeSeeder = {
  getSeedStats: jest.fn().mockResolvedValue({ totalBooks: 100, totalChapters: 500 }),
  importFromJson: jest.fn().mockResolvedValue({ imported: 10, errors: [] }),
};

const mockCompanion = {
  getGuidingPrompts: jest.fn().mockResolvedValue({ bookTitle: "论语", chapterTitle: "学而", prompts: [] }),
  chat: jest.fn().mockResolvedValue({ answer: "...", disclaimer: "..." }),
};

describe("ClassicController", () => {
  let ctrl: ClassicController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ClassicController],
      providers: [
        { provide: ClassicService, useValue: mockClassicSvc },
        { provide: ClassicLibrarySeeder, useValue: mockSeeder },
        { provide: ClassicDaizhigeSeeder, useValue: mockDaizhigeSeeder },
        { provide: ClassicCompanionService, useValue: mockCompanion },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ClassicController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /classic/books — 书籍列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listBooks(q);
    expect(result.books).toHaveLength(1);
    expect(mockClassicSvc.listBooks).toHaveBeenCalledWith(q);
  });

  it("GET /classic/books/:id — 书籍详情", async () => {
    const result: any = await ctrl.getBook("b1");
    expect(result.title).toBe("论语");
    expect(mockClassicSvc.getBook).toHaveBeenCalledWith("b1");
  });

  it("GET /classic/chapters/:id — 章节内容", async () => {
    const result: any = await ctrl.getChapter("ch1");
    expect(result.title).toBe("学而篇");
    expect(mockClassicSvc.getChapter).toHaveBeenCalledWith("ch1");
  });

  it("POST /classic/books — 创建书籍", async () => {
    const dto: any = { title: "论语", author: "孔子" };
    const result: any = await ctrl.createBook(dto);
    expect(result.id).toBe("b1");
    expect(mockClassicSvc.createBook).toHaveBeenCalledWith(dto);
  });

  it("PUT /classic/books/:id — 更新书籍", async () => {
    const dto: any = { title: "论语集注" };
    const result: any = await ctrl.updateBook("b1", dto);
    expect(result.title).toBe("论语集注");
    expect(mockClassicSvc.updateBook).toHaveBeenCalledWith("b1", dto);
  });

  it("DELETE /classic/books/:id — 删除书籍", async () => {
    const result: any = await ctrl.deleteBook("b1");
    expect(result.success).toBe(true);
    expect(mockClassicSvc.deleteBook).toHaveBeenCalledWith("b1");
  });

  it("POST /classic/books/:bookId/chapters — 创建章节", async () => {
    const dto: any = { title: "新章节", content: "..." };
    const result: any = await ctrl.createChapter("b1", dto);
    expect(result.id).toBe("ch1");
    expect(mockClassicSvc.createChapter).toHaveBeenCalledWith("b1", dto);
  });

  it("PUT /classic/chapters/:id — 更新章节", async () => {
    const dto: any = { title: "更新章节" };
    const result: any = await ctrl.updateChapter("ch1", dto);
    expect(result.title).toBe("更新章节");
    expect(mockClassicSvc.updateChapter).toHaveBeenCalledWith("ch1", dto);
  });

  it("DELETE /classic/chapters/:id — 删除章节", async () => {
    const result: any = await ctrl.deleteChapter("ch1");
    expect(result.success).toBe(true);
    expect(mockClassicSvc.deleteChapter).toHaveBeenCalledWith("ch1");
  });

  it("GET /classic/progress/:bookId — 阅读进度", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getProgress(req, "b1");
    expect(result.progress).toBe(0.5);
    expect(mockClassicSvc.getProgress).toHaveBeenCalledWith("u1", "b1");
  });

  it("PUT /classic/progress/:bookId — 更新进度", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch2", progress: 0.8 };
    const result: any = await ctrl.updateProgress(req, "b1", dto);
    expect(result.progress).toBe(0.8);
    expect(mockClassicSvc.updateProgress).toHaveBeenCalledWith("u1", "b1", dto);
  });

  it("GET /classic/bookmarks — 书签列表（分页）", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listBookmarks(req, "b1", 1, 20);
    expect(result.items).toHaveLength(1);
    expect(mockClassicSvc.listBookmarks).toHaveBeenCalledWith("u1", "b1", 1, 20);
  });

  it("POST /classic/bookmarks/:bookId — 创建书签", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch1", position: 42 };
    const result: any = await ctrl.createBookmark(req, "b1", dto);
    expect(result.id).toBe("bm1");
    expect(mockClassicSvc.createBookmark).toHaveBeenCalledWith("u1", "b1", dto);
  });

  it("DELETE /classic/bookmarks/:id — 删除书签", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteBookmark("bm1", req);
    expect(result.success).toBe(true);
    expect(mockClassicSvc.deleteBookmark).toHaveBeenCalledWith("bm1", "u1");
  });

  it("POST /classic/dictionary/lookup — 字典查询", async () => {
    const dto = { word: "仁" };
    const result = await ctrl.dictionaryLookup(dto);
    expect(result.word).toBe("仁");
    expect(mockClassicSvc.dictionaryLookup).toHaveBeenCalledWith("仁");
  });

  it("POST /classic/translate — 白话翻译", async () => {
    const dto = { text: "学而时习之" };
    const result = await ctrl.translate(dto);
    expect(result.translation).toBeTruthy();
    expect(mockClassicSvc.translateClassical).toHaveBeenCalledWith(dto);
  });

  it("GET /classic/continue-reading — 继续阅读", async () => {
    const req: any = { user: { id: "u1" } };
    const q: any = { limit: 10 };
    const result = await ctrl.getContinueReading(req, q);
    expect(result.items).toHaveLength(1);
    expect(mockClassicSvc.getContinueReading).toHaveBeenCalledWith("u1", 10);
  });

  it("GET /classic/reading-stats — 阅读统计", async () => {
    const req: any = { user: { id: "u1" } };
    const result = await ctrl.getReadingStats(req);
    expect(result.totalBooksRead).toBe(5);
    expect(mockClassicSvc.getReadingStats).toHaveBeenCalledWith("u1");
  });

  it("GET /classic/books/:id/annotations — 注疏列表", async () => {
    const result: any = await ctrl.listAnnotations("b1", undefined, 1, 20);
    expect(result.items).toHaveLength(1);
    expect(mockClassicSvc.listAnnotations).toHaveBeenCalledWith("b1", undefined, 1, 20);
  });

  it("POST /classic/annotations — 创建注疏标记", async () => {
    const dto: any = { bookId: "b1", startPos: 0, endPos: 10, content: "古注原文" };
    const result: any = await ctrl.createAnnotation(dto);
    expect(result.id).toBe("a1");
    expect(mockClassicSvc.createAnnotation).toHaveBeenCalledWith("b1", dto);
  });

  it("DELETE /classic/annotations/:id — 删除注疏标记", async () => {
    const result: any = await ctrl.deleteAnnotation("a1");
    expect(result.success).toBe(true);
    expect(mockClassicSvc.deleteAnnotation).toHaveBeenCalledWith("a1");
  });

  it("GET /classic/books/:id/versions — 同书版本", async () => {
    const result: any = await ctrl.getBookVersions("b1");
    expect(result.versions).toHaveLength(1);
    expect(mockClassicSvc.getBookVersions).toHaveBeenCalledWith("b1");
  });

  it("GET /classic/books/:id/cite — 引用生成", async () => {
    const result: any = await ctrl.getCitation("b1", "gbt7714", undefined, undefined, undefined);
    expect(result.citations.gbt7714).toContain("论语");
    expect(mockClassicSvc.generateCitation).toHaveBeenCalledWith("b1", "gbt7714", undefined, undefined, undefined);
  });
});
