import { VoiceTrialService } from "./voice-trial.service";
import { DEFAULT_VOICE_BILLING } from "./voice-quota.service";

/**
 * 广场试聊：每个智能体 3 分钟、最多试 5 个（决策人定）。
 * 用意是「让用户感兴趣、有好的体验，提高付费意愿」，所以这里锁的不只是额度算得对，
 * 还包括节奏——不倒计时、试完不拦路而是接住。
 */
function setup(rows: any[] = [], balanceSeconds = 0) {
  const store = [...rows];
  const prisma: any = {
    voiceTrialUsage: {
      findUnique: jest.fn(async ({ where }: any) =>
        store.find((r) => r.userId === where.userId_agentId.userId && r.agentId === where.userId_agentId.agentId) ?? null),
      count: jest.fn(async ({ where }: any) => store.filter((r) => r.userId === where.userId).length),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const hit = store.find((r) => r.userId === where.userId_agentId.userId && r.agentId === where.userId_agentId.agentId);
        if (hit) {
          hit.sessions += update.sessions.increment;
          return hit;
        }
        const row = { id: `t${store.length + 1}`, ...create };
        store.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const hit = store.find((r) => r.id === where.id)!;
        hit.usedSeconds += data.usedSeconds.increment;
        return hit;
      }),
      findMany: jest.fn(async ({ where }: any) => store.filter((r) => r.userId === where.userId)),
    },
  };
  const quota: any = {
    getConfig: jest.fn(async () => DEFAULT_VOICE_BILLING),
    getAvailable: jest.fn(async () => ({ availableSeconds: balanceSeconds, reservedSeconds: 0, balanceSeconds, chargeUsers: false })),
  };
  return { svc: new VoiceTrialService(prisma, quota), store, prisma };
}

const row = (userId: string, agentId: string, usedSeconds = 0) => ({ id: `${userId}-${agentId}`, userId, agentId, usedSeconds, sessions: 1 });

describe("广场智能体试聊", () => {
  it("没试过的智能体：可试 3 分钟，名额扣在「试过几个」上", async () => {
    const { svc } = setup();
    const st = await svc.status("u1", "a1");
    expect(st.canTrial).toBe(true);
    expect(st.remainingSeconds).toBe(180);
    expect(st.agentsLeft).toBe(5);
    expect(st.pricePerMinuteCents).toBe(200); // 2 元/分钟
  });

  it("换一个智能体还能再试，同一个不能反复试", async () => {
    // 同一个已聊满 3 分钟
    const { svc } = setup([row("u1", "a1", 180)]);
    expect((await svc.status("u1", "a1")).canTrial).toBe(false);
    // 换一个没试过的，照样能试
    const other = await svc.status("u1", "a2");
    expect(other.canTrial).toBe(true);
    expect(other.agentsLeft).toBe(4); // 已经试过 1 个
  });

  it("试满 5 个之后，新的智能体不再给试聊", async () => {
    const { svc } = setup(["a1", "a2", "a3", "a4", "a5"].map((a) => row("u1", a, 180)));
    const st = await svc.status("u1", "a6");
    expect(st.canTrial).toBe(false);
    expect(st.agentsLeft).toBe(0);
    await expect(svc.start("u1", "a6")).rejects.toThrow("试聊名额已用完");
  });

  it("名额用满后，之前没聊完的那个仍可接着试（它不占新名额）", async () => {
    // 五个都试过了，其中 a3 只用了 60 秒
    const { svc } = setup([
      row("u1", "a1", 180), row("u1", "a2", 180), row("u1", "a3", 60), row("u1", "a4", 180), row("u1", "a5", 180),
    ]);
    const a3 = await svc.status("u1", "a3");
    expect(a3.canTrial).toBe(true);
    expect(a3.remainingSeconds).toBe(120);
    // 聊满的那个不能再试，没试过的新智能体也没名额了
    expect((await svc.status("u1", "a1")).canTrial).toBe(false);
    expect((await svc.status("u1", "a9")).canTrial).toBe(false);
  });

  it("只在快结束时提示一次，不做全程倒计时（倒计时会让人一直惦记时间）", async () => {
    const { svc } = setup();
    const st = await svc.status("u1", "a1");
    expect(st.warnAtSeconds).toEqual([30]);
    const started = await svc.start("u1", "a1");
    expect(started.maxSeconds).toBe(180);
    expect(started.warnAtSeconds).toEqual([30]);
  });

  it("用量按实际累加，客户端多报的部分截断到上限，不去扣用户的付费余额", async () => {
    const { svc, store } = setup([row("u1", "a1", 150)]);
    const r = await svc.finish("u1", "a1", 999);
    expect(r.usedSeconds).toBe(180); // 只补到上限
    expect(store[0].usedSeconds).toBe(180);
  });

  // ── 试聊结束的去处：不拦路，而是接住 ──

  it("没聊满：还可以接着试", async () => {
    const { svc } = setup([row("u1", "a1", 0)]);
    expect((await svc.finish("u1", "a1", 60)).next).toBe("continue_trial");
  });

  it("聊满且有余额：直接用余额继续，不必现充", async () => {
    const { svc } = setup([row("u1", "a1", 0)], 600);
    const r = await svc.finish("u1", "a1", 180);
    expect(r.next).toBe("use_balance");
    expect(r.balanceSeconds).toBe(600);
  });

  it("聊满、没余额、还有名额：引导去试别的", async () => {
    const { svc } = setup([row("u1", "a1", 0)], 0);
    expect((await svc.finish("u1", "a1", 180)).next).toBe("try_other");
  });

  it("都用完了才谈付费，并带上单价", async () => {
    const { svc } = setup(
      [row("u1", "a1", 0), row("u1", "a2", 180), row("u1", "a3", 180), row("u1", "a4", 180), row("u1", "a5", 180)],
      0,
    );
    const r = await svc.finish("u1", "a1", 180);
    expect(r.next).toBe("pay");
    expect(r.agentsLeft).toBe(0);
    expect(r.pricePerMinuteCents).toBe(200);
  });

  it("没有试聊记录时结束试聊会被拒绝", async () => {
    const { svc } = setup();
    await expect(svc.finish("u1", "a1", 60)).rejects.toThrow("没有进行中的试聊记录");
  });

  it("我的试聊列表带剩余时长，页面可标注「已试聊」", async () => {
    const { svc } = setup([row("u1", "a1", 120), row("u1", "a2", 180)]);
    const r = await svc.mine("u1");
    expect(r.items).toHaveLength(2);
    expect(r.items.find((x) => x.agentId === "a1")?.remainingSeconds).toBe(60);
    expect(r.items.find((x) => x.agentId === "a2")?.remainingSeconds).toBe(0);
    expect(r.agentsLeft).toBe(3);
  });
});
