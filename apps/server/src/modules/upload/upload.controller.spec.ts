import { Test } from "@nestjs/testing";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockUploadSvc = {
  validateImage: jest.fn(),
  upload: jest.fn().mockResolvedValue({ url: "https://cdn.example.com/img.jpg", key: "uploads/img.jpg" }),
  uploadMany: jest.fn().mockResolvedValue([{ url: "https://cdn.example.com/1.jpg" }, { url: "https://cdn.example.com/2.jpg" }]),
  validateAudio: jest.fn(),
  validateVideo: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
};

describe("UploadController", () => {
  let ctrl: UploadController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(UploadController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /upload/image — 上传单张图片", async () => {
    const file = { originalname: "test.jpg", mimetype: "image/jpeg", buffer: Buffer.from(""), size: 1024 } as any;
    const result: any = await ctrl.uploadImage(file);
    expect(result.url).toContain("cdn");
    expect(mockUploadSvc.validateImage).toHaveBeenCalledWith(file);
    expect(mockUploadSvc.upload).toHaveBeenCalledWith(file);
  });

  it("POST /upload/images — 批量上传图片", async () => {
    const files = [
      { originalname: "1.jpg", mimetype: "image/jpeg", buffer: Buffer.from(""), size: 1024 },
      { originalname: "2.jpg", mimetype: "image/png", buffer: Buffer.from(""), size: 2048 },
    ] as any[];
    const result: any = await ctrl.uploadImages(files);
    expect(result).toHaveLength(2);
    expect(mockUploadSvc.uploadMany).toHaveBeenCalledWith(files);
  });

  it("POST /upload/images — 空文件列表抛异常", async () => {
    await expect(ctrl.uploadImages([] as any)).rejects.toThrow();
  });

  it("POST /upload/audio — 上传音频", async () => {
    const file = { originalname: "test.mp3", mimetype: "audio/mpeg", buffer: Buffer.from(""), size: 102400 } as any;
    const result: any = await ctrl.uploadAudio(file);
    expect(result.url).toContain("cdn");
    expect(mockUploadSvc.validateAudio).toHaveBeenCalledWith(file);
    expect(mockUploadSvc.upload).toHaveBeenCalledWith(file);
  });

  it("POST /upload/video — 上传视频", async () => {
    const file = { originalname: "test.mp4", mimetype: "video/mp4", buffer: Buffer.from(""), size: 1024000 } as any;
    const result: any = await ctrl.uploadVideo(file);
    expect(result.url).toContain("cdn");
    expect(mockUploadSvc.validateVideo).toHaveBeenCalledWith(file);
    expect(mockUploadSvc.upload).toHaveBeenCalledWith(file);
  });

  it("DELETE /upload/:key — 删除文件", async () => {
    const result: any = await ctrl.deleteFile("uploads/img.jpg");
    expect(result.success).toBe(true);
    expect(mockUploadSvc.delete).toHaveBeenCalledWith("uploads/img.jpg");
  });
});
