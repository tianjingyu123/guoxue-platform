import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ShopPaymentService } from "./shop-payment.service";
import { EntitlementService } from "../entitlement/entitlement.service";

const localUrl = process.env.REBU_LOCAL_PAYMENT_TEST_URL || "";
const isolated = (() => {
  try {
    const u = new URL(localUrl);
    return u.protocol === "postgresql:" && u.hostname === "127.0.0.1" && u.port === "55439"
      && u.username === "rebu_test" && u.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isolated ? describe : describe.skip)("支付回调与通知独立数据库事务", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const entitlement = new EntitlementService(prisma as any);
  const redis = { setNX: async () => true, del: async () => undefined };
  const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
  const notification = { sendOnce: jest.fn().mockResolvedValue(undefined) };
  const attribution = { recordOrderCommissionAndFee: jest.fn().mockResolvedValue(undefined) };
  const orderSvc = { invalidateOrderCache: jest.fn().mockResolvedValue(undefined),
    settleGroupBuyIfNeeded: jest.fn().mockResolvedValue(undefined) };
  const svc = new ShopPaymentService(prisma as any, redis as any, {} as any, {} as any,
    {} as any, webhook as any, {} as any, entitlement, attribution as any, orderSvc as any,
    undefined, undefined, undefined, undefined, undefined, notification as any);
  let userId: string;
  let orderId: string;
  let callback: Record<string, unknown>;

  beforeAll(async () => { await prisma.$connect(); });
  beforeEach(async () => {
    jest.clearAllMocks();
    userId = `synthetic-payment-user-${randomUUID()}`;
    orderId = `synthetic-payment-order-${randomUUID()}`;
    callback = { out_trade_no: `synthetic-intent-${orderId}`, transaction_id: `synthetic-txn-${orderId}`,
      trade_state: "SUCCESS", attach: orderId, amount: { total: 1500 } };
    await prisma.user.create({ data: { id: userId, nickname: "合成付款用户" } });
    await prisma.order.create({ data: { id: orderId, userId, type: "COURSE", targetId: "synthetic-course",
      amount: 15, status: "PENDING", payMethod: "WECHAT", payTransactionId: String(callback.out_trade_no) } });
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.entitlementLedger.deleteMany({ where: { userId } });
    await prisma.entitlementBalance.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("真实权益写入后失败，订单和权益回滚且不发成功通知", async () => {
    const original = entitlement.grantWithTx.bind(entitlement);
    jest.spyOn(entitlement, "grantWithTx").mockImplementationOnce(async (...args) => {
      await original(...args);
      throw new Error("合成权益发放后故障");
    });
    await expect(svc.handlePaymentNotify(callback)).rejects.toThrow("合成权益发放后故障");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PENDING");
    expect(order.payTransactionId).toBe(callback.out_trade_no);
    expect(await prisma.entitlementLedger.count({ where: { userId } })).toBe(0);
    expect(await prisma.entitlementBalance.count({ where: { userId } })).toBe(0);
    expect(webhook.fire).not.toHaveBeenCalled();
    expect(notification.sendOnce).not.toHaveBeenCalled();
    expect(attribution.recordOrderCommissionAndFee).not.toHaveBeenCalled();
  });

  it("通知故障不阻断入账，重投不重复发权益并保持通知幂等键", async () => {
    notification.sendOnce.mockRejectedValueOnce(new Error("合成通知故障"));
    await expect(svc.handlePaymentNotify(callback)).resolves.toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
    await expect(svc.handlePaymentNotify(callback)).resolves.toBe(true);
    expect(await prisma.entitlementLedger.count({ where: { userId, action: "GRANT" } })).toBe(1);
    expect(notification.sendOnce).toHaveBeenCalledTimes(2);
    for (const call of notification.sendOnce.mock.calls) {
      expect(call).toEqual([userId, `ORDER_PAID:${orderId}`, expect.objectContaining({ title: "支付成功" })]);
    }
  });

  it("外发箱故障保留已提交支付，重投补发而不重复发权益", async () => {
    webhook.fire.mockRejectedValueOnce(new Error("合成外发箱故障"));
    await expect(svc.handlePaymentNotify(callback)).rejects.toThrow("合成外发箱故障");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
    expect(notification.sendOnce).not.toHaveBeenCalled();
    await expect(svc.handlePaymentNotify(callback)).resolves.toBe(true);
    expect(await prisma.entitlementLedger.count({ where: { userId, action: "GRANT" } })).toBe(1);
    expect(notification.sendOnce).toHaveBeenCalledTimes(1);
  });
});
