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
