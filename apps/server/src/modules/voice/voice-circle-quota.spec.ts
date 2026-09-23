import { VoiceQuotaService, DEFAULT_VOICE_BILLING } from "./voice-quota.service";

/**
 * 圈子语音助理的额度（决策人定）：圈主申请开通、圈主充值、成本 0.1 元/分钟、
 * 前期默认开通并赠送 500 分钟、暂不向圈成员收费。
 *
 * 这里锁两件事：
 * 1. 开通即赠送，且只送一次（驳回后重新提交再通过，不能再送一遍）
 * 2. 圈主看得见「烧得多快、还能撑多久」——光给余额数字，他没法决定要不要充值
 */
function setup(over?: { balance?: number; reserved?: number; consumeSeconds?: number[] }) {
  const account = { id: "acc1", ownerType: "circle", ownerId: "c1", balanceSeconds: over?.balance ?? 0, reservedSeconds: over?.reserved ?? 0 };
  const prisma: any = {
    voiceQuotaAccount: {
      findUnique: jest.fn(async () => (over?.balance === undefined && over?.reserved === undefined ? account : account)),
      create: jest.fn(async () => account),
      upsert: jest.fn(async () => account),
      update: jest.fn(async ({ data }: any) => {
        account.balanceSeconds += data.balanceSeconds?.increment ?? 0;
        return account;
      }),
    },
    voiceQuotaLedger: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: "l1", ...data })),
      // consume 记的是负数
      findMany: jest.fn(async () => (over?.consumeSeconds ?? []).map((s) => ({ seconds: -Math.abs(s) }))),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  return { svc: new VoiceQuotaService(prisma), prisma, account };
}

describe("圈子语音助理额度", () => {
  it("开通即赠送 500 分钟，幂等键绑角色 id（重复审核只送一次）", async () => {
    const { svc, prisma } = setup();
    await svc.grantCircleWelcome("c1", "profile-1");
    const data = prisma.voiceQuotaLedger.create.mock.calls[0][0].data;
    expect(data.seconds).toBe(DEFAULT_VOICE_BILLING.pricing.circleGrantSeconds);
    expect(data.seconds).toBe(500 * 60);
    expect(data.idempotencyKey).toBe("circle-welcome:profile-1");
  });

  it("已发过的不再发（幂等键命中直接返回）", async () => {
    const { svc, prisma } = setup();
    prisma.voiceQuotaLedger.findUnique.mockResolvedValueOnce({ id: "old" });
    const r = await svc.grantCircleWelcome("c1", "profile-1");
    expect(r.duplicated).toBe(true);
    expect(prisma.voiceQuotaLedger.create).not.toHaveBeenCalled();
  });

  it("看板给出余额、近 7 天消耗与日均——圈主要判断的是烧得快不快", async () => {
    // 7 天用了 7×10 分钟 = 4200 秒，日均 600 秒
    const { svc } = setup({ balance: 6000, consumeSeconds: Array(7).fill(600) });
    const d = await svc.circleDashboard("c1");
    expect(d.usedLast7dSeconds).toBe(4200);
    expect(d.dailyAvgSeconds).toBe(600);
    expect(d.daysLeft).toBe(10); // 6000 / 600
    expect(d.pricePerMinuteCents).toBe(10); // 0.1 元/分钟
  });

  it("用量太少时不给「还能用几天」——刚开通就说能用几万天是假精确", async () => {
    const { svc } = setup({ balance: 30000, consumeSeconds: [] });
    const d = await svc.circleDashboard("c1");
    expect(d.dailyAvgSeconds).toBe(0);
    expect(d.daysLeft).toBeNull();
    // 没有日均时，按 30 分钟兜底提醒
    expect(d.warnBelowSeconds).toBe(30 * 60);
  });

  it("提醒阈值按日均留一天提前量，让圈主有时间充值", async () => {
    const { svc } = setup({ balance: 10000, consumeSeconds: Array(7).fill(3600) }); // 日均 3600
    const d = await svc.circleDashboard("c1");
    expect(d.warnBelowSeconds).toBe(3600);
  });

  it("余额耗尽是退回文字问答，不是让助理消失", async () => {
    const { svc } = setup({ balance: 0 });
    const d = await svc.circleDashboard("c1");
    expect(d.availableSeconds).toBe(0);
    // 突然哑掉会让成员以为圈主停了服务，这笔账最后算在圈主头上
    expect(d.exhaustedBehavior).toBe("fallback_to_text");
  });

  it("暂不向圈成员收费（决策人明确）", async () => {
    const { svc } = setup({ balance: 100 });
    expect((await svc.circleDashboard("c1")).chargeMembers).toBe(false);
  });

  it("进行中会话的预留要从可用里扣掉", async () => {
    const { svc } = setup({ balance: 1000, reserved: 400 });
    const d = await svc.circleDashboard("c1");
    expect(d.availableSeconds).toBe(600);
    expect(d.availableMinutes).toBe(10);
  });
});
