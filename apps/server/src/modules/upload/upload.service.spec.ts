import { Test } from "@nestjs/testing";
import { UploadService } from "./upload.service";
import { STORAGE_PROVIDER } from "./storage.interface";
import { BusinessException } from "../../common/business.exception";

const mockProvider = {
  upload: jest.fn(),
  delete: jest.fn(),
};

// 模拟 Express.Multer.File
const makeFile = (overrides: Record<string, any> = {}): any => ({
  fieldname: "file",
  originalname: "test.png",
  encoding: "7bit",
  mimetype: "image/png",
  size: 1024,
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
  ...overrides,
});

const jpegFile = () => makeFile({
  mimetype: "image/jpeg",
  originalname: "test.jpg",
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
});

const pngFile = () => makeFile({
  mimetype: "image/png",
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]),
});

describe("UploadService", () => {
  let svc: UploadService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [UploadService, { provide: STORAGE_PROVIDER, useValue: mockProvider }],
    }).compile();
    svc = mod.get(UploadService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("upload", () => {
    it("委托给 provider.upload", async () => {
      mockProvider.upload.mockResolvedValue({ url: "https://cdn.example.com/file.png", key: "uploads/file.png" });
      const result = await svc.upload(makeFile());
      expect(result.url).toBe("https://cdn.example.com/file.png");
      expect(mockProvider.upload).toHaveBeenCalled();
    });
  });

  describe("uploadMany", () => {
    it("批量上传成功", async () => {
      mockProvider.upload.mockResolvedValue({ url: "https://cdn.example.com/f.png" });
      const results = await svc.uploadMany([makeFile(), makeFile()]);
      expect(results).toHaveLength(2);
      expect(mockProvider.upload).toHaveBeenCalledTimes(2);
    });

    it("空文件列表抛出异常", async () => {
      await expect(svc.uploadMany([])).rejects.toThrow(BusinessException);
    });

    it("超过9个文件抛出异常", async () => {
      const files = Array.from({ length: 10 }, () => makeFile());
      await expect(svc.uploadMany(files)).rejects.toThrow("单次最多上传9个文件");
    });
  });

  describe("delete", () => {
    it("委托给 provider.delete", async () => {
      mockProvider.delete.mockResolvedValue(undefined);
      await svc.delete("uploads/file.png");
      expect(mockProvider.delete).toHaveBeenCalledWith("uploads/file.png");
    });
  });

  describe("validateImage", () => {
    it("空文件抛出异常", () => {
      expect(() => svc.validateImage(null as any)).toThrow("未选择文件");
    });

    it("不支持的MIME类型", () => {
      const f = makeFile({ mimetype: "application/pdf" });
      expect(() => svc.validateImage(f)).toThrow("不支持的图片格式");
    });

    it("文件过大", () => {
      const f = makeFile({ mimetype: "image/png", size: 15 * 1024 * 1024 });
      expect(() => svc.validateImage(f)).toThrow("图片大小不能超过");
    });

    it("魔数不匹配", () => {
      const f = makeFile({ mimetype: "image/png", buffer: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) });
      expect(() => svc.validateImage(f)).toThrow("文件内容与声明类型不符");
    });

    it("有效JPEG魔数通过", () => {
      expect(() => svc.validateImage(jpegFile())).not.toThrow();
    });

    it("有效PNG魔数通过", () => {
      expect(() => svc.validateImage(pngFile())).not.toThrow();
    });
  });

  describe("validateAudio", () => {
    it("空文件抛出异常", () => {
      expect(() => svc.validateAudio(null as any)).toThrow("未选择文件");
    });

    it("不支持的MIME类型", () => {
      const f = makeFile({ mimetype: "application/pdf" });
      expect(() => svc.validateAudio(f)).toThrow("不支持的音频格式");
    });

    it("文件过大", () => {
      const f = makeFile({ mimetype: "audio/mpeg", size: 60 * 1024 * 1024 });
      expect(() => svc.validateAudio(f)).toThrow("音频大小不能超过");
    });

    it("魔数不匹配", () => {
      const f = makeFile({ mimetype: "audio/mpeg", buffer: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) });
      expect(() => svc.validateAudio(f)).toThrow("文件内容与声明类型不符");
    });

    it("有效MP3魔数通过", () => {
      const f = makeFile({ mimetype: "audio/mpeg", buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) });
      expect(() => svc.validateAudio(f)).not.toThrow();
    });
  });

  describe("validateVideo", () => {
    it("空文件抛出异常", () => {
      expect(() => svc.validateVideo(null as any)).toThrow("未选择文件");
    });

    it("不支持的MIME类型", () => {
      const f = makeFile({ mimetype: "application/pdf" });
      expect(() => svc.validateVideo(f)).toThrow("不支持的视频格式");
    });

    it("文件过大", () => {
      const f = makeFile({ mimetype: "video/mp4", size: 250 * 1024 * 1024 });
      expect(() => svc.validateVideo(f)).toThrow("视频大小不能超过");
    });

    it("魔数不匹配", () => {
      const f = makeFile({ mimetype: "video/mp4", buffer: Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]) });
      expect(() => svc.validateVideo(f)).toThrow("文件内容与声明类型不符");
    });

    it("有效MP4 ftyp魔数通过", () => {
      const f = makeFile({
        mimetype: "video/mp4",
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x0c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
      });
      expect(() => svc.validateVideo(f)).not.toThrow();
    });
  });

  // /upload/file 文档附件（帖子文件卡·2026-07-10 交互小件整改批）
  describe("validateDocument", () => {
    it("空文件抛出异常", () => {
      expect(() => svc.validateDocument(null as any)).toThrow(BusinessException);
    });

    it("不支持的MIME类型（html 拒绝）", () => {
      const f = makeFile({ mimetype: "text/html", originalname: "x.html" });
      expect(() => svc.validateDocument(f)).toThrow("不支持的文件格式");
    });

    it("文件过大", () => {
      const f = makeFile({ mimetype: "application/pdf", size: 51 * 1024 * 1024 });
      expect(() => svc.validateDocument(f)).toThrow("文件大小不能超过");
    });

    it("PDF 魔数不匹配（伪造 MIME 拒绝）", () => {
      const f = makeFile({ mimetype: "application/pdf", originalname: "x.pdf" });
      expect(() => svc.validateDocument(f)).toThrow("文件内容与声明类型不符");
    });

    it("有效 PDF（%PDF 魔数）通过", () => {
      const f = makeFile({
        mimetype: "application/pdf",
        originalname: "x.pdf",
        buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x00, 0x00]),
      });
      expect(() => svc.validateDocument(f)).not.toThrow();
    });

    it("有效 docx（PK zip 魔数）通过", () => {
      const f = makeFile({
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalname: "x.docx",
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00]),
      });
      expect(() => svc.validateDocument(f)).not.toThrow();
    });

    it("纯文本 txt 跳过魔数校验通过", () => {
      const f = makeFile({ mimetype: "text/plain", originalname: "x.txt", buffer: Buffer.from("hello world!") });
      expect(() => svc.validateDocument(f)).not.toThrow();
    });
  });
});
