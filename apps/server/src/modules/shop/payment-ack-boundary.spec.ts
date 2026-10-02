import { Prisma, Order } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ShopPaymentService } from "./shop-payment.service";

describe.each(["WECHAT", "ALIPAY", "UNIONPAY"])("%s 支付事务冲突确认边界", (channel) => {
  const pending = {
    id: "synthetic-ack-order",
    userId: "synthetic-user",
    type: "PRODUCT",
    targetId: "synthetic-product",
    amount: new Prisma.Decimal(19),
    status: "PENDING",
    payTransactionId: "synthetic-intent",
  } as Order;
  const committed = {
    ...pending,
    status: "PAID",
    paidAt: new Date(),
    payMethod: channel,
    payTransactionId: "synthetic-trade",
  } as Order;
  let service: ShopPaymentService;
  let fresh: jest.Mock;
  let initial: jest.Mock;
  let fire: jest.Mock;
  let send: jest.Mock;
  const unique = () =>
    new Prisma.PrismaClientKnownRequestError("合成唯一键冲突", {
      code: "P2002",
      clientVersion: "test",
    });
  const call = () =>
    channel === "WECHAT"
      ? service.handlePaymentNotify({
          out_trade_no: "synthetic-intent",
          transaction_id: "synthetic-trade",
          attach: pending.id,
          trade_state: "SUCCESS",
          amount: { total: 1900 },
        })
      : channel === "ALIPAY"
        ? service.handleAlipayNotify({
            outTradeNo: "synthetic-intent",
            tradeNo: "synthetic-trade",
            tradeStatus: "TRADE_SUCCESS",
            totalAmount: "19.00",
          })
        : service.handleUnionpayNotify({
            outTradeNo: "synthetic-intent",
            tradeNo: "synthetic-trade",
            respCode: "00",
            amount: "1900",
          });
  beforeEach(() => {
    fresh = jest.fn().mockResolvedValue(committed);
    initial = jest.fn().mockResolvedValue(pending);
    const findUnique =
      channel === "WECHAT"
        ? jest.fn().mockImplementationOnce(initial).mockImplementation(fresh)
        : fresh;
    fire = jest.fn().mockResolvedValue(undefined);
    send = jest.fn().mockResolvedValue(undefined);
    service = new ShopPaymentService(
      { order: { findUnique, findFirst: initial } } as never,
      { setNX: async () => true, del: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      {} as never,
      {} as never,
      { fire } as never,
      {} as never,
      {} as never,
      { recordOrderCommissionAndFee: jest.fn() } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { sendOnce: send } as never,
    );
    jest
      .spyOn(service as unknown as { processPaidOrder: () => Promise<void> }, "processPaidOrder")
      .mockRejectedValue(unique());
  });

  it.each(["PAID", "SHIPPED", "COMPLETED", "REFUNDED"])(
    "已入账 %s 的终态重投必须保持正确通知语义",
    async (status) => {
      initial.mockResolvedValue({ ...committed, status });
      expect(await call()).toBe(true);
      if (status === "REFUNDED") {
        expect(fire).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
      } else expect(fire).toHaveBeenCalledWith("ORDER_PAID", expect.anything());
      expect(fresh).not.toHaveBeenCalled();
    },
  );
  it.each([{ status: "CANCELLED" }, { paidAt: null }])(
    "终态缺少有效入账事实不确认成功 %j",
    async (patch) => {
      initial.mockResolvedValue({ ...committed, ...patch });
      expect(await call()).toBe(false);
      expect(fire).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["未入账", { status: "PENDING" }],
    ["取消", { status: "CANCELLED" }],
    ["其他用户", { userId: "synthetic-other" }],
    ["其他业务", { type: "COURSE" }],
    ["其他权益", { targetId: "synthetic-other-target" }],
    ["金额不同", { amount: new Prisma.Decimal(20) }],
    ["没有入账时间", { paidAt: null }],
    ["其他渠道", { payMethod: "OTHER" }],
    ["另一笔流水", { payTransactionId: "synthetic-second-charge" }],
  ])("%s 的唯一键冲突不能确认成功", async (_name, patch) => {
    fresh.mockResolvedValue({ ...committed, ...patch });
    expect(await call()).toBe(false);
    expect(fire).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("订单不存在不能确认成功", async () => {
    fresh.mockResolvedValue(null);
    expect(await call()).toBe(false);
    expect(fire).not.toHaveBeenCalled();
  });
  it.each(["PAID", "SHIPPED", "COMPLETED"])(
    "核实同笔 %s 后补外发箱及幂等站内通知",
    async (status) => {
      fresh.mockResolvedValue({ ...committed, status });
      expect(await call()).toBe(true);
      expect(fire).toHaveBeenCalledWith(
        "ORDER_PAID",
        expect.objectContaining({
          orderId: pending.id,
          payMethod: channel,
          tradeNo: "synthetic-trade",
        }),
      );
      expect(send).toHaveBeenCalledWith(
        pending.userId,
        "ORDER_PAID:" + pending.id,
        expect.objectContaining({ targetId: pending.id }),
      );
    },
  );
  it("已退款的同笔流水可确认重投，但不再发送支付成功", async () => {
    fresh.mockResolvedValue({ ...committed, status: "REFUNDED" });
    expect(await call()).toBe(true);
    expect(fire).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("取消与订单CAS竞争后不能确认成功", async () => {
    jest
      .spyOn(service as unknown as { processPaidOrder: () => Promise<void> }, "processPaidOrder")
      .mockRejectedValue(new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更"));
    fresh.mockResolvedValue({ ...committed, status: "CANCELLED" });
    expect(await call()).toBe(false);
    expect(fire).not.toHaveBeenCalled();
  });
  it("查询故障保留失败，不伪造已入账", async () => {
    fresh.mockRejectedValue(new Error("synthetic read failure"));
    await expect(call()).rejects.toThrow("synthetic read failure");
    expect(send).not.toHaveBeenCalled();
  });
  it("非幂等事务错误不能吞掉", async () => {
    jest
      .spyOn(service as unknown as { processPaidOrder: () => Promise<void> }, "processPaidOrder")
      .mockRejectedValue(new Error("synthetic transaction failure"));
    await expect(call()).rejects.toThrow("synthetic transaction failure");
    expect(fresh).not.toHaveBeenCalled();
  });
  it("核实入账后站内通知失败不阻断确认", async () => {
    send.mockRejectedValue(new Error("synthetic notice failure"));
    expect(await call()).toBe(true);
  });
  it("外发箱持久化失败保留渠道重试，不回假成功", async () => {
    fire.mockRejectedValue(new Error("synthetic outbox failure"));
    await expect(call()).rejects.toThrow("synthetic outbox failure");
    expect(send).not.toHaveBeenCalled();
  });
});
