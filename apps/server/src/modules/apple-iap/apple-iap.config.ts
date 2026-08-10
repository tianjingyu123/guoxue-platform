import { existsSync, readFileSync } from "node:fs";

export interface AppleIapProductConfig {
  productId: string;
  amountCoin: number;
  referenceRmb: number;
  popular?: boolean;
}

export interface AppleIapSettings {
  enabled: boolean;
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
  { productId: "com.rebu.iosapprebu.coins2000", amountCoin: 2000, referenceRmb: 200, popular: true },
  { productId: "com.rebu.iosapprebu.coins5000", amountCoin: 5000, referenceRmb: 500 },
];

function readPrivateKey(): string {
  const base64 = process.env.APPLE_IAP_PRIVATE_KEY_BASE64?.trim();
  if (base64) return Buffer.from(base64, "base64").toString("utf8").trim();

  const configured = process.env.APPLE_IAP_PRIVATE_KEY?.trim();
  if (!configured) return "";
  if (configured.includes("BEGIN PRIVATE KEY")) return configured.replace(/\\n/g, "\n");
  if (existsSync(configured)) return readFileSync(configured, "utf8").trim();
  return configured.replace(/\\n/g, "\n");
}

function readProducts(): AppleIapProductConfig[] {
  const raw = process.env.APPLE_IAP_PRODUCTS_JSON?.trim();
  if (!raw) return DEFAULT_PRODUCTS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_PRODUCTS;
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
      .filter((row) => row.productId && Number.isInteger(row.amountCoin) && row.amountCoin > 0 && row.referenceRmb > 0);
    const unique = new Set(products.map((item) => item.productId));
    return products.length > 0 && unique.size === products.length ? products : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

export function getAppleIapSettings(): AppleIapSettings {
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim() || "";
  const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim() || "";
  const privateKey = readPrivateKey();
  const rawEnvironment = process.env.APPLE_IAP_ENVIRONMENT?.trim().toUpperCase();
  const environment = rawEnvironment === "SANDBOX" || rawEnvironment === "PRODUCTION"
    ? rawEnvironment
    : "AUTO";
  return {
    enabled: Boolean(keyId && issuerId && privateKey),
    keyId,
    issuerId,
    privateKey,
    bundleId: process.env.APPLE_IAP_BUNDLE_ID?.trim() || "com.rebu.iosapprebu",
    appAppleId: Number(process.env.APPLE_IAP_APP_APPLE_ID || 6756602923),
    environment,
    products: readProducts(),
  };
}
