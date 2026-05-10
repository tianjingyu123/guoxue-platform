import { Test, TestingModule } from "@nestjs/testing";
import { AiService } from "./ai.service";
import { PrismaModule } from "../../prisma/prisma.module";

// Polyfill fetch for test environment
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("AiService", () => {
  let svc: AiService;

  beforeEach(async () => {
    process.env.TENCENT_SECRET_ID = "test-id";
    process.env.TENCENT_SECRET_KEY = "test-key";
    mockFetch.mockResolvedValue({
      json: async () => ({
        Response: { Sentiment: "Positive", Positive: 0.9, Negative: 0.0, Neutral: 0.1 },
      }),
    });

    const mod: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AiService],
    }).compile();
    svc = await mod.resolve(AiService);
  });

  afterEach(() => mockFetch.mockClear());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("签名生成", () => {
    it("应能生成签名（不抛异常）", () => {
      const body = { Text: "测试" };
      expect(() => (svc as any).sign("asr", "SentenceRecognition", body)).not.toThrow();
    });
  });

  describe("翻译方法", () => {
    it("translateText应调API并返回结果", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ Response: { TargetText: "Hello" } }),
      });
      const r = await svc.translateText("你好", "zh", "en");
      expect(r).toBe("Hello");
    });
  });

  describe("情感分析", () => {
    it("sentimentAnalyze应返回情绪结果", async () => {
      const r = await svc.sentimentAnalyze("今天天气真好");
      expect(r).toHaveProperty("sentiment");
    });
  });

  describe("关键词提取", () => {
    it("extractKeywords应返回关键词数组", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          Response: { Keywords: [{ Word: "国学", Score: 0.95 }, { Word: "文化", Score: 0.8 }] },
        }),
      });
      const r = await svc.extractKeywords("国学传统文化");
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(2);
    });
  });
});
