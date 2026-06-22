import { Test } from "@nestjs/testing";
import { ClassicImageController } from "./classic-image.controller";
import { ClassicImageService } from "./classic-image.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockImageSvc = {
  listBookImages: jest.fn().mockResolvedValue({
    items: [{ id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://example.com/1" }],
    total: 1, page: 1, pageSize: 100,
  }),
  getPageImage: jest.fn().mockResolvedValue({
    id: "img1", pageNumber: 1, ocrTexts: [{ content: "子曰", lineNumber: 1 }],
  }),
  generateManifest: jest.fn().mockResolvedValue({
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: "http://localhost:3000/api/v1/classic/books/b1/manifest",
    type: "Manifest",
    label: { none: ["论语"] },
    items: [],
  }),
  createImage: jest.fn().mockResolvedValue({ id: "img2", bookId: "b1", pageNumber: 2 }),
  updateImage: jest.fn().mockResolvedValue({ id: "img1", pageNumber: 1 }),
  deleteImage: jest.fn().mockResolvedValue({ success: true }),
  generateManifestWithTextOverlay: jest.fn().mockResolvedValue({
    "@context": ["http://iiif.io/api/presentation/3/context.json", "http://www.w3.org/ns/anno.jsonld"],
    id: "http://localhost:3000/api/v1/classic/books/b1/manifest",
    type: "Manifest",
    label: { none: ["论语"] },
    items: [],
  }),
  getChapterImageMapping: jest.fn().mockResolvedValue({
    chapterId: "ch1", chapterTitle: "学而篇", totalChars: 100,
    mappingType: "ocr", pages: [{ imageId: "img1", pageNumber: 1, textStart: 0, textEnd: 50, lines: [] }],
  }),
  searchOcrText: jest.fn().mockResolvedValue({ keyword: "学", matches: [], total: 0 }),
};

describe("ClassicImageController", () => {
  let ctrl: ClassicImageController;
  const prevAppUrl = process.env.APP_URL;

  beforeAll(async () => {
    // manifest baseUrl 现使用服务端配置（APP_URL），不再依赖客户端 Host 头
    process.env.APP_URL = "http://localhost:3000";
    const mod = await Test.createTestingModule({
      controllers: [ClassicImageController],
      providers: [{ provide: ClassicImageService, useValue: mockImageSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ClassicImageController);
  });

  afterAll(() => {
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /classic/books/:id/images — 书籍所有页面图像（分页）", async () => {
    const result: any = await ctrl.listBookImages("b1");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockImageSvc.listBookImages).toHaveBeenCalledWith("b1", 1, 100);
  });

  it("GET /classic/books/:id/images/:page — 单页图像+OCR", async () => {
    const result: any = await ctrl.getPageImage("b1", "1");
    expect(result.ocrTexts).toHaveLength(1);
    expect(mockImageSvc.getPageImage).toHaveBeenCalledWith("b1", 1);
  });

  it("GET /classic/books/:id/manifest — IIIF Manifest", async () => {
    const result: any = await ctrl.getManifest("b1", undefined);
    expect(result.label.none[0]).toBe("论语");
    expect(mockImageSvc.generateManifest).toHaveBeenCalledWith("b1", "http://localhost:3000");
  });

  it("POST /classic/books/:id/images — 创建图像记录", async () => {
    const dto: any = { pageNumber: 2, iiifUrl: "http://example.com/2" };
    const result: any = await ctrl.createImage("b1", dto);
    expect(result.id).toBe("img2");
    expect(mockImageSvc.createImage).toHaveBeenCalledWith("b1", dto);
  });

  it("DELETE /classic/images/:id — 删除图像记录", async () => {
    const result: any = await ctrl.deleteImage("img1");
    expect(result.success).toBe(true);
    expect(mockImageSvc.deleteImage).toHaveBeenCalledWith("img1");
  });

  it("GET /classic/books/:id/manifest?textOverlay=true — 含文字叠加层的 Manifest", async () => {
    const result: any = await ctrl.getManifest("b1", "true");
    expect(result["@context"]).toHaveLength(2);
    expect(mockImageSvc.generateManifestWithTextOverlay).toHaveBeenCalledWith("b1", "http://localhost:3000");
  });

  it("GET /classic/chapters/:id/image-locations — 图文对照映射", async () => {
    const result: any = await ctrl.getChapterImageMapping("ch1");
    expect(result.mappingType).toBe("ocr");
    expect(result.pages).toHaveLength(1);
    expect(mockImageSvc.getChapterImageMapping).toHaveBeenCalledWith("ch1", undefined);
  });
});
