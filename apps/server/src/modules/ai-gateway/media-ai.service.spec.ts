import { Test } from "@nestjs/testing";
import { MediaAiService } from "./media-ai.service";
import { AiGatewayService } from "./ai-gateway.service";
import { TtsService } from "../tts/tts.service";

describe("MediaAiService", () => {
  let svc: MediaAiService;
  let gateway: jest.Mocked<AiGatewayService>;
  let tts: jest.Mocked<TtsService>;

  const mockGateway = { chat: jest.fn() } as any;
  const mockTts = { synthesize: jest.fn() } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MediaAiService,
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: TtsService, useValue: mockTts },
      ],
    }).compile();
    svc = mod.get(MediaAiService);
    gateway = mockGateway;
    tts = mockTts;
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("auditImage", () => {
    it("内容安全时返回 safe=true", async () => {
      gateway.chat.mockResolvedValue({
        content: '{"safe":true,"category":null,"reason":"正常","confidence":0.99}',
        model: "deepseek",
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      });

      const result = await svc.auditImage({ imageUrl: "https://example.com/img.jpg" });
      expect(result.safe).toBe(true);
      expect(result.model).toBe("deepseek");
    });

    it("检测到违规时返回 safe=false", async () => {
      gateway.chat.mockResolvedValue({
        content: '{"safe":false,"category":"violence","reason":"包含暴力内容","confidence":0.95}',
        model: "deepseek",
        usage: { promptTokens: 40, completionTokens: 40, totalTokens: 80 },
      });

      const result = await svc.auditImage({ imageUrl: "https://example.com/violent.jpg" });
      expect(result.safe).toBe(false);
      expect(result.category).toBe("violence");
    });

    it("fail-close：AI 未返 JSON → 不放行·转人工", async () => {
      gateway.chat.mockResolvedValue({
        content: "这张图片看起来没什么问题吧",
        model: "deepseek",
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });
      const result = await svc.auditImage({ imageUrl: "https://example.com/x.jpg" });
      expect(result.safe).toBe(false);
      expect(result.needsManualReview).toBe(true);
    });

    it("fail-close：JSON 无 safe 字段 → 按不安全处理", async () => {
      gateway.chat.mockResolvedValue({
        content: '{"category":null,"reason":"看不清"}',
        model: "deepseek",
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });
      const result = await svc.auditImage({ imageUrl: "https://example.com/x.jpg" });
      expect(result.safe).toBe(false);
      expect(result.needsManualReview).toBe(true);
    });

    it("fail-close：网关调用异常 → 不抛错,返回不安全·转人工", async () => {
      gateway.chat.mockRejectedValue(new Error("deepseek down"));
      const result = await svc.auditImage({ imageUrl: "https://example.com/x.jpg" });
      expect(result.safe).toBe(false);
      expect(result.category).toBe("AUDIT_ERROR");
      expect(result.needsManualReview).toBe(true);
    });
  });

  describe("textToSpeech", () => {
    it("委托 TtsService 并返回 base64 音频", async () => {
      tts.synthesize.mockResolvedValue({
        audio: Buffer.from("audio-data"),
        contentType: "audio/mpeg",
      });

      const result = await svc.textToSpeech({ text: "你好" });
      expect(result.audioBase64).toBe(Buffer.from("audio-data").toString("base64"));
      expect(result.contentType).toBe("audio/mpeg");
    });

    it("返回正确语音和格式", async () => {
      tts.synthesize.mockResolvedValue({
        audio: Buffer.from("data"),
        contentType: "audio/mpeg",
      });

      const result = await svc.textToSpeech({ text: "测试", voice: "yunxi", speed: 1.2 });
      expect(result.voice).toBe("yunxi");
      expect(result.contentType).toBe("audio/mpeg");
    });
  });

  describe("transcribeAudio", () => {
    beforeEach(() => {
      delete process.env.TENCENT_SECRET_ID;
      delete process.env.TENCENT_SECRET_KEY;
    });

    it("无腾讯云凭证时使用 AI 文本模拟回退", async () => {
      gateway.chat.mockResolvedValue({
        content: '{"text":"模拟转写结果","language":"zh","confidence":0.85}',
        model: "deepseek",
      });

      const result = await svc.transcribeAudio({ audioUrl: "https://example.com/a.mp3" });
      expect(result.text).toBe("模拟转写结果");
      expect(result.model).toBe("deepseek");
    });
  });
});
