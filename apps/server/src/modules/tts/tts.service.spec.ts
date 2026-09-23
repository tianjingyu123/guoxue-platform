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
    it("超过 3000 字的文本明确拒绝，不静默截断、不调用任何合成（2026-09-21 改：原先截断会让后半段无声消失）", async () => {
      mockRedis.getBuffer.mockResolvedValue(null);
      mockFetch.mockClear();
      await expect(svc.synthesize({ text: "字".repeat(5000) })).rejects.toThrow(/过长/);
      expect(mockFetch).not.toHaveBeenCalled();
      // 恰好 3000 字仍可合成
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) });
      mockRedis.setBuffer.mockResolvedValue(undefined);
      await svc.synthesize({ text: "字".repeat(3000) });
      expect(mockFetch).toHaveBeenCalled();
    });

    it("腾讯云按标点切分：任意长度的文本切分后拼接与原文逐字相同（不丢字、不重复）", () => {
      const split = (t: string) => (svc as any).splitByLength(t, 140) as string[];
      const alphabet = "子曰学而时习之不亦说乎，。；！？\n、";
      let seed = 7;
      const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let len = 0; len <= 1200; len += 7) {
        let t = "";
        for (let i = 0; i < len; i++) t += alphabet[Math.floor(rnd() * alphabet.length)];
        const parts = split(t);
        expect(parts.join("")).toBe(t);
        for (const p of parts) expect(p.length).toBeLessThanOrEqual(180);
      }
      // 无标点长文本：硬切兜底，仍不丢字
      const noPunct = "乾".repeat(1000);
      expect(split(noPunct).join("")).toBe(noPunct);
    });

    it("段落音频不把倍速带进资产身份：同一段不同倍速请求复用同一资产、只合成一次", async () => {
      const spy = jest.spyOn(svc as any, "doSynthesize").mockResolvedValue({ audio: Buffer.from("mp3"), ttsProvider: "edge", voiceId: (svc as any).providerVoiceId("edge", "xiaoxiao") });
      const a = await svc.synthesizeAsset({ text: "学而时习之", sourceType: "classic_segment", sourceId: "seg1", textType: "original" });
      const b = await svc.synthesizeAsset({ text: "学而时习之", sourceType: "classic_segment", sourceId: "seg1", textType: "original" });
      expect(b.assetId).toBe(a.assetId);
      expect(b.reused).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][2]).toBe("0%");
      await expect(svc.synthesizeAsset({ text: "   ", sourceType: "classic_segment", sourceId: "seg2", textType: "original" })).rejects.toThrow(/没有可朗读/);
      await expect(svc.synthesizeAsset({ text: "字".repeat(3001), sourceType: "classic_segment", sourceId: "seg3", textType: "original" })).rejects.toThrow(/过长/);
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

  describe("降级期间的成本：不重复合成、首选熔断", () => {
    let redis: RedisService;
    let svc2: TtsService;
    const tencentFail = { json: () => Promise.resolve({ Response: { Error: { Code: "InternalError", Message: "down" } } }) };
    const edgeOk = { ok: true, arrayBuffer: () => Promise.resolve(Buffer.from("edge-audio")) };
    const calls = () => mockFetch.mock.calls.map((c) => (String(c[0]).includes("tencentcloudapi") ? "tencent" : "edge"));

    beforeEach(() => {
      process.env.TENCENT_SECRET_ID = "AKIDtest";
      process.env.TENCENT_SECRET_KEY = "sk-test";
      redis = new RedisService();
      svc2 = new TtsService(redis, new AudioAssetService(fakePrisma.prisma, redis, fakeStorage.storage as any), mockVolcengine as unknown as VolcengineTtsAdapter);
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string) => (String(url).includes("tencentcloudapi") ? tencentFail : edgeOk));
    });

    it("同一段文字降级后再次请求：不再调首选、不再合成，直接读备用音频", async () => {
      await svc2.synthesize({ text: "降级复用测试" });
      expect(calls()).toEqual(["tencent", "edge"]);
      mockFetch.mockClear();
      const again = await svc2.synthesize({ text: "降级复用测试" });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(again.audio.toString()).toBe("edge-audio");
      expect(fakeStorage.storage.uploadBuffer).toHaveBeenCalledTimes(1);
    });

    it("首选连续失败达阈值后熔断：新文字直接走备用；熔断到期后重试首选并恢复", async () => {
      const { threshold } = TtsService.BREAKER;
      for (let i = 0; i < threshold; i++) await svc2.synthesize({ text: `熔断测试${i}` });
      expect(calls().filter((c) => c === "tencent")).toHaveLength(threshold);

      mockFetch.mockClear();
      await svc2.synthesize({ text: "熔断后的新文字" });
      expect(calls()).toEqual(["edge"]); // 不再等首选失败

      // 熔断到期（模拟 TTL 过去），首选已恢复
      await redis.del("tts-provider-open:tencent");
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string) =>
        String(url).includes("tencentcloudapi")
          ? { json: () => Promise.resolve({ Response: { Audio: Buffer.from("tencent-audio").toString("base64") } }) }
          : edgeOk,
      );
      const back = await svc2.synthesize({ text: "恢复后的新文字" });
      expect(calls()).toEqual(["tencent"]);
      expect(back.audio.toString()).toBe("tencent-audio");
    });

    it("首选偶发一次失败不熔断，成功后清零失败计数", async () => {
      await svc2.synthesize({ text: "偶发失败" });
      expect(await redis.get("tts-provider-open:tencent")).toBeNull();
      mockFetch.mockReset();
      mockFetch.mockImplementation(async () => ({ json: () => Promise.resolve({ Response: { Audio: Buffer.from("t").toString("base64") } }) }));
      await svc2.synthesize({ text: "随后成功" });
      expect(await redis.get("tts-provider-fail:tencent")).toBeNull();
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
