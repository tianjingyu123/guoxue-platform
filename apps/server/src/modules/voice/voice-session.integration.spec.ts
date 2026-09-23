import { PrismaClient } from "@prisma/client";
import { DEFAULT_VOICE_BILLING, VoiceQuotaService } from "./voice-quota.service";
import { VoiceContextBuilder } from "./voice-context.builder";
import { VoiceSessionService } from "./voice-session.service";
import { VoiceDeviceService } from "./voice-device.service";
import { MockXiaozhiProvider } from "./provider/mock-xiaozhi.provider";
import { UnavailableXiaozhiProvider } from "./provider/unavailable-xiaozhi.provider";

/**
 * 真实数据库集成验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<已执行小卜全部手工迁移的隔离库>
 *
 * 用的是 MockXiaozhiProvider：验证的是**热卜侧**的会话编排、幂等、额度与隔离，
 * 不代表小智商业接口已接通，也不代表真实计费正确。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("小卜语音会话编排 · 真实库 + 模拟供应商", () => {
  let prisma: PrismaClient;
  const prefix = `it-vs-${Date.now()}`;
  const billing = (over: any = {}) => ({
    configValue: JSON.stringify({ ...DEFAULT_VOICE_BILLING, version: "it", chargeUsers: true, minStartSeconds: 60, sessionMaxSeconds: 300, ...over }),
  });
  let cfg = billing();
  const system: any = { getConfig: jest.fn(async () => cfg) };

  function build(provider: any) {
    const quota = new VoiceQuotaService(prisma as any, system);
    const devices = new VoiceDeviceService(prisma as any);
    const svc = new VoiceSessionService(prisma as any, quota, new VoiceContextBuilder(prisma as any), provider, devices);
    return { quota, devices, svc };
  }

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    process.env.XIAOBU_DEVICE_PEPPER = "it-only-pepper-0123456789abcdef0123456789";
  });

  afterEach(() => {
    cfg = billing();
  });

  afterAll(async () => {
    const accounts = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { startsWith: prefix } } });
    const ids = accounts.map((a) => a.id);
    const sessions = await prisma.voiceSession.findMany({ where: { userId: { startsWith: prefix } }, select: { id: true } });
    const sids = sessions.map((s) => s.id);
    await prisma.voiceProviderAttempt.deleteMany({ where: { sessionId: { in: sids } } });
    await prisma.voiceUsageEvent.deleteMany({ where: { OR: [{ sessionId: { in: sids } }, { eventId: { startsWith: prefix } }] } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.voiceSession.deleteMany({ where: { id: { in: sids } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: ids } } });
    await prisma.voiceDevice.deleteMany({ where: { productSku: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  const reqId = (s: string) => `${s.replace(/[^A-Za-z0-9_-]/g, "")}-${Math.random().toString(36).slice(2, 10)}`;

  it("商业 API 未配置：返回暂未开放，不建会话、不预留额度", async () => {
    const { svc, quota } = build(new UnavailableXiaozhiProvider());
    const user = `${prefix}-unavail`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const r = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("unavail") });
    expect(r).toMatchObject({ available: false });
    expect(await prisma.voiceSession.count({ where: { userId: user } })).toBe(0);
    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(0);
  });

  it("同一 clientRequestId 并发开始 5 次：只建 1 个会话、只调 1 次供应商、只预留 1 次", async () => {
    const mock = new MockXiaozhiProvider();
    const { svc, quota } = build(mock);
    const user = `${prefix}-idem`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const rid = reqId("idem");
    const results = await Promise.all(Array.from({ length: 5 }, () => svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: rid })));
    const ids = new Set(results.map((r: any) => r.session?.id));
    expect(ids.size).toBe(1);
    expect(await prisma.voiceSession.count({ where: { userId: user } })).toBe(1);
    expect(mock.calls.issue).toBe(1);
    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(300);
    const s = await prisma.voiceSession.findFirstOrThrow({ where: { userId: user } });
    expect(s).toMatchObject({ status: "active", provider: "mock", providerIsMock: true, usageState: "mock" });
    // 凭据不落库
    expect(JSON.stringify(s)).not.toMatch(/credential/i);
  });

  it("不同请求号并发开始同一账户：只有一个能预留成功，另一个被拒", async () => {
    const { svc, quota } = build(new MockXiaozhiProvider());
    const user = `${prefix}-race`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 100, idempotencyKey: `${user}-g` });
    const settled = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) => svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId(`race${i}`) })),
    );
    const ok = settled.filter((r) => r.status === "fulfilled" && (r.value as any).session?.status === "active");
    expect(ok).toHaveLength(1);
    expect((await quota.getAvailable("user", user)).availableSeconds).toBe(0);
  });

  it("并发结束两次：只向供应商请求一次；重复回调只扣一次；时长按供应商用量", async () => {
    const mock = new MockXiaozhiProvider();
    const { svc, quota } = build(mock);
    const user = `${prefix}-end`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const started: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("end") });
    const sid = started.session.id;
    await Promise.all([svc.end(user, sid, { clientEstimatedSeconds: 99 }), svc.end(user, sid, { clientEstimatedSeconds: 99 })]);
    expect(mock.calls.end).toBe(1);
    const ending = await prisma.voiceSession.findUniqueOrThrow({ where: { id: sid } });
    // 模拟器声明支持用量回调：结束后等回调，不按估算先扣
    expect(ending.status).toBe("ending");

    const cb = mock.buildCallback({ eventId: `${prefix}-ev1`, providerSessionId: ending.providerSessionId!, correlationId: ending.requestId, usedSeconds: 125 });
    const [a, b] = await Promise.all([
      svc.handleUsageCallback("mock", cb.headers, cb.rawBody),
      svc.handleUsageCallback("mock", cb.headers, cb.rawBody),
    ]);
    expect([...a.results, ...b.results].map((r) => r.result).sort()).toEqual(["applied", "duplicate"]);
    const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id: sid } });
    expect(ended).toMatchObject({ status: "ended", usedSeconds: 125, usageSource: "mock", usageState: "mock" });
    // 模拟用量不计供应商成本
    expect(ended.supplierCostMicro).toBeNull();
    const ledger = await prisma.voiceQuotaLedger.findMany({ where: { sessionId: sid } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ seconds: -125 });
    expect(ledger[0].note).toMatch(/模拟供应商/);
    expect(await quota.getAvailable("user", user)).toMatchObject({ reservedSeconds: 0, balanceSeconds: 475 });
  });

  it("另一个事件号带不同时长的迟到回调：不重复扣减，标记待对账", async () => {
    const mock = new MockXiaozhiProvider();
    const { svc, quota } = build(mock);
    const user = `${prefix}-late`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const started: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("late") });
    const s = await prisma.voiceSession.findUniqueOrThrow({ where: { id: started.session.id } });
    const cb1 = mock.buildCallback({ eventId: `${prefix}-l1`, providerSessionId: s.providerSessionId!, usedSeconds: 60 });
    await svc.handleUsageCallback("mock", cb1.headers, cb1.rawBody);
    const cb2 = mock.buildCallback({ eventId: `${prefix}-l2`, providerSessionId: s.providerSessionId!, usedSeconds: 90 });
    const r2 = await svc.handleUsageCallback("mock", cb2.headers, cb2.rawBody);
    expect(r2.results[0].result).toBe("duplicate");
    const ev2 = await prisma.voiceUsageEvent.findFirstOrThrow({ where: { eventId: `${prefix}-l2` } });
    expect(ev2.applied).toBe(false);
    expect(ev2.note).toMatch(/待对账/);
    expect((await prisma.voiceQuotaLedger.findMany({ where: { sessionId: s.id } }))).toHaveLength(1);
  });

  it("供应商不支持用量回调时：有客户端估算记 estimated；没有记 unknown 且不扣、不填 0", async () => {
    const mock = new MockXiaozhiProvider();
    mock.behave({ capabilities: { usageCallback: "unknown" } });
    const { svc, quota } = build(mock);
    const user = `${prefix}-nocb`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });

    const s1: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("nocb1") });
    await svc.end(user, s1.session.id, { clientEstimatedSeconds: 70 });
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: s1.session.id } })).toMatchObject({ status: "ended", usageState: "mock", usedSeconds: 70 });

    const s2: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("nocb2") });
    await svc.end(user, s2.session.id, {});
    const e2 = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s2.session.id } });
    expect(e2).toMatchObject({ status: "ended", usageState: "unknown", usedSeconds: null, answerCompleteness: "unknown" });
    expect(await prisma.voiceQuotaLedger.count({ where: { sessionId: s2.session.id } })).toBe(0);
    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(0);
  });

  it("签发被拒：会话失败、预留释放、用量确定为 none；签发超时：用量记 unknown 待对账", async () => {
    const mock = new MockXiaozhiProvider();
    const { svc, quota } = build(mock);
    const user = `${prefix}-fail`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });

    mock.behave({ issueError: "REJECTED" });
    const r1: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("rej") });
    expect(r1.error).toMatchObject({ code: "REJECTED", retryable: false });
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: r1.session.id } })).toMatchObject({ status: "failed", usageState: "none", technicalOutcome: "failed" });

    mock.behave({ issueError: "TIMEOUT" });
    const r2: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("tmo") });
    expect(r2.error).toMatchObject({ code: "TIMEOUT", retryable: true });
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: r2.session.id } })).toMatchObject({ status: "failed", usageState: "unknown", technicalOutcome: "timeout" });

    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(0);
    const attempts = await prisma.voiceProviderAttempt.findMany({ where: { sessionId: { in: [r1.session.id, r2.session.id] } } });
    expect(attempts.map((a) => a.outcome).sort()).toEqual(["rejected", "timeout"]);
  });

  it("他人的会话：查、结束、评价一律 404（不暴露存在性）", async () => {
    const { svc, quota } = build(new MockXiaozhiProvider());
    const a = `${prefix}-ua`, b = `${prefix}-ub`;
    await quota.grant({ ownerType: "user", ownerId: a, seconds: 600, idempotencyKey: `${a}-g` });
    const s: any = await svc.start(a, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("iso") });
    await expect(svc.getMine(b, s.session.id)).rejects.toThrow(/不存在/);
    await expect(svc.end(b, s.session.id)).rejects.toThrow(/不存在/);
    expect((await svc.listMine(b, {})).total).toBe(0);
    expect((await svc.listMine(a, {})).total).toBe(1);
  });

  it("超时清理：超过上限的会话被结束；卡在 reserved 的被释放", async () => {
    const mock = new MockXiaozhiProvider();
    mock.behave({ capabilities: { usageCallback: "unknown" } });
    const { svc, quota } = build(mock);
    const user = `${prefix}-sweep`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const s: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("sweep") });
    const future = new Date(Date.now() + 3600_000);
    await svc.sweep(future, { userIdPrefix: prefix });
    const swept = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.session.id } });
    expect(swept).toMatchObject({ status: "ended", endReason: "idle_timeout", usageState: "unknown" });
    const endAttempts = await prisma.voiceProviderAttempt.findMany({ where: { sessionId: s.session.id, operation: "end" } });
    expect(endAttempts).toHaveLength(1);
    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(0);
  });

  it("1 分钟无新输入自动结束（决策人 09-21）：服务端在客户端之后 15 秒兜底；新输入刷新计时", async () => {
    const mock = new MockXiaozhiProvider();
    mock.behave({ capabilities: { usageCallback: "unknown" } });
    const { svc, quota } = build(mock);
    const user = `${prefix}-idle`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const s: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("idle") });
    expect(s.policy).toEqual({ idleTimeoutSeconds: 60 });
    const id = s.session.id;
    const back = (sec: number) => prisma.voiceSession.update({ where: { id }, data: { lastInputAt: new Date(Date.now() - sec * 1000) } });

    // 70 秒无输入：客户端已该挂断，服务端还在 15 秒宽限内，不动
    await back(70);
    await svc.sweep(new Date(), { userIdPrefix: prefix });
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id } })).status).toBe("active");

    // 80 秒前的最后输入，但刚刚又说了一句 → 计时刷新，不结束
    await back(80);
    const touched = await svc.recordInput(user, id);
    expect(touched).toMatchObject({ status: "active", idleTimeoutSeconds: 60 });
    await svc.sweep(new Date(), { userIdPrefix: prefix });
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id } })).status).toBe("active");

    // 80 秒没有新输入 → 按 idle_timeout 结束，并请求供应商停止
    await back(80);
    await svc.sweep(new Date(), { userIdPrefix: prefix });
    const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id } });
    expect(ended).toMatchObject({ status: "ended", endReason: "idle_timeout" });
    expect(await prisma.voiceProviderAttempt.count({ where: { sessionId: id, operation: "end" } })).toBe(1);

    // 结束后迟到的输入上报不会让会话「复活」
    const late = await svc.recordInput(user, id);
    expect(late.status).toBe("ended");
    expect((await prisma.voiceSession.findUniqueOrThrow({ where: { id } })).status).toBe("ended");
  });

  it("空闲秒数后台可调（限 15–600）；一直有输入的会话到时长上限按 max_duration 结束；他人不能替我刷新", async () => {
    cfg = billing({ idleTimeoutSeconds: 5 });
    const mock = new MockXiaozhiProvider();
    mock.behave({ capabilities: { usageCallback: "unknown" } });
    const { svc, quota } = build(mock);
    const user = `${prefix}-maxdur`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const s: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("maxdur") });
    expect(s.policy).toEqual({ idleTimeoutSeconds: 15 });
    await expect(svc.recordInput(`${prefix}-other`, s.session.id)).rejects.toThrow(/不存在/);

    // 模拟「一直在说话」：最近输入永远是当下；超过单次上限后按 max_duration 结束
    const future = new Date(Date.now() + 3600_000);
    await prisma.voiceSession.update({ where: { id: s.session.id }, data: { lastInputAt: future } });
    await svc.sweep(future, { userIdPrefix: prefix });
    const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.session.id } });
    expect(ended).toMatchObject({ status: "ended", endReason: "max_duration" });
  });

  it("客户端到点自动挂断：结束原因记 idle_timeout", async () => {
    const { svc, quota } = build(new MockXiaozhiProvider());
    const user = `${prefix}-idle-client`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const s: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("idlec") });
    const r: any = await svc.end(user, s.session.id, { reason: "idle_timeout", clientEstimatedSeconds: 61 });
    expect(r.session.endReason).toBe("idle_timeout");
  });

  it("切换供应商后，旧供应商遗留的会话不发给新供应商，按用量未知收尾", async () => {
    const { svc: mockSvc, quota } = build(new MockXiaozhiProvider());
    const user = `${prefix}-switch`;
    await quota.grant({ ownerType: "user", ownerId: user, seconds: 600, idempotencyKey: `${user}-g` });
    const s: any = await mockSvc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("switch") });
    const { svc: unavailSvc } = build(new UnavailableXiaozhiProvider());
    await unavailSvc.sweep(undefined, { userIdPrefix: prefix });
    expect(await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.session.id } })).toMatchObject({
      status: "ended", endReason: "provider_switched", usageState: "unknown", usedSeconds: null,
    });
    expect(await prisma.voiceProviderAttempt.count({ where: { sessionId: s.session.id, operation: "end" } })).toBe(0);
    expect((await quota.getAvailable("user", user)).reservedSeconds).toBe(0);
  });

  it("免费模式（chargeUsers=false，默认）：不扣额度，单次时长受免费上限约束", async () => {
    cfg = billing({ chargeUsers: false, freeSessionMaxSeconds: 180 });
    const { svc } = build(new MockXiaozhiProvider());
    const user = `${prefix}-free`;
    const s: any = await svc.start(user, { scene: "plaza", contextId: "xiaobu", clientRequestId: reqId("free") });
    expect(s.session.maxSeconds).toBe(180);
    const row = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s.session.id } });
    expect(row.accountId).toBeNull();
    expect(row.reservedSeconds).toBe(0);
  });

  describe("硬件设备状态机（模拟设备契约，不等于真实硬件验收）", () => {
    it("序列号不明文落库；绑定码一次性，并发绑定只有一个成功", async () => {
      const { devices } = build(new MockXiaozhiProvider());
      const serial = `SN${Date.now()}XYZ`;
      const d = await devices.register("admin", { serial, productSku: `${prefix}-sku` });
      const raw = await prisma.voiceDevice.findUniqueOrThrow({ where: { id: d.id } });
      expect(JSON.stringify(raw)).not.toContain(serial);
      expect(raw.serialHint).toBe(serial.slice(-4));
      await expect(devices.register("admin", { serial, productSku: `${prefix}-sku` })).rejects.toThrow(/已登记/);

      const { bindCode } = await devices.issueBindCode(d.id);
      expect(JSON.stringify(await prisma.voiceDevice.findUniqueOrThrow({ where: { id: d.id } }))).not.toContain(bindCode);
      const u1 = `${prefix}-d1`, u2 = `${prefix}-d2`;
      const settled = await Promise.allSettled([devices.bind(u1, bindCode), devices.bind(u2, bindCode)]);
      expect(settled.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      await expect(devices.bind(u1, bindCode)).rejects.toThrow(/无效或已过期/);
    });

    it("转赠后新主人看不到旧主人的设备历史；旧主人失去设备访问", async () => {
      const mock = new MockXiaozhiProvider();
      const { devices, svc, quota } = build(mock);
      const d = await devices.register("admin", { serial: `SN${Date.now()}TRF`, productSku: `${prefix}-sku` });
      const { bindCode } = await devices.issueBindCode(d.id);
      const oldOwner = `${prefix}-old`, newOwner = `${prefix}-new`;
      await quota.grant({ ownerType: "user", ownerId: oldOwner, seconds: 600, idempotencyKey: `${oldOwner}-g` });
      await quota.grant({ ownerType: "user", ownerId: newOwner, seconds: 600, idempotencyKey: `${newOwner}-g` });
      await devices.bind(oldOwner, bindCode);

      // 未经真实供应商激活：待开通，不建会话
      expect(await svc.startForDevice(oldOwner, d.id, reqId("dev0"))).toMatchObject({ available: false });
      // 模拟「已激活」只为验证历史隔离；真实激活必须由供应商确认
      await prisma.voiceDevice.update({ where: { id: d.id }, data: { activationState: "activated" } });
      const s1: any = await svc.startForDevice(oldOwner, d.id, reqId("dev1"));
      expect(s1.session.status).toBe("active");
      expect(await devices.history(oldOwner, d.id)).toHaveLength(1);

      const { transferCode } = await devices.initiateTransfer(oldOwner, d.id);
      await expect(devices.acceptTransfer(oldOwner, transferCode)).rejects.toThrow(/自己/);
      const moved = await devices.acceptTransfer(newOwner, transferCode);
      expect(moved).toMatchObject({ status: "bound", bindingVersion: 2 });
      await expect(devices.acceptTransfer(`${prefix}-third`, transferCode)).rejects.toThrow(/无效|已被使用/);

      expect(await devices.history(newOwner, d.id)).toHaveLength(0);
      await expect(devices.history(oldOwner, d.id)).rejects.toThrow(/不存在/);
      const s2: any = await svc.startForDevice(newOwner, d.id, reqId("dev2"));
      expect(await devices.history(newOwner, d.id)).toHaveLength(1);
      const row = await prisma.voiceSession.findUniqueOrThrow({ where: { id: s2.session.id } });
      expect(row.deviceBindingVersion).toBe(2);
    });

    it("停用后不能发起会话、不能解绑；恢复后回到原状态", async () => {
      const { devices, svc } = build(new MockXiaozhiProvider());
      const d = await devices.register("admin", { serial: `SN${Date.now()}DIS`, productSku: `${prefix}-sku` });
      const { bindCode } = await devices.issueBindCode(d.id);
      const u = `${prefix}-dis`;
      await devices.bind(u, bindCode);
      await expect(devices.disable("admin", d.id, "")).rejects.toThrow(/原因/);
      await devices.disable("admin", d.id, "投诉处置");
      await expect(svc.startForDevice(u, d.id, reqId("dis"))).rejects.toThrow(/停用/);
      await expect(devices.unbind(u, d.id)).rejects.toThrow(/停用/);
      expect(await devices.enable("admin", d.id)).toMatchObject({ status: "bound" });
      expect(await devices.unbind(u, d.id)).toMatchObject({ status: "unbound" });
    });
  });
});
