jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-hash-digest"),
  }),
  createSign: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    sign: jest.fn().mockReturnValue("bW9ja191bmlvbnBheV9zaWdu"),
  }),
  createVerify: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    verify: jest.fn().mockReturnValue(true),
  }),
}));

import { UnionpayService } from "./unionpay.service";

describe("UnionpayService", () => {
  let service: UnionpayService;

  beforeEach(() => {
    process.env.UNIONPAY_MER_ID = "test_merchant_123";
    process.env.UNIONPAY_PRIVATE_KEY = "mock-unionpay-private-key";
    process.env.UNIONPAY_PUBLIC_KEY = "mock-unionpay-public-key";
    process.env.UNIONPAY_SANDBOX = "true";
    process.env.UNIONPAY_NOTIFY_URL = "https://example.com/unionpay/notify";
    delete (global as any).fetch;
    jest.clearAllMocks();
    const { createVerify } = require("crypto");
    createVerify().verify.mockReturnValue(true);
    service = new UnionpayService();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe("支付与查询", () => {
    it("后台热更新验签公钥后当前实例立即读取新配置", () => {
      expect(service.isConfigured).toBe(true);
      delete process.env.UNIONPAY_PUBLIC_KEY;
      expect(service.isConfigured).toBe(false);
      process.env.UNIONPAY_PUBLIC_KEY = "new-unionpay-public-key";
      expect(service.isConfigured).toBe(true);
    });

    it("APP支付应请求并返回TN", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("tn=test_tn_12345&respCode=00"),
      });
      await expect(service.appPay({ outTradeNo: "GXUN001", amount: 100, subject: "测试商品" }))
        .resolves.toBe("test_tn_12345");
    });

    it("网页支付与云闪付H5应返回自动提交表单", async () => {
      await expect(service.webPay({
        outTradeNo: "GXUN003", amount: 200, subject: "网页商品", frontUrl: "https://example.com/done",
      })).resolves.toContain("GXUN003");
      await expect(service.quickPassPay({
        outTradeNo: "GXUN004", amount: 300, subject: "云闪付商品",
      })).resolves.toContain("<!DOCTYPE html>");
    });

    it("应查询订单并解析键值对响应", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("respCode=00&respMsg=Success&txnAmt=100"),
      });
      await expect(service.query("GXUN001")).resolves.toEqual(expect.objectContaining({ respCode: "00" }));
    });
  });

  describe("refund", () => {
    it("同步 00 仅表示受理，应返回 PROCESSING 并提交原 queryId/平台订单号", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("signature=bW9ja191bmlvbnBheV9zaWdu%3D%3D&merId=test_merchant_123&orderId=RForder001&origQryId=qry123&respCode=00&respMsg=Accepted"),
      });
      const result = await service.refund({
        outTradeNo: "GXUN001",
        outRefundNo: "RF-order-001",
        amount: 5000,
        origQryId: "qry123",
        merchantOrderId: "platform-order-1",
        requestedAt: new Date("2026-07-22T07:00:00.000Z"),
      });
      expect(result.status).toBe("PROCESSING");
      expect(result.raw.respCode).toBe("00");
      const body = new URLSearchParams((global as any).fetch.mock.calls[0][1].body);
      expect(body.get("txnType")).toBe("04");
      expect(body.get("origQryId")).toBe("qry123");
      expect(body.get("reqReserved")).toBe("platform-order-1");
      expect(body.get("orderId")).toBe("RForder001");
      expect(body.get("txnTime")).toBe("20260722150000");
    });

    it("缺少原交易 queryId 必须失败关闭", async () => {
      await expect(service.refund({
        outTradeNo: "GXUN001", outRefundNo: "RForder001", amount: 5000,
      })).rejects.toThrow("银联原交易流水号缺失");
      expect((global as any).fetch).toBeUndefined();
    });

    it("响应验签失败或 respCode 非 00 必须拒绝", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("signature=bad&merId=test_merchant_123&orderId=RForder001&respCode=00"),
      });
      await expect(service.refund({
        outTradeNo: "GXUN001", outRefundNo: "RForder001", amount: 5000, origQryId: "qry123",
      })).rejects.toThrow("银联退款响应验签失败");

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("signature=valid&merId=test_merchant_123&orderId=RForder001&origQryId=qry123&respCode=34&respMsg=Original%20transaction%20missing"),
      });
      await expect(service.refund({
        outTradeNo: "GXUN001", outRefundNo: "RForder001", amount: 5000, origQryId: "qry123",
      })).rejects.toThrow("Original transaction missing");
    });
  });

  it("网关时间按 GMT+8 输出，不能把 UTC 字符串冒充中国时间", () => {
    expect((service as any).formatTxnTime(new Date("2026-07-22T00:00:00.000Z"))).toBe("20260722080000");
  });

  describe("签名与工具", () => {
    it("签名验证应返回真实验证结果", () => {
      expect(service.verifySign("data", "valid-sig")).toBe(true);
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      expect(service.verifySign("data", "bad-sig")).toBe(false);
    });

    it("应生成商户订单号和标准回调响应", () => {
      expect(UnionpayService.genOutTradeNo()).toMatch(/^GXUN\d+/);
      expect(UnionpayService.buildNotifyResponse()).toBe("success");
    });
  });

  describe("verifyNotify", () => {
    it("应拒绝无签名和验签失败，但接收已验签的延迟重投", async () => {
      expect((await service.verifyNotify({ orderId: "o1" })).valid).toBe(false);
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      expect((await service.verifyNotify({
        signature: "bad-sign", orderId: "o1", respCode: "00", txnAmt: "100",
      })).error).toContain("验签失败");

      const oldDate = new Date(Date.now() + 8 * 60 * 60 * 1000 - 6 * 60 * 1000);
      const oldTxnTime = oldDate.toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const delayed = await service.verifyNotify({
        signature: "some-sign", merId: "test_merchant_123", orderId: "o1", respCode: "00", txnTime: oldTxnTime,
        queryId: "q1", txnAmt: "100",
      });
      expect(delayed.valid).toBe(true);
    });

    it("应拒绝其它商户的已签名回调", async () => {
      const result = await service.verifyNotify({
        signature: "some-sign", merId: "other_merchant", orderId: "o1", respCode: "00",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("商户号不匹配");
    });

    it("退款成功和失败回调均应保留路由、订单与金额字段", async () => {
      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const txnTime = now.toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const common = {
        signature: "some-sign",
        merId: "test_merchant_123",
        orderId: "RForder002",
        txnType: "04",
        reqReserved: "platform-order-2",
        origQryId: "query-2",
        txnAmt: "8800",
        txnTime,
      };
      const success = await service.verifyNotify({ ...common, respCode: "00", queryId: "refund-query-2" });
      expect(success.data).toEqual(expect.objectContaining({
        txnType: "04", merchantOrderId: "platform-order-2", amount: 8800, respCode: "00",
      }));

      const failed = await service.verifyNotify({ ...common, orderId: "RForder003", respCode: "34", respMsg: "失败" });
      expect(failed.data).toEqual(expect.objectContaining({
        txnType: "04", merchantOrderId: "platform-order-2", amount: 8800, respCode: "34",
      }));
    });

    it("验签阶段不提前去重，重复通知交由订单状态幂等", async () => {
      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const txnTime = now.toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const params = {
        signature: "some-sign", merId: "test_merchant_123", orderId: "order-dup-1", respCode: "00",
        queryId: "q-dup-1", txnAmt: "100", txnTime,
      };
      const first = await service.verifyNotify(params);
      const second = await service.verifyNotify(params);
      expect(first.data).toEqual(expect.objectContaining({ outTradeNo: "order-dup-1", tradeNo: "q-dup-1", amount: 100 }));
      expect(second.data).toEqual(expect.objectContaining({ outTradeNo: "order-dup-1", tradeNo: "q-dup-1", amount: 100 }));
      expect(second.data?.dedup).toBeUndefined();
    });
  });
});
