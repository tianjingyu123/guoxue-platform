import { AudioAssetService, canonicalJson, type AudioAssetRequest } from "./audio-asset.service";
import { RedisService } from "../../redis/redis.service";
import { createFakeAudioAssetPrisma, createFakeStorage } from "./audio-asset.test-utils";

/**
 * 模拟验证：内存 Prisma/存储 + RedisService 内存模式（未配置 REDIS_URL）。
 * 不代表真实数据库唯一约束或 COS 上传已验收。
 */
describe("AudioAssetService", () => {
  const baseReq: AudioAssetRequest = {
    sourceType: "classic_segment",
    sourceId: "seg-123",
    text: "子曰：学而时习之，不亦说乎？",
    textType: "original",
    ttsProvider: "tencent",
    voiceId: "101001",
    audioFormat: "mp3",
    synthesisParams: { rate: "0%", segmentRate: 0 },
  };

  let fakePrisma: ReturnType<typeof createFakeAudioAssetPrisma>;
  let fakeStorage: ReturnType<typeof createFakeStorage>;
  let redis: RedisService;
  let service: AudioAssetService;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_SENTINEL_HOSTS;
    fakePrisma = createFakeAudioAssetPrisma();
    fakeStorage = createFakeStorage();
    redis = new RedisService();
    service = new AudioAssetService(fakePrisma.prisma, redis, fakeStorage.storage as any);
  });

  const okSynth = (label = "audio") =>
    jest.fn(async () => ({ audio: Buffer.from(label), ttsProvider: "tencent" as const, voiceId: "101001" }));

  it("首次生成后再次请求直接复用，合成函数调用 0 次", async () => {
    const first = okSynth();
    const created = await service.getOrCreateAudioAsset(baseReq, first);
    expect(created.reused).toBe(false);
    expect(first).toHaveBeenCalledTimes(1);

    const second = okSynth("other");
    const reused = await service.getOrCreateAudioAsset(baseReq, second);
    expect(second).not.toHaveBeenCalled();
    expect(reused.reused).toBe(true);
    expect(reused.assetId).toBe(created.assetId);
  });

  it("并发 6 个相同请求只合成、上传一次", async () => {
    const synth = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 120));
      return { audio: Buffer.from("once"), ttsProvider: "tencent" as const, voiceId: "101001" };
    });
    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.getOrCreateAudioAsset(baseReq, synth)),
    );
    expect(synth).toHaveBeenCalledTimes(1);
    expect(fakeStorage.storage.uploadBuffer).toHaveBeenCalledTimes(1);
    expect(new Set(results.map((r) => r.assetId)).size).toBe(1);
    expect(fakePrisma.rows.size).toBe(1);
  });

  it("合成参数不同（含键顺序不同但值相同）时身份判定正确", async () => {
    await service.getOrCreateAudioAsset(baseReq, okSynth());
    const reordered = { ...baseReq, synthesisParams: { segmentRate: 0, rate: "0%" } };
    const s1 = okSynth();
    expect((await service.getOrCreateAudioAsset(reordered, s1)).reused).toBe(true);
    expect(s1).not.toHaveBeenCalled();

    const otherRate = { ...baseReq, synthesisParams: { rate: "-20%", segmentRate: 0 } };
    const s2 = okSynth();
    expect((await service.getOrCreateAudioAsset(otherRate, s2)).reused).toBe(false);
    expect(s2).toHaveBeenCalledTimes(1);

    for (const variant of [
      { voiceVersion: "v2" },
      { pronunciationDict: "dict-1" },
      { pauseStrategy: "dramatic" },
      { voiceId: "101004" },
      { textType: "vernacular" as const },
    ]) {
      const s = okSynth();
      const r = await service.getOrCreateAudioAsset({ ...baseReq, ...variant }, s);
      expect(r.reused).toBe(false);
      expect(s).toHaveBeenCalledTimes(1);
    }
  });

  it("等待他人合成时只复用完全一致身份的资产", async () => {
    // 另一配置的资产已存在
    await service.getOrCreateAudioAsset({ ...baseReq, pauseStrategy: "dramatic" }, okSynth());
    const textVersion = service.computeTextVersionHash(baseReq.text);
    const key = service.buildAssetKey({ ...baseReq, textVersion });
    // 模拟他人持锁
    await redis.setNX(`audio-asset-lock:${key}`, "other-holder", 300);
    const originalWait = AudioAssetService.WAIT_TIMEOUT_MS;
    (AudioAssetService as any).WAIT_TIMEOUT_MS = 600;
    const s = okSynth();
    await expect(service.getOrCreateAudioAsset(baseReq, s)).rejects.toThrow("音频正在生成");
    expect(s).not.toHaveBeenCalled();
    (AudioAssetService as any).WAIT_TIMEOUT_MS = originalWait;
  });

  it("供应商降级时按实际供应商与音色入库，并标记期望供应商", async () => {
    const synth = jest.fn(async () => ({
      audio: Buffer.from("edge"),
      ttsProvider: "edge" as const,
      voiceId: "zh-CN-XiaoxiaoNeural",
    }));
    const result = await service.getOrCreateAudioAsset(baseReq, synth);
    expect(result.fallbackFrom).toBe("tencent");
    expect(result.ttsProvider).toBe("edge");
    const row = [...fakePrisma.rows.values()][0];
    expect(row.ttsProvider).toBe("edge");
    expect(row.requestedProvider).toBe("tencent");
    expect(row.voiceId).toBe("zh-CN-XiaoxiaoNeural");

    // 下一次按期望供应商请求时不会把降级音频当成腾讯云音频复用
    const s2 = okSynth();
    const again = await service.getOrCreateAudioAsset(baseReq, s2);
    expect(s2).toHaveBeenCalledTimes(1);
    expect(again.ttsProvider).toBe("tencent");
  });

  it("合成失败记录 failed 状态并释放锁，下次可重试", async () => {
    const bad = jest.fn(async () => { throw new Error("供应商超时"); });
    await expect(service.getOrCreateAudioAsset(baseReq, bad)).rejects.toThrow("供应商超时");
    const row = [...fakePrisma.rows.values()][0];
    expect(row.synthesisStatus).toBe("failed");
    expect(row.isPlayable).toBe(false);

    const good = okSynth();
    const r = await service.getOrCreateAudioAsset(baseReq, good);
    expect(good).toHaveBeenCalledTimes(1);
    expect(r.reused).toBe(false);
    expect(fakePrisma.rows.size).toBe(1);
  });

  it("入库失败时删除已上传对象，避免孤立对象", async () => {
    fakePrisma.prisma.audioAsset.upsert.mockRejectedValueOnce(new Error("db down"));
    await expect(service.getOrCreateAudioAsset(baseReq, okSynth())).rejects.toThrow("db down");
    expect(fakeStorage.storage.delete).toHaveBeenCalledTimes(1);
    expect(fakeStorage.objects.size).toBe(0);
  });

  it("存储对象丢失时标记不可播放并返回 null；其他读取错误直接抛出", async () => {
    const created = await service.getOrCreateAudioAsset(baseReq, okSynth());
    fakeStorage.objects.clear();
    expect(await service.readAssetAudio(created)).toBeNull();
    expect([...fakePrisma.rows.values()][0].isPlayable).toBe(false);

    fakeStorage.storage.download.mockRejectedValueOnce(new Error("network"));
    await expect(service.readAssetAudio(created)).rejects.toThrow("network");
  });

  it("锁释放校验持有者，不删除他人的锁", async () => {
    await redis.setNX("lock:x", "holder-a", 300);
    expect(await redis.compareAndDelete("lock:x", "holder-b")).toBe(false);
    expect(await redis.get("lock:x")).toBe("holder-a");
    expect(await redis.compareAndDelete("lock:x", "holder-a")).toBe(true);
    expect(await redis.get("lock:x")).toBeNull();
  });

  it("canonicalJson 忽略键顺序与 undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [1, 2] } })).toBe(canonicalJson({ a: { c: [1, 2] }, b: 1 }));
  });
});
