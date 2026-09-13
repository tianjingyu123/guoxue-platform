import { createSign, generateKeyPairSync } from "crypto";
import { WechatPayService } from "./wechat-pay.service";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const originalFetch = global.fetch;
const envKeys = ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_PRIVATE_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_SERIAL_NO", "WECHAT_PAY_PUBLIC_KEY", "WECHAT_PAY_PUBLIC_KEY_ID"];
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

describe("微信资金查询原始响应验签", () => {
  let svc: WechatPayService;
  function response(data: any = {}, options: { overrides?: Record<string, string>; status?: number; tamper?: boolean; body?: string } = {}) {
    const body = options.body ?? JSON.stringify({ mchid: "mch-1", out_trade_no: "GX-order", amount: { total: 100, currency: "CNY" }, trade_state: "NOTPAY", ...data }, null, 2);
    const timestamp = String(Math.floor(Date.now() / 1000)), nonce = "nonce123";
    const signer = createSign("sha256WithRSAEncryption");
    signer.update(`${timestamp}\n${nonce}\n${body}\n`);
    const headers: Record<string, string> = { "Wechatpay-Timestamp": timestamp, "Wechatpay-Nonce": nonce,
      "Wechatpay-Serial": "PUB_KEY_ID_TEST", "Wechatpay-Signature": signer.sign(keys.privateKey, "base64"), ...options.overrides };
    (global.fetch as jest.Mock).mockResolvedValue({ status: options.status ?? 200,
      text: async () => options.tamper ? body + " " : body,
      headers: { get: (key: string) => headers[key] ?? null } });
  }

  beforeEach(() => {
    process.env.WECHAT_PAY_MCH_ID = "mch-1";
    process.env.WECHAT_PAY_PRIVATE_KEY = keys.privateKey;
    delete process.env.WECHAT_PAY_PRIVATE_KEY_PATH;
    process.env.WECHAT_PAY_SERIAL_NO = "MERCHANT_SERIAL";
    process.env.WECHAT_PAY_PUBLIC_KEY = keys.publicKey;
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = "PUB_KEY_ID_TEST";
    global.fetch = jest.fn();
    svc = new WechatPayService();
  });
  afterAll(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it("真实RSA验证保留空白的原始响应，检查金额和商户单号", async () => {
    response();
    expect((await svc.queryOrderVerified("GX-order", 100)).trade_state).toBe("NOTPAY");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/GX-order?mchid=mch-1",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: expect.stringContaining('mchid="mch-1"') }) }),
    );
  });
  it("只改变响应末尾一个空格也拒绝", async () => {
    response({}, { tamper: true });
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("验签失败");
  });
  it.each(["Wechatpay-Timestamp", "Wechatpay-Nonce", "Wechatpay-Serial", "Wechatpay-Signature"])("缺少%s失败关闭", async (header) => {
    response({}, { overrides: { [header]: "" } });
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("签名信息无效");
  });
  it.each(["PUB_KEY_ID_OTHER", 'PUB_KEY_ID_TEST",timestamp="1'])("拒绝不匹配或注入的公钥序列号%s", async (serial) => {
    response({}, { overrides: { "Wechatpay-Serial": serial } });
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow();
  });
  it("未配置公钥ID不使用回调兼容宽松模式", async () => {
    response(); delete process.env.WECHAT_PAY_PUBLIC_KEY_ID;
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("签名信息无效");
  });
  it("过期响应不能恢复支付意图", async () => {
    response({}, { overrides: { "Wechatpay-Timestamp": String(Math.floor(Date.now() / 1000) - 301) } });
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("签名信息无效");
  });
  it("按准确证书序列号选取平台证书验签", async () => {
    response({}, { overrides: { "Wechatpay-Serial": "CERT123" } });
    const resolver = jest.spyOn(svc, "getPlatformCertBySerial").mockResolvedValue(keys.publicKey);
    expect((await svc.queryOrderVerified("GX-order", 100)).trade_state).toBe("NOTPAY");
    expect(resolver).toHaveBeenCalledWith("CERT123");
  });
  it("证书不可取得时失败关闭", async () => {
    response({}, { overrides: { "Wechatpay-Serial": "UNKNOWN_CERT" } });
    jest.spyOn(svc, "getPlatformCertBySerial").mockRejectedValue(new Error("missing certificate"));
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("验签失败");
  });
  it.each([{ mchid: "other" }, { out_trade_no: "other" }, { amount: { total: 99, currency: "CNY" } },
    { amount: { total: "100", currency: "CNY" } }, { amount: { total: 100, currency: "USD" } }, { amount: null }, { trade_state: "OTHER" }])("签名有效仍拒绝业务字段不符%j", async (data) => {
    response(data);
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("不匹配");
  });
  it("已验签ORDER_NOT_EXIST仍不可作为重建许可", async () => {
    response({ code: "ORDER_NOT_EXIST" }, { status: 404 });
    await expect(svc.queryOrderVerified("GX-order", 100)).rejects.toThrow("尚未确认");
  });
  it("无效金额在发送请求前拒绝", async () => {
    await expect(svc.queryOrderVerified("GX-order", 0)).rejects.toThrow("参数无效");
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it("HTTP204关单成功不尝试解析空JSON", async () => {
    const json = jest.fn().mockRejectedValue(new Error("empty body"));
    (global.fetch as jest.Mock).mockResolvedValue({ status: 204, json });
    await expect(svc.closeOrder("GX-order")).resolves.toEqual({});
    expect(json).not.toHaveBeenCalled();
  });
});
