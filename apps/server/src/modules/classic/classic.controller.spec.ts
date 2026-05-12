import { Test } from "@nestjs/testing";
import { ClassicController } from "./classic.controller";
import { ClassicService } from "./classic.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockClassicSvc = {
  listBooks: jest.fn().mockResolvedValue([{ id: "b1", title: "论语" }]),
  getBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语", author: "孔子" }),
  getChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "学而篇", content: "..." }),
  createBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语" }),
  updateBook: jest.fn().mockResolvedValue({ id: "b1", title: "论语集注" }),
  deleteBook: jest.fn().mockResolvedValue({ success: true }),
  createChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "新章节" }),
  updateChapter: jest.fn().mockResolvedValue({ id: "ch1", title: "更新章节" }),
  deleteChapter: jest.fn().mockResolvedValue({ success: true }),
  getProgress: jest.fn().mockResolvedValue({ bookId: "b1", progress: 0.5 }),
  updateProgress: jest.fn().mockResolvedValue({ bookId: "b1", progress: 0.8 }),
  listBookmarks: jest.fn().mockResolvedValue([{ id: "bm1", chapterId: "ch1" }]),
  createBookmark: jest.fn().mockResolvedValue({ id: "bm1" }),
  deleteBookmark: jest.fn().mockResolvedValue({ success: true }),
};

describe("ClassicController", () => {
  let ctrl: ClassicController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ClassicController],
      providers: [{ provide: ClassicService, useValue: mockClassicSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ClassicController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /classic/books — 书籍列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listBooks(q);
    expect(result).toHaveLength(1);
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

  it("GET /classic/bookmarks — 书签列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listBookmarks(req, "b1");
    expect(result).toHaveLength(1);
    expect(mockClassicSvc.listBookmarks).toHaveBeenCalledWith("u1", "b1");
  });

  it("POST /classic/bookmarks/:bookId — 创建书签", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { chapterId: "ch1", position: 42 };
    const result: any = await ctrl.createBookmark(req, "b1", dto);
    expect(result.id).toBe("bm1");
    expect(mockClassicSvc.createBookmark).toHaveBeenCalledWith("u1", "b1", dto);
  });

  it("DELETE /classic/bookmarks/:id — 删除书签", async () => {
    const result: any = await ctrl.deleteBookmark("bm1");
    expect(result.success).toBe(true);
    expect(mockClassicSvc.deleteBookmark).toHaveBeenCalledWith("bm1");
  });
});
