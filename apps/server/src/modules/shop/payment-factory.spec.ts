import { Test } from "@nestjs/testing";
import { PaymentProviderFactory } from "./payment-factory";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { HuifuService } from "../huifu/huifu.service";

describe("PaymentProviderFactory · 多渠道退款路由", () => {
  let factory: PaymentProviderFactory;
  const mockWechat = { isConfigured: true, refund: jest.fn().mockResolvedValue({ status: "PROCESSING" }) };
  const mockAlipay = { isConfigured: true, refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
  const mockUnionpay = { isConfigured: true, refund: jest.fn().mockResolvedValue({ status: "PROCESSING" }) };
  const mockHuifu = {
    isEnabled: jest.fn().mockResolvedValue(true),
    createRefund: jest.fn().mockResolvedValue({ refundStatus: "PROCESSING" }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        PaymentProviderFactory,
        { provide: WechatPayService, useValue: mockWechat },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: HuifuService, useValue: mockHuifu },
      ],
    }).compile();
    factory = mod.get(PaymentProviderFactory);
  });

  beforeEach(() => jest.clearAllMocks());

  const base = {
    orderId: "order1",
    outTradeNo: "otn-fallback",
    outRefundNo: "RForder1",
    totalYuan: 99,
    totalFen: 9900,
    refundRequestedAt: new Date("2026-07-22T07:00:00.000Z"),
  };

  it("微信有 transactionId 时仅按 transaction_id 退款", async () => {
    await factory.refund("WECHAT", { ...base, transactionId: "4200001234wx" });
    const arg = mockWechat.refund.mock.calls[0][0];
    expect(arg.transactionId).toBe("4200001234wx");
    expect(arg.outTradeNo).toBeUndefined();
  });

  it("微信无 transactionId 时按 out_trade_no 退款", async () => {
    await factory.refund("WECHAT", base);
    const arg = mockWechat.refund.mock.calls[0][0];
    expect(arg.outTradeNo).toBe("otn-fallback");
    expect(arg.transactionId).toBeUndefined();
  });

  it("支付宝透传 trade_no，不能丢失渠道交易号", async () => {
    await factory.refund("ALIPAY", { ...base, transactionId: "ali-trade-1" });
    expect(mockAlipay.refund).toHaveBeenCalledWith(expect.objectContaining({
      outTradeNo: "otn-fallback",
      tradeNo: "ali-trade-1",
      refundAmount: 99,
    }));
  });

  it("银联透传 origQryId 与平台订单号", async () => {
    await factory.refund("UNIONPAY", { ...base, transactionId: "union-query-1" });
    expect(mockUnionpay.refund).toHaveBeenCalledWith(expect.objectContaining({
      origQryId: "union-query-1",
      merchantOrderId: "order1",
      requestedAt: base.refundRequestedAt,
      amount: 9900,
    }));
  });

  it("汇付按平台订单号调用确定性退款，并标准化处理中状态", async () => {
    await expect(factory.refund("HUIFU", base)).resolves.toEqual({ status: "PROCESSING" });
    expect(mockHuifu.createRefund).toHaveBeenCalledWith({
      orderId: "order1",
      amount: 99,
      reason: "用户申请退款",
    });
  });

  it("未知渠道失败关闭，绝不回落微信", async () => {
    await expect(factory.refund("UNKNOWN", base)).rejects.toThrow("原支付渠道暂不支持自动退款");
    expect(mockWechat.refund).not.toHaveBeenCalled();
  });

  it("配置探针支持汇付，缺失或未知渠道均返回 false", async () => {
    await expect(factory.isConfigured("HUIFU")).resolves.toBe(true);
    await expect(factory.isConfigured("UNKNOWN")).resolves.toBe(false);
    await expect(factory.isConfigured("")).resolves.toBe(false);
  });
});