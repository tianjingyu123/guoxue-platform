import { PrismaClient } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { DEFAULT_VOICE_BILLING } from "./voice-quota.service";
import { reverseVoiceTopupOrderInTx, topupIdempotencyKey } from "./voice-topup";
import { acquireGlobalConfigLock } from "./voice-it-lock";

/**
 * 语音时长充值 · 真实库验证（默认跳过）：XIAOBU_IT_DATABASE_URL=<已执行 manual_add_voice_minutes_order_type 的隔离库>
 * 走真实的 ShopOrderService.createOrder 定价分支与 ShopPaymentService 支付后处理注册表；
 * 不调用任何支付网关，不产生真实收款。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("语音时长充值 · 真实库", () => {
  let prisma: PrismaClient;
  let orders: ShopOrderService;
  let payment: ShopPaymentService;
  const tag = `it-topup-${Date.now()}`;
  const userId = `${tag}-u`;

  async function setBilling(chargeUsers: boolean) {
    const configValue = JSON.stringify({ ...DEFAULT_VOICE_BILLING, chargeUsers, version: "it" });
    await prisma.configSystem.upsert({
      where: { configKey: "voice_billing_config" },
      create: { configKey: "voice_billing_config", configValue },
      update: { configValue },
    });
  }

  // 与其他改全局配置的套件串行（见 voice-it-lock.ts）；等锁可能要等另一个套件跑完
  let releaseLock: (() => Promise<void>) | null = null;
  beforeAll(async () => {
    releaseLock = await acquireGlobalConfigLock(dbUrl!);
  }, 300_000);

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.user.create({ data: { id: userId, nickname: "充值测试" } });
    // 归因只影响佣金归属，与本用例无关：全部返回「无归因」
    const attribution: any = {
      resolveReferrerUserId: async () => null,
      isChannelAttributionEnabled: async () => false,
      findLatestChannelClick: async () => null,
      isLiveProductSource: () => false,
      resolveLiveCircleOwner: async () => null,
    };
    orders = new ShopOrderService(prisma as any, new RedisService(), {} as any, attribution);
    payment = new (ShopPaymentService as any)(prisma, new RedisService());
  });

  afterAll(async () => {
    const acc = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: userId } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: acc.map((a) => a.id) } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { ownerId: userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.configSystem.deleteMany({ where: { configKey: "voice_billing_config" } });
    await prisma.$disconnect();
  });

  // 放锁放在收尾之后：收尾会删全局配置，删完再让下一个套件开始
  afterAll(async () => {
    await releaseLock?.();
  });

  it("语音尚未开始计费（默认 chargeUsers=false）时拒绝下单：服务没开放不先收钱", async () => {
    await setBilling(false);
    await expect(orders.createOrder(userId, { type: "VOICE_MINUTES", targetId: "30", amount: 1 } as any)).rejects.toThrow(/暂未开始计费/);
  });

  it("开始计费后：价格按服务端 2 元/分钟计算，前端金额无效；非法档位拒绝", async () => {
    await setBilling(true);
    await expect(orders.createOrder(userId, { type: "VOICE_MINUTES", targetId: "7", amount: 1 } as any)).rejects.toThrow(/档位不存在/);
    await expect(orders.createOrder(userId, { type: "VOICE_MINUTES", targetId: "30; drop", amount: 1 } as any)).rejects.toThrow(/档位不存在/);
    const o: any = await orders.createOrder(userId, { type: "VOICE_MINUTES", targetId: "30", amount: 999 } as any);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id ?? o.order?.id } });
    expect(row.type).toBe("VOICE_MINUTES");
    expect(Number(row.amount)).toBe(60);
  });

  it("支付成功处理：同一事务加 10 分钟；重复执行只加一次；退款冲正扣回可用部分，已用部分待人工核对", async () => {
    await setBilling(true);
    const o: any = await orders.createOrder(userId, { type: "VOICE_MINUTES", targetId: "10", amount: 1 } as any);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.id ?? o.order?.id } });
    for (let i = 0; i < 2; i++) {
      await prisma.$transaction(async (tx) => { await payment.runPaidPostProcessors(order as any, tx); });
    }
    const acc = await prisma.voiceQuotaAccount.findUniqueOrThrow({ where: { ownerType_ownerId: { ownerType: "user", ownerId: userId } } });
    expect(acc.balanceSeconds).toBe(600);
    expect(await prisma.voiceQuotaLedger.count({ where: { idempotencyKey: topupIdempotencyKey(order.id) } })).toBe(1);

    // 模拟已用掉 200 秒（直接减余额，等价于一次已结算的通话）
    await prisma.voiceQuotaAccount.update({ where: { id: acc.id }, data: { balanceSeconds: { decrement: 200 } } });
    const r1 = await prisma.$transaction((tx) => reverseVoiceTopupOrderInTx(tx, order));
    expect(r1).toMatchObject({ reversed: 400, shortfall: 200, duplicated: false });
    const r2 = await prisma.$transaction((tx) => reverseVoiceTopupOrderInTx(tx, order));
    expect(r2.duplicated).toBe(true);
    const after = await prisma.voiceQuotaAccount.findUniqueOrThrow({ where: { id: acc.id } });
    expect(after.balanceSeconds).toBe(0);
    const refundLedger = await prisma.voiceQuotaLedger.findUniqueOrThrow({ where: { idempotencyKey: `${topupIdempotencyKey(order.id)}:refund` } });
    expect(refundLedger.note).toMatch(/200 秒已使用，待人工核对/);
  });
});
