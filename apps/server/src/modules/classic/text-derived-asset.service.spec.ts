import { TextDerivedAssetService, type TextAssetRequest } from "./text-derived-asset.service";
import { RedisService } from "../../redis/redis.service";

/** 模拟验证：内存版 textDerivedAsset 表（assetKey 唯一）+ RedisService 内存模式 */
function createFakePrisma() {
  const rows = new Map<string, any>();
  let seq = 0;
  const textDerivedAsset = {
    findUnique: jest.fn(async ({ where }: any) => rows.get(where.assetKey) ?? null),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const cur = rows.get(where.assetKey);
      if (cur) return Object.assign(cur, update);
      const row = { id: `t${++seq}`, model: null, ...create };
      rows.set(where.assetKey, row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => Object.assign(rows.get(where.assetKey), data)),
  };
  return { prisma: { textDerivedAsset } as any, rows };
}

describe("TextDerivedAssetService", () => {
  const base: TextAssetRequest = {
    sourceType: "classic_translation",
    sourceId: "hash-1",
    content: "学而时习之",
    processingType: "translation",
    modelPolicy: "gateway:classic_translate",
    promptVersion: "translate-v1",
  };
  let fake: ReturnType<typeof createFakePrisma>;
  let svc: TextDerivedAssetService;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    fake = createFakePrisma();
    svc = new TextDerivedAssetService(fake.prisma, new RedisService());
  });

  const proc = (result = "译文", model = "deepseek-v4-flash") => jest.fn(async () => ({ result, model }));

  it("命中后不再调用模型，并记录实际模型名", async () => {
    const p1 = proc();
    const first = await svc.getOrCreateTextAsset(base, p1);
    expect(first.cached).toBe(false);
    expect(first.model).toBe("deepseek-v4-flash");
    const p2 = proc("另一个");
    const second = await svc.getOrCreateTextAsset(base, p2);
    expect(p2).not.toHaveBeenCalled();
    expect(second).toMatchObject({ cached: true, result: "译文", model: "deepseek-v4-flash" });
  });

  it("无上下文的请求不会复用有上下文的结果（空 contextHash 不再是通配）", async () => {
    await svc.getOrCreateTextAsset({ ...base, context: "论语·学而" }, proc("有上下文译文"));
    const p = proc("无上下文译文");
    const r = await svc.getOrCreateTextAsset(base, p);
    expect(p).toHaveBeenCalledTimes(1);
    expect(r.result).toBe("无上下文译文");

    const p3 = proc();
    await svc.getOrCreateTextAsset({ ...base, context: "孟子" }, p3);
    expect(p3).toHaveBeenCalledTimes(1);
  });

  it("内容、处理类型、提示词版本、路由策略、质量版本任一不同都不复用", async () => {
    await svc.getOrCreateTextAsset(base, proc());
    for (const variant of [
      { content: "不亦说乎" },
      { processingType: "punctuation" as const },
      { promptVersion: "translate-v2" },
      { modelPolicy: "gateway:other" },
      { qualityVersion: "v1.0" },
      { language: "en" },
    ]) {
      const p = proc();
      const r = await svc.getOrCreateTextAsset({ ...base, ...variant }, p);
      expect(p).toHaveBeenCalledTimes(1);
      expect(r.cached).toBe(false);
    }
  });

  it("并发 5 个相同请求只调用一次模型", async () => {
    const p = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return { result: "once", model: "m" };
    });
    const results = await Promise.all(Array.from({ length: 5 }, () => svc.getOrCreateTextAsset(base, p)));
    expect(p).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.result === "once")).toBe(true);
    expect(fake.rows.size).toBe(1);
  });

  it("未通过校验的结果标记 failed，不作为缓存复用", async () => {
    const bad = proc("不是JSON");
    await expect(
      svc.getOrCreateTextAsset(base, bad, (raw) => raw.startsWith("{")),
    ).rejects.toThrow("生成结果不完整");
    expect([...fake.rows.values()][0].processingStatus).toBe("failed");

    const good = proc('{"translation":"好"}');
    const r = await svc.getOrCreateTextAsset(base, good, (raw) => raw.startsWith("{"));
    expect(good).toHaveBeenCalledTimes(1);
    expect(r.cached).toBe(false);
  });
});
