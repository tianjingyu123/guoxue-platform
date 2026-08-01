#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_CHECKS = [
  ["environment_credentials", "环境与凭据检查"],
  ["database_reconciliation", "数据库与核心业务数据对账"],
  ["payment_refund", "支付与退款闭环"],
  ["core_clients", "H5、微信小程序与 App 核心流程"],
  ["harmony_client", "Harmony 成品与关键流程"],
  ["client_artifacts", "五端成品、审计报告与公开配置绑定"],
  ["monitoring_backup_restore", "监控告警、备份与隔离恢复"],
  ["dns_rollback", "DNS 切流、节点摘除与应用回滚演练"],
  ["legal_privacy_support", "法务、隐私、客服、投诉与举报入口"],
];

const args = process.argv.slice(2);
let releaseId = "";
let evidenceDirectory = "";
let acceptanceArgument = "";
let reportArgument = "";
let maxAgeHours = 24;
let initMode = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--release-id" && next) {
    releaseId = next.trim();
    index += 1;
  } else if (arg === "--evidence-dir" && next) {
    evidenceDirectory = next;
    index += 1;
  } else if (arg === "--acceptance" && next) {
    acceptanceArgument = next;
    index += 1;
  } else if (arg === "--report" && next) {
    reportArgument = next;
    index += 1;
  } else if (arg === "--max-age-hours" && next) {
    maxAgeHours = Number.parseFloat(next);
    index += 1;
  } else if (arg === "--init") {
    initMode = true;
  } else {
    throw new Error(`未知或缺少值的参数：${arg}`);
  }
}

if (!/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  throw new Error("必须通过 --release-id 提供 8-80 位固定发布标识");
}
if (!evidenceDirectory) throw new Error("必须通过 --evidence-dir 指定发布证据目录");
if (!Number.isFinite(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 168) {
  throw new Error("--max-age-hours 必须是 1-168 的数字");
}

const evidenceDir = path.resolve(evidenceDirectory);
const acceptancePath = path.resolve(
  acceptanceArgument || path.join(evidenceDir, "production-cutover-acceptance.json"),
);
const reportPath = path.resolve(
  reportArgument || path.join(evidenceDir, "final-launch-decision.json"),
);
const machineDecisionPath = path.join(evidenceDir, "launch-decision.json");

if (initMode) {
  if (!isInsideDirectory(acceptancePath, evidenceDir)) {
    throw new Error("人工验收 JSON 必须生成在本次发布证据目录内");
  }
  const template = {
    schemaVersion: 1,
    releaseId,
    confirmation: `approve:${releaseId}`,
    changeTicket: "",
    completedAt: "",
    approvers: {
      technical: { name: "", role: "技术负责人", approvedAt: "" },
      business: { name: "", role: "业务负责人", approvedAt: "" },
    },
    checks: REQUIRED_CHECKS.map(([id]) => ({
      id,
      status: "PENDING",
      completedAt: "",
      evidence: [],
    })),
  };
  await mkdir(evidenceDir, { recursive: true });
  try {
    await writeFile(acceptancePath, `${JSON.stringify(template, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`人工验收表已经存在，拒绝覆盖：${acceptancePath}`);
    }
    throw error;
  }
  await chmod(acceptancePath, 0o600).catch(() => undefined);
  console.log(`已生成待填写的人工验收表：${acceptancePath}`);
  process.exit(0);
}

const now = Date.now();
const errors = [];
const checks = [];
const evidenceFiles = [];

function isInsideDirectory(filePath, directory) {
  const relative = path.relative(directory, filePath);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

function validateTimestamp(value, label, requireFresh = true) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    errors.push(`${label}缺少有效时间`);
    return;
  }
  const ageHours = (now - timestamp) / 3_600_000;
  if (ageHours < -0.25) errors.push(`${label}晚于当前服务器时间，请检查时钟同步`);
  if (requireFresh && ageHours > maxAgeHours) {
    errors.push(`${label}已超过 ${maxAgeHours} 小时有效期`);
  }
}

async function readJson(filePath, label) {
  try {
    const content = await readFile(filePath, "utf8");
    return { content, data: JSON.parse(content) };
  } catch (error) {
    errors.push(`${label}无法读取或解析：${error.message}`);
    return { content: "", data: null };
  }
}

async function validateArchivedFile(reference, checkId) {
  if (typeof reference !== "string" || !reference.trim()) {
    errors.push(`${checkId}包含空证据路径`);
    return;
  }
  const normalized = reference.trim().replaceAll("/", path.sep);
  const resolved = path.resolve(evidenceDir, normalized);
  if (!isInsideDirectory(resolved, evidenceDir)) {
    errors.push(`${checkId}证据必须位于本次发布证据目录内：${reference}`);
    return;
  }
  if ([acceptancePath, reportPath].includes(resolved)) {
    errors.push(`${checkId}不能把验收表或最终判定自身作为业务证据：${reference}`);
    return;
  }
  try {
    const stat = await lstat(resolved);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 1) {
      errors.push(`${checkId}证据必须是非空普通文件且不能是符号链接：${reference}`);
      return;
    }
    const content = await readFile(resolved);
    evidenceFiles.push({
      checkId,
      file: path.relative(evidenceDir, resolved).replaceAll(path.sep, "/"),
      size: stat.size,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  } catch (error) {
    errors.push(`${checkId}证据文件无法读取：${reference}（${error.message}）`);
  }
}

if (!isInsideDirectory(acceptancePath, evidenceDir)) {
  errors.push("人工验收 JSON 必须归档在本次发布证据目录内");
}
if (!isInsideDirectory(reportPath, evidenceDir)) {
  errors.push("最终上线判定报告必须写入本次发布证据目录内");
}

const machine = await readJson(machineDecisionPath, "机器上线判定");
if (machine.data) {
  validateTimestamp(machine.data.generatedAt, "机器上线判定");
  if (machine.data.releaseId !== releaseId) errors.push("机器上线判定的发布标识不一致");
  if (machine.data.decision !== "GO") errors.push("launch-decision.json 不是 GO");
  if (
    machine.data.summary?.failed !== 0 ||
    machine.data.summary?.passed !== machine.data.summary?.total ||
    machine.data.summary?.total < 9
  ) {
    errors.push("机器上线判定未包含全部通过的架构必需证据");
  }
  const sourceHashes = Object.values(machine.data.sources || {}).map((item) => item?.sha256);
  if (
    sourceHashes.length < 9 ||
    sourceHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(String(hash)))
  ) {
    errors.push("机器上线判定缺少完整的来源证据 SHA-256");
  }
}

const acceptance = await readJson(acceptancePath, "人工验收表");
if (acceptance.data) {
  const data = acceptance.data;
  if (data.schemaVersion !== 1) errors.push("人工验收表 schemaVersion 必须为 1");
  if (data.releaseId !== releaseId) errors.push("人工验收表的发布标识不一致");
  if (data.confirmation !== `approve:${releaseId}`) {
    errors.push(`人工验收确认值必须为 approve:${releaseId}`);
  }
  if (typeof data.changeTicket !== "string" || data.changeTicket.trim().length < 3) {
    errors.push("人工验收表必须填写变更单号");
  }
  validateTimestamp(data.completedAt, "人工验收完成时间");

  const approvers = [
    ["技术负责人", data.approvers?.technical],
    ["业务负责人", data.approvers?.business],
  ];
  for (const [label, approver] of approvers) {
    if (typeof approver?.name !== "string" || approver.name.trim().length < 2) {
      errors.push(`${label}姓名未填写`);
    }
    if (typeof approver?.role !== "string" || approver.role.trim().length < 2) {
      errors.push(`${label}角色未填写`);
    }
    validateTimestamp(approver?.approvedAt, `${label}签字时间`);
  }
  if (
    data.approvers?.technical?.name?.trim() &&
    data.approvers?.technical?.name?.trim() === data.approvers?.business?.name?.trim()
  ) {
    errors.push("技术负责人和业务负责人必须由不同人员签字");
  }

  const suppliedChecks = Array.isArray(data.checks) ? data.checks : [];
  const seen = new Set();
  for (const item of suppliedChecks) {
    if (seen.has(item?.id)) errors.push(`人工验收表存在重复检查项：${String(item?.id)}`);
    seen.add(item?.id);
  }
  for (const [id, title] of REQUIRED_CHECKS) {
    const item = suppliedChecks.find((entry) => entry?.id === id);
    if (!item) {
      errors.push(`人工验收表缺少检查项：${id}`);
      checks.push({ id, title, status: "MISSING", evidenceCount: 0 });
      continue;
    }
    if (item.status !== "PASS") errors.push(`${id}未明确标记为 PASS`);
    validateTimestamp(item.completedAt, `${id}完成时间`);
    if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
      errors.push(`${id}至少需要归档一份证据文件`);
    } else {
      for (const reference of item.evidence) await validateArchivedFile(reference, id);
    }
    checks.push({ id, title, status: item.status, evidenceCount: item.evidence?.length || 0 });
  }
  const knownIds = new Set(REQUIRED_CHECKS.map(([id]) => id));
  for (const item of suppliedChecks) {
    if (!knownIds.has(item?.id)) errors.push(`人工验收表包含未知检查项：${String(item?.id)}`);
  }
}

const acceptanceHash = acceptance.content
  ? createHash("sha256").update(acceptance.content).digest("hex")
  : null;
const machineHash = machine.content
  ? createHash("sha256").update(machine.content).digest("hex")
  : null;
const report = {
  schemaVersion: 1,
  generatedAt: new Date(now).toISOString(),
  releaseId,
  decision: errors.length === 0 ? "GO" : "BLOCK",
  summary: {
    machineDecision: machine.data?.decision || "MISSING",
    requiredManualChecks: REQUIRED_CHECKS.length,
    archivedEvidenceFiles: evidenceFiles.length,
    errors: errors.length,
  },
  sources: {
    machineDecision: { file: "launch-decision.json", sha256: machineHash },
    manualAcceptance: {
      file: path.relative(evidenceDir, acceptancePath).replaceAll(path.sep, "/"),
      sha256: acceptanceHash,
    },
  },
  approvers: acceptance.data?.approvers || null,
  checks,
  evidenceFiles,
  errors,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(reportPath, 0o600).catch(() => undefined);

for (const error of errors) console.error(`FAIL ${error}`);
console.log(
  `最终上线判定：${report.decision}（人工检查 ${checks.length}/${REQUIRED_CHECKS.length}，归档证据 ${evidenceFiles.length} 份）`,
);
console.log(`最终判定报告：${reportPath}`);
if (errors.length > 0) process.exitCode = 1;
