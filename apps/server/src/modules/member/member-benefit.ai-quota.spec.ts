import { RedisService } from "../../redis/redis.service";
import { MemberBenefitService } from "./member-benefit.service";

/**
 * AI 次数计次口径（决策人 2026-09-21）：复用也扣；生成失败必须退回；超限被拒不计数。
 * 用 RedisService 的进程内存模式（不设 REDIS_URL），不连任何外部服务。
 */
describe("MemberBenefitService · AI 次数扣减与失败退回", () => {
  const savedUrl = process.env.REDIS_URL;
  const savedSentinel = process.env.REDIS_SENTINEL_HOSTS;
  const savedLimit = process.env.AI_DAILY_FREE_LIMIT;
  let svc: MemberBenefitService;
  let memberLevel = "NONE";
  const user = "quota-u1";

  beforeAll(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_SENTINEL_HOSTS;
  });
  afterAll(() => {
    if (savedUrl !== undefined) process.env.REDIS_URL = savedUrl;
    if (savedSentinel !== undefined) process.env.REDIS_SENTINEL_HOSTS = savedSentinel;
    if (savedLimit === undefined) delete process.env.AI_DAILY_FREE_LIMIT;
    else process.env.AI_DAILY_FREE_LIMIT = savedLimit;
  });
  beforeEach(() => {
    process.env.AI_DAILY_FREE_LIMIT = "3";
    memberLevel = "NONE";
    const prisma: any = { user: { findUnique: async () => ({ memberLevel, memberExpire: null }) } };
    svc = new MemberBenefitService(prisma, new RedisService());
  });

  const used = async () => (await svc.getAiQuota(user)).usedToday;

  it("生成成功计 1 次；抛异常退回；返回兜底结果（failed 为真）也退回", async () => {
    await svc.runWithAiQuota(user, async () => "译文");
    expect(await used()).toBe(1);

    await expect(svc.runWithAiQuota(user, async () => { throw new Error("模型不可用"); })).rejects.toThrow("模型不可用");
    expect(await used()).toBe(1);

    const r = await svc.runWithAiQuota(user, async () => ({ answer: "抱歉" }), (x) => x.answer === "抱歉");
    expect(r.answer).toBe("抱歉");
    expect(await used()).toBe(1);
  });

  it("超限被拒的请求不计数；失败退回后又能用", async () => {
    await svc.consumeAiQuota(user);
    await svc.consumeAiQuota(user);
    const third = await svc.consumeAiQuota(user);
    await expect(svc.consumeAiQuota(user)).rejects.toThrow(/已用完/);
    await expect(svc.consumeAiQuota(user)).rejects.toThrow(/已用完/);
    expect(await used()).toBe(3);
    await svc.refundAiQuota(third);
    expect(await used()).toBe(2);
    await expect(svc.consumeAiQuota(user)).resolves.toMatchObject({ remaining: 0 });
  });

  it("同一凭据只退一次；计数不会退成负数", async () => {
    const t = await svc.consumeAiQuota(user);
    await svc.refundAiQuota(t);
    await svc.refundAiQuota(t);
    expect(await used()).toBe(0);
    const forged = { isMember: false, remaining: 0, key: t.key };
    await svc.refundAiQuota(forged);
    expect(await used()).toBe(0);
  });

  it("会员不计数，退回也不产生负数", async () => {
    memberLevel = "GOLD";
    const t = await svc.consumeAiQuota(user);
    expect(t).toMatchObject({ isMember: true, remaining: -1 });
    expect(t.key).toBeUndefined();
    await svc.refundAiQuota(t);
  });

  async function drain<T>(it: AsyncIterable<T>, stopAfter?: number) {
    const out: T[] = [];
    for await (const c of it) {
      out.push(c);
      if (stopAfter && out.length >= stopAfter) break;
    }
    return out;
  }

  it("流式：正常产出计次；中途出错退回；整段无文字退回；用户中途断开且已有产出按已生成计", async () => {
    async function* ok() { yield "潜龙"; yield "勿用"; }
    async function* broken() { yield "潜"; throw new Error("上游断开"); }
    async function* empty() { yield "  "; }

    await drain(svc.guardAiStream(await svc.consumeAiQuota(user), ok()));
    expect(await used()).toBe(1);

    await expect(drain(svc.guardAiStream(await svc.consumeAiQuota(user), broken()))).rejects.toThrow("上游断开");
    expect(await used()).toBe(1);

    await drain(svc.guardAiStream(await svc.consumeAiQuota(user), empty()));
    expect(await used()).toBe(1);

    await drain(svc.guardAiStream(await svc.consumeAiQuota(user), ok()), 1);
    expect(await used()).toBe(2);
  });
});
