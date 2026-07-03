import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { EbookService } from "./ebook.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  ebookCategory: { findMany: jest.fn(), create: jest.fn() },
  ebook: {
    findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
  ebookChapter: {
    findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), delete: jest.fn(),
  },
  ebookPurchase: {
    findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), upsert: jest.fn(), count: jest.fn(),
  },
  ebookProgress: {
    findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(),
  },
  ebookFavorite: {
    findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn(),
  },
  ebookBookmark: {
    findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn(),
  },
  ebookNote: {
    findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn(),
  },
  user: { findUnique: jest.fn() },
};

const mockAi = {
  translateText: jest.fn().mockResolvedValue("translated text"),
  extractKeywords: jest.fn().mockResolvedValue(["guoxue", "classic"]),
};

const mockJwt = { sign: jest.fn().mockReturnValue("mock-jwt-token") };

describe("EbookService", () => {
  let svc: EbookService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        EbookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    svc = mod.get(EbookService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // === Categories ===

  describe("listCategories", () => {
    beforeEach(() => {
      svc = new EbookService(mockPrisma as any, mockAi as any, mockJwt as any);
    });

    it("returns category list", async () => {
      mockPrisma.ebookCategory.findMany.mockResolvedValue([{ id: "c1", name: "jingbu", sortOrder: 1 }]);
      const result = await svc.listCategories();
      expect(result).toHaveLength(1);
    });

    it("empty list", async () => {
      mockPrisma.ebookCategory.findMany.mockResolvedValue([]);
      const result = await svc.listCategories();
      expect(result).toHaveLength(0);
    });
  });

  describe("createCategory", () => {
    it("creates category", async () => {
      mockPrisma.ebookCategory.create.mockResolvedValue({ id: "c1", name: "shibu", sortOrder: 2 });
      const result = await svc.createCategory({ name: "shibu", sortOrder: 2 });
      expect(result.name).toBe("shibu");
    });
  });

  // === Ebook CRUD ===

  describe("listBooks", () => {
    it("default pagination", async () => {
      mockPrisma.ebook.findMany.mockResolvedValue([]);
      mockPrisma.ebook.count.mockResolvedValue(0);
      const result = await svc.listBooks({});
      expect(result.total).toBe(0);
    });

    it("filter by category", async () => {
      mockPrisma.ebook.findMany.mockResolvedValue([]);
      mockPrisma.ebook.count.mockResolvedValue(0);
      await svc.listBooks({ categoryId: "c1" });
      expect(mockPrisma.ebook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED", categoryId: "c1" } }),
      );
    });

    it("keyword search with OR", async () => {
      mockPrisma.ebook.findMany.mockResolvedValue([]);
      mockPrisma.ebook.count.mockResolvedValue(0);
      await svc.listBooks({ keyword: "lunyu" });
      expect(mockPrisma.ebook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  describe("getBook", () => {
    it("returns ebook detail", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", title: "lunyu", category: {}, chapters: [] });
      mockPrisma.ebook.update.mockResolvedValue({});
      const result = await svc.getBook("b1");
      expect(result.title).toBe("lunyu");
    });

    it("shows purchased for logged-in buyer", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", title: "lunyu", category: {}, chapters: [] });
      mockPrisma.ebook.update.mockResolvedValue({});
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue({ id: "p1" });
      const result = await svc.getBook("b1", "u1");
      expect(result.purchased).toBe(true);
    });

    it("shows not purchased", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", title: "lunyu", category: {}, chapters: [] });
      mockPrisma.ebook.update.mockResolvedValue({});
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue(null);
      const result = await svc.getBook("b1", "u1");
      expect(result.purchased).toBe(false);
    });

    it("throws NotFoundException for missing ebook", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue(null);
      await expect(svc.getBook("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("createEbook", () => {
    it("creates ebook", async () => {
      mockPrisma.ebook.create.mockResolvedValue({ id: "b1", title: "new book" });
      const result = await svc.createEbook({ title: "new book" });
      expect(result.title).toBe("new book");
    });
  });

  describe("updateEbook", () => {
    it("updates ebook", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1" });
      mockPrisma.ebook.update.mockResolvedValue({ id: "b1", title: "updated" });
      const result = await svc.updateEbook("b1", { title: "updated" });
      expect(result.title).toBe("updated");
    });

    it("throws NotFoundException", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue(null);
      await expect(svc.updateEbook("invalid", {})).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteEbook", () => {
    it("deletes ebook", async () => {
      mockPrisma.ebook.delete.mockResolvedValue({});
      const result = await svc.deleteEbook("b1");
      expect(result).toBeDefined();
    });

    it("throws NotFoundException for missing", async () => {
      mockPrisma.ebook.delete.mockRejectedValue(new Error());
      await expect(svc.deleteEbook("invalid")).rejects.toThrow(BusinessException);
    });
  });

  // === Chapters ===

  describe("getChapter", () => {
    it("free trial chapter returned directly", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "trial", content: "free content", freeTrial: true,
        ebook: { id: "b1", title: "lunyu", price: 99, memberFree: false },
      });
      const result = await svc.getChapter("ch1");
      expect(result.content).toBe("free content");
    });

    it("throws for unpaid chapter without login", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "paid", content: "secret", freeTrial: false,
        ebook: { id: "b1", title: "lunyu", price: 99, memberFree: false },
      });
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      await expect(svc.getChapter("ch1")).rejects.toThrow(BusinessException);
    });

    it("purchased user can access", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "paid", content: "secret", freeTrial: false,
        ebook: { id: "b1", title: "lunyu", price: 99, memberFree: false },
      });
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue({ id: "p1" });
      const result = await svc.getChapter("ch1", "u1");
      expect(result.content).toBe("secret");
    });

    it("chapter not found", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue(null);
      await expect(svc.getChapter("invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("createChapter", () => {
    it("creates chapter and increments count", async () => {
      mockPrisma.ebookChapter.create.mockResolvedValue({ id: "ch1", title: "new chapter" });
      mockPrisma.ebook.update.mockResolvedValue({});
      const result = await svc.createChapter("b1", { title: "new chapter" });
      expect(result.id).toBe("ch1");
      expect(mockPrisma.ebook.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { totalChapters: { increment: 1 } } }),
      );
    });
  });

  describe("updateChapter", () => {
    it("updates chapter", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue({ id: "ch1", ebookId: "b1" });
      mockPrisma.ebookChapter.update.mockResolvedValue({ id: "ch1", title: "updated chapter" });
      const result = await svc.updateChapter("ch1", { title: "updated chapter" });
      expect(result.title).toBe("updated chapter");
    });
  });

  describe("deleteChapter", () => {
    it("deletes chapter and decrements count", async () => {
      mockPrisma.ebookChapter.findUnique.mockResolvedValue({ id: "ch1", ebookId: "b1" });
      mockPrisma.ebook.update.mockResolvedValue({});
      mockPrisma.ebookChapter.delete.mockResolvedValue({});
      const result = await svc.deleteChapter("ch1");
      expect(result).toBeDefined();
    });
  });

  // === Purchase ===

  describe("purchase", () => {
    it("successful purchase", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue(null);
      mockPrisma.ebookPurchase.create.mockResolvedValue({ id: "p1", amount: 99 });
      mockPrisma.ebook.update.mockResolvedValue({});
      const result = await svc.purchase("u1", "b1");
      expect(result.id).toBe("p1");
    });

    it("free ebook redeemed", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 0, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.upsert.mockResolvedValue({ id: "p1", amount: 0 });
      const result = await svc.purchase("u1", "b1");
      expect(result.id).toBe("p1");
    });

    it("active member redeems any paid ebook at 0 yuan (书院会员全场畅读)", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1", memberLevel: "YEARLY", memberExpire: new Date(Date.now() + 86400000),
      });
      mockPrisma.ebookPurchase.upsert.mockResolvedValue({ id: "p1", amount: 0 });
      const result = await svc.purchase("u1", "b1");
      expect(result.id).toBe("p1");
      // 会员路径走 0 元 upsert 领取，不走付费 create
      expect(mockPrisma.ebookPurchase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: "u1", ebookId: "b1", amount: 0 } }),
      );
      expect(mockPrisma.ebookPurchase.create).not.toHaveBeenCalled();
    });

    it("already purchased throws", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue({ id: "p1" });
      await expect(svc.purchase("u1", "b1")).rejects.toThrow(BusinessException);
    });

    it("ebook not found throws", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue(null);
      await expect(svc.purchase("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  describe("checkAccess", () => {
    it("no user returns false", async () => {
      const result = await svc.checkAccess("b1");
      expect(result).toBe(false);
    });

    it("free ebook returns true", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 0, memberFree: false });
      const result = await svc.checkAccess("b1", "u1");
      expect(result).toBe(true);
    });

    it("active member can read any paid ebook (全场畅读，不再看 memberFree)", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1", memberLevel: "YEARLY", memberExpire: new Date(Date.now() + 86400000),
      });
      const result = await svc.checkAccess("b1", "u1");
      expect(result).toBe(true);
      // 会员路径无需查购买记录
      expect(mockPrisma.ebookPurchase.findUnique).not.toHaveBeenCalled();
    });

    it("memberFree book does NOT grant access to non-member without purchase (修复非会员免费放行漏洞)", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: true });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue(null);
      const result = await svc.checkAccess("b1", "u1");
      expect(result).toBe(false);
    });

    it("purchased returns true", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue({ id: "p1" });
      const result = await svc.checkAccess("b1", "u1");
      expect(result).toBe(true);
    });

    it("not purchased returns false", async () => {
      mockPrisma.ebook.findUnique.mockResolvedValue({ id: "b1", price: 99, memberFree: false });
      mockPrisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null }); // 非会员
      mockPrisma.ebookPurchase.findUnique.mockResolvedValue(null);
      const result = await svc.checkAccess("b1", "u1");
      expect(result).toBe(false);
    });
  });

  describe("getMyPurchases", () => {
    it("returns purchase list", async () => {
      mockPrisma.ebookPurchase.findMany.mockResolvedValue([
        { id: "p1", ebook: { id: "b1", title: "lunyu", cover: null, author: "kongzi" } },
      ]);
      mockPrisma.ebookPurchase.count.mockResolvedValue(1);
      const result = await svc.getMyPurchases("u1");
      expect(result.purchases).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // === Reading Progress ===

  describe("getProgress", () => {
    it("gets progress", async () => {
      mockPrisma.ebookProgress.findUnique.mockResolvedValue({ progress: 60, chapterId: "ch3" });
      const result = await svc.getProgress("u1", "b1");
      expect(result).not.toBeNull();
      expect(result!.progress).toBe(60);
    });

    it("null when no progress", async () => {
      mockPrisma.ebookProgress.findUnique.mockResolvedValue(null);
      const result = await svc.getProgress("u1", "b1");
      expect(result).toBeNull();
    });
  });

  describe("updateProgress", () => {
    it("updates progress", async () => {
      mockPrisma.ebookProgress.upsert.mockResolvedValue({ progress: 50, completed: false });
      const result = await svc.updateProgress("u1", "b1", { progress: 50 });
      expect(result.progress).toBe(50);
    });

    it("marks complete at 100", async () => {
      mockPrisma.ebookProgress.upsert.mockResolvedValue({ progress: 100, completed: true });
      const result = await svc.updateProgress("u1", "b1", { progress: 100 });
      expect(result.completed).toBe(true);
    });
  });

  // === Bookmarks ===

  describe("listBookmarks", () => {
    it("returns all bookmarks", async () => {
      mockPrisma.ebookBookmark.findMany.mockResolvedValue([{ id: "bm1", page: 10 }]);
      mockPrisma.ebookBookmark.count.mockResolvedValue(1);
      const result = await svc.listBookmarks("u1");
      expect(result.bookmarks).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by ebook", async () => {
      mockPrisma.ebookBookmark.findMany.mockResolvedValue([]);
      mockPrisma.ebookBookmark.count.mockResolvedValue(0);
      await svc.listBookmarks("u1", { ebookId: "b1" });
      expect(mockPrisma.ebookBookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", ebookId: "b1" } }),
      );
    });
  });

  describe("createBookmark", () => {
    it("creates bookmark", async () => {
      mockPrisma.ebookBookmark.create.mockResolvedValue({ id: "bm1", page: 25 });
      const result = await svc.createBookmark("u1", "b1", { page: 25, note: "important" });
      expect(result.page).toBe(25);
    });
  });

  describe("deleteBookmark", () => {
    it("deletes bookmark", async () => {
      mockPrisma.ebookBookmark.deleteMany.mockResolvedValue({ count: 1 });
      const result = await svc.deleteBookmark("u1", "bm1");
      expect(result).toBeDefined();
      expect(mockPrisma.ebookBookmark.deleteMany).toHaveBeenCalledWith({ where: { id: "bm1", userId: "u1" } });
    });

    it("throws NotFoundException", async () => {
      mockPrisma.ebookBookmark.deleteMany.mockResolvedValue({ count: 0 });
      await expect(svc.deleteBookmark("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  // === Notes ===

  describe("listNotes", () => {
    it("returns all notes", async () => {
      mockPrisma.ebookNote.findMany.mockResolvedValue([{ id: "n1", content: "good" }]);
      mockPrisma.ebookNote.count.mockResolvedValue(1);
      const result = await svc.listNotes("u1");
      expect(result.notes).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("createNote", () => {
    it("creates note", async () => {
      mockPrisma.ebookNote.create.mockResolvedValue({ id: "n1", content: "note" });
      const result = await svc.createNote("u1", "b1", { content: "note" });
      expect(result.content).toBe("note");
    });
  });

  describe("updateNote", () => {
    it("updates note", async () => {
      mockPrisma.ebookNote.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.ebookNote.findUnique.mockResolvedValue({ id: "n1", content: "updated" });
      const result = await svc.updateNote("u1", "n1", { content: "updated" });
      expect(result?.content).toBe("updated");
      expect(mockPrisma.ebookNote.updateMany).toHaveBeenCalledWith({ where: { id: "n1", userId: "u1" }, data: { content: "updated" } });
    });

    it("throws NotFoundException when not owner", async () => {
      mockPrisma.ebookNote.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.updateNote("u1", "invalid", { content: "x" })).rejects.toThrow(BusinessException);
    });
  });

  describe("deleteNote", () => {
    it("deletes note", async () => {
      mockPrisma.ebookNote.deleteMany.mockResolvedValue({ count: 1 });
      const result = await svc.deleteNote("u1", "n1");
      expect(result).toBeDefined();
      expect(mockPrisma.ebookNote.deleteMany).toHaveBeenCalledWith({ where: { id: "n1", userId: "u1" } });
    });

    it("throws NotFoundException", async () => {
      mockPrisma.ebookNote.deleteMany.mockResolvedValue({ count: 0 });
      await expect(svc.deleteNote("u1", "invalid")).rejects.toThrow(BusinessException);
    });
  });

  // === AI ===

  describe("translateText", () => {
    it("translates default zh to en", async () => {
      mockAi.translateText.mockResolvedValue("The Analects");
      const result = await svc.translateText({ text: "lunyu" });
      expect(result.translated).toBe("The Analects");
      expect(mockAi.translateText).toHaveBeenCalledWith("lunyu", "zh", "en");
    });

    it("specifies target language", async () => {
      mockAi.translateText.mockResolvedValue("rongo");
      const result = await svc.translateText({ text: "lunyu", sourceLang: "zh", targetLang: "ja" });
      expect(result.targetLang).toBe("ja");
    });
  });

  describe("lookupWord", () => {
    it("returns translation and keywords", async () => {
      mockAi.translateText.mockResolvedValue("benevolence");
      mockAi.extractKeywords.mockResolvedValue(["renai", "daode"]);
      const result = await svc.lookupWord({ text: "ren", context: "ren zhe ai ren" });
      expect(result.english).toBe("benevolence");
      expect(result.relatedKeywords).toEqual(["renai", "daode"]);
    });
  });
});
