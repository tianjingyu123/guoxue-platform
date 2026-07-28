#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const envFile = args.find((arg) => !arg.startsWith("--")) || ".env";
const allowPlaceholders = args.includes("--allow-placeholders");

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
    ) value = value.slice(1, -1);
    result.set(match[1], value);
  }
  return result;
}

const resolvedEnvFile = path.resolve(envFile);
let envContent;
try {
  envContent = await readFile(resolvedEnvFile, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`错误：找不到环境文件 ${resolvedEnvFile}`);
    console.error("请先从模板创建环境文件并填写新服务器、数据库、域名和真实密钥：");
    console.error(`  PowerShell: Copy-Item .env.example ${envFile}`);
    console.error(`  Linux/macOS: cp .env.example ${envFile}`);
    console.error(`填写完成后重新运行：pnpm migration:check-env ${envFile}`);
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
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "BIGSCREEN_SECRET",
  "PUBLIC_DOMAIN",
  "PUBLIC_API_URL",
  "PUBLIC_H5_URL",
  "CORS_ORIGIN",
];

for (const key of required) {
  if (!values.get(key)) errors.push(`${key} 未配置`);
}

const placeholderPattern = /(change-me|example\.com|your-|password|secret123)/i;
for (const key of ["DATABASE_URL", "JWT_SECRET", "ENCRYPTION_KEY", "BIGSCREEN_SECRET"]) {
  const value = values.get(key) || "";
  if (!allowPlaceholders && value && placeholderPattern.test(value)) {
    errors.push(`${key} 仍是示例或弱值`);
  }
}

const urlKeys = [
  "PUBLIC_API_URL",
  "PUBLIC_H5_URL",
  "PUBLIC_ASSET_ORIGIN",
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
      errors.push(`${key} 生产环境必须使用 HTTPS`);
    }
    parsedUrls.set(key, url);
  } catch {
    errors.push(`${key} 不是有效 URL`);
  }
}

const apiOrigin = parsedUrls.get("PUBLIC_API_URL")?.origin;
for (const key of urlKeys.slice(3)) {
  const url = parsedUrls.get(key);
  if (apiOrigin && url && url.origin !== apiOrigin) {
    warnings.push(`${key} 与 PUBLIC_API_URL 不同源，请确认第三方平台白名单`);
  }
}

const h5Origin = parsedUrls.get("PUBLIC_H5_URL")?.origin;
const corsOrigins = (values.get("CORS_ORIGIN") || "")
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);
if (h5Origin && !corsOrigins.includes(h5Origin)) {
  errors.push("CORS_ORIGIN 未包含 PUBLIC_H5_URL 的 origin");
}
if (corsOrigins.includes("*")) errors.push("启用凭证的 CORS 不允许使用 *");

const oldOrigins = (values.get("MIGRATION_OLD_ORIGINS") || "")
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);
for (const oldOrigin of oldOrigins) {
  if (!corsOrigins.includes(oldOrigin)) {
    warnings.push(`双域并行期间 CORS_ORIGIN 尚未包含旧来源 ${oldOrigin}`);
  }
}

const publicDomain = values.get("PUBLIC_DOMAIN") || "";
const cookieDomain = (values.get("COOKIE_DOMAIN") || "").replace(/^\./, "");
if (cookieDomain && publicDomain && !publicDomain.endsWith(cookieDomain)) {
  warnings.push("COOKIE_DOMAIN 与 PUBLIC_DOMAIN 不在同一主域，请确认登录态策略");
}

console.log(`环境检查：读取 ${values.size} 个键（未输出任何值）`);
warnings.forEach((message) => console.log(`警告：${message}`));
errors.forEach((message) => console.error(`错误：${message}`));
if (errors.length > 0) process.exit(1);
console.log("环境检查通过");
