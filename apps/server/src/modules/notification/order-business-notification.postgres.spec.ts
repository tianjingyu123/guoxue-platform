import { PrismaClient, Order } from "@prisma/client";
import { OrderBusinessNotificationTask, recordOrderNoticeWithTx } from "./order-business-notification.task";
import { NotificationService } from "./notification.service";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import { ShopOrderLifecycleService } from "../shop/shop-order-lifecycle.service";
import { EntitlementService } from "../entitlement/entitlement.service";

const url = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462"
    || u.username !== "qa_voice" || u.pathname !== "/entitlement_notice_qa_20261002_order_business") {
    throw new Error("订单通知只允许新增08迁移后的本任务合成库，不使用生产DATABASE_URL");
  }
}
jest.setTimeout(30000);
(url ? describe : describe.skip)("新订单站内持久事实与失败恢复真实PG", () => {
  let db: PrismaClient;
  let task: OrderBusinessNotificationTask;
  const users: string[] = [], orders: string[] = [];
  const reverse = jest.fn().mockResolvedValue(undefined);
  const fire = jest.fn().mockResolvedValue(undefined);
  const notify = jest.fn().mockRejectedValue(new Error("合成立即通知故障"));
  const redis = { setNX: async () => true, del: async () => undefined, delByPattern: async () => undefined,
    getJson: async () => ({ PUSH_ENABLED: false }) };
  const orderSvc = { invalidateOrderCache: async () => undefined, settleGroupBuyIfNeeded: async () => undefined };
  const payment = () => new ShopPaymentService(db as never, redis as never, {} as never, {} as never, {} as never,
    { fire } as never, {} as never, new EntitlementService(db as never),
    { recordOrderCommissionAndFee: async () => undefined } as never, orderSvc as never,
    undefined, undefined, undefined, undefined, undefined, { sendOnce: notify } as never);
  const refund = () => new ShopRefundService(db as never, redis as never, {} as never, {} as never, {} as never,
    { registerRefundNotifyHandler: () => undefined } as never, {} as never, { fire } as never,
    new EntitlementService(db as never), { reverseCommission: reverse } as never, { sendOnce: notify } as never);
  const fixture = async (status: "PENDING" | "PAID" | "REFUNDED" = "PENDING") => {
    const user = await db.user.create({ data: { nickname: "合成订单通知验收" } }); users.push(user.id);
    const o = await db.order.create({ data: { userId: user.id, type: "PRODUCT", targetId: "synthetic-no-stock-product",
      amount: 1, payAmount: 1, status, payMethod: "WECHAT", payTransactionId: "synthetic-intent-" + user.id,
      ...(status !== "PENDING" ? { paidAt: new Date() } : {}), ...(status === "REFUNDED" ? { refundedAt: new Date() } : {}) } });
    orders.push(o.id); return o;
  };
  const pay = (svc: ShopPaymentService, o: Order) => svc.handlePaymentNotify({ out_trade_no: o.payTransactionId,
    transaction_id: "synthetic-final-" + o.id, attach: o.id, trade_state: "SUCCESS", amount: { total: 100 } });
  const refundCallback = async (svc: ShopRefundService, id: string) => {
    const o = await db.order.findUniqueOrThrow({ where: { id } });
    return svc.handleRefundNotify({ out_refund_no: "RF" + id, transaction_id: o.payTransactionId,
      refund_id: "synthetic-refund-" + id, refund_status: "SUCCESS", amount: { total: 100, refund: 100 } });
  };
  const count = (id: string, kind: string) => db.notification.count({ where: { targetId: id, idempotencyKey: { endsWith: ":" + kind + ":" + id } } });
  const facts = (id: string) => db.orderBusinessNotice.findMany({ where: { orderId: id } });
  const fail = async (table: "AfterSale" | "Notification", action: "INSERT" | "UPDATE", body: () => Promise<void>) => {
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_order_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic order notice database failure'; END $$");
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_order_notice_fail BEFORE ${action} ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_order_notice_fail()`);
    try { await body(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_order_notice_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_order_notice_fail()");
    }
  };
  beforeAll(async () => { db = new PrismaClient({ datasources: { db: { url: url! } } }); await db.$connect(); task = new OrderBusinessNotificationTask(db as never); });
  beforeEach(() => { reverse.mockReset().mockResolvedValue(undefined); fire.mockClear(); notify.mockClear(); });
  afterEach(async () => {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.afterSale.deleteMany({ where: { orderId: { in: orders } } });
    await db.entitlementLedger.deleteMany({ where: { userId: { in: users } } });
    await db.entitlementBalance.deleteMany({ where: { userId: { in: users } } });
    await db.order.deleteMany({ where: { id: { in: orders } } });
    await db.user.deleteMany({ where: { id: { in: users } } }); users.length = 0; orders.length = 0;
  });
  afterAll(async () => { await db.$disconnect(); });

  it("旧已支付与已退款订单不生成事实或历史通知", async () => {
    const a = await fixture("PAID"), b = await fixture("REFUNDED");
    expect(await task.deliverPending()).toBe(0); expect(await facts(a.id)).toHaveLength(0); expect(await facts(b.id)).toHaveLength(0);
  });
  it("真实支付入口通知失败仍确认；新事实分钟恢复且重复回调唯一", async () => {
    const o = await fixture(), svc = payment(); expect(await pay(svc, o)).toBe(true);
    expect(await count(o.id, "ORDER_PAID")).toBe(0); expect(await facts(o.id)).toHaveLength(1);
    expect(await task.deliverPending()).toBe(1); expect(await pay(svc, o)).toBe(true);
    expect(await task.deliverPending()).toBe(0); expect(await count(o.id, "ORDER_PAID")).toBe(1);
  });
  it("管理员线下确认复用同一事实入口", async () => {
    const o = await fixture(); const svc = new ShopOrderLifecycleService(db as never, redis as never,
      { recordOrderCommissionAndFee: async () => undefined } as never, orderSvc as never, payment());
    await svc.adminPayOrder(o.id, "synthetic-manual-" + o.id, "synthetic-admin");
    expect(await facts(o.id)).toHaveLength(1); expect(await task.deliverPending()).toBe(1);
  });
  it("支付后处理事务失败不残留事实或成功通知", async () => {
    const o = await fixture(), svc = payment();
    (svc as unknown as { paidPostProcessors: Record<string, () => Promise<void>> }).paidPostProcessors.PRODUCT = async () => { throw new Error("synthetic fulfillment failure"); };
    await expect(pay(svc, o)).rejects.toThrow("synthetic fulfillment failure");
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
    expect(await facts(o.id)).toHaveLength(0); expect(await task.deliverPending()).toBe(0);
  });
  it("通知INSERT真实失败不改已付订单；解除故障恢复一次", async () => {
    const o = await fixture(); expect(await pay(payment(), o)).toBe(true);
    await fail("Notification", "INSERT", async () => { await expect(task.deliverPending()).rejects.toThrow(); });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
    expect(await task.deliverPending()).toBe(1); expect(await task.deliverPending()).toBe(0);
  });
  it("分佣故障仅保留待放行退款事实；恢复后无需再依赖通知重投", async () => {
    const o = await fixture("PAID"); reverse.mockRejectedValueOnce(new Error("synthetic commission failure"));
    await expect(refundCallback(refund(), o.id)).rejects.toThrow("synthetic commission failure");
    expect((await facts(o.id))[0].readyAt).toBeNull(); expect(await task.deliverPending()).toBe(0);
    await refundCallback(refund(), o.id); expect((await facts(o.id))[0].readyAt).not.toBeNull();
    expect(await task.deliverPending()).toBe(1); expect(await count(o.id, "ORDER_REFUNDED")).toBe(1);
  });
  it("售后终态失败不放行；退款重试同事务放行且只恢复一次", async () => {
    const o = await fixture("PAID"); const a = await db.afterSale.create({ data: { orderId: o.id, userId: o.userId, type: "refund_only", reason: "隔离验收", status: "PROCESSING" } });
    await fail("AfterSale", "UPDATE", async () => { await expect(refundCallback(refund(), o.id)).rejects.toThrow(); });
    expect((await facts(o.id))[0].readyAt).toBeNull(); expect(await task.deliverPending()).toBe(0);
    expect((await db.afterSale.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("PROCESSING");
    await refundCallback(refund(), o.id); await refundCallback(refund(), o.id);
    expect((await db.afterSale.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("COMPLETED");
    expect(await facts(o.id)).toHaveLength(1); expect(await task.deliverPending()).toBe(1);
  });
  it("退款权益事务失败不残留退款事实", async () => {
    const o = await fixture("PAID"), svc = refund();
    (svc as unknown as { entitlement: { revokeSourceWithTx: () => Promise<void> } }).entitlement.revokeSourceWithTx = async () => { throw new Error("synthetic revoke failure"); };
    await expect(refundCallback(svc, o.id)).rejects.toThrow("synthetic revoke failure");
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID"); expect(await facts(o.id)).toHaveLength(0);
  });
  it("旧已退款订单重投不补建恢复事实", async () => {
    const o = await fixture("REFUNDED"); await refundCallback(refund(), o.id);
    expect(await facts(o.id)).toHaveLength(0); expect(await task.deliverPending()).toBe(0);
  });
  it("双独立客户端并发恢复只有一条数据库通知", async () => {
    const o = await fixture(); await pay(payment(), o);
    const other = new PrismaClient({ datasources: { db: { url: url! } } });
    try {
      const r = await Promise.all([task.deliverPending(), new OrderBusinessNotificationTask(other as never).deliverPending()]);
      expect(r.reduce((a, b) => a + b, 0)).toBe(1); expect(await count(o.id, "ORDER_PAID")).toBe(1);
    } finally { await other.$disconnect(); }
  });
  it("订单已退款不再恢复迟到的支付成功；只恢复最终退款", async () => {
    const o = await fixture(); await pay(payment(), o); await refundCallback(refund(), o.id);
    expect(await facts(o.id)).toHaveLength(2); expect(await task.deliverPending()).toBe(1);
    expect(await count(o.id, "ORDER_PAID")).toBe(0); expect(await count(o.id, "ORDER_REFUNDED")).toBe(1);
  });
  it("恢复时复核订单收件人，错误主体事实不发通知", async () => {
    const o = await fixture("PAID"), other = await fixture("PAID");
    await db.$transaction(tx => recordOrderNoticeWithTx(tx, o.id, "ORDER_PAID"));
    await db.orderBusinessNotice.update({ where: { eventKey: "ORDER_PAID:" + o.id }, data: { recipientId: other.userId } });
    expect(await task.deliverPending()).toBe(0);
  });
  it("恢复通知详情跨用户仍拒绝，正文不泄露手机号或渠道流水", async () => {
    const o = await fixture(), other = await fixture(); await pay(payment(), o); await task.deliverPending();
    const n = await db.notification.findFirstOrThrow({ where: { targetId: o.id } });
    const svc = new NotificationService(db as never, redis as never, {} as never, {} as never);
    await expect(svc.getById(n.id, other.userId)).rejects.toThrow(); expect((await svc.getById(n.id, o.userId)).id).toBe(n.id);
    expect(n.content).not.toContain(o.payTransactionId!); expect(n.content).toBe("订单已支付成功，可查看订单详情。");
  });
  it.each(["PROCESSING", "CLOSED", "ABNORMAL"])("退款状态%s不记录已完成恢复事实", async state => {
    const o = await fixture("PAID");
    await refund().handleRefundNotify({ out_refund_no: "RF" + o.id, transaction_id: o.payTransactionId,
      refund_status: state, amount: { refund: 100, total: 100 } });
    expect(await facts(o.id)).toHaveLength(0); expect(await task.deliverPending()).toBe(0);
  });
  it.each(["kind", "eventKey", "sourceVersion", "readyAt"])("数据库CHECK拒绝错误%s事实", async field => {
    const o = await fixture("PAID");
    const data = { eventKey: "ORDER_PAID:" + o.id, orderId: o.id, recipientId: o.userId,
      kind: "ORDER_PAID", sourceVersion: "ORDER_NOTICE_V1", readyAt: new Date() };
    Object.assign(data, { [field]: field === "readyAt" ? null : "INVALID" });
    await expect(db.orderBusinessNotice.create({ data })).rejects.toThrow();
    expect(await facts(o.id)).toHaveLength(0);
  });
});
