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
      const { tc3Sign } = require("../../common/tc3.util");
      expect(() => tc3Sign({
        secretId: "test-id",
        secretKey: "test-key",
        service: "asr",
        action: "SentenceRecognition",
        version: "2019-06-14",
        payload: { Text: "测试" },
      })).not.toThrow();
    });
  });

  describe("一句话识别参数", () => {
    it("DataLen 使用 Base64 解码后的原始字节数", async () => {
      const audio = Buffer.from("audio-bytes");
      await svc.sentenceRecognition(audio.toString("base64"), { format: "mp3" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.SourceType).toBe(1);
      expect(body.Data).toBe(audio.toString("base64"));
      expect(body.DataLen).toBe(audio.length);
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
