import { PrismaClient } from "@prisma/client";
import { RedisService } from "../../redis/redis.service";
import { ShopOrderService } from "../shop/shop-order.service";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { XiaobuCommerceService } from "./xiaobu-commerce.service";
import { memberVoiceKey, monthKey, reportTargetId, xiaobuMemberStatus } from "./xiaobu-commerce";
import { acquireGlobalConfigLock } from "./voice-it-lock";

/**
 * 报告单独购买与小卜AI会员 · 真实库验证（默认跳过）：
 * XIAOBU_IT_DATABASE_URL=<已执行 manual_add_xiaobu_commerce_order_types 的隔离库>
 * 走真实的 ShopOrderService 定价分支、ShopPaymentService 支付后处理注册表与 ShopRefundService 退款记账；
 * 不调用任何支付网关，不产生真实收款。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

run("小卜报告购买与AI会员 · 真实库", () => {
  let prisma: PrismaClient;
  let orders: ShopOrderService;
  let payment: ShopPaymentService;
  let refund: ShopRefundService;
  let commerce: XiaobuCommerceService;
  const tag = `it-xbc-${Date.now()}`;
  const userId = `${tag}-u`;
  const otherId = `${tag}-o`;
  let recordId = "";

  const balance = async (uid = userId) =>
    (await prisma.voiceQuotaAccount.findUnique({ where: { ownerType_ownerId: { ownerType: "user", ownerId: uid } } }))?.balanceSeconds ?? 0;

  async function buy(type: string, targetId: string, paidAt?: Date) {
    const o: any = await orders.createOrder(userId, { type, targetId, amount: 0.01 } as any);
    const id = o.id ?? o.order?.id;
    const order = await prisma.order.update({ where: { id }, data: { status: "PAID", paidAt: paidAt ?? new Date() } });
    await prisma.$transaction(async (tx) => { await payment.runPaidPostProcessors(order as any, tx); });
    return order;
  }

  // 与其他改全局配置的套件串行（见 voice-it-lock.ts）；等锁可能要等另一个套件跑完
  let releaseLock: (() => Promise<void>) | null = null;
  beforeAll(async () => {
    releaseLock = await acquireGlobalConfigLock(dbUrl!);
  }, 300_000);

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.configSystem.deleteMany({ where: { configKey: "xiaobu_commerce_config" } }); // 用缺省（拍板值）
    await prisma.user.createMany({ data: [{ id: userId, nickname: "报告购买测试" }, { id: otherId, nickname: "他人" }] });
    const rec = await prisma.paipanRecord.create({ data: { userId, paipanType: "BAZI", clientBirth: "it", inputParams: {}, resultData: {} } });
    recordId = rec.id;
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
    commerce = new XiaobuCommerceService(prisma as any);
  });

  afterAll(async () => {
    const ids = [userId, otherId];
    const acc = await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { in: ids } } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: acc.map((a) => a.id) } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.entitlementLedger.deleteMany({ where: { userId: { in: ids } } });
    await prisma.entitlementBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.paipanRecord.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  // 放锁放在收尾之后：收尾会删全局配置，删完再让下一个套件开始
  afterAll(async () => {
    await releaseLock?.();
  });

  it("报告：未购买时无权生成；下单价格按服务端 29 元，前端金额无效；别人的盘、非法类型拒绝", async () => {
    expect(await commerce.reportAccess(userId, recordId, "general")).toMatchObject({ granted: false, priceYuan: 29, includedVoiceMinutes: 30 });
    await expect(commerce.assertReportAccess(userId, recordId, "general")).rejects.toThrow(/需购买（29 元，含 30 分钟/);
    await expect(orders.createOrder(otherId, { type: "XIAOBU_REPORT", targetId: reportTargetId(recordId, "general") } as any)).rejects.toThrow(/自己的排盘/);
    await expect(orders.createOrder(userId, { type: "XIAOBU_REPORT", targetId: `${recordId}:hack` } as any)).rejects.toThrow(/对象无效/);
    const o: any = await orders.createOrder(userId, { type: "XIAOBU_REPORT", targetId: reportTargetId(recordId, "general"), amount: 0.01 } as any);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id ?? o.order?.id } });
    expect(Number(row.amount)).toBe(29);
    await prisma.order.delete({ where: { id: row.id } });
  });

  it("报告：付款后可生成且送 30 分钟；重复处理只送一次；同一份不能再买；其他报告类型仍需购买；退款后撤销并扣回时长", async () => {
    const order = await buy("XIAOBU_REPORT", reportTargetId(recordId, "general"));
    await prisma.$transaction(async (tx) => { await payment.runPaidPostProcessors(order as any, tx); }); // 回调重放
    expect(await balance()).toBe(1800);
    expect(await commerce.reportAccess(userId, recordId, "general")).toMatchObject({ granted: true, via: "purchased" });
    expect((await commerce.reportAccess(userId, recordId, "career")).granted).toBe(false);
    await expect(orders.createOrder(userId, { type: "XIAOBU_REPORT", targetId: reportTargetId(recordId, "general") } as any)).rejects.toThrow(/已购买/);

    await prisma.voiceQuotaAccount.update({ where: { ownerType_ownerId: { ownerType: "user", ownerId: userId } }, data: { balanceSeconds: { decrement: 300 } } }); // 已用 5 分钟
    expect(await (refund as any).applyRefundedBookkeeping(order.id, 29, "测试退款")).toBe(true);
    expect((await commerce.reportAccess(userId, recordId, "general")).granted).toBe(false);
    expect(await balance()).toBe(0);
    const note = (await prisma.voiceQuotaLedger.findUniqueOrThrow({ where: { idempotencyKey: `order:${order.id}:report-voice:refund` } })).note;
    expect(note).toMatch(/300 秒已使用，待人工核对/);
  });

  it("会员：四档价格按拍板值；开通即免费生成任意报告、当月送 300 分钟；会员不能再单买报告", async () => {
    const prices: Record<string, number> = { MONTHLY: 150, YEARLY: 988, YEAR3: 1899, YEAR5: 2499 };
    for (const [k, v] of Object.entries(prices)) {
      const o: any = await orders.createOrder(userId, { type: "XIAOBU_MEMBER", targetId: k, amount: 1 } as any);
      const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id ?? o.order?.id } });
      expect(Number(row.amount)).toBe(v);
      await prisma.order.delete({ where: { id: row.id } });
    }
    await expect(orders.createOrder(userId, { type: "XIAOBU_MEMBER", targetId: "FOREVER" } as any)).rejects.toThrow(/档位不存在/);

    const before = await balance();
    await buy("XIAOBU_MEMBER", "MONTHLY");
    expect(await balance()).toBe(before + 300 * 60);
    expect(await commerce.reportAccess(userId, recordId, "wealth")).toMatchObject({ granted: true, via: "member" });
    await expect(orders.createOrder(userId, { type: "XIAOBU_REPORT", targetId: reportTargetId(recordId, "wealth") } as any)).rejects.toThrow(/会员，报告免费/);
  });

  it("会员叠加与退款：期内续买从期末起算；同月再买不重复送语音；中间一笔退款后后续购买前移", async () => {
    // 上一用例已开通 1 个月；再买一年
    const s1 = await xiaobuMemberStatus(prisma, userId);
    const yearOrder = await buy("XIAOBU_MEMBER", "YEARLY");
    const s2 = await xiaobuMemberStatus(prisma, userId);
    expect(s2.expireAt!.getTime()).toBeGreaterThan(s1.expireAt!.getTime());
    const monthsBetween = (a: Date, b: Date) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    expect(monthsBetween(s1.expireAt!, s2.expireAt!)).toBe(12);
    // 同一自然月只送一次
    expect(await prisma.voiceQuotaLedger.count({ where: { idempotencyKey: memberVoiceKey(userId, monthKey(new Date())) } })).toBe(1);

    // 退掉月卡（第一笔）：年卡前移到从年卡付款时起算，到期日比原来早约 1 个月
    const monthly = await prisma.order.findFirstOrThrow({ where: { userId, type: "XIAOBU_MEMBER", targetId: "MONTHLY", status: "PAID" } });
    await (refund as any).applyRefundedBookkeeping(monthly.id, 150, "测试退款");
    const s3 = await xiaobuMemberStatus(prisma, userId);
    expect(s3.active).toBe(true);
    expect(monthsBetween(s3.expireAt!, s2.expireAt!)).toBe(1);
    // 仍是会员：当月赠送不扣
    const refundKey = `${memberVoiceKey(userId, monthKey(new Date()))}:refund`;
    expect(await prisma.voiceQuotaLedger.count({ where: { idempotencyKey: refundKey } })).toBe(0);

    // 全部退掉：会员失效，报告重新需要购买，当月赠送扣回
    await (refund as any).applyRefundedBookkeeping(yearOrder.id, 988, "测试退款");
    expect((await xiaobuMemberStatus(prisma, userId)).active).toBe(false);
    expect((await commerce.reportAccess(userId, recordId, "wealth")).granted).toBe(false);
    expect(await prisma.voiceQuotaLedger.count({ where: { idempotencyKey: refundKey } })).toBe(1);
  });

  it("月度发放：只给有效会员发，同月重跑不重复；过期会员不发", async () => {
    const now = new Date();
    const lastYear = new Date(now.getTime() - 400 * 86400_000);
    await buy("XIAOBU_MEMBER", "MONTHLY", lastYear); // 一年多前开通的月卡，早已过期
    expect((await xiaobuMemberStatus(prisma, userId)).active).toBe(false);
    const next = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 15)); // 明年 1 月
    const before = await balance();
    await commerce.grantMonthlyVoice(next);
    expect(await balance()).toBe(before);

    await buy("XIAOBU_MEMBER", "YEAR3"); // 三年会员，明年 1 月仍有效
    const b2 = await balance();
    await commerce.grantMonthlyVoice(next);
    await commerce.grantMonthlyVoice(next);
    expect(await balance()).toBe(b2 + 300 * 60);
  });
});
