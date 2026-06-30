import { CosStorageProvider } from "./cos-storage.provider";

const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock("cos-nodejs-sdk-v5", () => {
  return jest.fn().mockImplementation((config: any) => ({
    putObject: mockPutObject,
    deleteObject: mockDeleteObject,
  }));
});

describe("CosStorageProvider", () => {
  beforeEach(() => {
    process.env.COS_SECRET_ID = "test-id";
    process.env.COS_SECRET_KEY = "test-key";
    process.env.COS_BUCKET = "test-bucket";
    process.env.COS_REGION = "ap-shanghai";
    process.env.COS_CDN_BASE = "https://cdn.example.com";
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.COS_SECRET_ID;
    delete process.env.COS_SECRET_KEY;
    delete process.env.COS_BUCKET;
    delete process.env.COS_REGION;
    delete process.env.COS_CDN_BASE;
  });

  it("使用 COS_CDN_BASE 构建 URL", async () => {
    const provider = new CosStorageProvider();
    mockPutObject.mockImplementation((_params: any, cb: (...args: any[]) => void) => cb(null, {}));

    const file = {
      originalname: "test.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
    } as Express.Multer.File;

    const result = await provider.upload(file);
    expect(result.url).toContain("https://cdn.example.com/uploads/");
    expect(result.key).toMatch(/^uploads\//);
  });

  it("CDN_BASE 末尾斜杠被清理", async () => {
    process.env.COS_CDN_BASE = "https://cdn.example.com/";
    const provider = new CosStorageProvider();
    mockPutObject.mockImplementation((_params: any, cb: (...args: any[]) => void) => cb(null, {}));

    const file = {
      originalname: "test.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
    } as Express.Multer.File;

    const result = await provider.upload(file);
    expect(result.url).toContain("https://cdn.example.com/uploads/");
    expect(result.url).not.toContain("//uploads");
  });

  it("无 CDN 时使用 COS 默认域名", async () => {
    delete process.env.COS_CDN_BASE;
    const provider = new CosStorageProvider();
    mockPutObject.mockImplementation((_params: any, cb: (...args: any[]) => void) => cb(null, {}));

    const file = {
      originalname: "test.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
    } as Express.Multer.File;

    const result = await provider.upload(file);
    expect(result.url).toContain("test-bucket.cos.ap-shanghai.myqcloud.com");
  });

  it("上传失败时 reject", async () => {
    const provider = new CosStorageProvider();
    mockPutObject.mockImplementation((_params: any, cb: (...args: any[]) => void) =>
      cb(new Error("网络错误")),
    );

    const file = {
      originalname: "test.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
    } as Express.Multer.File;

    await expect(provider.upload(file)).rejects.toThrow("网络错误");
  });

  it("delete 成功", async () => {
    const provider = new CosStorageProvider();
    mockDeleteObject.mockImplementation((_params: any, cb: (...args: any[]) => void) => cb(null, {}));

    await expect(provider.delete("uploads/key.png")).resolves.toBeUndefined();
  });

  it("delete 失败时 reject", async () => {
    const provider = new CosStorageProvider();
    mockDeleteObject.mockImplementation((_params: any, cb: (...args: any[]) => void) =>
      cb(new Error("文件不存在")),
    );

    await expect(provider.delete("uploads/nonexistent.png")).rejects.toThrow("文件不存在");
  });

  it("无凭据时 COS 实例仍可创建", () => {
    delete process.env.COS_SECRET_ID;
    delete process.env.COS_SECRET_KEY;
    const provider = new CosStorageProvider();
    expect(provider).toBeDefined();
  });

  it("无法识别的 MIME 回退为安全的 .bin（不可执行，不用用户原始扩展名）", async () => {
    const provider = new CosStorageProvider();
    mockPutObject.mockImplementation((_params: any, cb: (...args: any[]) => void) => cb(null, {}));

    const file = {
      originalname: "noext",
      buffer: Buffer.from("data"),
      mimetype: "application/octet-stream",
    } as Express.Multer.File;

    const result = await provider.upload(file);
    expect(result.url).toContain(".bin");
  });
});
