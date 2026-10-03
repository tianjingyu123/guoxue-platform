import { Test } from "@nestjs/testing";
import { ClassicImageService } from "./classic-image.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockRedis = { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn(), delByPattern: jest.fn() };

const mockPrisma = {
  classicImage: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), delete: jest.fn(), count: jest.fn() },
  classicOcrText: { deleteMany: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  classicBook: { findFirst: jest.fn(), findUnique: jest.fn() },
  classicChapter: { findFirst: jest.fn(), findUnique: jest.fn() },
};

describe("ClassicImageService", () => {
  let svc: ClassicImageService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ClassicImageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(ClassicImageService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", author: "孔子" });
  });

  describe("listBookImages", () => {
    it("返回书籍所有页面图像（分页）", async () => {
      mockPrisma.classicImage.findMany.mockResolvedValue([
        { id: "img1", pageNumber: 1, label: "卷一·第一页", iiifUrl: "https://iiif.lib.harvard.edu/iiif/1", width: 2400, height: 3200, source: "harvard" },
      ]);
      mockPrisma.classicImage.count.mockResolvedValue(1);
      const result = await svc.listBookImages("b1");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].pageNumber).toBe(1);
      expect(result.total).toBe(1);
    });

    it("未通过公开许可门禁时不返回图像", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue(null);
      await expect(svc.listBookImages("blocked-book")).rejects.toThrow("书籍不存在");
      expect(mockPrisma.classicImage.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getPageImage", () => {
    it("返回单页图像含 OCR 坐标", async () => {
      mockPrisma.classicImage.findUnique.mockResolvedValue({
        id: "img1", pageNumber: 1, iiifUrl: "https://iiif.lib.harvard.edu/iiif/1",
        ocrTexts: [{ content: "子曰", x: 100, y: 50, w: 200, h: 30, lineNumber: 1, charIndex: 1 }],
      });
      const result = await svc.getPageImage("b1", 1);
      expect(result!.ocrTexts).toHaveLength(1);
    });

    it("页面不存在返回 null", async () => {
      mockPrisma.classicImage.findUnique.mockResolvedValue(null);
      const result = await svc.getPageImage("b1", 999);
      expect(result).toBeNull();
    });
  });

  describe("createImage", () => {
    it("创建/更新图像记录（upsert 幂等）", async () => {
      mockPrisma.classicImage.upsert.mockResolvedValue({ id: "img1", bookId: "b1", pageNumber: 1 });
      const result = await svc.createImage("b1", { pageNumber: 1, source: "harvard" });
      expect(result.id).toBe("img1");
    });
  });

  describe("createImagesBulk", () => {
    it("批量 upsert 图像记录", async () => {
      mockPrisma.classicImage.upsert.mockResolvedValue({});
      const result = await svc.createImagesBulk("b1", [
        { pageNumber: 1, iiifUrl: "http://example.com/1" },
        { pageNumber: 2, iiifUrl: "http://example.com/2" },
      ]);
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it("单条失败时继续处理", async () => {
      mockPrisma.classicImage.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("DB error"));
      const result = await svc.createImagesBulk("b1", [
        { pageNumber: 1, iiifUrl: "http://example.com/1" },
        { pageNumber: 2, iiifUrl: "http://example.com/2" },
      ]);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe("deleteImage", () => {
    it("删除图像记录", async () => {
      mockPrisma.classicImage.findUnique.mockResolvedValue({ id: "img1", bookId: "b1", pageNumber: 1 });
      mockPrisma.classicImage.delete.mockResolvedValue({ id: "img1" });
      const result = await svc.deleteImage("img1");
      expect(result.id).toBe("img1");
    });
    it("图像不存在抛出异常", async () => {
      mockPrisma.classicImage.findUnique.mockResolvedValue(null);
      await expect(svc.deleteImage("img99")).rejects.toThrow("图像记录不存在");
    });
  });

  describe("generateManifest", () => {
    it("生成 IIIF Presentation 3.0 Manifest", async () => {
      mockPrisma.classicImage.findMany.mockResolvedValue([
        { id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200 },
      ]);
      mockPrisma.classicBook.findFirst.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子",
      });
      const manifest = await svc.generateManifest("b1", "http://localhost:3000/api/v1");
      expect(manifest).not.toBeNull();
      expect(manifest!.label.none[0]).toBe("论语");
      expect(manifest!.items).toHaveLength(1);
      expect(manifest!.items[0].width).toBe(2400);
    });

    it("书籍不存在返回 null", async () => {
      mockPrisma.classicBook.findFirst.mockResolvedValue(null);
      const result = await svc.generateManifest("nonexistent", "http://localhost:3000");
      expect(result).toBeNull();
    });
  });

  describe("saveOcrTexts", () => {
    it("批量写入 OCR 坐标（先清旧数据）", async () => {
      mockPrisma.classicOcrText.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.classicOcrText.create.mockResolvedValue({});
      const result = await svc.saveOcrTexts("img1", [
        { content: "子曰", x: 100, y: 50, w: 200, h: 30, pageNumber: 1, lineNumber: 1, charIndex: 1, confidence: 0.95 },
      ]);
      expect(result.inserted).toBe(1);
      expect(mockPrisma.classicOcrText.deleteMany).toHaveBeenCalledWith({ where: { imageId: "img1" } });
    });
  });

  // ── 图文对照 ──
  describe("getChapterImageMapping", () => {
    it("有 OCR 数据时返回精确映射", async () => {
      mockPrisma.classicChapter.findFirst.mockResolvedValue({
        id: "ch1", bookId: "b1", title: "学而篇", content: "子曰学而时习之",
      });
      mockPrisma.classicImage.findMany.mockResolvedValue([
        {
          id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200,
          ocrTexts: [
            { content: "子", x: 100, y: 50, w: 80, h: 40, lineNumber: 1, charIndex: 1 },
            { content: "曰", x: 100, y: 110, w: 80, h: 40, lineNumber: 1, charIndex: 2 },
            { content: "学", x: 100, y: 170, w: 80, h: 40, lineNumber: 1, charIndex: 3 },
          ],
        },
      ]);
      const result = await svc.getChapterImageMapping("ch1");
      expect(result).not.toBeNull();
      expect(result!.mappingType).toBe("ocr");
      expect(result!.pages).toHaveLength(1);
      expect(result!.pages[0].lines).toHaveLength(1);
    });

    it("无 OCR 数据时返回启发式估算", async () => {
      mockPrisma.classicChapter.findFirst.mockResolvedValue({
        id: "ch1", bookId: "b1", title: "学而篇", content: "子曰学而时习之".repeat(50),
      });
      mockPrisma.classicImage.findMany.mockResolvedValue([
        { id: "img1", pageNumber: 1, label: "第1页", iiifUrl: null, width: 2400, height: 3200, ocrTexts: [] },
        { id: "img2", pageNumber: 2, label: "第2页", iiifUrl: null, width: 2400, height: 3200, ocrTexts: [] },
      ]);
      const result = await svc.getChapterImageMapping("ch1");
      expect(result).not.toBeNull();
      expect(result!.mappingType).toBe("estimated");
      expect(result!.pages.length).toBeGreaterThan(0);
      expect(result!.pages[0].lines.length).toBeGreaterThan(0);
    });

    it("章节不存在返回 null", async () => {
      mockPrisma.classicChapter.findFirst.mockResolvedValue(null);
      const result = await svc.getChapterImageMapping("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("generateManifestWithTextOverlay", () => {
    it("生成含 W3C 文字叠加层的 IIIF Manifest", async () => {
      mockPrisma.classicImage.findMany.mockResolvedValue([
        {
          id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200,
          ocrTexts: [
            { content: "子", x: 100, y: 50, w: 80, h: 40, lineNumber: 1, charIndex: 1 },
          ],
        },
      ]);
      mockPrisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", author: "孔子" });
      const manifest = await svc.generateManifestWithTextOverlay("b1", "http://localhost:3000/api/v1");
      expect(manifest).not.toBeNull();
      expect(manifest!["@context"]).toHaveLength(2);
      // Canvas 应包含 painting annotation 和 text annotation
      const canvas = manifest!.items[0];
      const annotationPage = canvas.items[0];
      expect(annotationPage.items.length).toBeGreaterThan(1);
      // 检查 text annotation 有 motivation: supplementing
      const textAnnos = annotationPage.items.filter((a: any) => a.motivation === "supplementing");
      expect(textAnnos.length).toBeGreaterThan(0);
      expect((textAnnos[0] as any).body.value).toBe("子");
    });
  });
});
