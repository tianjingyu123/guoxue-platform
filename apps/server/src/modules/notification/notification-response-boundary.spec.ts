import { NotificationService } from "./notification.service";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import { Prisma } from "@prisma/client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// 一轮事件循环足以观察已完成的工作，不用真实通道、固定延时或计时性能断言。
const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));
const dto = { type: "PURCHASE", title: "支付成功", content: "合成订单已支付" };

function fixture() {
  const row = { id: "synthetic-notification" };
  const prisma = {
    notification: { create: jest.fn().mockResolvedValue(row) },
    auth: { findMany: jest.fn().mockResolvedValue([{ provider: "WECHAT_MINI", openId: "synthetic-openid" }]) },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };
  const redis = {
    setNX: jest.fn().mockResolvedValue(true), del: jest.fn().mockResolvedValue(undefined),
    getJson: jest.fn().mockResolvedValue({ PUSH_ENABLED: true }),
    setJson: jest.fn().mockResolvedValue(undefined),
  };
  const push = { sendMiniSubscribeMsg: jest.fn().mockResolvedValue({}) };
  type Args = ConstructorParameters<typeof NotificationService>;
  const service = new NotificationService(prisma as unknown as Args[0], redis as unknown as Args[1],
    push as unknown as Args[2], {} as Args[3]);
  return { row, prisma, redis, push, service };
}

describe("关键业务通知持久化与可选推送的响应边界", () => {
  it("偏好查询未返回时，已落库通知仍及时返回并保留幂等键", async () => {
    const f = fixture();
    const prefs = deferred<{ PUSH_ENABLED: boolean }>();
    f.redis.getJson.mockReturnValueOnce(prefs.promise);
    let result: unknown;
    const task = f.service.sendOnce("synthetic-user", "ORDER_PAID:synthetic-order", dto).then(value => { result = value; });
    try {
      await nextTurn();
      expect(result).toEqual(f.row);
      expect(f.redis.del).not.toHaveBeenCalled();
      expect(f.prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: "synthetic-user:ORDER_PAID:synthetic-order" }),
      }));
    } finally {
      prefs.resolve({ PUSH_ENABLED: false });
      await task;
      await nextTurn();
    }
  });

  it("可选推送未返回时不拖住通知结果，稍后推送失败也不释放已落库的幂等键", async () => {
    const f = fixture();
    const delivery = deferred<unknown>();
    f.push.sendMiniSubscribeMsg.mockReturnValueOnce(delivery.promise);
    let result: unknown;
    const pushDto = {
      ...dto, pushData: { miniTemplateId: "synthetic-template" },
    };
    const task = f.service.sendOnce("synthetic-user", "ORDER_PAID:synthetic-order", pushDto)
      .then(value => { result = value; });
    try {
      await nextTurn();
      expect(f.push.sendMiniSubscribeMsg).toHaveBeenCalledTimes(1);
      expect(result).toEqual(f.row);
    } finally {
      delivery.reject(new Error("合成推送失败"));
      await task;
      await nextTurn();
    }
    expect(f.redis.del).not.toHaveBeenCalled();
    f.redis.setNX.mockResolvedValueOnce(false);
    await expect(f.service.sendOnce("synthetic-user", "ORDER_PAID:synthetic-order", dto)).resolves.toBeNull();
    expect(f.prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it("数据库尚未提交时不能提前返回、查询推送或释放幂等键", async () => {
    const f = fixture();
    const storage = deferred<typeof f.row>();
    f.prisma.notification.create.mockReturnValueOnce(storage.promise);
    let returned = false;
    const task = f.service.sendOnce("synthetic-user", "ORDER_PAID:synthetic-order", dto).then(() => { returned = true; });
    try {
      await nextTurn();
      expect(returned).toBe(false);
      expect(f.redis.getJson).not.toHaveBeenCalled();
      expect(f.redis.del).not.toHaveBeenCalled();
    } finally {
      storage.resolve(f.row);
      await task;
      await nextTurn();
    }
  });

  it("数据库失败仍向调用方报错、释放幂等键，不能开始推送", async () => {
    const f = fixture();
    f.prisma.notification.create.mockRejectedValueOnce(new Error("合成数据库失败"));
    await expect(f.service.sendOnce("synthetic-user", "ORDER_REFUNDED:synthetic-order", dto)).rejects.toThrow("合成数据库失败");
    expect(f.redis.del).toHaveBeenCalledWith("notification:sent:synthetic-user:ORDER_REFUNDED:synthetic-order");
    expect(f.redis.getJson).not.toHaveBeenCalled();
    expect(f.push.sendMiniSubscribeMsg).not.toHaveBeenCalled();
  });

  it("用户关闭推送后仍有站内通知，但不查询绑定账号或发推送", async () => {
    const f = fixture();
    f.redis.getJson.mockResolvedValueOnce({ PUSH_ENABLED: false });
    await expect(f.service.sendOnce("synthetic-user", "ORDER_PAID:synthetic-order", dto)).resolves.toEqual(f.row);
    await nextTurn();
    expect(f.prisma.auth.findMany).not.toHaveBeenCalled();
    expect(f.push.sendMiniSubscribeMsg).not.toHaveBeenCalled();
  });

  it("普通 send 仍等待可选推送完成，保持既有调用语义", async () => {
    const f = fixture();
    const prefs = deferred<{ PUSH_ENABLED: boolean }>();
    f.redis.getJson.mockReturnValueOnce(prefs.promise);
    let returned = false;
    const task = f.service.send("synthetic-user", dto).then(() => { returned = true; });
    try {
      await nextTurn();
      expect(returned).toBe(false);
    } finally {
      prefs.resolve({ PUSH_ENABLED: false });
      await task;
    }
    expect(returned).toBe(true);
  });

  it("真实支付事件方法与真实通知服务组合：推送准备卡住不拖住支付事件结果", async () => {
    const f = fixture();
    const prefs = deferred<{ PUSH_ENABLED: boolean }>();
    f.redis.getJson.mockReturnValueOnce(prefs.promise);
    const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
    type Args = ConstructorParameters<typeof ShopPaymentService>;
    const unused = {} as never;
    const payment = new ShopPaymentService(unused, unused, unused, unused,
      unused, webhook as unknown as Args[5], unused, unused, unused, unused,
      undefined, undefined, undefined, undefined, undefined, f.service);
    let returned = false;
    const task = payment.emitOrderPaidEvent({ id: "synthetic-order", userId: "synthetic-user", amount: new Prisma.Decimal(15) },
      "synthetic-intent", "WECHAT", "synthetic-transaction").then(() => { returned = true; });
    try {
      await nextTurn();
      expect(returned).toBe(true);
      expect(webhook.fire).toHaveBeenCalledTimes(1);
      expect(f.prisma.notification.create).toHaveBeenCalledTimes(1);
    } finally {
      prefs.resolve({ PUSH_ENABLED: false });
      await task;
      await nextTurn();
    }
  });

  it.each([false, true])("退款回调与真实通知服务组合，事务失败=%s：成功才建通知且不等待偏好", async (failTransaction) => {
    const f = fixture();
    const prefs = deferred<{ PUSH_ENABLED: boolean }>();
    f.redis.getJson.mockReturnValueOnce(prefs.promise);
    const order = { id: "synthetic-order", userId: "synthetic-user", type: "COURSE", status: "PAID",
      amount: 15, payAmount: null, payMethod: "WECHAT", payTransactionId: "synthetic-transaction" };
    let committed = false;
    const afterSale = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const executeRaw = jest.fn().mockResolvedValue(1);
    const transaction = jest.fn(async (run: (tx: unknown) => Promise<boolean>) => {
      const changed = await run({ order: { updateMany: async () => ({ count: 1 }) },
        afterSale, $executeRaw: executeRaw });
      if (failTransaction) throw new Error("合成事务提交失败");
      committed = true;
      return changed;
    });
    const prisma = { order: { findUnique: async () => order }, $transaction: transaction,
      afterSale };
    const redis = { setNX: async () => true, del: jest.fn().mockResolvedValue(undefined),
      delByPattern: async () => undefined };
    const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
    const entitlement = { revokeSourceWithTx: jest.fn().mockResolvedValue(undefined) };
    const create = f.prisma.notification.create.getMockImplementation()!;
    f.prisma.notification.create.mockImplementation((...args) => {
      expect(committed).toBe(true);
      return create(...args);
    });
    type Args = ConstructorParameters<typeof ShopRefundService>;
    const unused = {} as never;
    const refund = new ShopRefundService(prisma as unknown as Args[0], redis as unknown as Args[1],
      unused, unused, unused, { registerRefundNotifyHandler: () => undefined } as unknown as Args[5],
      unused, webhook as unknown as Args[7], entitlement as unknown as Args[8], undefined, f.service);
    let result = "pending";
    const task = refund.handleRefundNotify({ out_refund_no: "RFsynthetic-order", refund_status: "SUCCESS",
      transaction_id: "synthetic-transaction", refund_id: "synthetic-refund", amount: { refund: 1500, total: 1500 } })
      .then(() => { result = "success"; }, error => { result = error.message; });
    try {
      await nextTurn();
      expect(entitlement.revokeSourceWithTx).toHaveBeenCalledTimes(1);
      if (failTransaction) {
        expect(result).toBe("合成事务提交失败");
        expect(f.prisma.notification.create).not.toHaveBeenCalled();
        expect(webhook.fire).not.toHaveBeenCalled();
        expect(afterSale.updateMany).not.toHaveBeenCalled();
        expect(transaction).toHaveBeenCalledTimes(1);
        expect(executeRaw).toHaveBeenCalledTimes(1);
      } else {
        expect(result).toBe("success");
        expect(f.prisma.notification.create).toHaveBeenCalledTimes(1);
        expect(prisma.afterSale.updateMany).toHaveBeenCalledTimes(1);
        expect(transaction).toHaveBeenCalledTimes(2);
        expect(executeRaw).toHaveBeenCalledTimes(2);
      }
    } finally {
      prefs.resolve({ PUSH_ENABLED: false });
      await task;
      await nextTurn();
    }
    expect(redis.del).toHaveBeenCalledWith("refund:cb:RFsynthetic-order");
  });
});
