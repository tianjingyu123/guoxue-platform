import { TtsService } from "./tts.service";
import { RedisService } from "../../redis/redis.service";
import { AudioAssetService } from "./audio-asset.service";
import { VolcengineTtsAdapter } from "./volcengine-tts.adapter";
import { createFakeAudioAssetPrisma, createFakeStorage } from "./audio-asset.test-utils";

/**
 * 模拟验证：真实 AudioAssetService + 内存 Prisma/存储 + RedisService 内存模式；外部 TTS 调用用 fetch mock 计数。
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockRedis = {
  getBuffer: jest.fn(),
  setBuffer: jest.fn(),
};

const mockVolcengine = {
  synthesize: jest.fn(),
  getAvailableVoices: jest.fn(),
};

describe("TtsService", () => {
  let svc: TtsService;
  let fakePrisma: ReturnType<typeof createFakeAudioAssetPrisma>;
  let fakeStorage: ReturnType<typeof createFakeStorage>;
  let assetService: AudioAssetService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.VOLCENGINE_ACCESS_KEY;
    delete process.env.VOLCENGINE_TTS_APP_ID;
    fakePrisma = createFakeAudioAssetPrisma();
    fakeStorage = createFakeStorage();
    assetService = new AudioAssetService(fakePrisma.prisma, new RedisService(), fakeStorage.storage as any);
    svc = new TtsService(
      mockRedis as unknown as RedisService,
      assetService,
      mockVolcengine as unknown as VolcengineTtsAdapter,
    );
  });
  afterEach(() => {
    delete process.env.TENCENT_SECRET_ID;
    delete process.env.TENCENT_SECRET_KEY;
    delete process.env.TENCENT_CREDENTIAL_MODE;
    delete process.env.TENCENT_CVM_ROLE_NAME;
  });

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
    it("实例角色模式使用临时凭据和安全令牌调用腾讯云 TTS", async () => {
      process.env.TENCENT_CREDENTIAL_MODE = "instance-role";
      process.env.TENCENT_CVM_ROLE_NAME = "RebugxTtsSpecRole";
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            Code: "Success",
            TmpSecretId: "role-id",
            TmpSecretKey: "role-key",
            Token: "role-token",
            ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ Response: { Audio: Buffer.from("role-audio").toString("base64") } }),
        });
      mockRedis.setBuffer.mockResolvedValue(undefined);

      const result = await svc.synthesize({ text: "实例角色测试" });

      expect(result.audio.toString()).toBe("role-audio");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].headers).toMatchObject({ "X-TC-Token": "role-token" });
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
    it("Redis 未命中但持久化资产存在：供应商调用 0 次，从存储读回音频", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(Buffer.from("edge-audio")) });
      const first = await svc.synthesize({ text: "学而时习之" });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 模拟 Redis 过期/服务重启
      mockFetch.mockClear();
      mockRedis.getBuffer.mockResolvedValue(null);
      const second = await svc.synthesize({ text: "学而时习之" });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(fakeStorage.storage.download).toHaveBeenCalledTimes(1);
      expect(second.audio.equals(first.audio)).toBe(true);
    });

    it("并发相同文本只调用一次外部合成", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 80));
        return { ok: true, arrayBuffer: () => Promise.resolve(Buffer.from("once")) };
      });
      const results = await Promise.all(Array.from({ length: 5 }, () => svc.synthesize({ text: "并发测试" })));
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results.every((r) => r.audio.toString() === "once")).toBe(true);
    });

    it("存储对象丢失时只重新生成一次", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(Buffer.from("v1")) });
      await svc.synthesize({ text: "丢失测试" });
      fakeStorage.objects.clear();
      mockFetch.mockClear();
      const result = await svc.synthesize({ text: "丢失测试" });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.audio.toString()).toBe("v1");
    });

    it("腾讯云失败降级 Edge 时资产记录实际供应商，且不写入腾讯云缓存键", async () => {
      process.env.TENCENT_SECRET_ID = "AKIDtest";
      process.env.TENCENT_SECRET_KEY = "sk-test";
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Response: { Error: { Code: "AuthFailure", Message: "bad" } } }) })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) });
      await svc.synthesize({ text: "降级记录测试" });
      const row = [...fakePrisma.rows.values()][0];
      expect(row.ttsProvider).toBe("edge");
      expect(row.requestedProvider).toBe("tencent");
      expect(row.voiceId).toBe("zh-CN-XiaoxiaoNeural");
      expect(mockRedis.setBuffer).not.toHaveBeenCalled();
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
      expect(voices.length).toBe(6); // 更新：新增了 gushi_female 和 gushi_male
      expect(voices[0]).toHaveProperty("id");
      expect(voices[0]).toHaveProperty("name");
      expect(voices.find((v: { id: string }) => v.id === "xiaoxiao")).toBeTruthy();
    });
  });
});
