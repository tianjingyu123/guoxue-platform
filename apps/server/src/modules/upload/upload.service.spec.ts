import { Test } from "@nestjs/testing";
import { UploadService } from "./upload.service";

describe("UploadService", () => {
  let svc: UploadService;

  beforeAll(async () => {
    // 无 COS 凭证 → 自动使用本地存储
    delete process.env.COS_SECRET_ID;
    delete process.env.COS_SECRET_KEY;
    delete process.env.COS_BUCKET;

    const mod = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();
    svc = mod.get(UploadService);
  });

  it("默认使用本地存储上传图片", async () => {
    const mockFile = {
      originalname: "test.png",
      buffer: Buffer.from("fake-image-data"),
      mimetype: "image/png",
    } as Express.Multer.File;

    const result = await svc.upload(mockFile);
    expect(result.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
  });

  it("本地存储上传 jpg", async () => {
    const mockFile = {
      originalname: "photo.jpg",
      buffer: Buffer.from("fake-jpg"),
      mimetype: "image/jpeg",
    } as Express.Multer.File;

    const result = await svc.upload(mockFile);
    expect(result.url).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/);
  });
});
