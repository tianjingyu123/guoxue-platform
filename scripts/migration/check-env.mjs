#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const envFile = args.find((arg) => !arg.startsWith("--")) || ".env";
const allowPlaceholders = args.includes("--allow-placeholders");
const fullCheck = args.includes("--full");

function parseEnv(content) {
  const result = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result.set(match[1], value);
  }
  return result;
}

function normalizeUrl(value) {
  return value.replace(/\/+$/, "");
}

function splitList(value) {
  return (value || "")
    .split(",")
    .map((item) => normalizeUrl(item.trim()))
    .filter(Boolean);
}

function hasAll(values, keys) {
  return keys.every((key) => Boolean(values.get(key)));
}

function hasAny(values, keys) {
  return keys.some((key) => Boolean(values.get(key)));
}

const resolvedEnvFile = path.resolve(envFile);
let envContent;
try {
  envContent = await readFile(resolvedEnvFile, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`错误：找不到环境文件 ${resolvedEnvFile}`);
    console.error("请先复制生产模板并填写新服务器、数据库、域名和真实密钥：");
    console.error("  PowerShell: Copy-Item docker/.env.production.example docker/.env.production");
    console.error("  Linux/macOS: cp docker/.env.production.example docker/.env.production");
    console.error("填写完成后运行：pnpm migration:check-env docker/.env.production --full");
    process.exit(2);
  }
  console.error(`错误：无法读取环境文件 ${resolvedEnvFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const values = parseEnv(envContent);
const errors = [];
const warnings = [];
const required = [
  "NODE_ENV",
  "DB_PASSWORD",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "BIGSCREEN_SECRET",
  "PUBLIC_DOMAIN",
  "PUBLIC_API_URL",
  "PUBLIC_H5_URL",
  "PUBLIC_ASSET_ORIGIN",
  "CORS_ORIGIN",
  "WS_CORS_ORIGIN",
  "NGINX_SERVER_NAMES",
  "VITE_API_URL",
  "VITE_PUBLIC_H5_URL",
  "VITE_PUBLIC_ASSET_ORIGIN",
];

for (const key of required) {
  if (!values.get(key)) errors.push(`${key} 未配置`);
}

if (values.get("NODE_ENV") && values.get("NODE_ENV") !== "production") {
  errors.push("NODE_ENV 必须为 production");
}

const placeholderPattern =
  /(<change_me>|change-me|example\.com|your-|password|secret123|guoxue123)/i;
for (const [key, value] of values.entries()) {
  if (!allowPlaceholders && value && placeholderPattern.test(value)) {
    errors.push(`${key} 仍包含示例、旧弱口令或占位值`);
  }
}

if (!allowPlaceholders) {
  const jwtBytes = Buffer.byteLength(values.get("JWT_SECRET") || "", "utf8");
  const encryptionBytes = Buffer.byteLength(values.get("ENCRYPTION_KEY") || "", "utf8");
  const bigscreenBytes = Buffer.byteLength(values.get("BIGSCREEN_SECRET") || "", "utf8");
  if (jwtBytes > 0 && jwtBytes < 64) errors.push("JWT_SECRET 必须至少 64 字节");
  if (encryptionBytes > 0 && encryptionBytes !== 32) {
    errors.push("ENCRYPTION_KEY 必须恰好 32 字节");
  }
  if (bigscreenBytes > 0 && bigscreenBytes < 32) {
    errors.push("BIGSCREEN_SECRET 必须至少 32 字节");
  }
}

const urlKeys = [
  "PUBLIC_API_URL",
  "PUBLIC_H5_URL",
  "PUBLIC_ASSET_ORIGIN",
  "VITE_API_URL",
  "VITE_PUBLIC_H5_URL",
  "VITE_PUBLIC_ASSET_ORIGIN",
  "WECHAT_PAY_NOTIFY_URL",
  "WECHAT_PAY_REFUND_NOTIFY_URL",
  "ALIPAY_NOTIFY_URL",
  "UNIONPAY_NOTIFY_URL",
  "HUIFU_NOTIFY_URL",
  "KUAIDI100_CALLBACK_URL",
];
const parsedUrls = new Map();
for (const key of urlKeys) {
  const value = values.get(key);
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && values.get("NODE_ENV") === "production") {
      errors.push(`${key} 在生产环境必须使用 HTTPS`);
    }
    parsedUrls.set(key, url);
  } catch {
    errors.push(`${key} 不是有效 URL`);
  }
}

const apiUrl = parsedUrls.get("PUBLIC_API_URL");
const h5Url = parsedUrls.get("PUBLIC_H5_URL");
const assetUrl = parsedUrls.get("PUBLIC_ASSET_ORIGIN");
const publicDomain = values.get("PUBLIC_DOMAIN") || "";
if (apiUrl && publicDomain && apiUrl.hostname !== publicDomain) {
  errors.push("PUBLIC_DOMAIN 必须与 PUBLIC_API_URL 的主机名一致");
}
if (
  apiUrl &&
  parsedUrls.get("VITE_API_URL") &&
  normalizeUrl(parsedUrls.get("VITE_API_URL").href) !== `${normalizeUrl(apiUrl.href)}/api/v1`
) {
  errors.push("VITE_API_URL 必须等于 PUBLIC_API_URL + /api/v1");
}
if (
  h5Url &&
  parsedUrls.get("VITE_PUBLIC_H5_URL") &&
  normalizeUrl(parsedUrls.get("VITE_PUBLIC_H5_URL").href) !== normalizeUrl(h5Url.href)
) {
  errors.push("VITE_PUBLIC_H5_URL 必须与 PUBLIC_H5_URL 一致");
}
if (
  assetUrl &&
  parsedUrls.get("VITE_PUBLIC_ASSET_ORIGIN") &&
  normalizeUrl(parsedUrls.get("VITE_PUBLIC_ASSET_ORIGIN").href) !== normalizeUrl(assetUrl.href)
) {
  errors.push("VITE_PUBLIC_ASSET_ORIGIN 必须与 PUBLIC_ASSET_ORIGIN 一致");
}

const corsOrigins = splitList(values.get("CORS_ORIGIN"));
const wsOrigins = splitList(values.get("WS_CORS_ORIGIN"));
if (h5Url && !corsOrigins.includes(h5Url.origin)) {
  errors.push("CORS_ORIGIN 未包含 PUBLIC_H5_URL 的 origin");
}
if (h5Url && !wsOrigins.includes(h5Url.origin)) {
  errors.push("WS_CORS_ORIGIN 未包含 PUBLIC_H5_URL 的 origin");
}
if (corsOrigins.includes("*") || wsOrigins.includes("*")) {
  errors.push("生产环境 CORS / WebSocket CORS 不允许使用 *");
}

const nginxNames = (values.get("NGINX_SERVER_NAMES") || "")
  .split(/\s+/)
  .filter(Boolean);
if (publicDomain && !nginxNames.includes(publicDomain)) {
  errors.push("NGINX_SERVER_NAMES 未包含 PUBLIC_DOMAIN");
}

const apiOrigin = apiUrl?.origin;
for (const key of urlKeys.slice(6)) {
  const url = parsedUrls.get(key);
  if (apiOrigin && url && url.origin !== apiOrigin) {
    warnings.push(`${key} 与 PUBLIC_API_URL 不同源，请确认第三方平台回调白名单`);
  }
}

const oldOrigins = splitList(values.get("MIGRATION_OLD_ORIGINS"));
for (const oldOrigin of oldOrigins) {
  if (!corsOrigins.includes(oldOrigin)) {
    warnings.push(`双域并行期 CORS_ORIGIN 尚未包含旧来源 ${oldOrigin}`);
  }
  if (!wsOrigins.includes(oldOrigin)) {
    warnings.push(`双域并行期 WS_CORS_ORIGIN 尚未包含旧来源 ${oldOrigin}`);
  }
}

const cookieDomain = (values.get("COOKIE_DOMAIN") || "").replace(/^\./, "");
if (cookieDomain && publicDomain && !publicDomain.endsWith(cookieDomain)) {
  warnings.push("COOKIE_DOMAIN 与 PUBLIC_DOMAIN 不在同一主域，请确认登录态策略");
}

if (fullCheck) {
  const groups = [
    {
      name: "对象存储",
      keys: ["COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET", "COS_REGION"],
    },
    {
      name: "腾讯云通用能力（内容审核 / ASR / TTS）",
      keys: ["TENCENT_SECRET_ID", "TENCENT_SECRET_KEY"],
    },
    {
      name: "即时通讯",
      keys: ["IM_APP_ID", "IM_ADMIN_KEY", "IM_ADMIN_ID"],
    },
    {
      name: "实时语音",
      keys: ["TRTC_SDK_APP_ID", "TRTC_SECRET_KEY"],
    },
    {
      name: "直播",
      keys: [
        "LIVE_PUSH_DOMAIN",
        "LIVE_PLAY_DOMAIN",
        "LIVE_PUSH_KEY",
        "LIVE_PLAY_KEY",
        "LIVE_APP_NAME",
      ],
    },
    {
      name: "点播",
      keys: ["VOD_SUB_APP_ID"],
    },
    {
      name: "短信",
      keys: ["SMS_APP_ID", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"],
    },
    {
      name: "快递物流",
      keys: [
        "KUAIDI100_API_KEY",
        "KUAIDI100_CUSTOMER",
        "KUAIDI100_CALLBACK_URL",
        "KUAIDI100_SALT",
      ],
    },
  ];
  for (const group of groups) {
    if (!hasAll(values, group.keys)) {
      warnings.push(`${group.name}配置不完整：${group.keys.filter((key) => !values.get(key)).join(", ")}`);
    }
  }

  const miniAppIds = ["WECHAT_MINI_APP_ID", "WECHAT_MP_APP_ID"];
  if (!hasAny(values, miniAppIds) || !values.get("WECHAT_APP_SECRET")) {
    warnings.push("微信小程序登录配置不完整：需小程序 AppId 与 WECHAT_APP_SECRET");
  }
  if (
    !hasAny(values, [
      "DEEPSEEK_API_KEY",
      "ANTHROPIC_API_KEY",
      "DASHSCOPE_API_KEY",
      "LOCAL_MODEL_API_KEY",
    ])
  ) {
    errors.push("至少必须配置一个生产 AI 模型提供方");
  }

  const paymentGroups = [
    ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_SERIAL_NO", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_NOTIFY_URL"],
    ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY", "ALIPAY_NOTIFY_URL"],
    ["UNIONPAY_MER_ID", "UNIONPAY_PRIVATE_KEY", "UNIONPAY_PUBLIC_KEY", "UNIONPAY_NOTIFY_URL"],
  ];
  if (!paymentGroups.some((group) => hasAll(values, group))) {
    warnings.push("尚未形成一条完整支付通道，付费业务上线前必须至少完成一条通道联调");
  }
}

console.log(
  `环境检查：读取 ${values.size} 个键（未输出任何值；模式：${fullCheck ? "完整上线" : "核心"}）`,
);
warnings.forEach((message) => console.log(`警告：${message}`));
errors.forEach((message) => console.error(`错误：${message}`));
if (errors.length > 0) process.exit(1);
console.log("环境检查通过");
