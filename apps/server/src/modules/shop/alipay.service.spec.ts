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

  const mockFetchJson = (data: any) => {
    (global as any).fetch = jest.fn().mockResolvedValue({
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
    service = new AlipayService();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  // ───────── APP支付 ─────────
  describe("appPay", () => {
    it("应生成APP支付签名字符串", async () => {
      const result = await service.appPay({
        outTradeNo: "GXALI001",
        totalAmount: 99.99,
        subject: "测试商品",
      });
      expect(result).toContain("alipay.trade.app.pay");
      expect(result).toContain("bW9ja19zaWduYXR1cmU");
    });
  });

  // ───────── WAP支付 ─────────
  describe("wapPay", () => {
    it("应生成WAP支付URL", async () => {
      const result = await service.wapPay({
        outTradeNo: "GXALI003",
        totalAmount: 199.00,
        subject: "WAP商品",
      });
      expect(result).toContain("alipay.trade.wap.pay");
    });
  });

  // ───────── PC网页支付 ─────────
  describe("pagePay", () => {
    it("应生成PC支付URL", async () => {
      const result = await service.pagePay({
        outTradeNo: "GXALI004",
        totalAmount: 299.00,
        subject: "PC商品",
      });
      expect(result).toContain("alipay.trade.page.pay");
    });
  });

  // ───────── 订单查询 ─────────
  describe("query", () => {
    it("应查询订单状态", async () => {
      mockFetchJson({ alipay_trade_query_response: { code: "10000", trade_status: "TRADE_SUCCESS" } });

      const result = await service.query("GXALI001");
      expect(result).toBeDefined();
    });

    it("网络错误应抛出异常", async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error("Network error"));
      await expect(service.query("GXALI_FAIL")).rejects.toThrow("Network error");
    });
  });

  // ───────── 退款 ─────────
  describe("refund", () => {
    it("应生成退款URL", async () => {
      const result = await service.refund({
        outTradeNo: "GXALI001",
        refundAmount: 50.00,
        outRefundNo: "RF001",
      });
      expect(result).toContain("alipay.trade.refund");
    });
  });

  // ───────── 关闭订单 ─────────
  describe("close", () => {
    it("应生成关闭订单URL", async () => {
      const result = await service.close("GXALI001");
      expect(result).toContain("alipay.trade.close");
    });
  });

  // ───────── genOutTradeNo ─────────
  describe("genOutTradeNo", () => {
    it("应生成默认前缀的商户订单号", () => {
      const no = AlipayService.genOutTradeNo();
      expect(no).toMatch(/^GXALI\d+/);
    });

    it("应生成自定义前缀的商户订单号", () => {
      const no = AlipayService.genOutTradeNo("MYAPP");
      expect(no).toMatch(/^MYAPP\d+/);
    });
  });

  // ───────── 回调验证 ─────────
  describe("verifyNotify", () => {
    it("应拒绝无签名字段的回调", async () => {
      const result = await service.verifyNotify({ out_trade_no: "o1" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("签名");
    });

    it("应拒绝验签失败的回调", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(false);

      const result = await service.verifyNotify({
        sign: "bad-sign",
        out_trade_no: "o1",
        trade_status: "TRADE_SUCCESS",
        total_amount: "100.00",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("验签失败");
    });

    it("应拒绝超时通知", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValueOnce(true);

      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const result = await service.verifyNotify({
        sign: "valid-sign",
        out_trade_no: "o1",
        trade_status: "TRADE_SUCCESS",
        notify_time: oldTime,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("超时");
    });

    it("应去重重复通知", async () => {
      const { createVerify } = require("crypto");
      createVerify().verify.mockReturnValue(true);

      const now = new Date().toISOString();
      const params = {
        sign: "valid-sign",
        out_trade_no: "o2",
        trade_status: "TRADE_SUCCESS",
        total_amount: "100.00",
        notify_id: "notify-dup-1",
        notify_time: now,
      };

      const first = await service.verifyNotify(params);
      expect(first.valid).toBe(true);

      const second = await service.verifyNotify(params);
      expect(second.valid).toBe(true);
      expect(second.data?.dedup).toBe(true);
    });
  });
});
