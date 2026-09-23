import { ClassicPunctuationService, hasEnoughPunctuation, onlyPunctuationChanged, stripPunctuation } from "./classic-punctuation.service";
import { TextDerivedAssetService } from "./text-derived-asset.service";
import { RedisService } from "../../redis/redis.service";

/** 模拟验证：模型网关 mock + 内存版 textDerivedAsset；校验字序保护规则 */
describe("ClassicPunctuationService", () => {
  const RAW = "学而时习之不亦说乎有朋自远方来不亦乐乎人不知而不愠不亦君子乎";

  it("字序校验：只允许增删标点与空白", () => {
    expect(onlyPunctuationChanged(RAW, "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？")).toBe(true);
    expect(onlyPunctuationChanged(RAW, "学而时习之，不亦悦乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？")).toBe(false); // 改字
    expect(onlyPunctuationChanged(RAW, "学而时习之，不亦说乎？")).toBe(false); // 删字
    expect(onlyPunctuationChanged(RAW, "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？")).toBe(false); // 补字
    expect(stripPunctuation("「天」， 地。")).toBe("天地");
  });

  it("判断原文是否已有足够标点", () => {
    expect(hasEnoughPunctuation(RAW)).toBe(false);
    expect(hasEnoughPunctuation("学而时习之，不亦说乎？有朋自远方来，不亦乐乎？")).toBe(true);
  });

  function setup(original = RAW) {
    const rows = new Map<string, any>();
    const prisma: any = {
      classicSegment: { findUnique: jest.fn(async () => ({ id: "seg1", chapterId: "c1", originalContent: original, deletedAt: null })) },
      textDerivedAsset: {
        findUnique: jest.fn(async ({ where }: any) => rows.get(where.assetKey) ?? null),
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const cur = rows.get(where.assetKey);
          if (cur) return Object.assign(cur, update);
          const row = { id: "t1", model: null, ...create };
          rows.set(where.assetKey, row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => Object.assign(rows.get(where.assetKey), data)),
      },
    };
    delete process.env.REDIS_URL;
    const gateway: any = { chat: jest.fn() };
    const assets = new TextDerivedAssetService(prisma, new RedisService());
    return { svc: new ClassicPunctuationService(prisma, gateway, assets), gateway };
  }

  it("合格结果保存并被下一次查询复用，不再调用模型", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？", model: "m" });
    expect(await svc.peek("seg1")).toBeNull();
    const r = await svc.punctuate("seg1", "u1");
    expect(r).toMatchObject({ source: "ai_draft", cached: false });
    const again = await svc.peek("seg1");
    expect(again).toMatchObject({ source: "ai_draft", cached: true });
    expect(gateway.chat).toHaveBeenCalledTimes(1);
  });

  it("模型改了字：不保存、不返回改动后的文本", async () => {
    const { svc, gateway } = setup();
    gateway.chat.mockResolvedValue({ content: "学而时习之，不亦悦乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？", model: "m" });
    await expect(svc.punctuate("seg1", "u1")).rejects.toThrow("生成结果不完整");
    expect(await svc.peek("seg1")).toBeNull();
  });

  it("原文已有标点：直接返回原文，不调用模型", async () => {
    const { svc, gateway } = setup("学而时习之，不亦说乎？有朋自远方来，不亦乐乎？");
    expect(await svc.punctuate("seg1")).toMatchObject({ source: "original" });
    expect(gateway.chat).not.toHaveBeenCalled();
  });
});
