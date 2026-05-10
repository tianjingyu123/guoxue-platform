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
    service = new UnionpayService();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  // ───────── APP支付 ─────────
  describe("appPay", () => {
    it("应请求TN并通过backRequest返回", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve("tn=test_tn_12345&respCode=00"),
      });

      const result = await service.appPay({
        outTradeNo: "GXUN001",
        amount: 100,
        subject: "测试商品",
      });
      expect(result).toBe("test_tn_12345");
    });
  });

  // ───────── 网页支付 ─────────
  describe("webPay", () => {
    it("应生成自动提交HTML表单", async () => {
      const result = await service.webPay({
        outTradeNo: "GXUN003",
        amount: 200,
        subject: "网页商品",
        frontUrl: "https://example.com/done",
      });
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("GXUN003");
    });
  });

  // ───────── 云闪付H5 ─────────
  describe("quickPassPay", () => {
    it("应返回HTML表单", async () => {
      const result = await service.quickPassPay({
        outTradeNo: "GXUN004",
        amount: 300,
        subject: "云闪付商品",
      });
      expect(result).toContain("<!DOCTYPE html>");
    });
  });

  // ───────── 签名验证 ─────────
  describe("verifySign", () => {
    it("应返回 true 当签名有效", () => {
      expect(service.verifySign("data", "valid-sig")).toBe(true);
    });

    it("应返回 false 当签名无效", () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);
      expect(service.verifySign("data", "bad-sig")).toBe(false);
    });
  });

  // ───────── 订单查询 ─────────
  describe("query", () => {
    it("应查询订单并解析键值对响应", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve("respCode=00&respMsg=Success&txnAmt=100"),
      });

      const result = await service.query("GXUN001");
      expect(result.respCode).toBe("00");
    });
  });

  // ───────── 退款 ─────────
  describe("refund", () => {
    it("应发起退款", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve("respCode=00&respMsg=退款成功"),
      });

      const result = await service.refund({
        outTradeNo: "GXUN001",
        outRefundNo: "RF001",
        amount: 50,
        origQryId: "qry123",
      });
      expect(result.respCode).toBe("00");
    });
  });

  // ───────── genOutTradeNo ─────────
  describe("genOutTradeNo", () => {
    it("应生成商户订单号", () => {
      const no = UnionpayService.genOutTradeNo();
      expect(no).toMatch(/^GXUN\d+/);
    });
  });

  // ───────── buildNotifyResponse ─────────
  describe("buildNotifyResponse", () => {
    it("应返回 success", () => {
      expect(UnionpayService.buildNotifyResponse()).toBe("success");
    });
  });

  // ───────── 回调验证 ─────────
  describe("verifyNotify", () => {
    it("应拒绝无签名的回调", async () => {
      const result = await service.verifyNotify({ orderId: "o1" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("签名");
    });

    it("应拒绝验签失败的回调", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);

      const result = await service.verifyNotify({
        signature: "bad-sign",
        orderId: "o1",
        respCode: "00",
        txnAmt: "100",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("验签失败");
    });

    it("应拒绝超时通知", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(true);

      // 北京时间6分钟前
      const oldDate = new Date(Date.now() + 8 * 60 * 60 * 1000 - 6 * 60 * 1000);
      const oldTxnTime = oldDate.toISOString().slice(0, 19).replace(/[-:T]/g, "");

      const result = await service.verifyNotify({
        signature: "some-sign",
        orderId: "o1",
        respCode: "00",
        txnTime: oldTxnTime,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("超时");
    });

    it("应去重重复通知", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValue(true);

      // 生成北京时间（UTC+8）避免时区超时
      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const txnTime = now.toISOString().slice(0, 19).replace(/[-:T]/g, "");

      const params = {
        signature: "some-sign",
        orderId: "order-dup-1",
        respCode: "00",
        queryId: "q-dup-1",
        txnAmt: "100",
        txnTime,
      };

      await service.verifyNotify(params);
      const second = await service.verifyNotify(params);
      expect(second.data?.dedup).toBe(true);
    });
  });
});
