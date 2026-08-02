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
  console.error(
    `错误：${stage} 阶段必须通过 --env-file 提供正式环境文件以绑定新基础设施配置`,
  );
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
const normalizeHostname = (value) => text(value).toLowerCase().replace(/\.$/u, "");
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
const resourceReady = stage === "predeploy" || stage === "launch";
const launch = stage === "launch";
const server = intake.server || {};
const database = intake.database || {};
const cache = intake.cache || {};
const domains = intake.domains || {};
const storage = intake.storage || {};
const migration = intake.migration || {};
const operations = intake.operations || {};
const externalEndpoints = intake.externalEndpoints || {};
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
add(
  "DNS 切流窗口可控",
  isFilled(domains.dnsProvider) &&
    Number(domains.ttlSeconds) >= 60 &&
    Number(domains.ttlSeconds) <= 600,
  "切流前 TTL 应设置为 60-600 秒并明确 DNS 服务商",
);
const authoritativeNameServers = [...new Set(
  (Array.isArray(domains.authoritativeNameServers) ? domains.authoritativeNameServers : [])
    .map(normalizeHostname)
    .filter(Boolean),
)].sort();
add(
  "权威 DNS 双 NS 委派已规划",
  authoritativeNameServers.length >= 2 &&
    authoritativeNameServers.every(
      (hostname) =>
        hostname.includes(".") &&
        !isPlaceholder(hostname) &&
        !/[^a-z0-9.-]/u.test(hostname),
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
    ["local-nginx", "clb-cdn-managed", "clb-cdn-manual"].includes(
      certificateDeploymentMode,
    ) &&
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
const plannedCallbackUrls = [...new Set(
  (Array.isArray(externalEndpoints.callbackUrls) ? externalEndpoints.callbackUrls : [])
    .map(normalizeUrl)
    .filter(Boolean),
)].sort();
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
add(
  "第三方回调与客户端域名切换责任已登记",
  isFilled(externalEndpoints.owner) &&
    !isPlaceholder(externalEndpoints.owner) &&
    isFilled(externalEndpoints.clientDomainAllowlistOwner) &&
    !isPlaceholder(externalEndpoints.clientDomainAllowlistOwner) &&
    isFilled(externalEndpoints.evidenceReference) &&
    !isPlaceholder(externalEndpoints.evidenceReference),
  "必须明确第三方控制台、客户端域名白名单责任人和受控变更证据编号",
);
add(
  "第三方回调地址规划只指向新 API 入口",
  callbackPlanValid && controlPlaneCallbacksValid,
  "环境变量回调和云控制台回调必须使用 PUBLIC_API_URL 同源 HTTPS 地址、受控固定路径与唯一集成标识；未启用渠道可不登记",
);

if (resourceReady) {
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
      ...authoritativeNameServers,
      domains.certificateProvider,
      domains.certificateType,
      domains.certificateValidationMode,
      domains.certificateDeploymentMode,
      domains.certificateRenewalOwner,
      domains.certificateFallbackOwner,
      storage.bucket,
      storage.region,
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
      ...plannedCallbackUrls,
      ...plannedControlPlaneCallbacks.flatMap((item) => [
        item.integrationId,
        item.callbackUrl,
      ]),
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
  add(
    "已启用云能力均登记正式控制台回调",
    JSON.stringify(plannedControlPlaneIds) === JSON.stringify(requiredControlPlaneIds),
    "启用 VOD、直播或 IM 时必须逐项登记同源正式回调；报告只记录是否匹配，不记录原始地址",
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
    clbId:
      text(server.ingressMode).toLowerCase() === "clb" ? text(server.clbId) : "direct",
    databaseHost: text(database.endpointHost).toLowerCase(),
    databaseTls: database.tls === true,
    cacheHost: text(cache.endpointHost).toLowerCase(),
    cacheTls: cache.tls === true,
    publicDomain: text(domains.publicDomain).toLowerCase(),
    apiUrl: normalizeUrl(domains.apiUrl),
    h5Url: normalizeUrl(domains.h5Url),
    adminUrl: normalizeUrl(domains.adminUrl),
    assetOrigin: normalizeUrl(domains.assetOrigin),
    storageProvider: text(storage.provider).toLowerCase(),
    storageBucket: text(storage.bucket),
    storageRegion: text(storage.region).toLowerCase(),
    callbackUrlsFingerprint: fingerprint(plannedCallbackUrls),
    controlPlaneCallbacksFingerprint: fingerprint(plannedControlPlaneCallbacks),
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
    storageProvider: text(environmentValues.get("STORAGE_PROVIDER")).toLowerCase(),
    storageBucket: text(environmentValues.get("COS_BUCKET")),
    storageRegion: text(environmentValues.get("COS_REGION")).toLowerCase(),
    callbackUrlsFingerprint: fingerprint(
      [...new Set(
        [...knownCallbackPaths.keys()]
          .map((key) => normalizeUrl(environmentValues.get(key)))
          .filter(Boolean),
      )].sort(),
    ),
    controlPlaneCallbacksFingerprint: fingerprint(expectedControlPlaneCallbacks),
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
