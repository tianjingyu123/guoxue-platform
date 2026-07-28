import { Test } from "@nestjs/testing";
import { TtsService } from "./tts.service";
import { RedisService } from "../../redis/redis.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockRedis = {
  getBuffer: jest.fn(),
  setBuffer: jest.fn(),
};

describe("TtsService", () => {
  let svc: TtsService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [TtsService, { provide: RedisService, useValue: mockRedis }],
    }).compile();
    svc = mod.get(TtsService);
  });

  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => { delete process.env.TENCENT_SECRET_ID; delete process.env.TENCENT_SECRET_KEY; });

  describe("synthesize", () => {
    it("缓存命中直接返回", async () => {
      mockRedis.getBuffer.mockResolvedValue(Buffer.from("cached-audio"));
      const result = await svc.synthesize({ text: "你好" });
      expect(result.audio).toBeTruthy();
      expect(result.contentType).toBe("audio/mpeg");
      expect(mockFetch).not.toHaveBeenCalled();
    });
    it("缓存未命中调用 API 并回填", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      const result = await svc.synthesize({ text: "你好世界" });
      expect(result.audio).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRedis.setBuffer).toHaveBeenCalled();
    });
    it("支持指定语音和语速", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      const result = await svc.synthesize({ text: "测试", voice: "yunxi", rate: "-20%" });
      expect(result.audio).toBeTruthy();
    });
    it("API 请求失败抛出错误", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({ ok: false, status: 403 });
      await expect(svc.synthesize({ text: "你好" })).rejects.toThrow("TTS API 请求失败: 403");
    });
    it("超过 3000 字的文本被截断", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      const longText = "字".repeat(5000);
      await svc.synthesize({ text: longText });
      expect(mockFetch).toHaveBeenCalled();
    });
    it("配置腾讯云密钥时优先走腾讯云 TextToVoice", async () => {
      process.env.TENCENT_SECRET_ID = "AKIDtest";
      process.env.TENCENT_SECRET_KEY = "sk-test";
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ Response: { Audio: Buffer.from("tc-audio").toString("base64") } }),
      });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      const result = await svc.synthesize({ text: "腾讯云测试" });
      expect(result.audio.toString()).toBe("tc-audio");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("tts.tencentcloudapi.com"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    it("把古籍朗读情感和断句参数传给腾讯云", async () => {
      process.env.TENCENT_SECRET_ID = "AKIDtest";
      process.env.TENCENT_SECRET_KEY = "sk-test";
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ Response: { Audio: Buffer.from("tc-audio").toString("base64") } }),
      });
      mockRedis.setBuffer.mockResolvedValue(undefined);

      await svc.synthesize({
        text: "学而时习之，不亦说乎？",
        emotion: "poetry",
        emotionIntensity: 110,
        segmentRate: 2,
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual(expect.objectContaining({
        EmotionCategory: "poetry",
        EmotionIntensity: 110,
        SegmentRate: 2,
      }));
    });
    it("腾讯云失败时降级 Edge TTS", async () => {
      process.env.TENCENT_SECRET_ID = "AKIDtest";
      process.env.TENCENT_SECRET_KEY = "sk-test";
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Response: { Error: { Code: "AuthFailure", Message: "bad" } } }) })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      const result = await svc.synthesize({ text: "降级测试" });
      expect(result.audio).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getVoices", () => {
    it("返回可用语音列表", () => {
      const voices = svc.getVoices();
      expect(voices.length).toBe(4);
      expect(voices[0]).toHaveProperty("id");
      expect(voices[0]).toHaveProperty("name");
      expect(voices.find((v: { id: string }) => v.id === "xiaoxiao")).toBeTruthy();
    });
  });
});
