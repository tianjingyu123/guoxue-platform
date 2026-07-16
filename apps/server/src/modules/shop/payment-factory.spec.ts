import { Test } from "@nestjs/testing";
import { PaymentProviderFactory } from "./payment-factory";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";

describe("PaymentProviderFactory · 微信退款字段修复(后端审计P1-2)", () => {
  let factory: PaymentProviderFactory;
  const mockWechat = { refund: jest.fn().mockResolvedValue({ status: "PROCESSING" }) };
  const mockAlipay = { refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };
  const mockUnionpay = { refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        PaymentProviderFactory,
        { provide: WechatPayService, useValue: mockWechat },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
      ],
    }).compile();
    factory = mod.get(PaymentProviderFactory);
  });

  beforeEach(() => jest.clearAllMocks());

  const base = { outTradeNo: "otn-fallback", outRefundNo: "RForder1", totalYuan: 99, totalFen: 9900 };

  it("有 transactionId → 微信退款按 transaction_id 退(不传 out_trade_no)", async () => {
    await factory.refund("WECHAT", { ...base, transactionId: "4200001234wx" });
    const arg = mockWechat.refund.mock.calls[0][0];
    expect(arg.transactionId).toBe("4200001234wx");
    expect(arg.outTradeNo).toBeUndefined(); // 二选一,不同时下发
  });

  it("无 transactionId → 回退按 out_trade_no 退", async () => {
    await factory.refund("WECHAT", { ...base });
    const arg = mockWechat.refund.mock.calls[0][0];
    expect(arg.outTradeNo).toBe("otn-fallback");
    expect(arg.transactionId).toBeUndefined();
  });

  it("支付宝退款不受影响,仍按 outTradeNo", async () => {
    await factory.refund("ALIPAY", { ...base, transactionId: "should-be-ignored" });
    const arg = mockAlipay.refund.mock.calls[0][0];
    expect(arg.outTradeNo).toBe("otn-fallback");
  });
});
