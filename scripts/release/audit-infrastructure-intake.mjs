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
  intake.schemaVersion === 1 && intake.kind === "guoxue-new-infrastructure-intake",
  "schemaVersion 必须为 1，kind 必须为 guoxue-new-infrastructure-intake",
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
    Number(cache.versionMajor) >= 7 &&
    ["managed", "self-hosted"].includes(text(cache.topology).toLowerCase()) &&
    cache.privateNetwork === true &&
    cache.persistenceEnabled === true,
  "Redis 7+ 必须走私网并启用持久化",
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
      storage.bucket,
      storage.region,
      operations.backupOwner,
      operations.cutoverOwner,
      operations.rollbackOwner,
      operations.technicalApprover,
      operations.businessApprover,
      migration.writeFreezeOwner,
      migration.maintenanceWindowUtc,
    ].every((value) => isFilled(value) && !isPlaceholder(value)),
    `${stage} 阶段禁止 example、pending、change-me 或待填写值`,
  );
  add(
    "SSH 主机指纹已从可信控制台核验",
    /^SHA256:[A-Za-z0-9+/]{20,}={0,2}$/.test(text(server.sshHostFingerprint)),
    "禁止直接信任首次网络连接返回的指纹",
  );
  add(
    "安全组与正式证书已完成",
    server.securityGroupReviewed === true &&
      text(domains.certificateStatus).toLowerCase() === "issued",
    "切流前必须完成人工安全组复核并签发正式证书",
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
