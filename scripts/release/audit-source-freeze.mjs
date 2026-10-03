#!/usr/bin/env node

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
let strict = false;
let reportFile = "";
let expectedBranch = "";
let expectedCommit = "";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--") continue;
  if (arg === "--strict") {
    strict = true;
    continue;
  }
  if (arg === "--report") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--report 后必须提供报告路径");
      process.exit(2);
    }
    reportFile = next;
    index += 1;
    continue;
  }
  if (arg === "--expected-branch") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--expected-branch 后必须提供正式来源分支");
      process.exit(2);
    }
    expectedBranch = next.trim();
    index += 1;
    continue;
  }
  if (arg === "--expected-commit") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--expected-commit 后必须提供 40 位源提交 SHA");
      process.exit(2);
    }
    expectedCommit = next.trim().toLowerCase();
    index += 1;
    continue;
  }
  console.error(`错误：未知参数 ${arg}`);
  process.exit(2);
}

function git(commandArgs, { allowFailure = false } = {}) {
  const result = spawnSync("git", commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) {
    console.error(`错误：无法执行 git ${commandArgs.join(" ")}：${result.error.message}`);
    process.exit(2);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || "").trim();
    console.error(`错误：git ${commandArgs.join(" ")} 执行失败${detail ? `：${detail}` : ""}`);
    process.exit(2);
  }
  return result;
}

function parseStatus(rawStatus) {
  const records = String(rawStatus).split("\0");
  const changes = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    const file = record.slice(3);
    const change = { status, file };
    if (/[RC]/u.test(status)) {
      change.previousFile = records[index + 1] || "";
      index += 1;
    }
    changes.push(change);
  }
  return changes;
}

function parseNullSeparated(rawValue) {
  return String(rawValue).split("\0").filter(Boolean);
}

function isSensitivePath(file) {
  const normalized = file.replaceAll("\\", "/");
  const base = normalized.split("/").at(-1)?.toLowerCase() || "";
  const isTemplate = /\.(?:example|sample|template)$/u.test(base);
  if ((base === ".env" || base.startsWith(".env.")) && !isTemplate) return true;
  if (/^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/u.test(base) && !isTemplate) return true;
  if (/\.(?:pem|p12|pfx|key|keystore|jks)$/u.test(base) && !isTemplate) return true;
  return /^(?:credentials?|secrets?|service-account(?:-[^.]+)?)\.json$/u.test(base);
}

function normalizePath(file) {
  return file.replaceAll("\\", "/");
}

function summarizeBy(values, selector) {
  const counts = new Map();
  for (const value of values) {
    const key = selector(value) || "(none)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right, "zh-CN")),
  );
}

const binaryExtensions = new Set([
  ".7z",
  ".apk",
  ".aab",
  ".bin",
  ".dmg",
  ".exe",
  ".ipa",
  ".msi",
  ".pdf",
  ".rar",
  ".tar",
  ".tgz",
  ".war",
  ".zip",
]);

function extensionOf(file) {
  const base = normalizePath(file).split("/").at(-1) || "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "(none)";
}

const head = String(git(["rev-parse", "--verify", "HEAD"]).stdout).trim();
const branchResult = git(["symbolic-ref", "--short", "-q", "HEAD"], { allowFailure: true });
const branch = branchResult.status === 0 ? String(branchResult.stdout).trim() : "DETACHED";
const sourceBranch =
  branch === "DETACHED" && process.env.GITHUB_REF_NAME
    ? String(process.env.GITHUB_REF_NAME).trim()
    : branch;
const upstreamResult = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
  allowFailure: true,
});
const upstream = upstreamResult.status === 0 ? String(upstreamResult.stdout).trim() : "";
let ahead = null;
let behind = null;
if (upstream) {
  const relation = git(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], {
    allowFailure: true,
  });
  if (relation.status === 0) {
    const [aheadText, behindText] = String(relation.stdout).trim().split(/\s+/u);
    ahead = Number(aheadText);
    behind = Number(behindText);
  }
}

const statusResult = git(["status", "--porcelain=v1", "-z", "--untracked-files=normal"]);
const changes = parseStatus(statusResult.stdout);
const untrackedFiles = parseNullSeparated(
  git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout,
);
const conflictedStatuses = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

const counts = {
  total: changes.length,
  staged: changes.filter(({ status }) => status[0] !== " " && status[0] !== "?").length,
  unstaged: changes.filter(({ status }) => status[1] !== " " && status[1] !== "?").length,
  untracked: changes.filter(({ status }) => status === "??").length,
  untrackedFiles: untrackedFiles.length,
  conflicted: changes.filter(({ status }) => conflictedStatuses.has(status)).length,
  deleted: changes.filter(({ status }) => status.includes("D")).length,
};
const sensitivePaths = [
  ...changes.flatMap(({ file, previousFile }) => [file, previousFile].filter(Boolean)),
  ...untrackedFiles,
].filter((file, index, all) => isSensitivePath(file) && all.indexOf(file) === index);
const normalizedUntrackedFiles = untrackedFiles.map(normalizePath);
const untrackedFileDetails = normalizedUntrackedFiles.map((file) => {
  let sizeBytes = null;
  try {
    sizeBytes = statSync(path.resolve(file)).size;
  } catch {
    // 文件在 git 枚举后被外部进程移除时保留 null，避免审计器自身崩溃。
  }
  return { file, extension: extensionOf(file), sizeBytes };
});
const topLevelUntracked = normalizedUntrackedFiles.filter((file) => !file.includes("/"));
const allowedTopLevelUntracked = new Set([".gitattributes"]);
const manualReviewPaths = topLevelUntracked.filter((file) => !allowedTopLevelUntracked.has(file));
const oversizedUntrackedPaths = untrackedFileDetails
  .filter(({ sizeBytes }) => Number.isFinite(sizeBytes) && sizeBytes > 1024 * 1024)
  .map(({ file, sizeBytes }) => ({ file, sizeBytes }));
const binaryUntrackedPaths = untrackedFileDetails
  .filter(({ extension }) => binaryExtensions.has(extension))
  .map(({ file, extension, sizeBytes }) => ({ file, extension, sizeBytes }));
const changeSetReview = {
  trackedGroups: summarizeBy(
    changes.filter(({ status }) => status !== "??"),
    ({ file }) => normalizePath(file).split("/")[0],
  ),
  untrackedGroups: summarizeBy(normalizedUntrackedFiles, (file) => file.split("/")[0]),
  untrackedExtensions: summarizeBy(untrackedFileDetails, ({ extension }) => extension),
  topLevelUntracked,
  manualReviewPaths,
  oversizedUntrackedPaths,
  binaryUntrackedPaths,
};
const diffCheck = git(["diff", "--check"], { allowFailure: true });

const problems = [];
if (!/^[a-f0-9]{40}$/iu.test(head)) problems.push("无法确认 40 位源提交 SHA");
if (strict && !expectedBranch) problems.push("严格冻结缺少预期正式来源分支");
if (strict && !expectedCommit) problems.push("严格冻结缺少预期源提交 SHA");
if (expectedBranch && sourceBranch !== expectedBranch) {
  problems.push(`当前来源分支 ${sourceBranch} 与预期正式来源分支 ${expectedBranch} 不一致`);
}
if (expectedCommit && !/^[a-f0-9]{40}$/u.test(expectedCommit)) {
  problems.push("预期源提交 SHA 必须为 40 位十六进制");
} else if (expectedCommit && head.toLowerCase() !== expectedCommit) {
  problems.push("当前 HEAD 与预期源提交 SHA 不一致");
}
if (counts.total > 0) problems.push(`工作树尚未冻结，共 ${counts.total} 个变更条目`);
if (counts.conflicted > 0) problems.push(`存在 ${counts.conflicted} 个未解决冲突`);
if (sensitivePaths.length > 0) problems.push("变更清单包含疑似敏感文件名");
if (manualReviewPaths.length > 0) {
  problems.push(`存在 ${manualReviewPaths.length} 个需要人工归属确认的根目录文件`);
}
if (oversizedUntrackedPaths.length > 0) problems.push("未跟踪源码中包含超过 1 MiB 的文件");
if (binaryUntrackedPaths.length > 0) problems.push("未跟踪源码中包含二进制发布物或归档文件");
if (diffCheck.status !== 0) problems.push("git diff --check 未通过");

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  sourceCommit: head,
  branch: sourceBranch,
  gitBranch: branch,
  expectedBranch: expectedBranch || null,
  expectedCommit: expectedCommit || null,
  upstream: upstream || null,
  ahead,
  behind,
  clean: counts.total === 0,
  strict,
  readyForProductionPackage: problems.length === 0,
  counts,
  sensitivePaths,
  changeSetReview,
  problems,
  changes,
};

if (reportFile) {
  const resolvedReport = path.resolve(reportFile);
  mkdirSync(path.dirname(resolvedReport), { recursive: true });
  writeFileSync(resolvedReport, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`冻结审计报告：${resolvedReport}`);
}

console.log("源代码冻结审计");
console.log(`提交：${head}`);
console.log(
  `分支：${sourceBranch}${branch !== sourceBranch ? `（Git ${branch}）` : ""}${upstream ? `（上游 ${upstream}，领先 ${ahead}，落后 ${behind}）` : ""}`,
);
if (expectedBranch || expectedCommit) {
  console.log(`预期来源：${expectedBranch || "(未提供)"} @ ${expectedCommit || "(未提供)"}`);
}
console.log(
  `变更：${counts.total} 个状态条目（暂存 ${counts.staged}、未暂存 ${counts.unstaged}、未跟踪目录/文件 ${counts.untracked}、实际未跟踪文件 ${counts.untrackedFiles}、冲突 ${counts.conflicted}）`,
);
if (problems.length === 0) {
  console.log("结果：已具备生产固定包源代码基线");
} else {
  console.log("结果：尚未具备生产固定包源代码基线");
  for (const problem of problems) console.log(`- ${problem}`);
}

if (strict && problems.length > 0) process.exit(1);
