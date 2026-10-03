#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let evidenceDirectory = "";
let expectedBranch = "";
let expectedCommit = "";
let deployTarget = "";
let reportFile = "";
let maxAgeHours = 24;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--") continue;
  if (
    [
      "--evidence-dir",
      "--expected-branch",
      "--expected-commit",
      "--deploy-target",
      "--report",
      "--max-age-hours",
    ].includes(arg)
  ) {
    if (!next || next.startsWith("--")) {
      console.error(`错误：${arg} 后必须提供值`);
      process.exit(2);
    }
    if (arg === "--evidence-dir") evidenceDirectory = next;
    if (arg === "--expected-branch") expectedBranch = next;
    if (arg === "--expected-commit") expectedCommit = next.toLowerCase();
    if (arg === "--deploy-target") deployTarget = next.toLowerCase();
    if (arg === "--report") reportFile = next;
    if (arg === "--max-age-hours") maxAgeHours = Number(next);
    index += 1;
    continue;
  }
  console.error(`错误：未知参数 ${arg}`);
  process.exit(2);
}

if (!evidenceDirectory) {
  console.error("错误：必须提供 --evidence-dir");
  process.exit(2);
}
if (!expectedBranch) {
  console.error("错误：必须提供 --expected-branch");
  process.exit(2);
}
if (!/^[a-f0-9]{40}$/u.test(expectedCommit)) {
  console.error("错误：--expected-commit 必须是 40 位提交 SHA");
  process.exit(2);
}
if (!["standard", "tencent"].includes(deployTarget)) {
  console.error("错误：--deploy-target 仅允许 standard 或 tencent");
  process.exit(2);
}
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || maxAgeHours > 168) {
  console.error("错误：--max-age-hours 必须大于 0 且不超过 168");
  process.exit(2);
}

const resolvedEvidenceDirectory = path.resolve(evidenceDirectory);
const resolvedReportFile = path.resolve(
  reportFile || path.join(resolvedEvidenceDirectory, "predeploy-decision.json"),
);
const relativeReportPath = path.relative(resolvedEvidenceDirectory, resolvedReportFile);
if (
  relativeReportPath.startsWith("..") ||
  path.isAbsolute(relativeReportPath) ||
  relativeReportPath === ""
) {
  console.error("错误：预接入判定报告必须位于证据目录内");
  process.exit(2);
}

const sourceFiles = {
  sourceFreeze: "source-freeze-readiness.json",
  infrastructure: "infrastructure-intake-predeploy.json",
  environment: "environment-readiness.json",
};
const checks = [];
const sources = {};
const loaded = {};
const sourceBlockers = [];
const now = Date.now();
const maximumAgeMilliseconds = maxAgeHours * 60 * 60 * 1000;
const futureToleranceMilliseconds = 5 * 60 * 1000;

function addCheck(name, pass, detail, source) {
  checks.push({ name, pass: Boolean(pass), detail, source });
}

function addSourceBlocker(source, check) {
  const normalized = String(check || "")
    .replace(/[\r\n\t]+/gu, " ")
    .trim()
    .slice(0, 120);
  if (!normalized) return;
  const key = `${source}\u0000${normalized}`;
  if (sourceBlockers.some((item) => item.key === key)) return;
  sourceBlockers.push({ key, source, check: normalized });
}

for (const [key, fileName] of Object.entries(sourceFiles)) {
  const filePath = path.join(resolvedEvidenceDirectory, fileName);
  if (!existsSync(filePath)) {
    addCheck(`${fileName} 存在`, false, "缺少必需证据", fileName);
    continue;
  }

  try {
    const raw = readFileSync(filePath, "utf8");
    const value = JSON.parse(raw);
    loaded[key] = value;
    sources[key] = {
      file: fileName,
      sha256: createHash("sha256").update(raw).digest("hex"),
      generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    };
    addCheck(`${fileName} 可解析`, true, "JSON 结构有效", fileName);

    const generatedAt = Date.parse(value.generatedAt);
    const timestampValid = Number.isFinite(generatedAt);
    addCheck(
      `${fileName} 时间有效`,
      timestampValid,
      timestampValid ? "生成时间有效" : "缺少有效生成时间",
      fileName,
    );
    if (timestampValid) {
      const fresh =
        generatedAt <= now + futureToleranceMilliseconds &&
        now - generatedAt <= maximumAgeMilliseconds;
      addCheck(
        `${fileName} 未过期`,
        fresh,
        fresh ? `证据时效不超过 ${maxAgeHours} 小时` : "证据已过期或时间超前",
        fileName,
      );
    }
  } catch {
    addCheck(`${fileName} 可解析`, false, "JSON 无法解析", fileName);
  }
}

const freeze = loaded.sourceFreeze;
if (freeze) {
  const counts = freeze.counts || {};
  const identityMatches =
    freeze.sourceCommit === expectedCommit &&
    freeze.expectedCommit === expectedCommit &&
    freeze.branch === expectedBranch &&
    freeze.gitBranch === expectedBranch &&
    freeze.expectedBranch === expectedBranch;
  addCheck(
    "源码冻结身份一致",
    identityMatches,
    identityMatches ? "分支与提交身份完全匹配" : "分支或提交身份不匹配",
    sourceFiles.sourceFreeze,
  );
  const zeroCounts = ["total", "staged", "unstaged", "untracked", "conflicted"].every(
    (key) => Number(counts[key] || 0) === 0,
  );
  const freezeReady =
    freeze.schemaVersion === 2 &&
    freeze.strict === true &&
    freeze.clean === true &&
    freeze.readyForProductionPackage === true &&
    Array.isArray(freeze.problems) &&
    freeze.problems.length === 0 &&
    zeroCounts;
  addCheck(
    "源码冻结可用于生产包",
    freezeReady,
    freezeReady ? "严格、干净且无未归属变更" : "源码冻结未达到生产包要求",
    sourceFiles.sourceFreeze,
  );
  if (!freezeReady) {
    addSourceBlocker(sourceFiles.sourceFreeze, "源码冻结身份或工作树状态未通过");
  }
}

const infrastructure = loaded.infrastructure;
if (infrastructure) {
  const summary = infrastructure.summary || {};
  const binding = infrastructure.configurationBinding;
  const infrastructureReady =
    infrastructure.schemaVersion === 1 &&
    infrastructure.kind === "guoxue-infrastructure-intake-readiness" &&
    infrastructure.stage === "predeploy" &&
    infrastructure.deployTarget === deployTarget &&
    infrastructure.success === true &&
    Number(summary.failed) === 0 &&
    Number(summary.passed) === Number(summary.total) &&
    Array.isArray(infrastructure.checks) &&
    infrastructure.checks.every((check) => check?.pass === true) &&
    /^[a-f0-9]{64}$/u.test(infrastructure.inputSha256 || "") &&
    binding?.success === true;
  addCheck(
    "基础设施预接入通过",
    infrastructureReady,
    infrastructureReady
      ? "资源清单、正式环境和部署架构绑定一致"
      : "资源清单、环境绑定或预接入检查未通过",
    sourceFiles.infrastructure,
  );
  for (const check of Array.isArray(infrastructure.checks) ? infrastructure.checks : []) {
    if (check?.pass === false) {
      addSourceBlocker(sourceFiles.infrastructure, check.name || "基础设施子检查未通过");
    }
  }
}

const environment = loaded.environment;
if (environment) {
  const counts = environment.counts || {};
  const environmentReady =
    environment.fullCheck === true &&
    environment.deployTarget === deployTarget &&
    environment.success === true &&
    Number(counts.errors) === 0 &&
    Array.isArray(environment.errors) &&
    environment.errors.length === 0;
  addCheck(
    "正式环境完整检查通过",
    environmentReady,
    environmentReady ? "正式环境与部署架构检查通过" : "正式环境不完整、架构不匹配或存在错误",
    sourceFiles.environment,
  );
  if (!environmentReady) {
    const errorCount = Array.isArray(environment.errors)
      ? environment.errors.length
      : Number(counts.errors || 0);
    addSourceBlocker(
      sourceFiles.environment,
      `正式环境完整检查存在 ${errorCount} 项错误（详情见脱敏源报告）`,
    );
  }
}

const failed = checks.filter((check) => !check.pass);
for (const check of failed) {
  addSourceBlocker(check.source, check.name);
}
const decision = failed.length === 0 ? "GO" : "BLOCK";
const report = {
  schemaVersion: 1,
  kind: "guoxue-predeploy-decision",
  generatedAt: new Date().toISOString(),
  decision,
  expectedBranch,
  expectedCommit,
  deployTarget,
  maxAgeHours,
  summary: {
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
  },
  checks,
  blockers: sourceBlockers.map(({ source, check }) => ({ source, check })),
  sources,
};

mkdirSync(path.dirname(resolvedReportFile), { recursive: true });
writeFileSync(resolvedReportFile, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

console.log(`预接入聚合判定：${decision}`);
console.log(`汇总：${report.summary.passed}/${report.summary.total} 通过`);
if (decision !== "GO") {
  console.log(`阻断项（${report.blockers.length}）：`);
  for (const blocker of report.blockers) {
    console.log(`- [${blocker.source}] ${blocker.check}`);
  }
}
console.log(`脱敏判定报告：${resolvedReportFile}`);
if (decision !== "GO") process.exit(1);
