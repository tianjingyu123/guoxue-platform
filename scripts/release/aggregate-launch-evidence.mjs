#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { isPublicAddress } from "./public-dns.mjs";

const args = process.argv.slice(2);
let releaseId = "";
let evidenceDirectory = "";
let reportArgument = "";
let maxAgeHours = 24;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--release-id" && next) {
    releaseId = next.trim();
    index += 1;
  } else if (arg === "--evidence-dir" && next) {
    evidenceDirectory = next;
    index += 1;
  } else if (arg === "--report" && next) {
    reportArgument = next;
    index += 1;
  } else if (arg === "--max-age-hours" && next) {
    maxAgeHours = Number.parseFloat(next);
    index += 1;
  } else {
    throw new Error(`未知或缺少值的参数：${arg}`);
  }
}

if (!/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  throw new Error("必须通过 --release-id 提供 8-80 位固定发布标识");
}
if (!evidenceDirectory) throw new Error("必须通过 --evidence-dir 指定该版本的证据目录");
if (!Number.isFinite(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 168) {
  throw new Error("--max-age-hours 必须是 1-168 的数字");
}

const evidenceDir = path.resolve(evidenceDirectory);
const reportPath = path.resolve(reportArgument || path.join(evidenceDir, "launch-decision.json"));
const now = Date.now();
const checks = [];
const sources = {};
const sourceData = {};

function addCheck(name, pass, detail, source) {
  checks.push({ name, pass, detail, source });
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/\.$/u, "");
}

function endpointHostname(value) {
  try {
    return normalizeHostname(new URL(String(value || "")).hostname);
  } catch {
    return "";
  }
}

function dnsRecordTargets(record, expected) {
  const target = normalizeHostname(expected);
  if (!target) return false;
  return [record?.terminalHostname, ...(record?.cnameChain || [])]
    .map(normalizeHostname)
    .includes(target);
}

function validateGeneratedAt(data, name, requireFresh) {
  const timestamp = Date.parse(data.generatedAt);
  if (!Number.isFinite(timestamp)) return `${name}缺少有效 generatedAt`;
  const ageHours = (now - timestamp) / 3_600_000;
  if (ageHours < -0.25) return `${name}生成时间晚于当前服务器时间，请检查时钟同步`;
  if (requireFresh && ageHours > maxAgeHours) {
    return `${name}已超过 ${maxAgeHours} 小时有效期（${ageHours.toFixed(1)} 小时）`;
  }
  return "";
}

async function loadSource(definition) {
  const sourcePath = path.join(evidenceDir, definition.file);
  try {
    const content = await readFile(sourcePath, "utf8");
    const data = JSON.parse(content);
    sourceData[definition.id] = data;
    const problems = [];
    const timeProblem = validateGeneratedAt(data, definition.name, definition.requireFresh);
    if (timeProblem) problems.push(timeProblem);
    problems.push(...definition.validate(data));
    sources[definition.id] = {
      file: definition.file,
      sha256: createHash("sha256").update(content).digest("hex"),
      generatedAt: data.generatedAt || null,
    };
    addCheck(
      definition.name,
      problems.length === 0,
      problems.length === 0 ? "证据有效" : problems.join("；"),
      definition.file,
    );
  } catch (error) {
    sources[definition.id] = { file: definition.file, sha256: null, generatedAt: null };
    addCheck(definition.name, false, `无法读取或解析证据：${error.message}`, definition.file);
  }
}

const definitions = [
  {
    id: "hostPreflight",
    name: "新服务器主机与固定版本预检",
    file: "host-preflight-readiness.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.kind !== "guoxue-host-preflight-readiness") {
        problems.push("主机预检证据类型无效");
      }
      if (data.releaseId !== releaseId) problems.push(`主机预检发布标识为 ${String(data.releaseId)}`);
      if (
        data.success !== true ||
        data.summary?.failed !== 0 ||
        !Number.isInteger(data.summary?.passed) ||
        data.summary.passed < 1 ||
        !Array.isArray(data.checks) ||
        data.checks.length === 0 ||
        data.checks.some((item) => item.status === "FAIL")
      ) {
        problems.push("新服务器主机预检未通过");
      }
      for (const field of ["hostIdentitySha256", "preflightScriptSha256", "sourceOutputSha256"]) {
        if (!/^[a-f0-9]{64}$/u.test(String(data[field] || ""))) {
          problems.push(`主机预检缺少有效 ${field}`);
        }
      }
      return problems;
    },
  },
  {
    id: "infrastructureIntake",
    name: "新基础设施接入与责任人验收",
    file: "infrastructure-intake-readiness.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.kind !== "guoxue-infrastructure-intake-readiness") {
        problems.push("接入清单证据类型无效");
      }
      if (data.stage !== "launch") problems.push("接入清单不是 launch 阶段验收");
      if (!["standard", "tencent"].includes(data.deployTarget)) {
        problems.push("接入清单部署架构无效");
      }
      if (!/^[a-f0-9]{64}$/u.test(String(data.inputSha256 || ""))) {
        problems.push("接入清单缺少有效输入 SHA-256");
      }
      if (
        data.success !== true ||
        data.summary?.failed !== 0 ||
        !Array.isArray(data.checks) ||
        data.checks.length === 0 ||
        data.checks.some((item) => item.pass !== true)
      ) {
        problems.push("新基础设施接入验收未全部通过");
      }
      return problems;
    },
  },
  {
    id: "tencentCloud",
    name: "腾讯云目标资源现场审计",
    file: "tencent-cloud-readiness.json",
    requireFresh: true,
    when: () => sourceData.infrastructureIntake?.deployTarget === "tencent",
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 2) problems.push("schemaVersion 不是 2");
      if (data.kind !== "guoxue-tencent-cloud-readiness") {
        problems.push("腾讯云审计证据类型无效");
      }
      if (data.releaseId !== releaseId) {
        problems.push(`腾讯云审计发布标识为 ${String(data.releaseId)}`);
      }
      if (
        data.success !== true ||
        data.summary?.failed !== 0 ||
        !data.targetBinding?.region ||
        !data.targetBinding?.clbId ||
        !data.targetBinding?.cdnDomain ||
        !data.targetBinding?.certificateDomain
      ) {
        problems.push("腾讯云监控、CLB、CDN 或证书现场审计未全部通过");
      }
      const clbInstances = data.clb?.data?.instances;
      if (
        !Array.isArray(clbInstances) ||
        clbInstances.length !== 1 ||
        clbInstances.some(
          (item) =>
            item.loadBalancerId !== data.targetBinding?.clbId ||
            !Array.isArray(item.loadBalancerVips) ||
            item.loadBalancerVips.length === 0 ||
            item.loadBalancerVips.some((address) => !isPublicAddress(address)),
        )
      ) {
        problems.push("腾讯云 CLB 实例或公网 VIP 证据无效");
      }
      const cdnDomains = data.cdn?.data?.domains;
      if (
        !Array.isArray(cdnDomains) ||
        cdnDomains.length !== 1 ||
        normalizeHostname(cdnDomains[0]?.domain) !==
          normalizeHostname(data.targetBinding?.cdnDomain) ||
        !normalizeHostname(cdnDomains[0]?.cname)
      ) {
        problems.push("腾讯云 CDN 域名或分配 CNAME 证据无效");
      }
      return problems;
    },
  },
  {
    id: "package",
    name: "固定发布包验真",
    file: "package-verification.json",
    requireFresh: false,
    validate: (data) => {
      const problems = [];
      const commit = String(data.commit || "").toLowerCase();
      const expectedCommit = String(data.expectedCommit || "").toLowerCase();
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.releaseId !== releaseId) problems.push(`发布标识为 ${String(data.releaseId)}`);
      if (data.success !== true || data.errorCount !== 0 || !isEmptyArray(data.errors)) {
        problems.push("包验真未通过");
      }
      if (data.allowDirty !== false) problems.push("生产证据允许了 dirty 包");
      if (!/^[a-f0-9]{40}$/u.test(commit)) problems.push("固定包提交格式无效");
      if (!/^[a-f0-9]{40}$/u.test(expectedCommit)) problems.push("固定包期望提交格式无效");
      if (commit !== expectedCommit) problems.push("固定包提交与期望提交不一致");
      return problems;
    },
  },
  {
    id: "directory",
    name: "已解压发布目录验真",
    file: "release-directory-verification.json",
    requireFresh: false,
    validate: (data) => {
      const problems = [];
      const commit = String(data.commit || "").toLowerCase();
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.releaseId !== releaseId) problems.push(`发布标识为 ${String(data.releaseId)}`);
      if (data.success !== true || data.errorCount !== 0 || !isEmptyArray(data.errors)) {
        problems.push("发布目录验真未通过");
      }
      if (!/^[a-f0-9]{40}$/u.test(commit)) problems.push("已部署目录提交格式无效");
      return problems;
    },
  },
  {
    id: "clientConfigBinding",
    name: "客户端公开配置绑定验收",
    file: "client-config-binding-verification.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      const sourceCommit = String(data.sourceCommit || "").toLowerCase();
      const expectedCommit = String(data.expectedCommit || "").toLowerCase();
      const packageCommit = String(sourceData.package?.commit || "").toLowerCase();
      const directoryCommit = String(sourceData.directory?.commit || "").toLowerCase();
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.releaseId !== releaseId) {
        problems.push(`配置绑定发布标识为 ${String(data.releaseId)}`);
      }
      if (data.expectedReleaseId !== releaseId) {
        problems.push(`配置绑定期望发布标识为 ${String(data.expectedReleaseId)}`);
      }
      if (data.success !== true || data.errorCount !== 0 || !isEmptyArray(data.errors)) {
        problems.push("客户端公开配置绑定校验未通过");
      }
      if (!/^[a-f0-9]{40}$/u.test(sourceCommit)) problems.push("配置绑定源提交格式无效");
      if (!/^[a-f0-9]{40}$/u.test(expectedCommit)) problems.push("配置绑定期望提交格式无效");
      if (sourceCommit !== expectedCommit) problems.push("配置绑定源提交与期望提交不一致");
      if (packageCommit && sourceCommit !== packageCommit) {
        problems.push("配置绑定源提交与固定包提交不一致");
      }
      if (directoryCommit && sourceCommit !== directoryCommit) {
        problems.push("配置绑定源提交与已部署目录提交不一致");
      }
      if (!/^[a-f0-9]{64}$/u.test(String(data.expectedFingerprint || ""))) {
        problems.push("配置绑定期望指纹格式无效");
      }
      if (!/^[a-f0-9]{64}$/u.test(String(data.actualFingerprint || ""))) {
        problems.push("配置绑定实际指纹格式无效");
      }
      if (data.expectedFingerprint !== data.actualFingerprint) {
        problems.push("服务器客户端公开配置与 CI 审计配置不一致");
      }
      return problems;
    },
  },
  {
    id: "database",
    name: "数据库迁移与核心业务对账",
    file: "database-migration-verification.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.releaseId !== releaseId) {
        problems.push(`数据库核验发布标识为 ${String(data.releaseId)}`);
      }
      if (data.success !== true) problems.push("数据库迁移核验未通过");
      if (data.verificationMode !== "final") problems.push("数据库核验不是 final 模式");
      if (data.sourceExportMode !== "final") problems.push("源归档不是最终停写后的 final 归档");
      if (!/^[A-Fa-f0-9-]+$/u.test(String(data.consistentSnapshot || ""))) {
        problems.push("数据库核验缺少有效的一致性快照标识");
      }
      if (!Number.isSafeInteger(data.tableCount) || data.tableCount < 1) {
        problems.push("数据库核验没有有效的表计数");
      }
      if (data.mismatchedTableCount !== 0) problems.push("源库与目标库表计数存在差异");
      if (data.businessIntegrityPassed !== true) problems.push("核心业务完整性校验未通过");
      if (data.prismaMigrationStatusPassed !== true) {
        problems.push("Prisma 迁移状态未通过");
      }
      for (const source of ["counts", "checksum", "manifest"]) {
        if (!/^[a-f0-9]{64}$/u.test(String(data.sources?.[source]?.sha256 || ""))) {
          problems.push(`数据库核验缺少 ${source} 的 SHA-256`);
        }
      }
      return problems;
    },
  },
  {
    id: "environment",
    name: "正式环境与凭据门禁",
    file: "environment-readiness.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.fullCheck !== true) problems.push("未执行完整环境检查");
      if (data.success !== true || data.counts?.errors !== 0 || !isEmptyArray(data.errors)) {
        problems.push("环境检查未通过");
      }
      return problems;
    },
  },
  {
    id: "runtime",
    name: "公网运行时与版本绑定验收",
    file: "runtime-verification.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.kind !== "guoxue-runtime-verification") {
        problems.push("运行时验收证据类型无效");
      }
      if (data.allowDegraded !== false) problems.push("运行时验收允许降级");
      if (data.expectedReleaseId !== releaseId) {
        problems.push(`期望发布标识为 ${String(data.expectedReleaseId)}`);
      }
      if (data.observedReleaseId !== releaseId) {
        problems.push(`实际运行发布标识为 ${String(data.observedReleaseId)}`);
      }
      if (
        data.summary?.failed !== 0 ||
        !Array.isArray(data.results) ||
        data.results.length === 0 ||
        data.results.some((item) => item.status !== "PASS")
      ) {
        problems.push("公网运行时验收未全部通过");
      }
      if (
        !data.endpoints ||
        ["api", "h5", "admin", "asset"].some(
          (key) => !endpointHostname(data.endpoints?.[key]),
        )
      ) {
        problems.push("公网运行时端点证据无效");
      }
      const endpointHosts = ["api", "h5", "admin", "asset"]
        .map((key) => endpointHostname(data.endpoints?.[key]))
        .filter(Boolean);
      const uniqueEndpointHosts = [...new Set(endpointHosts)];
      const dnsEntries = Array.isArray(data.dnsEndpoints) ? data.dnsEndpoints : [];
      const dnsByHost = new Map(
        dnsEntries.map((item) => [normalizeHostname(item?.hostname), item]),
      );
      if (
        dnsEntries.length === 0 ||
        uniqueEndpointHosts.some((hostname) => !dnsByHost.has(hostname)) ||
        dnsEntries.some(
          (item) =>
            !normalizeHostname(item?.hostname) ||
            !normalizeHostname(item?.terminalHostname) ||
            !Array.isArray(item?.cnameChain) ||
            !Array.isArray(item?.addresses) ||
            item.addresses.length === 0 ||
            item.addresses.some((address) => !isPublicAddress(address)),
        )
      ) {
        problems.push("公网 DNS 解析、CNAME 链或地址安全证据无效");
      }
      if (
        !Array.isArray(data.tlsCertificates) ||
        data.tlsCertificates.length === 0 ||
        data.tlsCertificates.some(
          (item) =>
            item.chainAuthorized !== true ||
            item.hostnameMatched !== true ||
            !Number.isInteger(item.daysRemaining) ||
            item.daysRemaining < 14 ||
            !Number.isFinite(Date.parse(item.validTo)) ||
            !/^[a-f0-9]{64}$/u.test(String(item.fingerprintSha256 || "")),
        )
      ) {
        problems.push("公网 TLS 证书链、域名、有效期或指纹证据无效");
      }

      const cloud = sourceData.tencentCloud;
      if (sourceData.infrastructureIntake?.deployTarget === "tencent" && cloud) {
        const clbInstance = cloud.clb?.data?.instances?.[0] || {};
        const clbVips = new Set(clbInstance.loadBalancerVips || []);
        const clbDomain = normalizeHostname(clbInstance.domain);
        const assetHost = endpointHostname(data.endpoints?.asset);
        const applicationHosts = [...new Set([
          endpointHostname(data.endpoints?.api),
          endpointHostname(data.endpoints?.h5),
          endpointHostname(data.endpoints?.admin),
        ].filter(Boolean))];
        const applicationsBound = applicationHosts.every((hostname) => {
          const record = dnsByHost.get(hostname);
          return (
            record &&
            ((record.addresses || []).some((address) => clbVips.has(address)) ||
              (clbDomain && dnsRecordTargets(record, clbDomain)))
          );
        });
        const cdnCname = normalizeHostname(cloud.cdn?.data?.domains?.[0]?.cname);
        const assetRecord = dnsByHost.get(assetHost);
        const assetBound =
          assetRecord &&
          normalizeHostname(cloud.targetBinding?.cdnDomain) === assetHost &&
          dnsRecordTargets(assetRecord, cdnCname);
        if (!applicationsBound || !assetBound) {
          problems.push("公网 DNS 未指向本次腾讯云 CLB/CDN 目标");
        }
      }
      return problems;
    },
  },
  {
    id: "retention",
    name: "版本保留与磁盘余量审计",
    file: "retention-audit.json",
    requireFresh: true,
    validate: (data) => {
      const problems = [];
      if (data.schemaVersion !== 1) problems.push("schemaVersion 不是 1");
      if (data.currentReleaseId !== releaseId) {
        problems.push(`当前发布标识为 ${String(data.currentReleaseId)}`);
      }
      if (!isEmptyArray(data.errors)) problems.push("版本保留审计存在错误");
      if (data.destructiveActionPerformed !== false) problems.push("审计执行了破坏性操作");
      const minimumBytes = Number(data.disk?.minFreeGb) * 1024 ** 3;
      if (
        !Number.isFinite(data.disk?.freeBytes) ||
        !Number.isFinite(minimumBytes) ||
        data.disk.freeBytes < minimumBytes
      ) {
        problems.push("磁盘可用空间未达到审计阈值");
      }
      return problems;
    },
  },
];

for (const definition of definitions) {
  if (definition.when && !definition.when()) continue;
  await loadSource(definition);
}

const failed = checks.filter((item) => !item.pass);
const report = {
  schemaVersion: 1,
  generatedAt: new Date(now).toISOString(),
  releaseId,
  evidenceDirectory: evidenceDir,
  maxAgeHours,
  decision: failed.length === 0 ? "GO" : "BLOCK",
  summary: { passed: checks.length - failed.length, failed: failed.length, total: checks.length },
  sources,
  checks,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(reportPath, 0o600).catch(() => undefined);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}：${item.detail}`);
}
console.log(`上线判定：${report.decision}（${report.summary.passed}/${report.summary.total}）`);
console.log(`判定报告：${reportPath}`);
if (failed.length > 0) process.exitCode = 1;
