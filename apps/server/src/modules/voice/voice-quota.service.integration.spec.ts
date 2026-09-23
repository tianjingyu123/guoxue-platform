import { PrismaClient } from "@prisma/client";
import { VoiceQuotaService, DEFAULT_VOICE_BILLING } from "./voice-quota.service";

/**
 * 真实数据库集成验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<已执行 manual_add_xiaobu_ai_assets 的隔离库>
 * 验证额度预留的条件更新、流水幂等、结算幂等。费率为测试配置，不代表拍板价格。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("VoiceQuotaService 真实库", () => {
  let prisma: PrismaClient;
  const prefix = `it-voice-${Date.now()}`;
  const chargeConfig = { configValue: JSON.stringify({ ...DEFAULT_VOICE_BILLING, version: "it", chargeUsers: true, minStartSeconds: 60, sessionMaxSeconds: 300 }) };
  const system: any = { getConfig: jest.fn(async () => chargeConfig) };

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  });

  afterAll(async () => {
    const accounts = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { startsWith: prefix } } });
    const ids = accounts.map((a) => a.id);
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.voiceSession.deleteMany({ where: { userId: { startsWith: prefix } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("发放幂等：同一幂等键并发到达只加一次余额", async () => {
    const svc = new VoiceQuotaService(prisma as any, system);
    const owner = `${prefix}-grant`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => svc.grant({ ownerType: "user", ownerId: owner, seconds: 600, idempotencyKey: `${owner}-order-1` })),
    );
    expect(results.filter((r) => !r.duplicated)).toHaveLength(1);
    expect((await svc.getAvailable("user", owner)).balanceSeconds).toBe(600);
  });

  it("并发开始会话不会重复花同一笔余额；额度不足拒绝", async () => {
    const svc = new VoiceQuotaService(prisma as any, system);
    const owner = `${prefix}-race`;
    await svc.grant({ ownerType: "user", ownerId: owner, seconds: 100, idempotencyKey: `${owner}-g` });
    const settled = await Promise.allSettled(
      Array.from({ length: 4 }, () => svc.startSession({ userId: owner, scene: "report_dialogue" })),
    );
    const ok = settled.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    const avail = await svc.getAvailable("user", owner);
    expect(avail.reservedSeconds).toBe(100);
    expect(avail.availableSeconds).toBe(0);
    await expect(svc.startSession({ userId: owner, scene: "report_dialogue" })).rejects.toThrow(/额度不足|其他通话/);
  });

  it("结算幂等：按用量扣减、释放剩余预留、记录供应商成本与估算标记", async () => {
    const svc = new VoiceQuotaService(prisma as any, system);
    const owner = `${prefix}-settle`;
    await svc.grant({ ownerType: "user", ownerId: owner, seconds: 600, idempotencyKey: `${owner}-g` });
    const session = await svc.startSession({ userId: owner, scene: "report_dialogue", tier: "lite" });
    expect(session.reservedSeconds).toBe(300);

    const [a, b] = await Promise.all([
      svc.settleSession({ sessionId: session.id, usedSeconds: 125, usageSource: "estimate", endReason: "user_hangup" }),
      svc.settleSession({ sessionId: session.id, usedSeconds: 125, usageSource: "estimate", endReason: "user_hangup" }),
    ]);
    expect([a.duplicated, b.duplicated].filter((d) => !d)).toHaveLength(1);

    const avail = await svc.getAvailable("user", owner);
    expect(avail.balanceSeconds).toBe(475);
    expect(avail.reservedSeconds).toBe(0);
    const ended = await prisma.voiceSession.findUniqueOrThrow({ where: { id: session.id } });
    // 125 秒 × 41000 micro/分钟 / 60 = 85416.67 → 向上取整 85417 micro（约 0.085 元）
    expect(ended.supplierCostMicro).toBe(85417n);
    const ledgers = await prisma.voiceQuotaLedger.findMany({ where: { sessionId: session.id } });
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0].note).toContain("待供应商用量对账");
  });

  it("免费模式不扣额度，但限制单次时长并照常记录供应商成本", async () => {
    const freeSystem: any = { getConfig: jest.fn(async () => null) };
    const svc = new VoiceQuotaService(prisma as any, freeSystem);
    const owner = `${prefix}-free`;
    const session = await svc.startSession({ userId: owner, scene: "report_dialogue" });
    expect(session.accountId).toBeNull();
    expect(session.maxSeconds).toBe(DEFAULT_VOICE_BILLING.freeSessionMaxSeconds);
    const { session: ended } = await svc.settleSession({ sessionId: session.id, usedSeconds: 60, usageSource: "estimate", endReason: "idle_timeout" });
    expect(ended.supplierCostMicro).toBe(41000n);
  });
});
