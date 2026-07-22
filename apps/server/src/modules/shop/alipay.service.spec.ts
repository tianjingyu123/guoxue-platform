jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  createSign: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    sign: jest.fn().mockReturnValue("bW9ja19zaWduYXR1cmU="),
  }),
  createVerify: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    verify: jest.fn().mockReturnValue(true),
  }),
  randomUUID: jest.fn().mockReturnValue("mock-uuid-xxxx"),
}));

import { AlipayService } from "./alipay.service";

describe("AlipayService", () => {
  let service: AlipayService;

  const envelopeResponse = (responseKey: string, payload: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ [responseKey]: payload, sign: "valid-sign" }),
  });

  const mockFetchJson = (data: unknown) => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });
  };

  beforeEach(() => {
    process.env.ALIPAY_APP_ID = "test_app_123";
    process.env.ALIPAY_PRIVATE_KEY = "mock-private-key-content";
    process.env.ALIPAY_PUBLIC_KEY = "mock-public-key-content";
    process.env.ALIPAY_SANDBOX = "true";
    process.env.ALIPAY_NOTIFY_URL = "https://example.com/alipay/notify";
    delete (global as any).fetch;
    jest.clearAllMocks();
    const { createVerify } = require("crypto");
    createVerify().verify.mockReturnValue(true);
    service = new AlipayService();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe("支付请求", () => {
    it("APP支付应生成已签名参数串", async () => {
      const result = await service.appPay({ outTradeNo: "GXALI001", totalAmount: 99.99, subject: "测试商品" });
      expect(result).toContain("alipay.trade.app.pay");
      expect(result).toContain("bW9ja19zaWduYXR1cmU");
    });

    it("WAP与PC支付应生成网关URL", async () => {
      await expect(service.wapPay({ outTradeNo: "GXALI003", totalAmount: 199, subject: "WAP商品" }))
        .resolves.toContain("alipay.trade.wap.pay");
      await expect(service.pagePay({ outTradeNo: "GXALI004", totalAmount: 299, subject: "PC商品" }))
        .resolves.toContain("alipay.trade.page.pay");
    });
  });

  describe("query", () => {
    it("应查询订单状态", async () => {
      mockFetchJson({ alipay_trade_query_response: { code: "10000", trade_status: "TRADE_SUCCESS" } });
      await expect(service.query("GXALI001")).resolves.toBeDefined();
    });

    it("网络错误应抛出异常", async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error("Network error"));
      await expect(service.query("GXALI_FAIL")).rejects.toThrow("Network error");
    });
  });

  describe("refund", () => {
    it("fund_change=Y 才直接确认退款成功，并优先使用 trade_no", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue(
        envelopeResponse("alipay_trade_refund_response", {
          code: "10000", fund_change: "Y", trade_no: "202607220001", out_trade_no: "GXALI001",
        }),
      );
      const result = await service.refund({
        outTradeNo: "GXALI001",
        tradeNo: "202607220001",
        refundAmount: 50,
        outRefundNo: "RF001",
      });
      expect(result.status).toBe("SUCCESS");
      const init = (global as any).fetch.mock.calls[0][1];
      const body = new URLSearchParams(init.body);
      const biz = JSON.parse(body.get("biz_content") || "{}");
      expect(biz.trade_no).toBe("202607220001");
      expect(biz.out_trade_no).toBeUndefined();
      expect(body.getAll("sign")).toHaveLength(1);
    });

    it("fund_change=N 时查询同一请求号，REFUND_SUCCESS 才确认成功", async () => {
      (global as any).fetch = jest.fn()
        .mockResolvedValueOnce(envelopeResponse("alipay_trade_refund_response", {
          code: "10000", fund_change: "N", out_trade_no: "GXALI001",
        }))
        .mockResolvedValueOnce(envelopeResponse("alipay_trade_fastpay_refund_query_response", {
          code: "10000", refund_status: "REFUND_SUCCESS",
          out_trade_no: "GXALI001", out_request_no: "RF-STABLE-001",
        }));
      const result = await service.refund({
        outTradeNo: "GXALI001",
        refundAmount: 50,
        outRefundNo: "RF-STABLE-001",
      });
      expect(result.status).toBe("SUCCESS");
      const queryBody = new URLSearchParams((global as any).fetch.mock.calls[1][1].body);
      expect(JSON.parse(queryBody.get("biz_content") || "{}").out_request_no).toBe("RF-STABLE-001");
    });

    it("查询未明确成功时保持 PROCESSING，不提前本地记账", async () => {
      (global as any).fetch = jest.fn()
        .mockResolvedValueOnce(envelopeResponse("alipay_trade_refund_response", {
          code: "10000", fund_change: "N", out_trade_no: "GXALI001",
        }))
        .mockResolvedValueOnce(envelopeResponse("alipay_trade_fastpay_refund_query_response", {
          code: "10000", refund_status: "REFUND_PROCESSING",
          out_trade_no: "GXALI001", out_request_no: "RF002",
        }));
      await expect(service.refund({
        outTradeNo: "GXALI001", refundAmount: 50, outRefundNo: "RF002",
      })).resolves.toEqual(expect.objectContaining({ status: "PROCESSING" }));
    });

    it("有效签名但交易号或退款请求号不匹配时必须失败关闭", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue(
        envelopeResponse("alipay_trade_refund_response", {
          code: "10000", fund_change: "Y", trade_no: "OTHER-TRADE",
        }),
      );
      await expect(service.refund({
        outTradeNo: "GXALI001", tradeNo: "202607220001", refundAmount: 50, outRefundNo: "RF-ID",
      })).rejects.toThrow("交易标识不匹配");

      (global as any).fetch = jest.fn().mockResolvedValue(
        envelopeResponse("alipay_trade_fastpay_refund_query_response", {
          code: "10000", refund_status: "REFUND_SUCCESS",
          out_trade_no: "GXALI001", out_request_no: "OTHER-REQUEST",
        }),
      );
      await expect(service.queryRefund({
        outTradeNo: "GXALI001", outRefundNo: "RF-ID",
      })).rejects.toThrow("交易标识不匹配");
    });

    it("业务码失败或响应验签失败必须失败关闭", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue(
        envelopeResponse("alipay_trade_refund_response", { code: "40004", sub_msg: "交易不存在" }),
      );
      await expect(service.refund({
        outTradeNo: "GXALI404", refundAmount: 50, outRefundNo: "RF404",
      })).rejects.toThrow("交易不存在");

      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      (global as any).fetch = jest.fn().mockResolvedValue(
        envelopeResponse("alipay_trade_refund_response", { code: "10000", fund_change: "Y" }),
      );
      await expect(service.refund({
        outTradeNo: "GXALI001", refundAmount: 50, outRefundNo: "RF-BAD-SIGN",
      })).rejects.toThrow("支付宝响应验签失败");
    });
  });

  it("网关 timestamp 按 GMT+8 输出，不能受服务器 UTC 时区影响", () => {
    expect((service as any).formatGatewayTimestamp(new Date("2026-07-22T00:00:00.000Z"))).toBe("2026-07-22 08:00:00");
  });

  describe("其它能力", () => {
    it("关闭订单应生成URL", async () => {
      await expect(service.close("GXALI001")).resolves.toContain("alipay.trade.close");
    });

    it("应生成默认与自定义前缀商户订单号", () => {
      expect(AlipayService.genOutTradeNo()).toMatch(/^GXALI\d+/);
      expect(AlipayService.genOutTradeNo("MYAPP")).toMatch(/^MYAPP\d+/);
    });
  });

  describe("verifyNotify", () => {
    it("应拒绝无签名字段的回调", async () => {
      const result = await service.verifyNotify({ out_trade_no: "o1" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("签名");
    });

    it("应拒绝其它应用的已签名回调", async () => {
      const result = await service.verifyNotify({
        sign: "valid-sign", app_id: "other_app", out_trade_no: "o1", trade_status: "TRADE_SUCCESS",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("应用标识不匹配");
    });

    it("应拒绝验签失败的回调", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      const result = await service.verifyNotify({
        sign: "bad-sign", app_id: "test_app_123", out_trade_no: "o1", trade_status: "TRADE_SUCCESS", total_amount: "100.00",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("验签失败");
    });

    it("签名有效的延迟重投仍交由订单幂等处理", async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const result = await service.verifyNotify({
        sign: "valid-sign", app_id: "test_app_123", out_trade_no: "o1", trade_status: "TRADE_SUCCESS", notify_time: oldTime,
      });
      expect(result.valid).toBe(true);
    });

    it("验签阶段不提前去重，重复通知交由订单状态幂等", async () => {
      const now = new Date().toISOString();
      const params = {
        sign: "valid-sign",
        app_id: "test_app_123",
        out_trade_no: "o2",
        trade_status: "TRADE_SUCCESS",
        total_amount: "100.00",
        notify_id: "notify-dup-1",
        notify_time: now,
      };
      const first = await service.verifyNotify(params);
      const second = await service.verifyNotify(params);
      expect(first).toEqual(expect.objectContaining({
        valid: true,
        data: expect.objectContaining({ outTradeNo: "o2", totalAmount: 100 }),
      }));
      expect(second).toEqual(expect.objectContaining({
        valid: true,
        data: expect.objectContaining({ outTradeNo: "o2", totalAmount: 100 }),
      }));
      expect(second.data?.dedup).toBeUndefined();
    });
  });
});