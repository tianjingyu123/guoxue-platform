import { Test } from "@nestjs/testing";
import { EbookController } from "./ebook.controller";
import { EbookService } from "./ebook.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockEbookSvc = {
  listCategories: jest.fn().mockResolvedValue([{ id: "cat1", name: "经部" }]),
  createCategory: jest.fn().mockResolvedValue({ id: "cat1", name: "经部" }),
  listBooks: jest.fn().mockResolvedValue([{ id: "b1", title: "论语" }]),
  getBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语" }),
  getChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "学而篇" }),
  createEbook: jest.fn().mockResolvedValue({ id: "b1", title: "论语" }),
  updateEbook: jest.fn().mockResolvedValue({ id: "b1", title: "论语集注" }),
  deleteEbook: jest.fn().mockResolvedValue({ success: true }),
  createChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "新章节" }),
  updateChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "更新" }),
  deleteChapter: jest.fn().mockResolvedValue({ success: true }),
  purchase: jest.fn().mockResolvedValue({ orderId: "o1" }),
  getMyPurchases: jest.fn().mockResolvedValue([{ id: "b1" }]),
  getProgress: jest.fn().mockResolvedValue({ progress: 0.5 }),
  updateProgress: jest.fn().mockResolvedValue({ progress: 0.8 }),
  listBookmarks: jest.fn().mockResolvedValue([{ id: "bm1" }]),
  createBookmark: jest.fn().mockResolvedValue({ id: "bm1" }),
  deleteBookmark: jest.fn().mockResolvedValue({ success: true }),
  listNotes: jest.fn().mockResolvedValue([{ id: "n1", text: "笔记" }]),
  createNote: jest.fn().mockResolvedValue({ id: "n1" }),
  updateNote: jest.fn().mockResolvedValue({ id: "n1", text: "更新笔记" }),
  deleteNote: jest.fn().mockResolvedValue({ success: true }),
  translateText: jest.fn().mockResolvedValue({ original: "学而时习之", translated: "..." }),
  lookupWord: jest.fn().mockResolvedValue({ word: "习", meaning: "温习" }),
};

describe("EbookController", () => {
  let ctrl: EbookController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [EbookController],
      providers: [{ provide: EbookService, useValue: mockEbookSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(EbookController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /ebook/categories — 分类列表", async () => {
    const result: any = await ctrl.listCategories();
    expect(result).toHaveLength(1);
    expect(mockEbookSvc.listCategories).toHaveBeenCalled();
  });

  it("POST /ebook/categories — 创建分类", async () => {
    const dto: any = { name: "经部" };
    const result: any = await ctrl.createCategory(dto);
    expect(result.name).toBe("经部");
    expect(mockEbookSvc.createCategory).toHaveBeenCalledWith(dto);
  });

  it("GET /ebook/books — 电子书列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listBooks(q);
    expect(result).toHaveLength(1);
    expect(mockEbookSvc.listBooks).toHaveBeenCalledWith(q);
  });

  it("GET /ebook/books/:id — 电子书详情", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getBook("b1", req);
    expect(result.title).toBe("论语");
    expect(mockEbookSvc.getBook).toHaveBeenCalledWith("b1", "u1");
  });

  it("GET /ebook/chapters/:id — 章节内容", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getChapter("ch1", req);
    expect(result.title).toBe("学而篇");
    expect(mockEbookSvc.getChapter).toHaveBeenCalledWith("ch1", "u1");
  });

  it("POST /ebook/books — 创建电子书", async () => {
    const dto: any = { title: "论语" };
    const result: any = await ctrl.createEbook(dto);
    expect(result.id).toBe("b1");
    expect(mockEbookSvc.createEbook).toHaveBeenCalledWith(dto);
  });

  it("PUT /ebook/books/:id — 更新电子书", async () => {
    const dto: any = { title: "论语集注" };
    const result: any = await ctrl.updateEbook("b1", dto);
    expect(result.title).toBe("论语集注");
    expect(mockEbookSvc.updateEbook).toHaveBeenCalledWith("b1", dto);
  });

  it("DELETE /ebook/books/:id — 删除电子书", async () => {
    const result: any = await ctrl.deleteEbook("b1");
    expect(result.success).toBe(true);
    expect(mockEbookSvc.deleteEbook).toHaveBeenCalledWith("b1");
  });

  it("POST /ebook/books/:ebookId/chapters — 创建章节", async () => {
    const dto: any = { title: "新章节" };
    const result: any = await ctrl.createChapter("b1", dto);
    expect(result.id).toBe("ch1");
    expect(mockEbookSvc.createChapter).toHaveBeenCalledWith("b1", dto);
  });

  it("PUT /ebook/chapters/:id — 更新章节", async () => {
    const dto: any = { title: "更新" };
    const result: any = await ctrl.updateChapter("ch1", dto);
    expect(result.title).toBe("更新");
  });

  it("DELETE /ebook/chapters/:id — 删除章节", async () => {
    const result: any = await ctrl.deleteChapter("ch1");
    expect(result.success).toBe(true);
  });

  it("POST /ebook/purchase/:ebookId — 购买电子书", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = {};
    const result: any = await ctrl.purchase(req, "b1", dto);
    expect(result.orderId).toBe("o1");
    expect(mockEbookSvc.purchase).toHaveBeenCalledWith("u1", "b1");
  });

  it("GET /ebook/purchases — 我的购买", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getMyPurchases(req, 1, 20);
    expect(result).toHaveLength(1);
    expect(mockEbookSvc.getMyPurchases).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("GET /ebook/progress/:ebookId — 阅读进度", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getProgress(req, "b1");
    expect(result.progress).toBe(0.5);
  });

  it("PUT /ebook/progress/:ebookId — 更新进度", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch2", progress: 0.8 };
    const result: any = await ctrl.updateProgress(req, "b1", dto);
    expect(result.progress).toBe(0.8);
  });

  it("GET /ebook/bookmarks — 书签列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listBookmarks(req, "b1", 1, 20);
    expect(result).toHaveLength(1);
    expect(mockEbookSvc.listBookmarks).toHaveBeenCalledWith("u1", { ebookId: "b1", page: 1, pageSize: 20 });
  });

  it("POST /ebook/bookmarks/:ebookId — 创建书签", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch1", position: 42 };
    const result: any = await ctrl.createBookmark(req, "b1", dto);
    expect(result.id).toBe("bm1");
  });

  it("DELETE /ebook/bookmarks/:id — 删除书签", async () => {
    const result: any = await ctrl.deleteBookmark("bm1");
    expect(result.success).toBe(true);
  });

  it("GET /ebook/notes — 笔记列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listNotes(req, "b1", 1, 20);
    expect(result).toHaveLength(1);
    expect(mockEbookSvc.listNotes).toHaveBeenCalledWith("u1", { ebookId: "b1", page: 1, pageSize: 20 });
  });

  it("POST /ebook/notes/:ebookId — 创建笔记", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch1", text: "笔记" };
    const result: any = await ctrl.createNote(req, "b1", dto);
    expect(result.id).toBe("n1");
  });

  it("PUT /ebook/notes/:id — 更新笔记", async () => {
    const dto: any = { text: "更新笔记" };
    const result: any = await ctrl.updateNote("n1", dto);
    expect(result.text).toBe("更新笔记");
  });

  it("DELETE /ebook/notes/:id — 删除笔记", async () => {
    const result: any = await ctrl.deleteNote("n1");
    expect(result.success).toBe(true);
  });

  it("POST /ebook/translate — AI翻译", async () => {
    const dto: any = { text: "学而时习之", targetLang: "zh-CN" };
    const result: any = await ctrl.translateText(dto);
    expect(result.translated).toBe("...");
    expect(mockEbookSvc.translateText).toHaveBeenCalledWith(dto);
  });

  it("POST /ebook/lookup — 古文查词", async () => {
    const dto: any = { word: "习", context: "学而时习之" };
    const result: any = await ctrl.lookupWord(dto);
    expect(result.meaning).toBe("温习");
    expect(mockEbookSvc.lookupWord).toHaveBeenCalledWith(dto);
  });
});
