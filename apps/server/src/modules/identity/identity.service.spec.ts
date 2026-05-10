import { Test, TestingModule } from "@nestjs/testing";
import { IdentityService } from "./identity.service";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("IdentityService", () => {
  let svc: IdentityService;

  beforeEach(async () => {
    process.env.TENCENT_SECRET_ID = "test-id";
    process.env.TENCENT_SECRET_KEY = "test-key";
    mockFetch.mockResolvedValue({
      json: async () => ({
        Response: { Name: "张三", IdNum: "110101199001011234", RequestId: "req-1" },
      }),
    });

    const mod: TestingModule = await Test.createTestingModule({
      providers: [IdentityService],
    }).compile();
    svc = mod.get(IdentityService);
  });

  afterEach(() => mockFetch.mockClear());

  it("应被定义", () => expect(svc).toBeDefined());

  it("无凭证时不应抛出", () => {
    delete process.env.TENCENT_SECRET_ID;
    expect(() => Test.createTestingModule({
      providers: [IdentityService],
    }).compile()).not.toThrow();
  });

  describe("身份证OCR", () => {
    it("应返回识别结果", async () => {
      const result = await svc.idCardOcr({ imageBase64: "base64data", side: "FRONT" });
      expect(result).toBeDefined();
    });
  });

  describe("二要素核验", () => {
    it("应返回核验结果", async () => {
      const result = await svc.idCardVerification("张三", "110101199001011234");
      expect(result).toBeDefined();
    });
  });

  describe("签名生成（callApi）", () => {
    it("应能调用callApi生成签名（不抛异常）", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ Response: { Name: "Test", RequestId: "x" } }),
      });
      const result = await (svc as any).callApi("ocr", "TestAction", {});
      expect(result).toBeDefined();
    });
  });
});
