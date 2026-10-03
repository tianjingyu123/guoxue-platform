import { PrismaClient } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { DEFAULT_VOICE_BILLING, VoiceQuotaService } from "./voice-quota.service";
import { CIRCLE_VOICE_REVENUE_TYPE } from "./voice-topup";
import { acquireGlobalConfigLock } from "./voice-it-lock";

/**
 * 圈内语音时长充值 · 圈主与平台五五分成（决策人 2026-09-21）· 真实库验证（默认跳过）：
 * XIAOBU_IT_DATABASE_URL=<隔离库>
 * 走真实 ShopOrderService（来源校验与定价）、ShopPaymentService（支付后处理）、ShopRefundService（退款记账）；
 * 不调用任何支付网关，不产生真实收款。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("圈内语音时长充值五五分成 · 真实库", () => {
  let prisma: PrismaClient;
  let orders: ShopOrderService;
  let payment: ShopPaymentService;
  let refund: ShopRefundService;
  let quota: VoiceQuotaService;
  const tag = `it-cvr-${Date.now()}`;
  const owner = `${tag}-owner`;
  const member = `${tag}-member`;
  const outsider = `${tag}-out`;
  let circleId = "";

  async function setBilling(chargeUsers: boolean) {
    const configValue = JSON.stringify({ ...DEFAULT_VOICE_BILLING, chargeUsers, version: "it" });
    await prisma.configSystem.upsert({
      where: { configKey: "voice_billing_config" },
      create: { configKey: "voice_billing_config", configValue },
      update: { configValue },
    });
  }

  async function topup(userId: string, minutes: number, source?: string) {
    const o: any = await orders.createOrder(userId, {
      type: "VOICE_MINUTES",
      targetId: String(minutes),
      amount: 1,
      ...(source ? { sourceContentType: "CIRCLE_VOICE", sourceContentId: source } : {}),
    } as any);
    const id = o.id ?? o.order?.id;
    const order = await prisma.order.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), payAmount: o.amount ?? undefined } });
    // 与收银回调一致：处理器只拿到部分字段，来源由处理器在事务内重读
    await prisma.$transaction(async (tx) => {
      await payment.runPaidPostProcessors({ id: order.id, type: order.type, userId: order.userId, targetId: order.targetId, amount: order.amount } as any, tx);
    });
    return order;
  }

  // 与其他改全局配置的套件串行（见 voice-it-lock.ts）；等锁可能要等另一个套件跑完
  let releaseLock: (() => Promise<void>) | null = null;
  beforeAll(async () => {
    releaseLock = await acquireGlobalConfigLock(dbUrl!);
  }, 300_000);

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await setBilling(true);
    await prisma.user.createMany({ data: [owner, member, outsider].map((id) => ({ id, nickname: id.slice(-6) })) });
    const circle = await prisma.circle.create({ data: { name: `${tag}-圈`, intro: "it", ownerId: owner, status: "ACTIVE" } as any });
    circleId = circle.id;
    await prisma.circleMember.createMany({ data: [{ circleId, userId: owner, role: "OWNER" } as any, { circleId, userId: member } as any] });
    await prisma.voiceAgentProfile.create({
      data: { ownerType: "circle", ownerId: circleId, name: "圈助理", persona: "p", prompt: "p", voiceId: "v", status: "APPROVED", activeVersion: 1 } as any,
    });
    const attribution: any = {
      resolveReferrerUserId: async () => null,
      isChannelAttributionEnabled: async () => false,
      findLatestChannelClick: async () => null,
      isLiveProductSource: () => false,
      resolveLiveCircleOwner: async () => null,
    };
    const entitlement = new EntitlementService(prisma as any);
    orders = new ShopOrderService(prisma as any, new RedisService(), {} as any, attribution);
    payment = new (ShopPaymentService as any)(prisma, new RedisService());
    (payment as any).entitlement = entitlement;
    const huifu: any = { registerRefundNotifyHandler: () => undefined };
    refund = new ShopRefundService(prisma as any, new RedisService(), {} as any, {} as any, {} as any, huifu, {} as any, { fire: async () => undefined } as any, entitlement);
    // 系统配置直接读库（与线上 SystemService.getConfig 同一张表）
    const system: any = { getConfig: (configKey: string) => prisma.configSystem.findUnique({ where: { configKey } }) };
    quota = new VoiceQuotaService(prisma as any, system);
  });

  afterAll(async () => {
    const ids = [owner, member, outsider];
    const orderIds = (await prisma.order.findMany({ where: { userId: { in: ids } }, select: { id: true } })).map((o) => o.id);
    await prisma.circleRevenueRecord.deleteMany({ where: { circleId } });
    await prisma.platformFeeRecord.deleteMany({ where: { sourceId: { in: orderIds } } });
    await prisma.voiceSession.deleteMany({ where: { userId: { in: ids } } });
    const acc = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { in: [...ids, circleId] } } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: acc.map((a) => a.id) } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: acc.map((a) => a.id) } } });
    await prisma.entitlementLedger.deleteMany({ where: { userId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.voiceAgentProfile.deleteMany({ where: { ownerId: circleId } });
    await prisma.circleMember.deleteMany({ where: { circleId } });
    await prisma.circle.deleteMany({ where: { id: circleId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.configSystem.deleteMany({ where: { configKey: "voice_billing_config" } });
    await prisma.$disconnect();
  });

  // 放锁放在收尾之后：收尾会删全局配置，删完再让下一个套件开始
  afterAll(async () => {
    await releaseLock?.();
  });

  it("成员在圈内充值：付款后记圈主收益 50% 与平台抽成 50%；回调重放只记一次", async () => {
    const order = await topup(member, 30, circleId);
    expect(order.sourceContentType).toBe("CIRCLE_VOICE");
    expect(Number(order.amount)).toBe(60);
    await prisma.$transaction(async (tx) => { await payment.runPaidPostProcessors(order as any, tx); }); // 重放
    const recs = await prisma.circleRevenueRecord.findMany({ where: { circleId, type: CIRCLE_VOICE_REVENUE_TYPE, sourceId: order.id } });
    expect(recs).toHaveLength(1);
    expect(Number(recs[0].amount)).toBe(60);
    expect(Number(recs[0].ownerShare)).toBe(30);
    expect(Number(recs[0].platformFee)).toBe(30);
    expect(Number(recs[0].splitRate)).toBe(0.5);
    const fee = await prisma.platformFeeRecord.findMany({ where: { type: CIRCLE_VOICE_REVENUE_TYPE, sourceId: order.id } });
    expect(fee).toHaveLength(1);
    expect(Number(fee[0].platformFee)).toBe(30);
  });

  it("不分成的情况：非成员带圈子来源（剥离归因照常买）、不带来源的平台充值、圈主给自己充值", async () => {
    const a = await topup(outsider, 10, circleId);
    expect(a.sourceContentType).toBeNull();
    const b = await topup(member, 10);
    const c = await topup(owner, 10, circleId);
    for (const o of [a, b, c]) {
      expect(await prisma.circleRevenueRecord.count({ where: { sourceId: o.id } })).toBe(0);
    }
  });

  it("退款：记负数冲正（与入圈退款同口径），重复退款只冲一次", async () => {
    const order = await topup(member, 10, circleId);
    await (refund as any).applyRefundedBookkeeping(order.id, 20, "测试退款");
    const rev = await prisma.circleRevenueRecord.findMany({ where: { sourceId: order.id }, orderBy: { createdAt: "asc" } });
    expect(rev.map((r) => r.type)).toEqual([CIRCLE_VOICE_REVENUE_TYPE, `${CIRCLE_VOICE_REVENUE_TYPE}_refund`]);
    expect(Number(rev[1].ownerShare)).toBe(-10);
    expect(Number(rev[1].amount)).toBe(-20);
    await prisma.$transaction(async (tx) => {
      const { reverseVoiceTopupOrderInTx } = await import("./voice-topup");
      await reverseVoiceTopupOrderInTx(tx, order);
    });
    expect(await prisma.circleRevenueRecord.count({ where: { sourceId: order.id } })).toBe(2);
  });

  it("扣费顺序：圈子账户够则扣圈子；圈子账户用完改扣成员自己的时长", async () => {
    // 圈子账户给 5 分钟
    await quota.grant({ ownerType: "circle", ownerId: circleId, seconds: 300, idempotencyKey: `${tag}:circle-grant` });
    const s1 = await quota.startSession({
      userId: member, scene: "circle_assistant", contextType: "circle", contextId: circleId,
      account: { ownerType: "circle", ownerId: circleId }, fallbackAccount: { ownerType: "user", ownerId: member },
    });
    const circleAcc = await prisma.voiceQuotaAccount.findUniqueOrThrow({ where: { ownerType_ownerId: { ownerType: "circle", ownerId: circleId } } });
    expect(s1.accountId).toBe(circleAcc.id);
    // 圈子额度被这通预留占满后，下一通改扣成员自己的
    const s2 = await quota.startSession({
      userId: member, scene: "circle_assistant", contextType: "circle", contextId: circleId,
      account: { ownerType: "circle", ownerId: circleId }, fallbackAccount: { ownerType: "user", ownerId: member },
    });
    const memberAcc = await prisma.voiceQuotaAccount.findUniqueOrThrow({ where: { ownerType_ownerId: { ownerType: "user", ownerId: member } } });
    expect(s2.accountId).toBe(memberAcc.id);
    // 没有备选账户时仍报额度不足
    await expect(quota.startSession({
      userId: member, scene: "circle_assistant", account: { ownerType: "circle", ownerId: circleId },
    })).rejects.toThrow(/额度不足/);
  });
});
