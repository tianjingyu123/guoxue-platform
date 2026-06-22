import { Test, TestingModule } from "@nestjs/testing";
import { IdentityService } from "./identity.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisService } from "../../redis/redis.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const mockPrisma = {
  user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  ttl: jest.fn().mockResolvedValue(86400),
};

describe("IdentityService", () => {
  let svc: IdentityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.TENCENT_SECRET_ID = "test-id";
    process.env.TENCENT_SECRET_KEY = "test-key";
    mockFetch.mockResolvedValue({
      json: async () => ({
        Response: { Result: "0", Name: "张三", IdNum: "110101199001011234", RequestId: "req-1" },
      }),
    });

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(IdentityService);
  });

  afterEach(() => mockFetch.mockClear());

  it("应被定义", () => expect(svc).toBeDefined());

  it("无凭证时不应抛出", () => {
    delete process.env.TENCENT_SECRET_ID;
    expect(() => Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()).not.toThrow();
  });

  describe("身份证OCR", () => {
    it("应返回识别结果（userId已传入）", async () => {
      const result = await svc.idCardOcr("u1", { imageBase64: "base64data", side: "FRONT" });
      expect(result).toBeDefined();
      expect(result.name).toBe("张三");
    });
  });

  describe("二要素核验", () => {
    it("应返回核验结果（userId已传入）", async () => {
      const result = await svc.idCardVerification("u1", "张三", "110101199001011234");
      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
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
