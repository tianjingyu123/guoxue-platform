import { generateKeyPairSync } from "node:crypto";
import { getAppleIapSettings } from "./apple-iap.config";

const ENV_KEYS = [
  "APPLE_IAP_REQUIRED",
  "APPLE_IAP_KEY_ID",
  "APPLE_IAP_ISSUER_ID",
  "APPLE_IAP_PRIVATE_KEY_BASE64",
  "APPLE_IAP_PRIVATE_KEY",
  "APPLE_IAP_BUNDLE_ID",
  "APPLE_IAP_APP_APPLE_ID",
  "APPLE_IAP_ENVIRONMENT",
  "APPLE_IAP_PRODUCTS_JSON",
];

function validPrivateKey(): string {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

function configureValidAppleIap() {
  process.env.APPLE_IAP_KEY_ID = "52873GT6JV";
  process.env.APPLE_IAP_ISSUER_ID = "123e4567-e89b-42d3-a456-426614174000";
  process.env.APPLE_IAP_PRIVATE_KEY_BASE64 = Buffer.from(validPrivateKey()).toString("base64");
  process.env.APPLE_IAP_BUNDLE_ID = "com.rebu.iosapprebu";
  process.env.APPLE_IAP_APP_APPLE_ID = "6756602923";
  process.env.APPLE_IAP_PRODUCTS_JSON = JSON.stringify([
    { productId: "com.rebu.iosapprebu.coins1000", amountCoin: 1000, referenceRmb: 100 },
  ]);
}

describe("Apple IAP 配置", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("未配置且非必需时保持关闭", () => {
    const settings = getAppleIapSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.required).toBe(false);
    expect(settings.configured).toBe(false);
    expect(settings.problems).toEqual(
      expect.arrayContaining(["KEY_ID_MISSING", "ISSUER_ID_MISSING", "PRIVATE_KEY_MISSING"]),
    );
  });

  it("完整有效配置才启用", () => {
    configureValidAppleIap();
    process.env.APPLE_IAP_REQUIRED = "true";
    const settings = getAppleIapSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.required).toBe(true);
    expect(settings.configured).toBe(true);
    expect(settings.problems).toEqual([]);
  });

  it("拒绝无法解析或曲线不正确的私钥", () => {
    configureValidAppleIap();
    process.env.APPLE_IAP_PRIVATE_KEY_BASE64 = Buffer.from("not-a-private-key").toString("base64");
    const settings = getAppleIapSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.problems).toContain("PRIVATE_KEY_INVALID");
  });

  it("显式商品配置损坏时不静默启用默认商品", () => {
    configureValidAppleIap();
    process.env.APPLE_IAP_PRODUCTS_JSON = "{invalid-json";
    const settings = getAppleIapSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.problems).toContain("PRODUCTS_INVALID");
  });
});
