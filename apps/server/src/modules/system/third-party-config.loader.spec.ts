process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 字节，供 crypto 测试

import {
  ThirdPartyConfigLoader,
  WECHAT_PAY_RUNTIME_CONFIG_SOURCE,
} from "./third-party-config.loader";
import { encrypt, decrypt } from "../../common/crypto.util";

const mockPrisma: any = {
  configSystem: { findMany: jest.fn(), findUnique: jest.fn() },
};

describe("ThirdPartyConfigLoader", () => {
  let loader: ThirdPartyConfigLoader;
  beforeEach(() => {
    mockPrisma.configSystem.findMany.mockReset();
    mockPrisma.configSystem.findUnique.mockReset();
    delete process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE];
    delete process.env.WECHAT_PAY_CALLBACK_KEY_MODE;
    delete process.env.WECHAT_OPEN_APP_ID;
    delete process.env.WECHAT_OPEN_APP_SECRET;
    delete process.env.APPLE_IAP_REQUIRED;
    delete process.env.APPLE_IAP_KEY_ID;
    delete process.env.APPLE_IAP_ISSUER_ID;
    delete process.env.APPLE_IAP_PRIVATE_KEY;
    delete process.env.APPLE_IAP_BUNDLE_ID;
    delete process.env.APPLE_IAP_APP_APPLE_ID;
    delete process.env.APPLE_IAP_ENVIRONMENT;
    delete process.env.APPLE_IAP_PRODUCTS_JSON;
    for (const key of [
      "WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_ALLOWED_MCH_ID", "WECHAT_PAY_API_V3_KEY",
      "WECHAT_PAY_SERIAL_NO", "WECHAT_PAY_PRIVATE_KEY", "WECHAT_PAY_NOTIFY_URL", "WECHAT_PAY_REFUND_NOTIFY_URL",
      "ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY", "ALIPAY_NOTIFY_URL",
      "HUIFU_MERCHANT_ID", "HUIFU_APP_ID", "HUIFU_PRODUCT_ID", "HUIFU_RSA_PRIVATE_KEY", "HUIFU_RSA_PUBLIC_KEY", "HUIFU_NOTIFY_URL",
      "UNIONPAY_MER_ID", "UNIONPAY_PFX_PATH", "UNIONPAY_PFX_PASSWORD", "UNIONPAY_PUBLIC_KEY", "UNIONPAY_NOTIFY_URL",
    ]) delete process.env[key];
    loader = new ThirdPartyConfigLoader(mockPrisma);
  });

  it("syncToEnv：解密 DB 配置写回 process.env", async () => {
    const stored = encrypt(JSON.stringify({ apiKey: "sk-test-ABCD1234" }));
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.deepseek", configValue: stored },
    ]);
    delete process.env.DEEPSEEK_API_KEY;
    const n = await loader.syncToEnv();
    expect(n).toBe(1);
    expect(process.env.DEEPSEEK_API_KEY).toBe("sk-test-ABCD1234");
  });

  it("多套 env 命名：小程序 appId 写入全部变量名（兼容代码不统一命名）", async () => {
    const stored = encrypt(JSON.stringify({ appId: "wx-mini-123" }));
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.wechat_mini", configValue: stored },
    ]);
    await loader.syncToEnv();
    expect(process.env.WECHAT_MINI_APP_ID).toBe("wx-mini-123");
    expect(process.env.MINIPROGRAM_APP_ID).toBe("wx-mini-123");
    expect(process.env.WECHAT_MP_APP_ID).toBe("wx-mini-123");
  });

  it("开放平台移动应用配置写入 APP 微信登录实际读取的变量", async () => {
    const stored = encrypt(JSON.stringify({ appId: "wx-open-app", appSecret: "open-secret" }));
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.wechat_open", configValue: stored },
    ]);

    await loader.syncToEnv();

    expect(process.env.WECHAT_OPEN_APP_ID).toBe("wx-open-app");
    expect(process.env.WECHAT_OPEN_APP_SECRET).toBe("open-secret");
  });

  it("buildDisplayValue：敏感字段掩码、非敏感原样（明文不出后端）", () => {
    const stored = encrypt(JSON.stringify({ apiKey: "sk-secret-9876", baseUrl: "https://api.x" }));
    const display = JSON.parse(loader.buildDisplayValue("third_party.deepseek", stored));
    expect(display.apiKey).toBe("****9876");
    expect(display.baseUrl).toBe("https://api.x");
  });

  it("buildStoredValue：掩码值不覆盖真值、新值更新、加密存储", async () => {
    const existing = encrypt(JSON.stringify({ apiKey: "sk-real-key", baseUrl: "https://old" }));
    mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: existing });
    const stored = await loader.buildStoredValue(
      "third_party.deepseek",
      JSON.stringify({ apiKey: "****key", baseUrl: "https://new" }),
    );
    expect(stored).not.toContain("sk-real"); // 密文
    const merged = JSON.parse(decrypt(stored));
    expect(merged.apiKey).toBe("sk-real-key"); // 掩码值不覆盖
    expect(merged.baseUrl).toBe("https://new"); // 新值更新
  });

  it("env 兜底：DB 无配置时不写 env（保留 .env 原值）", async () => {
    mockPrisma.configSystem.findMany.mockResolvedValue([]);
    process.env.DEEPSEEK_API_KEY = "from-dotenv";
    const n = await loader.syncToEnv();
    expect(n).toBe(0);
    expect(process.env.DEEPSEEK_API_KEY).toBe("from-dotenv"); // 兜底不变
    expect(process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE]).toBe("ENV");
  });

  it("微信支付配置完整时标记为数据库来源", async () => {
    const stored = encrypt(
      JSON.stringify({
        appId: "wx-current",
        mchId: "1748964663",
        serialNo: "SERIAL_CURRENT",
        apiV3Key: "12345678901234567890123456789012",
        privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
      }),
    );
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.wechat_pay", configValue: stored },
    ]);

    await loader.syncToEnv();

    expect(process.env.WECHAT_PAY_MCH_ID).toBe("1748964663");
    expect(process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE]).toBe("DB");
  });

  it("微信支付公钥模式缺少公钥材料时拒绝标记为数据库来源", async () => {
    const stored = encrypt(
      JSON.stringify({
        appId: "wx-current",
        mchId: "1748964663",
        serialNo: "SERIAL_CURRENT",
        apiV3Key: "12345678901234567890123456789012",
        privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
        publicKeyId: "PUB_KEY_ID_CURRENT",
      }),
    );
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.wechat_pay", configValue: stored },
    ]);

    await loader.syncToEnv();

    expect(process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE]).toBe("INVALID");
  });

  it("微信支付公钥和公钥 ID 成对配置时允许标记为数据库来源", async () => {
    const stored = encrypt(
      JSON.stringify({
        appId: "wx-current",
        mchId: "1748964663",
        serialNo: "SERIAL_CURRENT",
        apiV3Key: "12345678901234567890123456789012",
        privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
        publicKey: "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----",
        publicKeyId: "PUB_KEY_ID_CURRENT",
      }),
    );
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.wechat_pay", configValue: stored },
    ]);

    await loader.syncToEnv();

    expect(process.env.WECHAT_PAY_PUBLIC_KEY_ID).toBe("PUB_KEY_ID_CURRENT");
    expect(process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE]).toBe("DB");
  });

  it("数据库读取失败时禁止把环境变量视为安全支付配置", async () => {
    process.env.WECHAT_PAY_MCH_ID = "1740184141";
    mockPrisma.configSystem.findMany.mockRejectedValue(new Error("db unavailable"));

    await loader.syncToEnv();

    expect(process.env[WECHAT_PAY_RUNTIME_CONFIG_SOURCE]).toBe("ERROR");
  });

  it("支付就绪度只返回缺项与来源，不泄露密钥", async () => {
    const stored = encrypt(JSON.stringify({
      appId: "wx-current",
      mchId: "1748964663",
      allowedMchId: "1748964663",
      serialNo: "SERIAL_CURRENT",
      apiV3Key: "12345678901234567890123456789012",
      privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
      notifyUrl: "https://api.example.com/api/v1/shop/pay/notify",
      refundNotifyUrl: "https://api.example.com/api/v1/shop/refund/notify",
    }));
    mockPrisma.configSystem.findMany.mockResolvedValue([{ configKey: "third_party.wechat_pay", configValue: stored, updatedAt: new Date() }]);

    const result = await loader.getPaymentReadiness();
    const wechat = result.items.find((item) => item.key === "wechat_pay");

    expect(wechat).toEqual(expect.objectContaining({
      configurationStatus: "COMPLETE",
      source: "DATABASE",
      missingFields: [],
      invalidFields: [],
    }));
    expect(JSON.stringify(result)).not.toContain("12345678901234567890123456789012");
    expect(JSON.stringify(result)).not.toContain("BEGIN PRIVATE KEY");
  });

  it("支付就绪度明确指出商户白名单不一致和缺项", async () => {
    const stored = encrypt(JSON.stringify({
      appId: "wx-current",
      mchId: "1748964663",
      allowedMchId: "0000000000",
      notifyUrl: "http://localhost/notify",
    }));
    mockPrisma.configSystem.findMany.mockResolvedValue([{ configKey: "third_party.wechat_pay", configValue: stored, updatedAt: new Date() }]);

    const result = await loader.getPaymentReadiness();
    const wechat = result.items.find((item) => item.key === "wechat_pay")!;
    expect(wechat.configurationStatus).toBe("INCOMPLETE");
    expect(wechat.missingFields).toEqual(expect.arrayContaining(["APIv3 密钥", "商户私钥（内容或路径）"]));
    expect(wechat.invalidFields.join(" ")).toContain("白名单");
    expect(wechat.invalidFields.join(" ")).toContain("公网 HTTPS");
  });

  it("Apple IAP 配置从数据库同步到运行时并保持私钥掩码", async () => {
    const stored = encrypt(
      JSON.stringify({
        required: "true",
        keyId: "52873GT6JV",
        issuerId: "123e4567-e89b-42d3-a456-426614174000",
        privateKey: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
        bundleId: "com.rebu.iosapprebu",
        appAppleId: "6756602923",
        environment: "AUTO",
        productsJson: JSON.stringify([
          {
            productId: "com.rebu.iosapprebu.coins1000",
            amountCoin: 1000,
            referenceRmb: 100,
          },
        ]),
      }),
    );
    mockPrisma.configSystem.findMany.mockResolvedValue([
      { configKey: "third_party.apple_iap", configValue: stored },
    ]);

    const written = await loader.syncToEnv();
    const display = JSON.parse(loader.buildDisplayValue("third_party.apple_iap", stored));

    expect(written).toBe(8);
    expect(process.env.APPLE_IAP_KEY_ID).toBe("52873GT6JV");
    expect(process.env.APPLE_IAP_ISSUER_ID).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(process.env.APPLE_IAP_BUNDLE_ID).toBe("com.rebu.iosapprebu");
    expect(process.env.APPLE_IAP_PRODUCTS_JSON).toContain("coins1000");
    expect(display.privateKey).toBe("****----");
  });
});
