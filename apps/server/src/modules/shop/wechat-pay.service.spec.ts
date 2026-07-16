jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-hash"),
  }),
  createSign: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    sign: jest.fn().mockReturnValue("bW9ja193eHBheV9zaWduYXR1cmU="),
  }),
  createVerify: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    verify: jest.fn().mockReturnValue(true),
  }),
  createDecipheriv: jest.fn().mockReturnValue({
    setAuthTag: jest.fn().mockReturnThis(),
    setAAD: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnValue(Buffer.from('{"out_trade_no":"o1","trade_state":"SUCCESS"}')),
    final: jest.fn().mockReturnValue(Buffer.from("")),
  }),
  randomUUID: jest.fn().mockReturnValue("mock-uuid-no-dashes"),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn().mockReturnValue("mock-private-key-from-file"),
}));

import { WechatPayService } from "./wechat-pay.service";

describe("WechatPayService", () => {
  let service: WechatPayService;

  const mockFetchJson = (data: any, status = 200) => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  };

  beforeEach(() => {
    process.env.WECHAT_PAY_MCH_ID = "test_mch_123456";
    process.env.WECHAT_PAY_SERIAL_NO = "TEST_SERIAL_NO_001";
    process.env.WECHAT_PAY_API_V3_KEY = "test-api-v3-key-32chars!!!!!";
    process.env.WECHAT_PAY_PRIVATE_KEY = "mock-private-key-content";
    process.env.WECHAT_APP_ID = "wx_test_app_id";
    process.env.WECHAT_PAY_NOTIFY_URL = "https://example.com/wxpay/notify";
    delete (global as any).fetch;

    jest.clearAllMocks();
    service = new WechatPayService();
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  // ───────── JSAPI 支付 ─────────
  describe("createJsapiOrder", () => {
    it("应创建JSAPI订单并返回 prepayId + paySign", async () => {
      mockFetchJson({ prepay_id: "prepay_test_001" });

      const result = await service.createJsapiOrder({
        outTradeNo: "GX001",
        description: "测试商品",
        amount: { total: 100 },
        payer: { openid: "oTestUserOpenId" },
      });

      expect(result.prepayId).toBe("prepay_test_001");
      expect(result.paySign).toBeDefined();
      expect(result.paySign.appId).toBe("wx_test_app_id");
    });

    it("API错误时应抛出异常", async () => {
      mockFetchJson({ code: "PARAM_ERROR", message: "参数错误" }, 400);

      await expect(
        service.createJsapiOrder({
          outTradeNo: "GX_ERR",
          description: "错误",
          amount: { total: 100 },
          payer: { openid: "oUser1" },
        }),
      ).rejects.toThrow("微信支付失败");
    });

    it("appId 覆盖时（公众号内H5支付）下单与调起签名应使用同一覆盖 appid", async () => {
      mockFetchJson({ prepay_id: "prepay_oa_001" });

      const result = await service.createJsapiOrder({
        outTradeNo: "GX_OA",
        description: "公众号支付",
        amount: { total: 100 },
        payer: { openid: "oOaOpenId" },
        appId: "wx_official_app_id",
      });

      // 下单请求体 appid = 覆盖值（openid 与 appid 必须同应用）
      const fetchMock = (global as any).fetch as jest.Mock;
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.appid).toBe("wx_official_app_id");
      // 调起签名 appId 与下单一致，否则 getBrandWCPayRequest 验签失败
      expect(result.paySign.appId).toBe("wx_official_app_id");
    });

    it("未传 appId 时保持默认 appid（小程序支付不受影响）", async () => {
      mockFetchJson({ prepay_id: "prepay_mini_001" });

      const result = await service.createJsapiOrder({
        outTradeNo: "GX_MINI",
        description: "小程序支付",
        amount: { total: 100 },
        payer: { openid: "oMiniOpenId" },
      });

      const fetchMock = (global as any).fetch as jest.Mock;
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(body.appid).toBe("wx_test_app_id");
      expect(result.paySign.appId).toBe("wx_test_app_id");
    });
  });

  // ───────── APP 支付 ─────────
  describe("createAppOrder", () => {
    it("应创建APP订单", async () => {
      mockFetchJson({ prepay_id: "prepay_app_001" });

      const result = await service.createAppOrder({
        outTradeNo: "GX_APP_001",
        description: "APP商品",
        amount: { total: 500 },
      });

      expect(result.prepayId).toBe("prepay_app_001");
    });
  });

  // ───────── Native 支付 ─────────
  describe("createNativeOrder", () => {
    it("应创建扫码支付订单", async () => {
      mockFetchJson({ code_url: "weixin://wxpay/bizpayurl?pr=abc123" });

      const result = await service.createNativeOrder({
        outTradeNo: "GX_NATIVE_001",
        description: "扫码商品",
        amount: { total: 300 },
      });

      expect(result.codeUrl).toBe("weixin://wxpay/bizpayurl?pr=abc123");
    });
  });

  // ───────── H5 支付 ─────────
  describe("createH5Order", () => {
    it("应创建H5支付订单", async () => {
      mockFetchJson({ h5_url: "https://wx.tenpay.com/h5/pay/xxx" });

      const result = await service.createH5Order({
        outTradeNo: "GX_H5_001",
        description: "H5商品",
        amount: { total: 400 },
        sceneInfo: { payerClientIp: "127.0.0.1" },
      });

      expect(result.h5Url).toBe("https://wx.tenpay.com/h5/pay/xxx");
    });
  });

  // ───────── 订单查询 ─────────
  describe("queryOrder", () => {
    it("应查询订单状态", async () => {
      mockFetchJson({ trade_state: "SUCCESS", out_trade_no: "GX001" });

      const result = await service.queryOrder("GX001");
      expect(result.trade_state).toBe("SUCCESS");
    });
  });

  // ───────── 退款 ─────────
  describe("refund", () => {
    it("应按商户订单号退款", async () => {
      mockFetchJson({ status: "PROCESSING", out_refund_no: "RF001" });

      const result = await service.refund({
        outTradeNo: "GX001",
        outRefundNo: "RF001",
        amount: { refund: 50, total: 100 },
        reason: "用户申请退款",
      });

      expect(result.status).toBe("PROCESSING");
    });

    it("应按交易单号退款", async () => {
      mockFetchJson({ status: "SUCCESS", out_refund_no: "RF002" });

      const result = await service.refund({
        transactionId: "txn_001",
        outRefundNo: "RF002",
        amount: { refund: 100, total: 100 },
      });

      expect(result.status).toBe("SUCCESS");
    });
  });

  // ───────── 签名头解析 ─────────
  describe("parseNotifySign", () => {
    it("应正确解析签名头", () => {
      const header = 'WECHATPAY2-SHA256-RSA2048 timestamp="1234567890",nonce_str="abc123",signature="sig-value",serial_no="SERIAL001"';
      const result = service.parseNotifySign(header);

      expect(result).not.toBeNull();
      expect(result!.timestamp).toBe("1234567890");
      expect(result!.nonce).toBe("abc123");
      expect(result!.signature).toBe("sig-value");
      expect(result!.serialNo).toBe("SERIAL001");
    });

    it("解析失败应返回 null", () => {
      const result = service.parseNotifySign("invalid-header");
      expect(result).toBeNull();
    });
  });

  // ───────── 时间戳验证 ─────────
  describe("isTimestampValid", () => {
    it("应认为当前时间戳有效", () => {
      const now = Math.floor(Date.now() / 1000);
      expect(WechatPayService.isTimestampValid(String(now))).toBe(true);
    });

    it("应拒绝过期时间戳", () => {
      const old = Math.floor(Date.now() / 1000) - 600;
      expect(WechatPayService.isTimestampValid(String(old))).toBe(false);
    });
  });

  // ───────── AES解密 ─────────
  describe("aesGcmDecrypt", () => {
    it("应解密 AES-256-GCM 数据", () => {
      const result = service.aesGcmDecrypt("ad", "nonce12345", "aa".repeat(50));
      expect(result).toBe('{"out_trade_no":"o1","trade_state":"SUCCESS"}');
    });
  });

  // ───────── 分账管理 ─────────
  describe("profit sharing", () => {
    it("应添加分账接收方", async () => {
      mockFetchJson({ account: "partner_mch_001" });
      const result = await service.addProfitSharingReceiver({
        type: "MERCHANT_ID", account: "partner_mch_001", relationType: "PARTNER",
      });
      expect(result.account).toBe("partner_mch_001");
    });

    it("应查询分账接收方列表", async () => {
      mockFetchJson({ data: [] });
      const result = await service.listProfitSharingReceivers();
      expect(result).toBeDefined();
    });

    it("应创建分账订单", async () => {
      mockFetchJson({ out_order_no: "ps_001" });
      const result = await service.createProfitSharing({
        outTradeNo: "GX001", outOrderNo: "ps_001",
        receivers: [{ type: "MERCHANT_ID", account: "m1", amount: 50, description: "分账" }],
      });
      expect(result.out_order_no).toBe("ps_001");
    });

    it("应完结分账", async () => {
      mockFetchJson({});
      const result = await service.finishProfitSharing({ outOrderNo: "ps_001", description: "完结" });
      expect(result).toBeDefined();
    });

    it("应查询剩余待分金额", async () => {
      mockFetchJson({ unsplit_amount: 100 });
      const result = await service.queryUnsplitAmount("txn_001");
      expect(result.unsplit_amount).toBe(100);
    });
  });

  // ───────── 账单 ─────────
  describe("bills", () => {
    it("应申请交易账单", async () => {
      mockFetchJson({ download_url: "https://api.mch.weixin.qq.com/v3/billdownload/file?token=xxx" });
      const result = await service.getTradeBill({ billDate: "2025-01-01" });
      expect(result.download_url).toBeDefined();
    });

    it("应下载账单文件", async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: () => Promise.resolve("交易时间,商户订单号,交易金额\n2025-01-01,o1,100"),
      });

      const result = await service.downloadBillFile("https://api.mch.weixin.qq.com/v3/billdownload/file?token=xxx");
      expect(result).toContain("交易时间");
    });
  });

  // ───────── 回调验证 ─────────
  describe("verifyAndDecryptNotify", () => {
    it("签名头解析失败应返回错误", async () => {
      const result = await service.verifyAndDecryptNotify("bad-header", "{}");
      expect(result.valid).toBe(false);
    });

    it("应处理无资源字段的通知", async () => {
      mockFetchJson({ data: [] }); // getPlatformCerts -> callApi

      const header = 'WECHATPAY2-SHA256-RSA2048 timestamp="1234567890",nonce_str="abc",signature="sig",serial_no="SERIAL001"';
      const body = JSON.stringify({ id: "evt-001", event_type: "TRANSACTION.SUCCESS" });

      const result = await service.verifyAndDecryptNotify(header, body);
      expect(result).toBeDefined();
    });
  });
});
