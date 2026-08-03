#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const EXPECTED_COUNTS = {
  LIVE_STATUS_STALE: 2,
  UPCOMING_LIVE_EXPIRED: 3,
};

function parseArgs(argv) {
  const result = { maxAgeHours: 24 };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!value || !key.startsWith("--")) throw new Error(`参数缺少值：${key}`);
    if (key === "--release-id") result.releaseId = value;
    else if (key === "--remediation") result.remediationPath = value;
    else if (key === "--freshness-report") result.freshnessReportPath = value;
    else if (key === "--report") result.reportPath = value;
    else if (key === "--max-age-hours") result.maxAgeHours = Number(value);
    else throw new Error(`未知参数：${key}`);
    index += 1;
  }
  return result;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isHttpsOrigin(value) {
  try {
    const target = new URL(value);
    return target.protocol === "https:" && target.origin === value;
  } catch {
    return false;
  }
}

function findForbiddenIdentityFields(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (/^(id|ids|title|titles|businessId|contentId)$/iu.test(key)) findings.push(field);
    findings.push(...findForbiddenIdentityFields(child, field));
  }
  return findings;
}

function validateFreshTimestamp(value, name, now, maxAgeHours) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return `${name}缺少有效时间`;
  const ageHours = (now - timestamp) / 3_600_000;
  if (ageHours < -0.25) return `${name}晚于当前时间，请检查时钟同步`;
  if (ageHours > maxAgeHours) return `${name}已超过 ${maxAgeHours} 小时有效期`;
  return "";
}

async function readJson(filePath) {
  const content = await readFile(path.resolve(filePath), "utf8");
  return { content, data: JSON.parse(content) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!/^[A-Za-z0-9._-]{8,80}$/u.test(String(args.releaseId || ""))) {
    throw new Error("必须提供 8-80 位固定发布标识");
  }
  if (!args.remediationPath || !args.freshnessReportPath || !args.reportPath) {
    throw new Error("必须提供 --remediation、--freshness-report 和 --report");
  }
  if (!Number.isFinite(args.maxAgeHours) || args.maxAgeHours < 1 || args.maxAgeHours > 168) {
    throw new Error("--max-age-hours 必须是 1-168 的数字");
  }

  const now = Date.now();
  const errors = [];
  const remediation = await readJson(args.remediationPath);
  const freshness = await readJson(args.freshnessReportPath);
  const action = remediation.data;
  const gate = freshness.data;

  if (action.schemaVersion !== 1 || action.kind !== "guoxue-public-content-remediation") {
    errors.push("公开内容处理记录类型无效");
  }
  if (action.releaseId !== args.releaseId) errors.push("公开内容处理记录未绑定本次发布标识");
  if (action.confirmation !== `remediate-public-content:${args.releaseId}`) {
    errors.push("公开内容处理记录缺少本次发布精确确认词");
  }
  if (!isHttpsOrigin(action.target)) errors.push("公开内容处理目标必须是 HTTPS origin");
  if (!["EXCLUDED", "ARCHIVED", "MIXED"].includes(action.actionMode)) {
    errors.push("处理方式必须是 EXCLUDED、ARCHIVED 或 MIXED");
  }
  if (action.historicalRecordsDeleted !== false) errors.push("不得把删除历史记录作为通过条件");
  if (action.publicFeedExclusionVerified !== true) {
    errors.push("处理记录必须确认公开流已排除这些状态");
  }
  const forbiddenFields = findForbiddenIdentityFields(action);
  if (forbiddenFields.length > 0) {
    errors.push(`脱敏处理记录不得包含业务身份字段：${forbiddenFields.join("、")}`);
  }
  for (const [code, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (action.counts?.[code] !== expected) errors.push(`${code} 处理数量必须是 ${expected}`);
  }
  if (
    !action.counts ||
    Object.keys(action.counts).sort().join(",") !== Object.keys(EXPECTED_COUNTS).sort().join(",") ||
    action.total !== 5
  ) {
    errors.push("处理记录必须精确覆盖 2 条 stale live 和 3 条 expired upcoming");
  }

  const actionTimeProblem = validateFreshTimestamp(
    action.completedAt,
    "公开内容处理时间",
    now,
    args.maxAgeHours,
  );
  if (actionTimeProblem) errors.push(actionTimeProblem);

  if (gate.schemaVersion !== 1 || gate.kind !== "guoxue-public-content-freshness") {
    errors.push("公开内容新鲜度报告类型无效");
  }
  if (gate.target !== action.target) errors.push("处理记录与新鲜度门禁目标不一致");
  if (!Number.isInteger(gate.totalItems) || gate.totalItems < 1)
    errors.push("生产公开流没有可展示内容");
  if (
    gate.blockers !== 0 ||
    !Array.isArray(gate.findings) ||
    gate.findings.some((item) => item?.severity === "P0")
  ) {
    errors.push("处理后的生产公开流仍存在 P0 新鲜度阻断");
  }
  const gateTimeProblem = validateFreshTimestamp(
    gate.generatedAt,
    "公开内容新鲜度报告",
    now,
    args.maxAgeHours,
  );
  if (gateTimeProblem) errors.push(gateTimeProblem);
  const completedAt = Date.parse(action.completedAt);
  const checkedAt = Date.parse(gate.checkedAt);
  if (!Number.isFinite(checkedAt) || (Number.isFinite(completedAt) && checkedAt < completedAt)) {
    errors.push("生产公开流门禁必须在内容处理完成后重新执行");
  }

  const report = {
    schemaVersion: 1,
    kind: "guoxue-public-content-remediation-verification",
    generatedAt: new Date().toISOString(),
    releaseId: args.releaseId,
    decision: errors.length === 0 ? "PASS" : "BLOCK",
    target: action.target || null,
    remediation: {
      actionMode: action.actionMode || null,
      completedAt: action.completedAt || null,
      counts: action.counts || null,
      total: action.total ?? null,
      historicalRecordsDeleted: action.historicalRecordsDeleted ?? null,
      publicFeedExclusionVerified: action.publicFeedExclusionVerified ?? null,
    },
    freshness: {
      checkedAt: gate.checkedAt || null,
      totalItems: gate.totalItems ?? null,
      blockers: gate.blockers ?? null,
    },
    sources: {
      remediationSha256: sha256(remediation.content),
      freshnessReportSha256: sha256(freshness.content),
    },
    errors,
  };

  const outputPath = path.resolve(args.reportPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await chmod(outputPath, 0o600).catch(() => undefined);
  console.log(
    `公开内容处理闭环：${report.decision}，处理 ${report.remediation.total ?? 0} 条，公开流阻断 ${report.freshness.blockers ?? "未知"}`,
  );
  if (errors.length > 0) {
    for (const error of errors) console.error(`BLOCK ${error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`公开内容处理闭环验真失败：${error.message}`);
  process.exitCode = 2;
});
