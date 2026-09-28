import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ShopRefundService } from "./shop-refund.service";
import { EntitlementService } from "../entitlement/entitlement.service";

const localUrl = process.env.REBU_LOCAL_REFUND_TEST_URL || "";
const isolated = (() => {
  try {
    const u = new URL(localUrl);
    return u.protocol === "postgresql:" && u.hostname === "127.0.0.1" && u.port === "55439"
      && u.username === "rebu_test" && u.pathname === "/rebu_candidate_test";
  } catch { return false; }
})();

(isolated ? describe : describe.skip)("退款回调与通知独立数据库事务", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const userId = `synthetic-refund-user-${randomUUID()}`;
  const orderId = `synthetic-refund-order-${randomUUID()}`;
  const entitlement = new EntitlementService(prisma as any);
  const redis = { setNX: async () => true, del: async () => undefined, delByPattern: async () => undefined };
  const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
  const notification = { sendOnce: jest.fn().mockResolvedValue(undefined) };
  const svc = new ShopRefundService(prisma as any, redis as any, {} as any, {} as any,
    {} as any, { registerRefundNotifyHandler: () => undefined } as any,
    {} as any, webhook as any, entitlement, undefined, notification as any);
  const callback = { out_refund_no: `RF${orderId}`, refund_status: "SUCCESS",
    transaction_id: `synthetic-txn-${orderId}`, refund_id: "synthetic-refund-id", amount: { refund: 1500, total: 1500 } };

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.user.create({ data: { id: userId, nickname: "合成退款用户" } });
    await prisma.order.create({ data: { id: orderId, userId, type: "COURSE", targetId: "synthetic-course",
      amount: 15, status: "PAID", payMethod: "WECHAT", payTransactionId: callback.transaction_id } });
    await entitlement.grant({ userId, entitlementKey: "synthetic.course.access", kind: "ACCESS",
      resourceType: "COURSE", resourceId: "synthetic-course", sourceType: "ORDER", sourceId: orderId,
      quantity: 1, idempotencyKey: `grant:${orderId}` });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.entitlementLedger.deleteMany({ where: { userId } });
    await prisma.entitlementBalance.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("真实权益冲正写入后失败，订单和权益一起回滚且无成功通知", async () => {
    const original = entitlement.revokeSourceWithTx.bind(entitlement);
    const fail = jest.spyOn(entitlement, "revokeSourceWithTx").mockImplementationOnce(async (...args) => {
      await original(...args);
      throw new Error("合成权益冲正后故障");
    });
    await expect(svc.handleRefundNotify(callback)).rejects.toThrow("合成权益冲正后故障");
    fail.mockRestore();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
    expect(await prisma.entitlementLedger.count({ where: { userId, action: "REVOKE" } })).toBe(0);
    expect(notification.sendOnce).not.toHaveBeenCalled();
    expect(webhook.fire).not.toHaveBeenCalled();
  });

  it("回调重试成功后通知故障不回滚，重复回调不重复冲正且通知键稳定", async () => {
    notification.sendOnce.mockRejectedValueOnce(new Error("合成通知故障"));
    await expect(svc.handleRefundNotify(callback)).resolves.toBeUndefined();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("REFUNDED");
    expect(await prisma.entitlementLedger.count({ where: { userId, action: "REVOKE" } })).toBe(1);
    await svc.handleRefundNotify(callback);
    expect(await prisma.entitlementLedger.count({ where: { userId, action: "REVOKE" } })).toBe(1);
    expect(notification.sendOnce).toHaveBeenCalledTimes(2);
    for (const call of notification.sendOnce.mock.calls) {
      expect(call).toEqual([userId, `ORDER_REFUNDED:${orderId}`, expect.objectContaining({ title: "退款完成" })]);
    }
  });
});
