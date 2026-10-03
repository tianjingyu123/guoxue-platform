import { createPrivateKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

export interface AppleIapProductConfig {
  productId: string;
  amountCoin: number;
  referenceRmb: number;
  popular?: boolean;
}

export interface AppleIapSettings {
  enabled: boolean;
  required: boolean;
  configured: boolean;
  problems: string[];
  keyId: string;
  issuerId: string;
  privateKey: string;
  bundleId: string;
  appAppleId: number;
  environment: "AUTO" | "SANDBOX" | "PRODUCTION";
  products: AppleIapProductConfig[];
}

const DEFAULT_PRODUCTS: AppleIapProductConfig[] = [
  { productId: "com.rebu.iosapprebu.coins1000", amountCoin: 1000, referenceRmb: 100 },
  {
    productId: "com.rebu.iosapprebu.coins2000",
    amountCoin: 2000,
    referenceRmb: 200,
    popular: true,
  },
  { productId: "com.rebu.iosapprebu.coins5000", amountCoin: 5000, referenceRmb: 500 },
];

function readPrivateKey(): string {
  try {
    const base64 = process.env.APPLE_IAP_PRIVATE_KEY_BASE64?.trim();
    if (base64) return Buffer.from(base64, "base64").toString("utf8").trim();

    const configured = process.env.APPLE_IAP_PRIVATE_KEY?.trim();
    if (!configured) return "";
    if (configured.includes("BEGIN PRIVATE KEY")) return configured.replace(/\\n/g, "\n");
    if (existsSync(configured)) return readFileSync(configured, "utf8").trim();
    return configured.replace(/\\n/g, "\n");
  } catch {
    return "";
  }
}

function readProducts(): { products: AppleIapProductConfig[]; valid: boolean } {
  const raw = process.env.APPLE_IAP_PRODUCTS_JSON?.trim();
  if (!raw) return { products: DEFAULT_PRODUCTS, valid: true };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { products: DEFAULT_PRODUCTS, valid: false };
    const products = parsed
      .map((item) => {
        const row = item as Partial<AppleIapProductConfig>;
        return {
          productId: String(row.productId || "").trim(),
          amountCoin: Number(row.amountCoin),
          referenceRmb: Number(row.referenceRmb),
          popular: Boolean(row.popular),
        };
      })
      .filter(
        (row) =>
          row.productId &&
          Number.isInteger(row.amountCoin) &&
          row.amountCoin > 0 &&
          row.referenceRmb > 0,
      );
    const unique = new Set(products.map((item) => item.productId));
    const valid = products.length > 0 && unique.size === products.length;
    return { products: valid ? products : DEFAULT_PRODUCTS, valid };
  } catch {
    return { products: DEFAULT_PRODUCTS, valid: false };
  }
}

function isValidPrivateKey(privateKey: string): boolean {
  if (!privateKey) return false;
  try {
    const key = createPrivateKey(privateKey);
    return key.asymmetricKeyType === "ec" && key.asymmetricKeyDetails?.namedCurve === "prime256v1";
  } catch {
    return false;
  }
}

export function getAppleIapSettings(): AppleIapSettings {
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim() || "";
  const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim() || "";
  const privateKey = readPrivateKey();
  const required = process.env.APPLE_IAP_REQUIRED?.trim().toLowerCase() === "true";
  const configured = Boolean(keyId || issuerId || privateKey);
  const bundleId = process.env.APPLE_IAP_BUNDLE_ID?.trim() || "com.rebu.iosapprebu";
  const appAppleId = Number(process.env.APPLE_IAP_APP_APPLE_ID || 6756602923);
  const productResult = readProducts();
  const problems: string[] = [];
  if (!keyId) problems.push("KEY_ID_MISSING");
  else if (!/^[A-Z0-9]{10}$/u.test(keyId)) problems.push("KEY_ID_INVALID");
  if (!issuerId) problems.push("ISSUER_ID_MISSING");
  else if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(issuerId)
  ) {
    problems.push("ISSUER_ID_INVALID");
  }
  if (!privateKey) problems.push("PRIVATE_KEY_MISSING");
  else if (!isValidPrivateKey(privateKey)) problems.push("PRIVATE_KEY_INVALID");
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*){2,}$/u.test(bundleId)) {
    problems.push("BUNDLE_ID_INVALID");
  }
  if (!Number.isSafeInteger(appAppleId) || appAppleId <= 0) problems.push("APP_APPLE_ID_INVALID");
  if (!productResult.valid) problems.push("PRODUCTS_INVALID");
  const rawEnvironment = process.env.APPLE_IAP_ENVIRONMENT?.trim().toUpperCase();
  const environment =
    rawEnvironment === "SANDBOX" || rawEnvironment === "PRODUCTION" ? rawEnvironment : "AUTO";
  return {
    enabled: problems.length === 0,
    required,
    configured,
    problems,
    keyId,
    issuerId,
    privateKey,
    bundleId,
    appAppleId,
    environment,
    products: productResult.products,
  };
}
