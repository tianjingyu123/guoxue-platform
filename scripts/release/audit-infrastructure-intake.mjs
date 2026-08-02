#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

function valueOf(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : fallback;
}

const inputArg = valueOf("--input");
const stage = valueOf("--stage", "procurement").toLowerCase();
const reportArg = valueOf("--report");
const expectedDeployTarget = valueOf("--expected-deploy-target").toLowerCase();
const envFileArg = valueOf("--env-file");

if (!inputArg) {
  console.error("错误：必须通过 --input 提供新基础设施接入清单");
  process.exit(2);
}
if (!["procurement", "predeploy", "launch"].includes(stage)) {
  console.error("错误：--stage 仅允许 procurement、predeploy 或 launch");
  process.exit(2);
}
if (stage !== "procurement" && !envFileArg) {
  console.error(`错误：${stage} 阶段必须通过 --env-file 提供正式环境文件以绑定新基础设施配置`);
  process.exit(2);
}

const inputPath = path.resolve(inputArg);
if (!existsSync(inputPath)) {
  console.error(`错误：找不到新基础设施接入清单 ${inputPath}`);
  process.exit(2);
}

let raw;
let intake;
try {
  raw = readFileSync(inputPath, "utf8");
  intake = JSON.parse(raw);
} catch (error) {
  console.error(`错误：接入清单不是有效 JSON：${error.message}`);
  process.exit(2);
}

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
const text = (value) => String(value ?? "").trim();
const isFilled = (value) => Boolean(text(value));
const isPlaceholder = (value) =>
  /(?:example\.(?:com|test)|change[-_ ]?me|placeholder|pending|待填写|待配置|<[^>]+>)/i.test(
    text(value),
  );
const isHttps = (value) => {
  try {
    return new URL(text(value)).protocol === "https:";
  } catch {
    return false;
  }
};
const normalizeUrl = (value) => {
  try {
    const parsed = new URL(text(value));
    parsed.hash = "";
    parsed.search = "";
    return parsed.href.replace(/\/+$/u, "").toLowerCase();
  } catch {
    return "";
  }
};
const normalizeOrigin = (value) => {
  try {
    return new URL(text(value)).origin.toLowerCase();
  } catch {
    return "";
  }
};
const websocketOrigin = (value) => {
  try {
    const parsed = new URL(text(value));
    if (parsed.protocol !== "https:") return "";
    return `wss://${parsed.host}`.toLowerCase();
  } catch {
    return "";
  }
};
const normalizeHostname = (value) => text(value).toLowerCase().replace(/\.$/u, "");
const isDomainName = (value) => {
  const domain = normalizeHostname(value);
  return (
    domain.length <= 253 &&
    domain.includes(".") &&
    domain.split(".").every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label),
    )
  );
};
const parseMailbox = (value) => {
  const input = text(value);
  const bracketed = input.match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/u);
  const email = text(bracketed?.[2] || input).toLowerCase();
  const match = email.match(/^[^@\s]+@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/iu);
  return match && isDomainName(match[1]) ? { email, domain: normalizeHostname(match[1]) } : null;
};
const normalizeAppLinkPath = (value) => {
  const pattern = text(value);
  return pattern.startsWith("/") &&
    pattern.endsWith("*") &&
    !pattern.includes("//") &&
    !pattern.includes("?") &&
    !pattern.includes("#")
    ? pattern
    : "";
};
const normalizeAndroidCertificateFingerprint = (value) => {
  const compact = text(value).replace(/:/gu, "").toUpperCase();
  return /^[A-F0-9]{64}$/u.test(compact) ? compact.match(/.{2}/gu).join(":") : "";
};
const parseEnv = (content) => {
  const values = new Map();
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
};
const parseServiceUrl = (value) => {
  try {
    return new URL(text(value));
  } catch {
    return null;
  }
};
const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isPublicIpv4 = (value) => {
  const parts = text(value)
    .split(".")
    .map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b, c] = parts;
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  ) {
    return false;
  }
  return true;
};
const enabled = (...keys) => keys.some((key) => {
  const value = text(environmentValues.get(key));
  return value && !isPlaceholder(value);
});
const deriveOutboundDependencyIds = () => {
  const ids = new Set();
  const addWhen = (condition, id) => {
    if (condition) ids.add(id);
  };
  addWhen(
    deployTarget === "tencent" ||
      enabled(
        "TENCENT_SECRET_ID",
        "TENCENT_CVM_ROLE_NAME",
        "COS_BUCKET",
        "IM_APP_ID",
        "TRTC_SDK_APP_ID",
        "LIVE_PUSH_DOMAIN",
        "LIVE_PLAY_DOMAIN",
        "VOD_SUB_APP_ID",
        "SMS_APP_ID",
        "TENCENT_MAP_KEY",
      ),
    "tencent-cloud",
  );
  addWhen(enabled("IM_APP_ID", "TRTC_SDK_APP_ID"), "tencent-im");
  addWhen(enabled("LIVE_PUSH_DOMAIN", "LIVE_PLAY_DOMAIN"), "tencent-live");
  addWhen(enabled("VOD_SUB_APP_ID"), "tencent-vod");
  addWhen(enabled("SMS_APP_ID"), "tencent-sms");
  addWhen(enabled("TENCENT_MAP_KEY"), "tencent-map");
  addWhen(
    enabled(
      "WECHAT_APP_ID",
      "WECHAT_OFFICIAL_APPID",
      "WECHAT_MINI_APP_ID",
      "WECHAT_MP_APP_ID",
      "MINIPROGRAM_APP_ID",
    ),
    "wechat-open",
  );
  addWhen(enabled("WECHAT_PAY_MCH_ID"), "wechat-pay");
  addWhen(enabled("ALIPAY_APP_ID"), "alipay");
  addWhen(enabled("UNIONPAY_MER_ID"), "unionpay");
  addWhen(enabled("HUIFU_MERCHANT_ID", "HUIFU_APP_ID"), "huifu");
  addWhen(enabled("KUAIDI100_API_KEY"), "kuaidi100");
  addWhen(enabled("DEEPSEEK_API_KEY"), "deepseek");
  addWhen(enabled("ANTHROPIC_API_KEY"), "anthropic");
  addWhen(enabled("DASHSCOPE_API_KEY"), "dashscope");
  addWhen(enabled("LOCAL_MODEL_BASE_URL"), "local-model");
  addWhen(enabled("COZE_API_KEY", "COZE_BOT_ID"), "coze");
  const emailMode = text(environmentValues.get("EMAIL_MODE")).toLowerCase();
  addWhen(emailMode === "smtp" && enabled("SMTP_HOST"), "email-smtp");
  addWhen(emailMode === "api" && enabled("EMAIL_API_URL"), "email-api");
  addWhen(enabled("WEWORK_WEBHOOK_URL", "WEWORK_WEBHOOK_ALERT_URL"), "wework-webhook");
  addWhen(enabled("WEWORK_CORP_ID", "WEWORK_AGENT_ID"), "wework-app");
  return [...ids].sort();
};
const resourceReady = stage === "predeploy" || stage === "launch";
const launch = stage === "launch";
const server = intake.server || {};
const database = intake.database || {};
const cache = intake.cache || {};
const domains = intake.domains || {};
const appDeepLinks = intake.appDeepLinks || {};
const appDeepLinksIos = appDeepLinks.ios || {};
const appDeepLinksAndroid = appDeepLinks.android || {};
const storage = intake.storage || {};
const storageObjectMigration = storage.objectMigration || {};
const sourceStorageInventory = storageObjectMigration.sourceInventory || {};
const targetStorageInventory = storageObjectMigration.targetInventory || {};
const migration = intake.migration || {};
const operations = intake.operations || {};
const externalEndpoints = intake.externalEndpoints || {};
const emailDelivery = externalEndpoints.emailDelivery || {};
const smsDelivery = externalEndpoints.smsDelivery || {};
const paymentDelivery = externalEndpoints.paymentDelivery || {};
const logisticsDelivery = externalEndpoints.logisticsDelivery || {};
const deployTarget = text(intake.deployTarget).toLowerCase();
let environmentValues = new Map();
let reportBinding = null;
if (envFileArg) {
  const envFilePath = path.resolve(envFileArg);
  try {
    environmentValues = parseEnv(readFileSync(envFilePath, "utf8"));
  } catch (error) {
    console.error(`错误：无法读取正式环境文件：${error.message}`);
    process.exit(2);
  }
}
const expectedEgressIpv4 = [
  ...new Set(
    (Array.isArray(externalEndpoints.expectedEgressIpv4)
      ? externalEndpoints.expectedEgressIpv4
      : []
    ).map((value) => text(value)),
  ),
].sort();
const outboundDependencies = (
  Array.isArray(externalEndpoints.outboundDependencies)
    ? externalEndpoints.outboundDependencies
    : []
)
  .map((item) => ({
    serviceId: text(item?.serviceId).toLowerCase(),
    dnsTlsReachabilityVerified: item?.dnsTlsReachabilityVerified === true,
    credentialSmokeTestPassed: item?.credentialSmokeTestPassed === true,
    providerSourceIpPolicyVerified: item?.providerSourceIpPolicyVerified === true,
  }))
  .sort((left, right) => left.serviceId.localeCompare(right.serviceId));
const outboundDependencyIds = outboundDependencies.map((item) => item.serviceId);
const expectedOutboundDependencyIds = deriveOutboundDependencyIds();
const configuredEmailMode = text(environmentValues.get("EMAIL_MODE")).toLowerCase();
const emailEnabled = configuredEmailMode === "smtp" || configuredEmailMode === "api";
const configuredEmailMailbox = parseMailbox(environmentValues.get("EMAIL_FROM"));
const sendingDomain = normalizeHostname(emailDelivery.sendingDomain);
const returnPathDomain = normalizeHostname(emailDelivery.returnPathDomain);
const configuredSmsAppId = text(environmentValues.get("SMS_APP_ID"));
const configuredSmsSignName = text(environmentValues.get("SMS_SIGN_NAME"));
const configuredSmsVerificationTemplateId = text(environmentValues.get("SMS_TEMPLATE_ID"));
const configuredSmsRetentionTemplateId = text(environmentValues.get("SMS_CHURN_TEMPLATE_ID"));
const smsEnabled = [
  configuredSmsAppId,
  configuredSmsSignName,
  configuredSmsVerificationTemplateId,
  configuredSmsRetentionTemplateId,
].some(Boolean);
const smsRetentionEnabled = Boolean(configuredSmsRetentionTemplateId);
const paymentChannelDefinitions = [
  { channelId: "wechat-pay", merchantKey: "WECHAT_PAY_MCH_ID" },
  { channelId: "alipay", merchantKey: "ALIPAY_APP_ID" },
  { channelId: "unionpay", merchantKey: "UNIONPAY_MER_ID" },
  { channelId: "huifu", merchantKey: "HUIFU_MERCHANT_ID" },
];
const configuredPaymentChannels = paymentChannelDefinitions
  .map((item) => ({
    channelId: item.channelId,
    merchantReference: text(environmentValues.get(item.merchantKey)),
  }))
  .filter((item) => item.merchantReference && !isPlaceholder(item.merchantReference));
const paymentEnabled = configuredPaymentChannels.length > 0;
const configuredPrimaryPaymentChannel = configuredPaymentChannels.find(
  (item) => item.channelId === text(paymentDelivery.channelId).toLowerCase(),
);
const configuredLogisticsProviders = [
  {
    providerId: "kuaidi100",
    accountReference: text(environmentValues.get("KUAIDI100_CUSTOMER")),
    enabled: isFilled(environmentValues.get("KUAIDI100_API_KEY")),
  },
].filter(
  (item) => item.enabled && item.accountReference && !isPlaceholder(item.accountReference),
);
const logisticsEnabled = configuredLogisticsProviders.length > 0;
const configuredPrimaryLogisticsProvider = configuredLogisticsProviders.find(
  (item) => item.providerId === text(logisticsDelivery.providerId).toLowerCase(),
);

add(
  "接入清单契约有效",
  intake.schemaVersion === 2 && intake.kind === "guoxue-new-infrastructure-intake",
  "schemaVersion 必须为 2，kind 必须为 guoxue-new-infrastructure-intake；旧清单需从最新模板重新生成并逐项复核",
);
add(
  "部署架构明确",
  ["standard", "tencent"].includes(deployTarget),
  "deployTarget 仅允许 standard 或 tencent",
);
if (expectedDeployTarget) {
  add(
    "接入清单与完整门禁部署架构一致",
    deployTarget === expectedDeployTarget,
    `清单 ${deployTarget || "未填写"}；门禁 ${expectedDeployTarget}`,
  );
}
add(
  "服务器供应商、地域与 Linux 架构明确",
  isFilled(server.provider) &&
    isFilled(server.region) &&
    text(server.osFamily).toLowerCase() === "linux" &&
    ["x86_64", "amd64", "aarch64", "arm64"].includes(text(server.architecture).toLowerCase()),
  "生产主机必须为受支持的 Linux 架构",
);
add(
  "服务器容量达到首发最低线",
  Number(server.cpuCores) >= 2 && Number(server.memoryMb) >= 4096 && Number(server.diskGb) >= 40,
  "至少 2 核、4096 MB 内存、40 GB 磁盘；正式采购建议预留增长空间",
);
add(
  "入口方式与受控 SSH 用户明确",
  ["direct", "clb"].includes(text(server.ingressMode).toLowerCase()) && isFilled(server.sshUser),
  "入口仅允许 direct 或 clb，禁止依赖 root 临时口令作为交接方案",
);
add(
  "负载均衡入口已登记目标资源",
  text(server.ingressMode).toLowerCase() !== "clb" || isFilled(server.clbId),
  "使用 CLB 时必须登记本次新购负载均衡资源 ID；采购阶段可填 pending，launch 阶段必须填实",
);
add(
  "PostgreSQL 规格与保护策略满足要求",
  text(database.engine).toLowerCase() === "postgresql" &&
    Number(database.versionMajor) >= 16 &&
    ["managed", "self-hosted"].includes(text(database.topology).toLowerCase()) &&
    database.privateNetwork === true &&
    database.backupEnabled === true &&
    database.pitrEnabled === true &&
    Number(database.retentionDays) >= 7,
  "PostgreSQL 16+ 必须走私网并启用备份、PITR 和至少 7 天保留",
);
add(
  "Redis 规格与持久化策略满足要求",
  text(cache.engine).toLowerCase() === "redis" &&
    Number(cache.versionMajor) >= 6 &&
    ["managed", "self-hosted"].includes(text(cache.topology).toLowerCase()) &&
    cache.privateNetwork === true &&
    cache.persistenceEnabled === true,
  "Redis 6+ 必须走私网并启用持久化",
);
if (deployTarget === "tencent") {
  add(
    "腾讯云托管数据服务启用 TLS",
    database.topology === "managed" &&
      cache.topology === "managed" &&
      database.tls === true &&
      cache.tls === true,
    "tencent 架构必须使用托管 PostgreSQL/Redis 并启用 TLS",
  );
}
add(
  "公网、H5、管理端和静态资源入口已规划为 HTTPS",
  isFilled(domains.publicDomain) &&
    [domains.apiUrl, domains.h5Url, domains.adminUrl, domains.assetOrigin].every(isHttps),
  "四类公开入口必须显式登记 HTTPS 地址",
);
const appLinkHost = normalizeHostname(appDeepLinks.host);
const h5Host = (() => {
  try {
    return normalizeHostname(new URL(text(domains.h5Url)).hostname);
  } catch {
    return "";
  }
})();
const rawAppLinkPaths = Array.isArray(appDeepLinks.pathPatterns)
  ? appDeepLinks.pathPatterns
  : [];
const plannedAppLinkPaths = rawAppLinkPaths.map(normalizeAppLinkPath).filter(Boolean).sort();
const appLinkPathsValid =
  rawAppLinkPaths.length > 0 &&
  plannedAppLinkPaths.length === rawAppLinkPaths.length &&
  new Set(plannedAppLinkPaths).size === plannedAppLinkPaths.length;
const rawAndroidCertificateFingerprints = Array.isArray(
  appDeepLinksAndroid.sha256CertFingerprints,
)
  ? appDeepLinksAndroid.sha256CertFingerprints
  : [];
const plannedAndroidCertificateFingerprints = rawAndroidCertificateFingerprints
  .map(normalizeAndroidCertificateFingerprint)
  .filter(Boolean)
  .sort();
add(
  "App 深链主机、受控路径与责任已规划",
  appLinkHost.includes(".") &&
    appLinkHost === h5Host &&
    !isPlaceholder(appLinkHost) &&
    appLinkPathsValid &&
    isFilled(appDeepLinks.owner) &&
    !isPlaceholder(appDeepLinks.owner) &&
    isFilled(appDeepLinks.evidenceReference) &&
    !isPlaceholder(appDeepLinks.evidenceReference),
  "深链必须使用正式 H5 同一 HTTPS 主机、只登记受控通配路径，并明确真机验收责任人与受控证据编号",
);
add(
  "App 深链应用身份与现有发布包一致",
  text(appDeepLinksIos.bundleId) === "com.rebu.iosapprebu" &&
    text(appDeepLinksAndroid.packageName) === "com.rebu.apprebu",
  "Universal Link 与 App Link 必须绑定当前 iOS Bundle ID 和 Android 包名，禁止迁移时生成新应用身份",
);
add(
  "DNS 切流窗口可控",
  isFilled(domains.dnsProvider) &&
    Number(domains.ttlSeconds) >= 60 &&
    Number(domains.ttlSeconds) <= 600,
  "切流前 TTL 应设置为 60-600 秒并明确 DNS 服务商",
);
const authoritativeNameServers = [
  ...new Set(
    (Array.isArray(domains.authoritativeNameServers) ? domains.authoritativeNameServers : [])
      .map(normalizeHostname)
      .filter(Boolean),
  ),
].sort();
add(
  "权威 DNS 双 NS 委派已规划",
  authoritativeNameServers.length >= 2 &&
    authoritativeNameServers.every(
      (hostname) =>
        hostname.includes(".") && !isPlaceholder(hostname) && !/[^a-z0-9.-]/u.test(hostname),
    ),
  "必须登记至少两个真实、互不重复的权威 NS；最终切流将从公网逐路核验实际委派",
);
const certificateType = text(domains.certificateType).toLowerCase();
const certificateValidationMode = text(domains.certificateValidationMode).toLowerCase();
const certificateDeploymentMode = text(domains.certificateDeploymentMode).toLowerCase();
const dnsProvider = text(domains.dnsProvider).toLowerCase();
const dnsHostedByTencent = /(?:dnspod|腾讯云|tencent)/iu.test(dnsProvider);
add(
  "新域名证书生命周期方案与责任人已规划",
  isFilled(domains.certificateProvider) &&
    !isPlaceholder(domains.certificateProvider) &&
    ["letsencrypt", "free", "paid"].includes(certificateType) &&
    ["http-01", "dns-auto", "dns-manual"].includes(certificateValidationMode) &&
    ["local-nginx", "clb-cdn-managed", "clb-cdn-manual"].includes(certificateDeploymentMode) &&
    isFilled(domains.certificateRenewalOwner) &&
    !isPlaceholder(domains.certificateRenewalOwner) &&
    isFilled(domains.certificateFallbackOwner) &&
    !isPlaceholder(domains.certificateFallbackOwner),
  "采购前必须明确证书供应商、类型、验证方式、部署位置、续期责任人和失败兜底责任人",
);
if (deployTarget === "standard") {
  add(
    "standard 证书方案与本地 Nginx 入口一致",
    certificateDeploymentMode === "local-nginx" &&
      ["http-01", "dns-manual"].includes(certificateValidationMode),
    "standard 架构证书必须部署到本地 Nginx；验证仅允许 HTTP-01 或人工 DNS",
  );
}
if (deployTarget === "tencent") {
  add(
    "腾讯云证书方案与 CLB/CDN 入口一致",
    ["clb-cdn-managed", "clb-cdn-manual"].includes(certificateDeploymentMode) &&
      ["dns-auto", "dns-manual"].includes(certificateValidationMode) &&
      (certificateValidationMode !== "dns-auto" || dnsHostedByTencent),
    "腾讯云入口证书必须部署到 CLB/CDN；只有腾讯云 DNS/DNSPod 才能登记自动 DNS 验证，第三方 DNS 必须使用人工验证与人工部署",
  );
}
add(
  "对象存储使用私有读",
  ["cos", "s3", "oss"].includes(text(storage.provider).toLowerCase()) &&
    storage.privateRead === true,
  "生产文件不得依赖应用服务器本地盘或公共读 Bucket",
);
add(
  "对象存储迁移方案使用逐对象内容摘要",
  text(storageObjectMigration.mode).toLowerCase() === "copy" &&
    text(storageObjectMigration.manifestAlgorithm).toLowerCase() === "sha256-content-v1" &&
    Number(storageObjectMigration.oldBucketRetentionHours) >= 72,
  "正式迁移必须按对象键排序后以对象键、字节数和文件内容 SHA-256 生成清单，不得用分片上传 ETag 代替内容摘要；旧桶至少保留 72 小时",
);
add(
  "备份、切流、回滚和双人审批责任人已登记",
  [
    operations.backupOwner,
    operations.cutoverOwner,
    operations.rollbackOwner,
    operations.technicalApprover,
    operations.businessApprover,
  ].every(isFilled) && text(operations.technicalApprover) !== text(operations.businessApprover),
  "技术与业务审批人必须为不同人员",
);
add(
  "迁移窗口、停写责任人与旧环境回退保留期已规划",
  isFilled(migration.writeFreezeOwner) &&
    isFilled(migration.maintenanceWindowUtc) &&
    Number(migration.rollbackRetentionHours) >= 72,
  "至少保留 72 小时旧环境回退窗口，并明确停写责任人与维护窗口",
);

const knownCallbackPaths = new Map([
  ["WECHAT_PAY_NOTIFY_URL", "/api/v1/shop/pay/notify"],
  ["WECHAT_PAY_REFUND_NOTIFY_URL", "/api/v1/shop/refund/notify"],
  ["ALIPAY_NOTIFY_URL", "/api/v1/shop/alipay/notify"],
  ["UNIONPAY_NOTIFY_URL", "/api/v1/shop/unionpay/notify"],
  ["HUIFU_NOTIFY_URL", "/api/v1/huifu/notify"],
  ["KUAIDI100_CALLBACK_URL", "/api/v1/shop/logistics/kuaidi100/callback"],
]);
const knownControlPlaneCallbackPaths = new Map([
  ["tencent-vod", "/api/v1/videos/vod/callback"],
  ["tencent-live", "/api/v1/live/callback"],
  ["tencent-live-audit", "/api/v1/live/audit/callback"],
  ["tencent-im", "/api/v1/im/callback"],
]);
const knownClientDomainSurfaceProtocols = new Map([
  ["wechat-mini-request-api", "https:"],
  ["wechat-mini-upload-api", "https:"],
  ["wechat-mini-download-api", "https:"],
  ["wechat-mini-download-assets", "https:"],
  ["wechat-mini-socket-api", "wss:"],
  ["wechat-mini-business-h5", "https:"],
  ["wechat-official-oauth-h5", "https:"],
  ["wechat-official-js-sdk-h5", "https:"],
]);
const plannedCallbackUrls = [
  ...new Set(
    (Array.isArray(externalEndpoints.callbackUrls) ? externalEndpoints.callbackUrls : [])
      .map(normalizeUrl)
      .filter(Boolean),
  ),
].sort();
const apiOrigin = (() => {
  try {
    return new URL(text(domains.apiUrl)).origin.toLowerCase();
  } catch {
    return "";
  }
})();
const callbackPaths = new Set(knownCallbackPaths.values());
const callbackPlanValid = plannedCallbackUrls.every((value) => {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.origin.toLowerCase() === apiOrigin &&
      callbackPaths.has(parsed.pathname.replace(/\/+$/u, ""))
    );
  } catch {
    return false;
  }
});
const plannedControlPlaneCallbacks = (
  Array.isArray(externalEndpoints.controlPlaneCallbacks)
    ? externalEndpoints.controlPlaneCallbacks
    : []
)
  .map((item) => ({
    integrationId: text(item?.integrationId).toLowerCase(),
    callbackUrl: normalizeUrl(item?.callbackUrl),
  }))
  .sort((left, right) => left.integrationId.localeCompare(right.integrationId));
const plannedControlPlaneIds = plannedControlPlaneCallbacks.map((item) => item.integrationId);
const controlPlaneCallbacksValid =
  new Set(plannedControlPlaneIds).size === plannedControlPlaneIds.length &&
  plannedControlPlaneCallbacks.every((item) => {
    const expectedPath = knownControlPlaneCallbackPaths.get(item.integrationId);
    if (!expectedPath) return false;
    try {
      const parsed = new URL(item.callbackUrl);
      return (
        parsed.protocol === "https:" &&
        parsed.origin.toLowerCase() === apiOrigin &&
        parsed.pathname.replace(/\/+$/u, "") === expectedPath
      );
    } catch {
      return false;
    }
  });
const rawClientDomainAllowlistEntries = Array.isArray(
  externalEndpoints.clientDomainAllowlistEntries,
)
  ? externalEndpoints.clientDomainAllowlistEntries
  : [];
const plannedClientDomainAllowlistEntries = rawClientDomainAllowlistEntries
  .map((item) => ({
    surfaceId: text(item?.surfaceId).toLowerCase(),
    origin: normalizeOrigin(item?.origin),
  }))
  .sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
const plannedClientDomainSurfaceIds = plannedClientDomainAllowlistEntries.map(
  (item) => item.surfaceId,
);
const clientDomainAllowlistEntriesValid =
  new Set(plannedClientDomainSurfaceIds).size === plannedClientDomainSurfaceIds.length &&
  rawClientDomainAllowlistEntries.every((rawItem) => {
    const surfaceId = text(rawItem?.surfaceId).toLowerCase();
    const expectedProtocol = knownClientDomainSurfaceProtocols.get(surfaceId);
    if (!expectedProtocol || !normalizeOrigin(rawItem?.origin)) return false;
    try {
      const parsed = new URL(text(rawItem?.origin));
      return (
        parsed.protocol === expectedProtocol &&
        parsed.username === "" &&
        parsed.password === "" &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === ""
      );
    } catch {
      return false;
    }
  });
const rawStorageCorsAllowedOrigins = Array.isArray(storage.corsAllowedOrigins)
  ? storage.corsAllowedOrigins
  : [];
const plannedStorageCorsAllowedOrigins = rawStorageCorsAllowedOrigins
  .map((origin) => normalizeOrigin(origin))
  .sort();
const storageCorsAllowedOriginsValid =
  new Set(plannedStorageCorsAllowedOrigins).size === plannedStorageCorsAllowedOrigins.length &&
  rawStorageCorsAllowedOrigins.every((rawOrigin) => {
    const value = text(rawOrigin);
    if (!normalizeOrigin(value)) return false;
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "https:" &&
        parsed.username === "" &&
        parsed.password === "" &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === ""
      );
    } catch {
      return false;
    }
  });
const isIsoUtc = (value) => {
  const normalized = text(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(normalized) &&
    Number.isFinite(Date.parse(normalized));
};
const storageManifestSha256Valid = (value) => /^[a-f0-9]{64}$/u.test(text(value));
const storageInventorySummariesValid =
  isIsoUtc(sourceStorageInventory.generatedAtUtc) &&
  isIsoUtc(targetStorageInventory.generatedAtUtc) &&
  Number(targetStorageInventory.objectCount) > 0 &&
  Number.isSafeInteger(Number(sourceStorageInventory.objectCount)) &&
  Number.isSafeInteger(Number(targetStorageInventory.objectCount)) &&
  Number(sourceStorageInventory.objectCount) === Number(targetStorageInventory.objectCount) &&
  Number(targetStorageInventory.totalBytes) > 0 &&
  Number.isSafeInteger(Number(sourceStorageInventory.totalBytes)) &&
  Number.isSafeInteger(Number(targetStorageInventory.totalBytes)) &&
  Number(sourceStorageInventory.totalBytes) === Number(targetStorageInventory.totalBytes) &&
  storageManifestSha256Valid(sourceStorageInventory.manifestSha256) &&
  storageManifestSha256Valid(targetStorageInventory.manifestSha256) &&
  text(sourceStorageInventory.manifestSha256) === text(targetStorageInventory.manifestSha256) &&
  Date.parse(targetStorageInventory.generatedAtUtc) >=
    Date.parse(sourceStorageInventory.generatedAtUtc);
add(
  "第三方回调与客户端域名切换责任已登记",
  isFilled(externalEndpoints.owner) &&
    !isPlaceholder(externalEndpoints.owner) &&
    isFilled(externalEndpoints.clientDomainAllowlistOwner) &&
    !isPlaceholder(externalEndpoints.clientDomainAllowlistOwner) &&
    isFilled(externalEndpoints.outboundAccessOwner) &&
    !isPlaceholder(externalEndpoints.outboundAccessOwner) &&
    isFilled(externalEndpoints.outboundEvidenceReference) &&
    !isPlaceholder(externalEndpoints.outboundEvidenceReference) &&
    isFilled(externalEndpoints.evidenceReference) &&
    !isPlaceholder(externalEndpoints.evidenceReference),
  "必须明确第三方控制台、客户端域名白名单、出站依赖责任人和受控变更证据编号",
);
add(
  "新服务器固定公网出口身份已登记",
  !resourceReady ||
    (expectedEgressIpv4.length > 0 &&
      expectedEgressIpv4.every(isPublicIpv4) &&
      new Set(expectedEgressIpv4).size === expectedEgressIpv4.length),
  "predeploy/launch 至少登记一个真实、固定、非私网/保留/文档地址的 IPv4 出口；使用 NAT 网关时只登记 NAT 固定出口，不得登记容器或数据库私网地址",
);
add(
  "邮件发送域、退信域和交付责任已绑定",
  !resourceReady ||
    !emailEnabled ||
    (configuredEmailMailbox &&
      sendingDomain === configuredEmailMailbox.domain &&
      isDomainName(sendingDomain) &&
      isDomainName(returnPathDomain) &&
      isFilled(emailDelivery.owner) &&
      !isPlaceholder(emailDelivery.owner) &&
      isFilled(emailDelivery.evidenceReference) &&
      !isPlaceholder(emailDelivery.evidenceReference)),
  "启用邮件后，接入清单发送域必须与 EMAIL_FROM 一致，并登记退信域、责任人和受控 DNS/供应商证据；报告不记录邮箱或原始域名",
);
add(
  "短信签名、模板和交付责任已绑定",
  !resourceReady ||
    !smsEnabled ||
    (configuredSmsAppId &&
      configuredSmsSignName &&
      configuredSmsVerificationTemplateId &&
      text(smsDelivery.appId) === configuredSmsAppId &&
      text(smsDelivery.signName) === configuredSmsSignName &&
      text(smsDelivery.verificationTemplateId) === configuredSmsVerificationTemplateId &&
      text(smsDelivery.retentionTemplateId) === configuredSmsRetentionTemplateId &&
      isFilled(smsDelivery.owner) &&
      !isPlaceholder(smsDelivery.owner) &&
      isFilled(smsDelivery.evidenceReference) &&
      !isPlaceholder(smsDelivery.evidenceReference)),
  "启用短信后，接入清单必须与 SMS_SIGN_NAME、SMS_TEMPLATE_ID、可选召回模板完全一致，并登记责任人与审核证据；报告只记录指纹",
);
add(
  "首发支付通道、商户身份和闭环责任已绑定",
  !resourceReady ||
    !paymentEnabled ||
    (configuredPrimaryPaymentChannel &&
      text(paymentDelivery.merchantReference) ===
        configuredPrimaryPaymentChannel.merchantReference &&
      isFilled(paymentDelivery.owner) &&
      !isPlaceholder(paymentDelivery.owner) &&
      isFilled(paymentDelivery.evidenceReference) &&
      !isPlaceholder(paymentDelivery.evidenceReference)),
  "启用支付后必须从正式环境已配置通道中指定一条首发通道，精确绑定商户身份、闭环责任人与受控证据编号；报告只保存指纹",
);
add(
  "首发物流供应商、账号身份和履约责任已绑定",
  !resourceReady ||
    !logisticsEnabled ||
    (configuredPrimaryLogisticsProvider &&
      text(logisticsDelivery.accountReference) ===
        configuredPrimaryLogisticsProvider.accountReference &&
      isFilled(logisticsDelivery.owner) &&
      !isPlaceholder(logisticsDelivery.owner) &&
      isFilled(logisticsDelivery.evidenceReference) &&
      !isPlaceholder(logisticsDelivery.evidenceReference)),
  "启用物流后必须从正式环境已配置供应商中指定首发供应商，精确绑定账号身份、履约责任人与受控证据编号；报告只保存指纹",
);
add(
  "外部依赖清单与正式环境启用能力完全一致",
  !resourceReady ||
    (new Set(outboundDependencyIds).size === outboundDependencyIds.length &&
      outboundDependencyIds.length === expectedOutboundDependencyIds.length &&
      outboundDependencyIds.every((id, index) => id === expectedOutboundDependencyIds[index])),
  "predeploy/launch 会按正式环境变量推导腾讯云、微信、支付、物流、AI、邮件和企业微信依赖；缺项、多项或重复项都会阻断",
);
add(
  "第三方回调地址规划只指向新 API 入口",
  callbackPlanValid && controlPlaneCallbacksValid,
  "环境变量回调和云控制台回调必须使用 PUBLIC_API_URL 同源 HTTPS 地址、受控固定路径与唯一集成标识；未启用渠道可不登记",
);
add(
  "客户端合法域名清单使用受控表面与安全 origin",
  clientDomainAllowlistEntriesValid,
  "仅允许登记受控的小程序/公众号表面；普通入口必须为 HTTPS origin，socket 必须为 WSS origin，禁止路径、查询参数、凭据和重复表面",
);
add(
  "对象存储 CORS 仅登记精确 HTTPS origin",
  storageCorsAllowedOriginsValid,
  "禁止对象存储使用通配来源、HTTP、路径、查询参数、凭据或重复来源；上传仍经自家 API，不应为浏览器开放写入口",
);

if (resourceReady) {
  add(
    "App 深链正式 Team ID 与 Android 签名证书已登记",
    /^[A-Z0-9]{10}$/u.test(text(appDeepLinksIos.teamId).toUpperCase()) &&
      !isPlaceholder(appDeepLinksIos.teamId) &&
      rawAndroidCertificateFingerprints.length > 0 &&
      plannedAndroidCertificateFingerprints.length ===
        rawAndroidCertificateFingerprints.length &&
      new Set(plannedAndroidCertificateFingerprints).size ===
        plannedAndroidCertificateFingerprints.length,
    "预部署前必须登记 Apple Developer Team ID 与正式发布签名 SHA-256；使用应用商店重签名时必须登记商店实际签名指纹",
  );
  add(
    "接入清单不含占位值",
    [
      server.provider,
      server.region,
      ...(text(server.ingressMode).toLowerCase() === "clb" ? [server.clbId] : []),
      server.sshUser,
      server.sshHostFingerprint,
      database.provider,
      database.endpointHost,
      cache.provider,
      cache.endpointHost,
      domains.publicDomain,
      domains.apiUrl,
      domains.h5Url,
      domains.adminUrl,
      domains.assetOrigin,
      appDeepLinks.host,
      appDeepLinks.owner,
      appDeepLinks.evidenceReference,
      appDeepLinksIos.teamId,
      appDeepLinksIos.bundleId,
      appDeepLinksAndroid.packageName,
      ...rawAppLinkPaths,
      ...rawAndroidCertificateFingerprints,
      ...authoritativeNameServers,
      domains.certificateProvider,
      domains.certificateType,
      domains.certificateValidationMode,
      domains.certificateDeploymentMode,
      domains.certificateRenewalOwner,
      domains.certificateFallbackOwner,
      storage.bucket,
      storage.region,
      ...rawStorageCorsAllowedOrigins,
      storageObjectMigration.owner,
      storageObjectMigration.evidenceReference,
      operations.backupOwner,
      operations.cutoverOwner,
      operations.rollbackOwner,
      operations.technicalApprover,
      operations.businessApprover,
      migration.writeFreezeOwner,
      migration.maintenanceWindowUtc,
      externalEndpoints.owner,
      externalEndpoints.clientDomainAllowlistOwner,
      externalEndpoints.evidenceReference,
      ...(emailEnabled
        ? [
            emailDelivery.owner,
            emailDelivery.sendingDomain,
            emailDelivery.returnPathDomain,
            emailDelivery.evidenceReference,
          ]
        : []),
      ...(smsEnabled
        ? [
            smsDelivery.owner,
            smsDelivery.appId,
            smsDelivery.signName,
            smsDelivery.verificationTemplateId,
            smsDelivery.evidenceReference,
          ]
        : []),
      ...(paymentEnabled
        ? [
            paymentDelivery.owner,
            paymentDelivery.channelId,
            paymentDelivery.merchantReference,
            paymentDelivery.evidenceReference,
          ]
        : []),
      ...(logisticsEnabled
        ? [
            logisticsDelivery.owner,
            logisticsDelivery.providerId,
            logisticsDelivery.accountReference,
            logisticsDelivery.evidenceReference,
          ]
        : []),
      ...plannedCallbackUrls,
      ...plannedControlPlaneCallbacks.flatMap((item) => [item.integrationId, item.callbackUrl]),
      ...plannedClientDomainAllowlistEntries.flatMap((item) => [item.surfaceId, item.origin]),
    ].every((value) => isFilled(value) && !isPlaceholder(value)),
    `${stage} 阶段禁止 example、pending、change-me 或待填写值`,
  );
  add(
    "SSH 主机指纹已从可信控制台核验",
    /^SHA256:[A-Za-z0-9+/]{20,}={0,2}$/.test(text(server.sshHostFingerprint)),
    "禁止直接信任首次网络连接返回的指纹",
  );
  add(
    "安全组与正式证书签发部署已完成",
    server.securityGroupReviewed === true &&
      text(domains.certificateStatus).toLowerCase() === "issued" &&
      domains.certificateDeploymentVerified === true,
    "预部署前必须完成人工安全组复核、正式证书签发并实测已部署到目标入口",
  );
  add(
    "对象存储跨域、生命周期与签名链接已实测",
    storage.corsConfigured === true &&
      storage.lifecycleConfigured === true &&
      storage.signedUrlVerified === true,
    "对象存储三项验收必须来自新 Bucket 实测",
  );
}

if (launch) {
  add(
    "App 深链关联文件、客户端能力与真机跳转已现场验收",
    appDeepLinksIos.associatedDomainsEnabled === true &&
      appDeepLinksIos.provisioningProfileRegenerated === true &&
      appDeepLinksIos.associationFileDeployed === true &&
      appDeepLinksIos.deviceVerificationPassed === true &&
      appDeepLinksAndroid.autoVerifyIntentFilterConfigured === true &&
      appDeepLinksAndroid.associationFileDeployed === true &&
      appDeepLinksAndroid.deviceVerificationPassed === true,
    "上线前必须无重定向部署两份 .well-known 关联文件，重新生成 iOS 描述文件，合入 Android autoVerify，并分别完成 iOS/Android 真机冷启动跳转",
  );
  add(
    "对象存储源目标清单已逐对象一致性核验",
    storageObjectMigration.comparisonVerified === true && storageInventorySummariesValid,
    "切流前必须在停写后的最终复制窗口分别生成源桶与目标桶清单，并确认对象数、总字节数和内容清单 SHA-256 完全一致；报告不记录 Bucket、对象键或下载地址",
  );
  add(
    "旧对象存储回退窗口已保留",
    storageObjectMigration.oldBucketRetentionConfirmed === true &&
      Number(storageObjectMigration.oldBucketRetentionHours) >= 72 &&
      isFilled(storageObjectMigration.owner) &&
      !isPlaceholder(storageObjectMigration.owner) &&
      isFilled(storageObjectMigration.evidenceReference) &&
      !isPlaceholder(storageObjectMigration.evidenceReference),
    "旧桶在至少 72 小时回退窗口内必须保持只读可恢复，并登记迁移责任人与受控证据编号",
  );
  add(
    "证书续期兜底与公网握手已现场验证",
    domains.certificateRenewalProcedureVerified === true &&
      domains.certificatePublicHandshakeVerified === true,
    "正式切流前必须演练续期/替换步骤，并从公网核验证书链、域名匹配和有效期",
  );
  add(
    "监控、告警和恢复演练已完成",
    operations.monitoringConfigured === true &&
      operations.alertTested === true &&
      operations.restoreDrillCompleted === true,
    "机器健康不替代告警试发和隔离恢复演练",
  );
  add(
    "源库、目标库与 DNS 变更权限已现场验证",
    migration.sourceDatabaseAccessVerified === true &&
      migration.targetDatabaseAccessVerified === true &&
      migration.dnsChangeAccessVerified === true,
    "切流前必须以受控账号分别实测源库导出、目标库连接和 DNS 变更权限",
  );
  add(
    "数据库迁移演练和旧环境回退保留已完成",
    migration.rehearsalCompleted === true &&
      migration.oldEnvironmentRetentionConfirmed === true &&
      Number(migration.rollbackRetentionHours) >= 72,
    "正式迁移前必须完成同版本演练，并确认旧环境在回退窗口内不被释放或覆盖",
  );
  add(
    "第三方控制台、回调安全与客户端白名单已现场验收",
    externalEndpoints.controlPlaneInventoryVerified === true &&
      externalEndpoints.callbackReachabilityVerified === true &&
      externalEndpoints.callbackAuthenticationVerified === true &&
      externalEndpoints.callbackRetryIdempotencyVerified === true &&
      externalEndpoints.clientDomainAllowlistVerified === true,
    "切流前必须完成已启用支付/物流/直播等控制台换址、回调可达性与验签重放、客户端 request/upload/download/socket/业务域名验收",
  );
  add(
    "新服务器出口身份与全部外部依赖已现场验收",
    externalEndpoints.egressIdentityVerified === true &&
      externalEndpoints.outboundDependencySmokeTestsPassed === true &&
      outboundDependencies.length === expectedOutboundDependencyIds.length &&
      outboundDependencies.every(
        (item) =>
          item.dnsTlsReachabilityVerified &&
          item.credentialSmokeTestPassed &&
          item.providerSourceIpPolicyVerified,
      ),
    "必须从新服务器实测固定出口 IP，并对每个启用依赖完成 DNS/TLS、只读或沙箱鉴权冒烟，以及供应商来源 IP 白名单/无限制策略复核；不得用本机或旧服务器结果代替",
  );
  add(
    "邮件域名信誉、退信投诉与真实投递已现场验收",
    !emailEnabled ||
      (emailDelivery.spfVerified === true &&
        emailDelivery.dkimVerified === true &&
        emailDelivery.dmarcVerified === true &&
        emailDelivery.bounceHandlingVerified === true &&
        emailDelivery.complaintHandlingVerified === true &&
        emailDelivery.unsubscribeVerified === true &&
        emailDelivery.deliverySmokeTestPassed === true),
    "启用邮件后必须从新服务器完成 SPF、DKIM、DMARC、退信/投诉处理、退订链路和至少一封真实投递验收，禁止只验证 TCP 端口可连",
  );
  add(
    "短信签名模板、回执、真实投递与登录兜底已现场验收",
    !smsEnabled ||
      (smsDelivery.signApproved === true &&
        smsDelivery.verificationTemplateApproved === true &&
        smsDelivery.deliveryReceiptVerified === true &&
        smsDelivery.realNumberSmokeTestPassed === true &&
        smsDelivery.alternateLoginVerified === true &&
        (!smsRetentionEnabled ||
          (smsDelivery.retentionTemplateApproved === true &&
            smsDelivery.retentionConsentAndOptOutVerified === true))),
    "启用短信后必须核验签名与验证码模板审核、受控真实号码投递及状态回执，并验证短信故障时仍可通过其他方式登录；启用召回模板时还必须核验独立模板、用户授权和退订策略",
  );
  add(
    "首发支付通道已完成真实收款、退款、回调和对账闭环",
    !paymentEnabled ||
      (paymentDelivery.productionAccountVerified === true &&
        paymentDelivery.smallAmountPaymentPassed === true &&
        paymentDelivery.paymentCallbackVerified === true &&
        paymentDelivery.orderLedgerVerified === true &&
        paymentDelivery.refundSmokeTestPassed === true &&
        paymentDelivery.refundCallbackVerified === true &&
        paymentDelivery.reconciliationVerified === true &&
        paymentDelivery.duplicateCallbackReplayVerified === true),
    "正式开放付费入口前必须用所绑定首发通道完成受控小额实付、验签入账、退款与退款通知、日终对账和重复回调重放；沙箱截图或仅能下单不能替代闭环",
  );
  add(
    "首发物流供应商已完成真实运单、轨迹回调、异常件和退货联动闭环",
    !logisticsEnabled ||
      (logisticsDelivery.productionAccountVerified === true &&
        logisticsDelivery.controlledWaybillVerified === true &&
        logisticsDelivery.trackingSubscriptionVerified === true &&
        logisticsDelivery.trackingCallbackAuthenticated === true &&
        logisticsDelivery.trackingStatePersisted === true &&
        logisticsDelivery.deliveryExceptionVerified === true &&
        logisticsDelivery.returnRefundLinkageVerified === true &&
        logisticsDelivery.duplicateCallbackReplayVerified === true),
    "正式开放实物发货前必须用所绑定生产账号完成受控真实运单、轨迹订阅、回调验签与状态落库，并验证异常件告警、退货退款联动和重复回调重放；只查询示例单号不能替代闭环",
  );
}

if (resourceReady) {
  const databaseUrl = parseServiceUrl(environmentValues.get("DATABASE_URL"));
  const redisUrl = parseServiceUrl(environmentValues.get("REDIS_URL"));
  const databaseTls = databaseUrl
    ? ["require", "verify-ca", "verify-full"].includes(
        text(databaseUrl.searchParams.get("sslmode")).toLowerCase(),
      )
    : false;
  const cacheTls = redisUrl?.protocol === "rediss:";
  const requiredControlPlaneIds = [
    ...(environmentValues.get("VOD_SUB_APP_ID") ? ["tencent-vod"] : []),
    ...(environmentValues.get("LIVE_PUSH_DOMAIN") || environmentValues.get("LIVE_PLAY_DOMAIN")
      ? ["tencent-live", "tencent-live-audit"]
      : []),
    ...(environmentValues.get("IM_APP_ID") ? ["tencent-im"] : []),
  ].sort();
  const miniProgramEnabled = ["WECHAT_MINI_APP_ID", "MINIPROGRAM_APP_ID", "WECHAT_MP_APP_ID"].some(
    (key) => isFilled(environmentValues.get(key)),
  );
  const officialAccountEnabled = isFilled(environmentValues.get("WECHAT_OFFICIAL_APPID"));
  const expectedClientDomainAllowlistEntries = [
    ...(miniProgramEnabled
      ? [
          {
            surfaceId: "wechat-mini-request-api",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_API_URL")),
          },
          {
            surfaceId: "wechat-mini-upload-api",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_API_URL")),
          },
          {
            surfaceId: "wechat-mini-download-api",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_API_URL")),
          },
          {
            surfaceId: "wechat-mini-download-assets",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_ASSET_ORIGIN")),
          },
          {
            surfaceId: "wechat-mini-socket-api",
            origin: websocketOrigin(environmentValues.get("PUBLIC_API_URL")),
          },
          {
            surfaceId: "wechat-mini-business-h5",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_H5_URL")),
          },
        ]
      : []),
    ...(officialAccountEnabled
      ? [
          {
            surfaceId: "wechat-official-oauth-h5",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_H5_URL")),
          },
          {
            surfaceId: "wechat-official-js-sdk-h5",
            origin: normalizeOrigin(environmentValues.get("PUBLIC_H5_URL")),
          },
        ]
      : []),
  ].sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
  const expectedStorageCorsAllowedOrigins = [
    ...new Set([
      normalizeOrigin(environmentValues.get("PUBLIC_H5_URL")),
      normalizeOrigin(`${normalizeUrl(environmentValues.get("PUBLIC_API_URL"))}/admin/`),
    ]),
  ]
    .filter(Boolean)
    .sort();
  add(
    "已启用云能力均登记正式控制台回调",
    JSON.stringify(plannedControlPlaneIds) === JSON.stringify(requiredControlPlaneIds),
    "启用 VOD、直播或 IM 时必须逐项登记同源正式回调；报告只记录是否匹配，不记录原始地址",
  );
  add(
    "已启用微信客户端均登记完整合法域名",
    JSON.stringify(plannedClientDomainAllowlistEntries) ===
      JSON.stringify(expectedClientDomainAllowlistEntries),
    "启用小程序时必须登记 request、upload、API/COS download、socket 与 H5 业务域名；启用公众号时必须登记网页授权与 JS-SDK 安全域名",
  );
  add(
    "对象存储 CORS 来源与正式 H5 和后台入口完全绑定",
    JSON.stringify(plannedStorageCorsAllowedOrigins) ===
      JSON.stringify(expectedStorageCorsAllowedOrigins),
    "新 Bucket/CDN 只允许正式 H5 与后台页面的精确 origin 读取资源；漏登、多登或旧域名残留都会阻断",
  );
  const expectedControlPlaneCallbacks = requiredControlPlaneIds.map((integrationId) => ({
    integrationId,
    callbackUrl: normalizeUrl(
      `${environmentValues.get("PUBLIC_API_URL")}${knownControlPlaneCallbackPaths.get(integrationId)}`,
    ),
  }));
  const intakeBinding = {
    deployTarget,
    region: text(server.region).toLowerCase(),
    clbId: text(server.ingressMode).toLowerCase() === "clb" ? text(server.clbId) : "direct",
    databaseHost: text(database.endpointHost).toLowerCase(),
    databaseTls: database.tls === true,
    cacheHost: text(cache.endpointHost).toLowerCase(),
    cacheTls: cache.tls === true,
    publicDomain: text(domains.publicDomain).toLowerCase(),
    apiUrl: normalizeUrl(domains.apiUrl),
    h5Url: normalizeUrl(domains.h5Url),
    adminUrl: normalizeUrl(domains.adminUrl),
    assetOrigin: normalizeUrl(domains.assetOrigin),
    appLinkHost,
    storageProvider: text(storage.provider).toLowerCase(),
    storageBucket: text(storage.bucket),
    storageRegion: text(storage.region).toLowerCase(),
    storageCorsAllowedOriginsFingerprint: fingerprint(plannedStorageCorsAllowedOrigins),
    callbackUrlsFingerprint: fingerprint(plannedCallbackUrls),
    controlPlaneCallbacksFingerprint: fingerprint(plannedControlPlaneCallbacks),
    clientDomainAllowlistFingerprint: fingerprint(plannedClientDomainAllowlistEntries),
    outboundDependencyFingerprint: fingerprint(outboundDependencyIds),
    emailSendingDomainFingerprint: fingerprint(emailEnabled ? sendingDomain : "disabled"),
    smsDeliveryFingerprint: fingerprint(
      smsEnabled
        ? {
            appId: text(smsDelivery.appId),
            signName: text(smsDelivery.signName),
            verificationTemplateId: text(smsDelivery.verificationTemplateId),
            retentionTemplateId: text(smsDelivery.retentionTemplateId),
          }
        : "disabled",
    ),
    paymentDeliveryFingerprint: fingerprint(
      paymentEnabled
        ? {
            channelId: text(paymentDelivery.channelId).toLowerCase(),
            merchantReference: text(paymentDelivery.merchantReference),
          }
        : "disabled",
    ),
    logisticsDeliveryFingerprint: fingerprint(
      logisticsEnabled
        ? {
            providerId: text(logisticsDelivery.providerId).toLowerCase(),
            accountReference: text(logisticsDelivery.accountReference),
          }
        : "disabled",
    ),
  };
  const publicApiUrl = normalizeUrl(environmentValues.get("PUBLIC_API_URL"));
  const environmentBinding = {
    deployTarget: expectedDeployTarget || deployTarget,
    region:
      text(server.ingressMode).toLowerCase() === "clb"
        ? text(environmentValues.get("TENCENT_REGION")).toLowerCase()
        : text(server.region).toLowerCase(),
    clbId:
      text(server.ingressMode).toLowerCase() === "clb"
        ? text(environmentValues.get("TENCENT_CLB_ID"))
        : "direct",
    databaseHost: text(databaseUrl?.hostname).toLowerCase(),
    databaseTls,
    cacheHost: text(redisUrl?.hostname).toLowerCase(),
    cacheTls,
    publicDomain: text(environmentValues.get("PUBLIC_DOMAIN")).toLowerCase(),
    apiUrl: publicApiUrl,
    h5Url: normalizeUrl(environmentValues.get("PUBLIC_H5_URL")),
    adminUrl: normalizeUrl(`${publicApiUrl}/admin/`),
    assetOrigin: normalizeUrl(environmentValues.get("PUBLIC_ASSET_ORIGIN")),
    appLinkHost: (() => {
      try {
        return normalizeHostname(new URL(text(environmentValues.get("PUBLIC_H5_URL"))).hostname);
      } catch {
        return "";
      }
    })(),
    storageProvider: text(environmentValues.get("STORAGE_PROVIDER")).toLowerCase(),
    storageBucket: text(environmentValues.get("COS_BUCKET")),
    storageRegion: text(environmentValues.get("COS_REGION")).toLowerCase(),
    storageCorsAllowedOriginsFingerprint: fingerprint(expectedStorageCorsAllowedOrigins),
    callbackUrlsFingerprint: fingerprint(
      [
        ...new Set(
          [...knownCallbackPaths.keys()]
            .map((key) => normalizeUrl(environmentValues.get(key)))
            .filter(Boolean),
        ),
      ].sort(),
    ),
    controlPlaneCallbacksFingerprint: fingerprint(expectedControlPlaneCallbacks),
    clientDomainAllowlistFingerprint: fingerprint(expectedClientDomainAllowlistEntries),
    outboundDependencyFingerprint: fingerprint(expectedOutboundDependencyIds),
    emailSendingDomainFingerprint: fingerprint(
      emailEnabled ? configuredEmailMailbox?.domain || "invalid" : "disabled",
    ),
    smsDeliveryFingerprint: fingerprint(
      smsEnabled
        ? {
            appId: configuredSmsAppId,
            signName: configuredSmsSignName,
            verificationTemplateId: configuredSmsVerificationTemplateId,
            retentionTemplateId: configuredSmsRetentionTemplateId,
          }
        : "disabled",
    ),
    paymentDeliveryFingerprint: fingerprint(
      paymentEnabled
        ? {
            channelId: text(paymentDelivery.channelId).toLowerCase(),
            merchantReference: configuredPrimaryPaymentChannel?.merchantReference || "invalid",
          }
        : "disabled",
    ),
    logisticsDeliveryFingerprint: fingerprint(
      logisticsEnabled
        ? {
            providerId: text(logisticsDelivery.providerId).toLowerCase(),
            accountReference: configuredPrimaryLogisticsProvider?.accountReference || "invalid",
          }
        : "disabled",
    ),
  };
  const bindingFields = Object.keys(intakeBinding);
  const mismatchedBindingFields = bindingFields.filter(
    (field) => intakeBinding[field] !== environmentBinding[field],
  );
  add(
    "正式环境与新基础设施接入清单完全绑定",
    mismatchedBindingFields.length === 0,
    mismatchedBindingFields.length === 0
      ? "数据库、缓存、公开入口与对象存储逐项一致"
      : `不一致字段：${mismatchedBindingFields.join(", ")}；报告不记录原始地址或凭据`,
  );
  reportBinding = {
    success: mismatchedBindingFields.length === 0,
    matchedFields: bindingFields.length - mismatchedBindingFields.length,
    totalFields: bindingFields.length,
    intakeFingerprint: fingerprint(intakeBinding),
    environmentFingerprint: fingerprint(environmentBinding),
  };
}

const failures = checks.filter((check) => !check.pass);
const report = {
  schemaVersion: 1,
  kind: "guoxue-infrastructure-intake-readiness",
  generatedAt: new Date().toISOString(),
  stage,
  deployTarget,
  inputSha256: createHash("sha256").update(raw).digest("hex"),
  configurationBinding: reportBinding,
  storageMigrationEvidence: launch
    ? {
        algorithm: text(storageObjectMigration.manifestAlgorithm).toLowerCase(),
        sourceSummaryFingerprint: fingerprint({
          generatedAtUtc: sourceStorageInventory.generatedAtUtc,
          objectCount: Number(sourceStorageInventory.objectCount),
          totalBytes: Number(sourceStorageInventory.totalBytes),
          manifestSha256: text(sourceStorageInventory.manifestSha256),
        }),
        targetSummaryFingerprint: fingerprint({
          generatedAtUtc: targetStorageInventory.generatedAtUtc,
          objectCount: Number(targetStorageInventory.objectCount),
          totalBytes: Number(targetStorageInventory.totalBytes),
          manifestSha256: text(targetStorageInventory.manifestSha256),
        }),
        matched: storageInventorySummariesValid,
      }
    : null,
  appDeepLinkEvidence: launch
    ? {
        hostFingerprint: fingerprint(appLinkHost),
        iosIdentityFingerprint: fingerprint(
          `${text(appDeepLinksIos.teamId).toUpperCase()}.${text(appDeepLinksIos.bundleId)}`,
        ),
        androidIdentityFingerprint: fingerprint({
          packageName: text(appDeepLinksAndroid.packageName),
          sha256CertFingerprints: plannedAndroidCertificateFingerprints,
        }),
        pathPatternsFingerprint: fingerprint(plannedAppLinkPaths),
        deviceVerificationPassed:
          appDeepLinksIos.deviceVerificationPassed === true &&
          appDeepLinksAndroid.deviceVerificationPassed === true,
      }
    : null,
  outboundAccessEvidence: launch
    ? {
        expectedEgressIpv4Fingerprint: fingerprint(expectedEgressIpv4),
        egressAddressCount: expectedEgressIpv4.length,
        dependencyIdsFingerprint: fingerprint(outboundDependencyIds),
        dependencyCount: outboundDependencies.length,
        verified:
          externalEndpoints.egressIdentityVerified === true &&
          externalEndpoints.outboundDependencySmokeTestsPassed === true &&
          outboundDependencies.every(
            (item) =>
              item.dnsTlsReachabilityVerified &&
              item.credentialSmokeTestPassed &&
              item.providerSourceIpPolicyVerified,
          ),
      }
    : null,
  emailDeliveryEvidence: launch && emailEnabled
    ? {
        sendingDomainFingerprint: fingerprint(sendingDomain),
        returnPathDomainFingerprint: fingerprint(returnPathDomain),
        verified:
          emailDelivery.spfVerified === true &&
          emailDelivery.dkimVerified === true &&
          emailDelivery.dmarcVerified === true &&
          emailDelivery.bounceHandlingVerified === true &&
          emailDelivery.complaintHandlingVerified === true &&
          emailDelivery.unsubscribeVerified === true &&
          emailDelivery.deliverySmokeTestPassed === true,
      }
    : null,
  smsDeliveryEvidence: launch && smsEnabled
    ? {
        configurationFingerprint: fingerprint({
          appId: configuredSmsAppId,
          signName: configuredSmsSignName,
          verificationTemplateId: configuredSmsVerificationTemplateId,
          retentionTemplateId: configuredSmsRetentionTemplateId,
        }),
        retentionEnabled: smsRetentionEnabled,
        verified:
          smsDelivery.signApproved === true &&
          smsDelivery.verificationTemplateApproved === true &&
          smsDelivery.deliveryReceiptVerified === true &&
          smsDelivery.realNumberSmokeTestPassed === true &&
          smsDelivery.alternateLoginVerified === true &&
          (!smsRetentionEnabled ||
            (smsDelivery.retentionTemplateApproved === true &&
              smsDelivery.retentionConsentAndOptOutVerified === true)),
      }
    : null,
  paymentDeliveryEvidence: launch && paymentEnabled
    ? {
        configurationFingerprint: fingerprint({
          channelId: text(paymentDelivery.channelId).toLowerCase(),
          merchantReference: text(paymentDelivery.merchantReference),
        }),
        verified:
          paymentDelivery.productionAccountVerified === true &&
          paymentDelivery.smallAmountPaymentPassed === true &&
          paymentDelivery.paymentCallbackVerified === true &&
          paymentDelivery.orderLedgerVerified === true &&
          paymentDelivery.refundSmokeTestPassed === true &&
          paymentDelivery.refundCallbackVerified === true &&
          paymentDelivery.reconciliationVerified === true &&
          paymentDelivery.duplicateCallbackReplayVerified === true,
      }
    : null,
  logisticsDeliveryEvidence: launch && logisticsEnabled
    ? {
        configurationFingerprint: fingerprint({
          providerId: text(logisticsDelivery.providerId).toLowerCase(),
          accountReference: text(logisticsDelivery.accountReference),
        }),
        verified:
          logisticsDelivery.productionAccountVerified === true &&
          logisticsDelivery.controlledWaybillVerified === true &&
          logisticsDelivery.trackingSubscriptionVerified === true &&
          logisticsDelivery.trackingCallbackAuthenticated === true &&
          logisticsDelivery.trackingStatePersisted === true &&
          logisticsDelivery.deliveryExceptionVerified === true &&
          logisticsDelivery.returnRefundLinkageVerified === true &&
          logisticsDelivery.duplicateCallbackReplayVerified === true,
      }
    : null,
  success: failures.length === 0,
  summary: {
    passed: checks.length - failures.length,
    failed: failures.length,
    total: checks.length,
  },
  checks,
};

if (reportArg) {
  const reportPath = path.resolve(reportArg);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(`新基础设施接入门禁（${stage}）`);
for (const check of checks) {
  console.log(`${check.pass ? "通过" : "阻断"}：${check.name} —— ${check.detail}`);
}
console.log(`汇总：${report.summary.passed}/${report.summary.total} 通过`);
if (!report.success) process.exit(1);
