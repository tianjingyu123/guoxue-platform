#!/usr/bin/env node

import { createPrivateKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const args = process.argv.slice(2);
let envFile = ".env";
let reportFile = "";
let hasEnvFile = false;
let allowPlaceholders = false;
let fullCheck = false;
let deployTarget = "";
let nodeRole = "operations";
let releaseChannel = "production";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--allow-placeholders") {
    allowPlaceholders = true;
    continue;
  }
  if (arg === "--full") {
    fullCheck = true;
    continue;
  }
  if (arg === "--deploy-target") {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error("错误：--deploy-target 后必须提供 standard 或 tencent");
      process.exit(2);
    }
    deployTarget = value.trim().toLowerCase();
    index += 1;
    continue;
  }
  if (arg === "--node-role") {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error("错误：--node-role 后必须提供 app 或 operations");
      process.exit(2);
    }
    nodeRole = value.trim().toLowerCase();
    index += 1;
    continue;
  }
  if (arg === "--release-channel") {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error("错误：--release-channel 后必须提供 production 或 staging");
      process.exit(2);
    }
    releaseChannel = value.trim().toLowerCase();
    index += 1;
    continue;
  }
  if (arg === "--report") {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      console.error("错误：--report 后必须提供 JSON 报告路径");
      process.exit(2);
    }
    reportFile = value;
    index += 1;
    continue;
  }
  if (arg.startsWith("--")) {
    console.error(`错误：未知参数 ${arg}`);
    process.exit(2);
  }
  if (hasEnvFile) {
    console.error(`错误：只能指定一个环境文件，发现多余参数 ${arg}`);
    process.exit(2);
  }
  envFile = arg;
  hasEnvFile = true;
}

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

function parseMailbox(value) {
  const input = String(value || "").trim();
  const bracketed = input.match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/u);
  const email = (bracketed?.[2] || input).trim().toLowerCase();
  const match = email.match(/^[^@\s]+@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/iu);
  if (!match || !match[1].includes(".")) return null;
  return { email, domain: match[1].toLowerCase() };
}

const resolvedEnvFile = path.resolve(envFile);
let envContent;
try {
  envContent = await readFile(resolvedEnvFile, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`错误：找不到环境文件 ${resolvedEnvFile}`);
    console.error("请先把生产模板复制到仓库外的受控路径，并填写新服务器、数据库、域名和真实密钥。");
    console.error(
      "填写完成后运行：pnpm migration:check-env <受控环境文件> --full --deploy-target standard|tencent --node-role app|operations",
    );
    process.exit(2);
  }
  console.error(`错误：无法读取环境文件 ${resolvedEnvFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const values = parseEnv(envContent);
const errors = [];
const warnings = [];

if (deployTarget && !["standard", "tencent"].includes(deployTarget)) {
  errors.push("DEPLOY_TARGET 仅允许 standard 或 tencent");
}
if (fullCheck && !deployTarget) {
  errors.push("完整上线检查必须通过 --deploy-target 显式指定 standard 或 tencent");
}
if (!new Set(["app", "operations"]).has(nodeRole)) {
  errors.push("NODE_ROLE 仅允许 app 或 operations");
}
if (!new Set(["production", "staging"]).has(releaseChannel)) {
  errors.push("RELEASE_CHANNEL 仅允许 production 或 staging");
}
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
  "STORAGE_PROVIDER",
  "CORS_ORIGIN",
  "WS_CORS_ORIGIN",
  "NGINX_SERVER_NAMES",
  "VITE_API_URL",
  "VITE_PUBLIC_H5_URL",
  "VITE_PUBLIC_ASSET_ORIGIN",
  "PAIPAN_MODE",
  "PAIPAN_LEGACY_DISPLAY_VERSION",
  "PAIPAN_NATIVE_QA_ENABLED",
  "PAIPAN_OPERATION_H5_BASE",
  "PAIPAN_USER_LOOKUP_URL",
  "PAIPAN_PARTNER_OPEN_URL",
  "PAIPAN_PARTNER_OAUTH_URL",
  "PAIPAN_REFERRAL_BASE",
];
if (fullCheck && deployTarget === "tencent") {
  required.push(
    "TENCENT_REGION",
    "TENCENT_CLB_ID",
    "TENCENT_CDN_DOMAIN",
    "TENCENT_CERTIFICATE_DOMAIN",
    "TENCENTDB_CA_CERT_PATH",
  );
}

for (const key of required) {
  if (!values.get(key)) errors.push(`${key} 未配置`);
}

if (values.get("NODE_ENV") && values.get("NODE_ENV") !== "production") {
  errors.push("NODE_ENV 必须为 production");
}

const storageProvider = (values.get("STORAGE_PROVIDER") || "").trim().toLowerCase();
if (storageProvider && !["auto", "local", "cos"].includes(storageProvider)) {
  errors.push("STORAGE_PROVIDER 仅支持 auto、local 或 cos");
}
const tencentCredentialMode = (values.get("TENCENT_CREDENTIAL_MODE") || "static")
  .trim()
  .toLowerCase();
if (!["static", "instance-role"].includes(tencentCredentialMode)) {
  errors.push("TENCENT_CREDENTIAL_MODE 仅支持 static 或 instance-role");
}
const cosKeys =
  tencentCredentialMode === "instance-role"
    ? ["TENCENT_CVM_ROLE_NAME", "COS_BUCKET", "COS_REGION"]
    : ["COS_SECRET_ID", "COS_SECRET_KEY", "COS_BUCKET", "COS_REGION"];
if (storageProvider === "cos" && !hasAll(values, cosKeys)) {
  errors.push(
    `STORAGE_PROVIDER=cos 时配置不完整：${cosKeys.filter((key) => !values.get(key)).join(", ")}`,
  );
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

const emailMode = (values.get("EMAIL_MODE") || "").trim().toLowerCase();
const emailConnectionKeys = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_API_URL",
  "EMAIL_API_KEY",
  "EMAIL_FROM",
];
const emailConnectionConfigured = hasAny(values, emailConnectionKeys);
if (emailMode && !["smtp", "api", "disabled"].includes(emailMode)) {
  errors.push("EMAIL_MODE 仅允许 smtp、api 或 disabled");
}
if (!emailMode && emailConnectionConfigured) {
  errors.push("邮件连接已填写但 EMAIL_MODE 未明确指定为 smtp 或 api");
}
if (emailMode === "disabled" && emailConnectionConfigured) {
  errors.push("EMAIL_MODE=disabled 时不得残留 SMTP、邮件 API 或发件人配置");
}
const emailFromMailbox = parseMailbox(values.get("EMAIL_FROM"));
if ((emailMode === "smtp" || emailMode === "api") && !emailFromMailbox) {
  errors.push("启用邮件时 EMAIL_FROM 必须是合法邮箱或“名称 <邮箱>”格式");
}
if (emailMode === "smtp") {
  const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"];
  if (!hasAll(values, smtpKeys)) {
    errors.push(`SMTP 邮件配置不完整：${smtpKeys.filter((key) => !values.get(key)).join(", ")}`);
  }
  const smtpPort = Number(values.get("SMTP_PORT"));
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    errors.push("SMTP_PORT 必须是 1-65535 的整数");
  } else if (smtpPort !== 465) {
    errors.push("当前内置 SMTP 客户端仅支持 465 隐式 TLS；STARTTLS 请改用受支持的邮件 API 通道");
  }
  if (
    values.get("NODE_ENV") === "production" &&
    (values.get("SMTP_TLS_REJECT_UNAUTHORIZED") || "").trim().toLowerCase() === "false"
  ) {
    errors.push("生产环境禁止 SMTP_TLS_REJECT_UNAUTHORIZED=false");
  }
}
if (emailMode === "api") {
  const apiKeys = ["EMAIL_API_URL", "EMAIL_API_KEY", "EMAIL_FROM"];
  if (!hasAll(values, apiKeys)) {
    errors.push(`邮件 API 配置不完整：${apiKeys.filter((key) => !values.get(key)).join(", ")}`);
  }
  const configuredEmailApiUrl = values.get("EMAIL_API_URL");
  if (configuredEmailApiUrl) {
    try {
      if (new URL(configuredEmailApiUrl).protocol !== "https:") {
        errors.push("生产邮件 API 必须使用 HTTPS");
      }
    } catch {
      errors.push("EMAIL_API_URL 不是有效 URL");
    }
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
  "WECHAT_PAY_TRANSFER_NOTIFY_URL",
  "ALIPAY_NOTIFY_URL",
  "UNIONPAY_NOTIFY_URL",
  "HUIFU_NOTIFY_URL",
  "KUAIDI100_CALLBACK_URL",
  "PAIPAN_OPERATION_H5_BASE",
  "PAIPAN_USER_LOOKUP_URL",
  "PAIPAN_PARTNER_OPEN_URL",
  "PAIPAN_PARTNER_OAUTH_URL",
  "PAIPAN_REFERRAL_BASE",
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

function parseServiceUrl(key) {
  const value = values.get(key);
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    errors.push(`${key} 不是有效连接地址`);
    return null;
  }
}

const databaseUrl = parseServiceUrl("DATABASE_URL");
const databaseReplicaUrl = parseServiceUrl("DATABASE_REPLICA_URL");
const redisUrl = parseServiceUrl("REDIS_URL");

for (const [key, url] of [
  ["DATABASE_URL", databaseUrl],
  ["DATABASE_REPLICA_URL", databaseReplicaUrl],
]) {
  if (url && !["postgres:", "postgresql:"].includes(url.protocol)) {
    errors.push(`${key} 必须使用 PostgreSQL 连接协议`);
  }
}
if (redisUrl && !["redis:", "rediss:"].includes(redisUrl.protocol)) {
  errors.push("REDIS_URL 必须使用 redis:// 或 rediss:// 连接协议");
}

if (deployTarget === "tencent") {
  const localOrComposeHosts = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "postgres",
    "redis",
    "host.docker.internal",
  ]);
  for (const [key, url] of [
    ["DATABASE_URL", databaseUrl],
    ["DATABASE_REPLICA_URL", databaseReplicaUrl],
    ["REDIS_URL", redisUrl],
  ]) {
    if (url && localOrComposeHosts.has(url.hostname.toLowerCase())) {
      errors.push(`${key} 在 DEPLOY_TARGET=tencent 时必须使用已验收的托管服务私网地址`);
    }
  }
  if (storageProvider && storageProvider !== "cos") {
    errors.push("DEPLOY_TARGET=tencent 时 STORAGE_PROVIDER 必须为 cos，禁止本地盘静默兜底");
  }
  const tencentRegion = (values.get("TENCENT_REGION") || "").trim().toLowerCase();
  const tencentClbId = (values.get("TENCENT_CLB_ID") || "").trim();
  const tencentCdnDomain = (values.get("TENCENT_CDN_DOMAIN") || "").trim().toLowerCase();
  const tencentCertificateDomain = (values.get("TENCENT_CERTIFICATE_DOMAIN") || "")
    .trim()
    .toLowerCase();
  const tencentDatabaseCaPath = (values.get("TENCENTDB_CA_CERT_PATH") || "").trim();
  if (tencentRegion && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u.test(tencentRegion)) {
    errors.push("TENCENT_REGION 格式无效");
  }
  if (tencentClbId && !/^lb-[A-Za-z0-9]+$/u.test(tencentClbId)) {
    errors.push("TENCENT_CLB_ID 格式无效");
  }
  if (
    tencentCdnDomain &&
    tencentCdnDomain !== (parsedUrls.get("PUBLIC_ASSET_ORIGIN")?.hostname || "").toLowerCase()
  ) {
    errors.push("TENCENT_CDN_DOMAIN 必须与 PUBLIC_ASSET_ORIGIN 主机名一致");
  }
  if (
    tencentCertificateDomain &&
    tencentCertificateDomain !== (values.get("PUBLIC_DOMAIN") || "").trim().toLowerCase()
  ) {
    errors.push("TENCENT_CERTIFICATE_DOMAIN 必须与 PUBLIC_DOMAIN 一致");
  }
  if (
    fullCheck &&
    tencentDatabaseCaPath &&
    (!/^\/[A-Za-z0-9._/-]+\.(?:pem|crt)$/u.test(tencentDatabaseCaPath) ||
      tencentDatabaseCaPath.split("/").includes(".."))
  ) {
    errors.push("TENCENTDB_CA_CERT_PATH 必须是 Linux 宿主机上的 PEM/CRT 绝对路径且不得包含 ..");
  }
}

const paipanMode = (values.get("PAIPAN_MODE") || "").trim().toLowerCase();
if (!["legacy", "native"].includes(paipanMode)) errors.push("PAIPAN_MODE 仅支持 legacy 或 native");
if (fullCheck && releaseChannel === "production" && paipanMode !== "legacy") {
  errors.push("正式运营首发 PAIPAN_MODE 必须为 legacy；自研排盘需重新验收后再切换");
}
if ((values.get("PAIPAN_LEGACY_DISPLAY_VERSION") || "").trim() !== "1") {
  errors.push("PAIPAN_LEGACY_DISPLAY_VERSION 当前必须固定为 1");
}
const paipanQaEnabled = (values.get("PAIPAN_NATIVE_QA_ENABLED") || "").trim().toLowerCase();
if (!["true", "false"].includes(paipanQaEnabled))
  errors.push("PAIPAN_NATIVE_QA_ENABLED 仅支持 true 或 false");
if (releaseChannel === "production" && paipanQaEnabled !== "false") {
  errors.push("正式生产必须关闭 PAIPAN_NATIVE_QA_ENABLED");
}
if (paipanQaEnabled === "true" && !(values.get("PAIPAN_NATIVE_QA_ALLOWLIST") || "").trim()) {
  errors.push("开启自研排盘 QA 时必须配置 PAIPAN_NATIVE_QA_ALLOWLIST");
}
const paipanBaseUrl = parsedUrls.get("PAIPAN_OPERATION_H5_BASE");
if (
  paipanMode === "legacy" &&
  paipanBaseUrl &&
  (paipanBaseUrl.hostname !== "www.yrydai.cn" ||
    paipanBaseUrl.pathname !== "/guoxueApp.php" ||
    paipanBaseUrl.search ||
    paipanBaseUrl.hash)
) {
  errors.push(
    "PAIPAN_OPERATION_H5_BASE 必须为已核验的 yrydai.cn 入口，手机号、key 与 go 参数由服务端生成",
  );
}

const apiUrl = parsedUrls.get("PUBLIC_API_URL");
const h5Url = parsedUrls.get("PUBLIC_H5_URL");
const assetUrl = parsedUrls.get("PUBLIC_ASSET_ORIGIN");
const publicDomain = values.get("PUBLIC_DOMAIN") || "";
const productionPublicUrls = new Map([
  ["PUBLIC_API_URL", apiUrl],
  ["PUBLIC_H5_URL", h5Url],
  ["PUBLIC_ASSET_ORIGIN", assetUrl],
  ["VITE_API_URL", parsedUrls.get("VITE_API_URL")],
  ["VITE_PUBLIC_H5_URL", parsedUrls.get("VITE_PUBLIC_H5_URL")],
  ["VITE_PUBLIC_ASSET_ORIGIN", parsedUrls.get("VITE_PUBLIC_ASSET_ORIGIN")],
]);
const isPreproductionHostname = (hostname) =>
  hostname
    .toLowerCase()
    .split(".")
    .some((label) => label === "pre" || label.startsWith("pre-"));
if (fullCheck && releaseChannel === "production") {
  const preproductionKeys = [...productionPublicUrls]
    .filter(([, url]) => url && isPreproductionHostname(url.hostname))
    .map(([key]) => key);
  if (isPreproductionHostname(publicDomain)) preproductionKeys.push("PUBLIC_DOMAIN");
  if (preproductionKeys.length > 0) {
    errors.push(
      `正式上线配置禁止使用 pre-* 预发布域名：${[...new Set(preproductionKeys)].join(", ")}`,
    );
  }
}
if (fullCheck && releaseChannel === "staging") {
  const productionKeys = [...productionPublicUrls]
    .filter(([, url]) => url && !isPreproductionHostname(url.hostname))
    .map(([key]) => key);
  if (publicDomain && !isPreproductionHostname(publicDomain)) productionKeys.push("PUBLIC_DOMAIN");
  if (productionKeys.length > 0) {
    errors.push(`预发布配置必须使用 pre-* 隔离域名：${[...new Set(productionKeys)].join(", ")}`);
  }
}
if (apiUrl && apiUrl.pathname !== "/") {
  errors.push("PUBLIC_API_URL 只能填写站点根地址，不要包含 /api/v1 或其他路径");
}
if (apiUrl && publicDomain && apiUrl.hostname !== publicDomain) {
  errors.push("PUBLIC_DOMAIN 必须与 PUBLIC_API_URL 的主机名一致");
}
if (
  apiUrl &&
  parsedUrls.get("VITE_API_URL") &&
  normalizeUrl(parsedUrls.get("VITE_API_URL").href) !== normalizeUrl(apiUrl.href)
) {
  errors.push("VITE_API_URL 必须与 PUBLIC_API_URL 一致（客户端请求层会自动追加 /api/v1）");
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

const nginxNames = (values.get("NGINX_SERVER_NAMES") || "").split(/\s+/).filter(Boolean);
if (publicDomain && !nginxNames.includes(publicDomain)) {
  errors.push("NGINX_SERVER_NAMES 未包含 PUBLIC_DOMAIN");
}

const apiOrigin = apiUrl?.origin;
const callbackPaths = new Map([
  ["WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"],
  ["WECHAT_PAY_REFUND_NOTIFY_URL", "/api/v1/shop/refund/notify"],
  ["WECHAT_PAY_TRANSFER_NOTIFY_URL", "/api/v1/payout/wechat/transfer-notify"],
  ["ALIPAY_NOTIFY_URL", "/api/v1/shop/alipay/notify"],
  ["UNIONPAY_NOTIFY_URL", "/api/v1/shop/unionpay/notify"],
  ["HUIFU_NOTIFY_URL", "/api/v1/huifu/notify"],
  ["KUAIDI100_CALLBACK_URL", "/api/v1/shop/logistics/kuaidi100/callback"],
]);
for (const [key, expectedPath] of callbackPaths) {
  const url = parsedUrls.get(key);
  if (apiOrigin && url && url.origin !== apiOrigin) {
    errors.push(`${key} 必须与 PUBLIC_API_URL 同源，禁止第三方平台继续回调旧域名`);
  }
  if (url && url.pathname.replace(/\/+$/, "") !== expectedPath) {
    errors.push(`${key} 路径必须为 ${expectedPath}`);
  }
}

const oldOrigins = splitList(values.get("MIGRATION_OLD_ORIGINS"));
const currentPublicOrigins = new Set(
  [apiUrl?.origin, h5Url?.origin, assetUrl?.origin].filter(Boolean),
);
for (const oldOrigin of oldOrigins) {
  try {
    const parsedOldOrigin = new URL(oldOrigin);
    if (
      normalizeUrl(parsedOldOrigin.href) !== parsedOldOrigin.origin ||
      parsedOldOrigin.search ||
      parsedOldOrigin.hash
    ) {
      errors.push(`MIGRATION_OLD_ORIGINS 只能填写 origin，不要包含路径：${oldOrigin}`);
    }
    if (currentPublicOrigins.has(parsedOldOrigin.origin)) {
      errors.push(
        `MIGRATION_OLD_ORIGINS 包含当前生产 origin ${parsedOldOrigin.origin}，会导致成品审计误判或继续使用旧域名`,
      );
    }
  } catch {
    errors.push(`MIGRATION_OLD_ORIGINS 包含无效 URL：${oldOrigin}`);
    continue;
  }
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

const smsCredentialKeys =
  tencentCredentialMode === "instance-role"
    ? ["TENCENT_CVM_ROLE_NAME"]
    : ["TENCENT_SECRET_ID", "TENCENT_SECRET_KEY"];
const smsKeys = [...smsCredentialKeys, "SMS_APP_ID", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"];
const smsConnectionKeys = [
  "SMS_APP_ID",
  "SMS_SIGN_NAME",
  "SMS_TEMPLATE_ID",
  "SMS_CHURN_TEMPLATE_ID",
];
if (hasAny(values, smsConnectionKeys)) {
  const missingSmsKeys = smsKeys.filter((key) => !values.get(key));
  if (missingSmsKeys.length > 0) {
    errors.push(`短信配置不完整：${missingSmsKeys.join(", ")}`);
  }
  if (values.get("SMS_APP_ID") && !/^\d{6,20}$/u.test(values.get("SMS_APP_ID"))) {
    errors.push("SMS_APP_ID 必须是腾讯云短信控制台登记的纯数字 SdkAppId");
  }
  if (values.get("SMS_TEMPLATE_ID") && !/^\d{1,20}$/u.test(values.get("SMS_TEMPLATE_ID"))) {
    errors.push("SMS_TEMPLATE_ID 必须是审核通过的纯数字验证码模板 ID");
  }
  if (
    values.get("SMS_CHURN_TEMPLATE_ID") &&
    !/^\d{1,20}$/u.test(values.get("SMS_CHURN_TEMPLATE_ID"))
  ) {
    errors.push("SMS_CHURN_TEMPLATE_ID 必须是审核通过的纯数字召回模板 ID");
  }
  const smsSignName = (values.get("SMS_SIGN_NAME") || "").trim();
  if (smsSignName && (smsSignName.length < 2 || smsSignName.length > 20)) {
    errors.push("SMS_SIGN_NAME 长度必须为 2 至 20 个字符，并与控制台审核通过内容完全一致");
  }
}

const appleIapRequiredValue = (values.get("APPLE_IAP_REQUIRED") || "false").trim().toLowerCase();
if (!["true", "false"].includes(appleIapRequiredValue)) {
  errors.push("APPLE_IAP_REQUIRED 仅允许 true 或 false");
}

if (fullCheck && appleIapRequiredValue === "true") {
  const appleIapKeys = [
    "APPLE_IAP_KEY_ID",
    "APPLE_IAP_ISSUER_ID",
    "APPLE_IAP_PRIVATE_KEY_BASE64",
    "APPLE_IAP_BUNDLE_ID",
    "APPLE_IAP_APP_APPLE_ID",
    "APPLE_IAP_PRODUCTS_JSON",
  ];
  const missingAppleIapKeys = appleIapKeys.filter((key) => !values.get(key));
  if (missingAppleIapKeys.length > 0) {
    errors.push(`Apple IAP 配置不完整：${missingAppleIapKeys.join(", ")}`);
  }
  if (values.get("APPLE_IAP_KEY_ID") && !/^[A-Z0-9]{10}$/u.test(values.get("APPLE_IAP_KEY_ID"))) {
    errors.push("APPLE_IAP_KEY_ID 必须是 10 位大写字母或数字");
  }
  if (
    values.get("APPLE_IAP_ISSUER_ID") &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      values.get("APPLE_IAP_ISSUER_ID"),
    )
  ) {
    errors.push("APPLE_IAP_ISSUER_ID 必须是 App Store Connect Issuer UUID");
  }
  const applePrivateKeyBase64 = values.get("APPLE_IAP_PRIVATE_KEY_BASE64");
  if (applePrivateKeyBase64) {
    try {
      const privateKey = createPrivateKey(
        Buffer.from(applePrivateKeyBase64, "base64").toString("utf8"),
      );
      if (
        privateKey.asymmetricKeyType !== "ec" ||
        privateKey.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      ) {
        errors.push("APPLE_IAP_PRIVATE_KEY_BASE64 必须是 Apple P-256 PKCS#8 私钥");
      }
    } catch {
      errors.push("APPLE_IAP_PRIVATE_KEY_BASE64 无法解析为 Apple P-256 PKCS#8 私钥");
    }
  }
  const appleBundleId = values.get("APPLE_IAP_BUNDLE_ID");
  if (
    appleBundleId &&
    !/^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*){2,}$/u.test(appleBundleId)
  ) {
    errors.push("APPLE_IAP_BUNDLE_ID 格式无效");
  }
  const appleAppId = values.get("APPLE_IAP_APP_APPLE_ID");
  if (appleAppId && !/^\d{6,20}$/u.test(appleAppId)) {
    errors.push("APPLE_IAP_APP_APPLE_ID 必须是 App Store Connect 数字 Apple ID");
  }
  const appleProductsJson = values.get("APPLE_IAP_PRODUCTS_JSON");
  if (appleProductsJson) {
    try {
      const products = JSON.parse(appleProductsJson);
      const productIds = Array.isArray(products)
        ? products.map((item) => String(item?.productId || "").trim())
        : [];
      const valid =
        Array.isArray(products) &&
        products.length > 0 &&
        products.every(
          (item) =>
            item &&
            typeof item === "object" &&
            String(item.productId || "").startsWith(`${appleBundleId}.`) &&
            Number.isInteger(Number(item.amountCoin)) &&
            Number(item.amountCoin) > 0 &&
            Number(item.referenceRmb) > 0,
        ) &&
        new Set(productIds).size === productIds.length;
      if (!valid) errors.push("APPLE_IAP_PRODUCTS_JSON 商品格式、数量或 productId 无效");
    } catch {
      errors.push("APPLE_IAP_PRODUCTS_JSON 不是合法 JSON");
    }
  }
}

if (fullCheck) {
  if (nodeRole === "operations") {
    const monitoringEnabled = (values.get("MONITORING_ENABLED") || "").trim().toLowerCase();
    if (monitoringEnabled !== "true") {
      errors.push("完整上线模式要求 MONITORING_ENABLED=true");
    }
    const monitoringKeys = [
      "GF_ADMIN_PASSWORD",
      "WEWORK_CORP_ID",
      "WEWORK_AGENT_ID",
      "WEWORK_AGENT_SECRET",
      "DBA_WEWORK_USER_IDS",
    ];
    if (!hasAll(values, monitoringKeys)) {
      errors.push(
        `生产监控与企业微信告警配置不完整：${monitoringKeys
          .filter((key) => !values.get(key))
          .join(", ")}`,
      );
    }
  }

  const groups = [
    {
      name: "对象存储",
      keys: cosKeys,
    },
    {
      name: "腾讯云通用能力（内容审核 / ASR / TTS）",
      keys:
        tencentCredentialMode === "instance-role"
          ? ["TENCENT_CVM_ROLE_NAME"]
          : ["TENCENT_SECRET_ID", "TENCENT_SECRET_KEY"],
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
      keys: ["KUAIDI100_API_KEY", "KUAIDI100_CUSTOMER", "KUAIDI100_CALLBACK_URL", "KUAIDI100_SALT"],
    },
  ];
  for (const group of groups) {
    if (!hasAll(values, group.keys)) {
      warnings.push(
        `${group.name}配置不完整：${group.keys.filter((key) => !values.get(key)).join(", ")}`,
      );
    }
  }

  const miniAppIds = ["WECHAT_MINI_APP_ID", "MINIPROGRAM_APP_ID", "WECHAT_MP_APP_ID"];
  const miniAppSecrets = ["MINIPROGRAM_APP_SECRET", "WECHAT_APP_SECRET"];
  const configuredMiniAppIds = miniAppIds.map((key) => values.get(key)).filter(Boolean);
  if (!hasAny(values, miniAppIds) || !hasAny(values, miniAppSecrets)) {
    errors.push("微信小程序登录配置不完整：需显式配置小程序 AppID 与 MINIPROGRAM_APP_SECRET");
  }
  if (new Set(configuredMiniAppIds).size > 1) {
    errors.push(
      "微信小程序 AppID 别名配置不一致：WECHAT_MINI_APP_ID、MINIPROGRAM_APP_ID 与 WECHAT_MP_APP_ID 不得指向不同应用",
    );
  }

  const officialAppId = values.get("WECHAT_OFFICIAL_APPID");
  const officialAppSecret = values.get("WECHAT_OFFICIAL_APP_SECRET");
  if (!officialAppId || !officialAppSecret) {
    errors.push("微信公众号登录配置不完整：需同时配置 WECHAT_OFFICIAL_APPID 与 WECHAT_OFFICIAL_APP_SECRET");
  }
  const extraWechatOAuthOrigins = (values.get("WECHAT_OAUTH_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of extraWechatOAuthOrigins) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:" || parsed.origin !== origin.replace(/\/+$/u, "")) {
        errors.push("WECHAT_OAUTH_ALLOWED_ORIGINS 只能填写 HTTPS 源（协议+域名+可选端口），禁止路径和参数");
        break;
      }
    } catch {
      errors.push("WECHAT_OAUTH_ALLOWED_ORIGINS 包含无效地址");
      break;
    }
  }

  try {
    const storeBaseline = JSON.parse(
      await readFile(path.join(repoRoot, "config/release/store-baseline.json"), "utf8"),
    );
    const expectedMiniAppId = String(storeBaseline.wechatMiniAppId || "").trim();
    if (!expectedMiniAppId) {
      errors.push("商店发布基线缺少 wechatMiniAppId，无法核对正式小程序身份");
    } else {
      if (configuredMiniAppIds.some((appId) => appId !== expectedMiniAppId)) {
        errors.push("正式环境的小程序 AppID 与受控商店发布基线不一致");
      }
      const paymentAppId = values.get("WECHAT_PAY_APP_ID");
      if (paymentAppId && paymentAppId !== expectedMiniAppId) {
        errors.push("微信支付绑定 AppID 与受控商店发布基线不一致");
      }
    }
  } catch {
    errors.push("无法读取受控商店发布基线，不能核对正式小程序与支付身份");
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

  const wechatCallbackKeyMode = values.get("WECHAT_PAY_CALLBACK_KEY_MODE");
  const wechatDbConfigVerified = values.get("WECHAT_PAY_DB_CONFIG_VERIFIED") === "true";
  const wechatDatabaseBacked =
    hasAll(values, [
      "WECHAT_PAY_ALLOWED_MCH_ID",
      "WECHAT_PAY_NOTIFY_URL",
      "WECHAT_PAY_REFUND_NOTIFY_URL",
      "WECHAT_PAY_TRANSFER_NOTIFY_URL",
    ]) &&
    wechatDbConfigVerified &&
    ["PLATFORM_CERT", "PUBLIC_KEY"].includes(wechatCallbackKeyMode);
  const allowedWechatMerchantId = values.get("WECHAT_PAY_ALLOWED_MCH_ID");
  if (allowedWechatMerchantId && !/^\d{6,20}$/u.test(allowedWechatMerchantId)) {
    errors.push("WECHAT_PAY_ALLOWED_MCH_ID 必须是微信支付登记的纯数字商户号");
  }
  if (
    hasAny(values, ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_ALLOWED_MCH_ID"]) &&
    !wechatDbConfigVerified
  ) {
    errors.push(
      "WECHAT_PAY_DB_CONFIG_VERIFIED 必须显式为 true，确认后台数据库中的微信支付配置已完成核验",
    );
  }
  if (
    hasAny(values, ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_ALLOWED_MCH_ID"]) &&
    !["PLATFORM_CERT", "PUBLIC_KEY"].includes(wechatCallbackKeyMode)
  ) {
    errors.push("WECHAT_PAY_CALLBACK_KEY_MODE 必须显式为 PLATFORM_CERT 或 PUBLIC_KEY");
  }

  const paymentChannels = [
    {
      id: "微信支付",
      configured: hasAny(values, ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_ALLOWED_MCH_ID"]),
      complete: wechatDatabaseBacked,
    },
    {
      id: "支付宝",
      configured: hasAny(values, ["ALIPAY_APP_ID"]),
      complete:
        hasAll(values, ["ALIPAY_APP_ID", "ALIPAY_NOTIFY_URL"]) &&
        hasAny(values, ["ALIPAY_PRIVATE_KEY", "ALIPAY_PRIVATE_KEY_PATH"]) &&
        hasAny(values, ["ALIPAY_PUBLIC_KEY", "ALIPAY_PUBLIC_KEY_PATH"]) &&
        values.get("ALIPAY_SANDBOX") !== "true",
    },
    {
      id: "银联支付",
      configured: hasAny(values, ["UNIONPAY_MER_ID"]),
      complete:
        hasAll(values, ["UNIONPAY_MER_ID", "UNIONPAY_NOTIFY_URL"]) &&
        ((hasAll(values, ["UNIONPAY_PFX_PATH", "UNIONPAY_PFX_PASSWORD"]) &&
          hasAny(values, ["UNIONPAY_PUBLIC_KEY", "UNIONPAY_PUBLIC_KEY_PATH"])) ||
          (hasAny(values, ["UNIONPAY_PRIVATE_KEY", "UNIONPAY_PRIVATE_KEY_PATH"]) &&
            hasAny(values, ["UNIONPAY_PUBLIC_KEY", "UNIONPAY_PUBLIC_KEY_PATH"]))) &&
        values.get("UNIONPAY_SANDBOX") !== "true",
    },
    {
      id: "汇付聚合支付",
      configured: hasAny(values, ["HUIFU_NOTIFY_URL", "HUIFU_MERCHANT_ID", "HUIFU_APP_ID"]),
      complete:
        hasAll(values, ["HUIFU_NOTIFY_URL"]) && values.get("HUIFU_DB_CONFIG_VERIFIED") === "true",
    },
  ];
  for (const channel of paymentChannels.filter((item) => item.configured && !item.complete)) {
    errors.push(
      `${channel.id}生产配置不完整：必须具备签名材料、正式回调与退款闭环所需配置，且不得使用沙箱模式`,
    );
  }
  if (!paymentChannels.some((channel) => channel.complete)) {
    errors.push("尚未形成一条完整支付通道，完整上线前必须至少完成一条通道联调");
  }
}

console.log(
  `环境检查：读取 ${values.size} 个键（未输出任何值；模式：${fullCheck ? "完整上线" : "核心"}；架构：${deployTarget || "未指定"}；节点角色：${nodeRole}；发布通道：${releaseChannel}）`,
);
warnings.forEach((message) => console.log(`警告：${message}`));
errors.forEach((message) => console.error(`错误：${message}`));
if (reportFile) {
  const resolvedReportFile = path.resolve(reportFile);
  if (resolvedReportFile === resolvedEnvFile) {
    console.error("错误：验收报告不能覆盖环境文件");
    process.exit(2);
  }
  const report = {
    generatedAt: new Date().toISOString(),
    environmentFile:
      path.relative(process.cwd(), resolvedEnvFile).replaceAll("\\", "/") ||
      path.basename(resolvedEnvFile),
    fullCheck,
    deployTarget: deployTarget || null,
    nodeRole,
    releaseChannel,
    success: errors.length === 0,
    counts: {
      configuredKeys: values.size,
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
  };
  await mkdir(path.dirname(resolvedReportFile), { recursive: true });
  await writeFile(resolvedReportFile, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(`验收报告已写入：${resolvedReportFile}（不含任何配置值）`);
}
if (errors.length > 0) process.exit(1);
console.log("环境检查通过");
