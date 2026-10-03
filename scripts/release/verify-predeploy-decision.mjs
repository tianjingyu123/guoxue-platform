#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SAFE_FILE_NAMES = new Set([
  "source-freeze-readiness.json",
  "infrastructure-intake-predeploy.json",
  "environment-readiness.json",
]);
const TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "kind",
  "generatedAt",
  "decision",
  "expectedBranch",
  "expectedCommit",
  "deployTarget",
  "maxAgeHours",
  "summary",
  "checks",
  "blockers",
  "sources",
]);

function exactKeys(value, allowed) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

export function verifyPredeployDecision(
  report,
  {
    expectedBranch,
    expectedCommit,
    deployTarget,
    maxAgeHours = 24,
    raw = "",
    now = Date.now(),
    requireGo = true,
  },
) {
  const errors = [];
  const fail = (message) => errors.push(message);

  if (!exactKeys(report, TOP_LEVEL_KEYS)) fail("报告包含未知顶层字段或不是对象");
  if (report?.schemaVersion !== 1 || report?.kind !== "guoxue-predeploy-decision") {
    fail("报告类型或版本不受支持");
  }
  if (!new Set(["GO", "BLOCK"]).has(report?.decision)) fail("预接入统一判定值无效");
  if (requireGo && report?.decision !== "GO") fail("预接入统一判定不是 GO");
  if (report?.expectedBranch !== expectedBranch) fail("报告来源分支与预期不一致");
  if (report?.expectedCommit !== expectedCommit) fail("报告来源提交与预期不一致");
  if (report?.deployTarget !== deployTarget) fail("报告部署架构与预期不一致");
  if (Number(report?.maxAgeHours) !== Number(maxAgeHours)) fail("报告证据时效参数与预期不一致");

  const generatedAt = Date.parse(report?.generatedAt);
  const maximumAgeMilliseconds = Number(maxAgeHours) * 60 * 60 * 1000;
  if (
    !Number.isFinite(generatedAt) ||
    generatedAt > now + 5 * 60 * 1000 ||
    now - generatedAt > maximumAgeMilliseconds
  ) {
    fail("报告生成时间无效、超前或已经过期");
  }

  const checks = Array.isArray(report?.checks) ? report.checks : [];
  if (checks.length === 0) fail("报告没有检查项");
  if (
    checks.some(
      (check) =>
        !exactKeys(check, new Set(["name", "pass", "detail", "source"])) ||
        typeof check.name !== "string" ||
        typeof check.pass !== "boolean" ||
        typeof check.detail !== "string" ||
        typeof check.source !== "string",
    )
  ) {
    fail("报告检查项结构无效或仍存在未通过项");
  }

  const summary = report?.summary;
  const passed = checks.filter((check) => check.pass === true).length;
  const failed = checks.length - passed;
  if (
    !exactKeys(summary, new Set(["total", "passed", "failed"])) ||
    Number(summary?.total) !== checks.length ||
    Number(summary?.passed) !== passed ||
    Number(summary?.failed) !== failed
  ) {
    fail("报告汇总与检查项不一致");
  }
  if (
    !Array.isArray(report?.blockers) ||
    report.blockers.some(
      (blocker) =>
        !exactKeys(blocker, new Set(["source", "check"])) ||
        !SAFE_FILE_NAMES.has(blocker.source) ||
        typeof blocker.check !== "string" ||
        !blocker.check.trim(),
    )
  ) {
    fail("阻断项结构无效或包含非脱敏字段");
  } else if (requireGo && report.blockers.length !== 0) {
    fail("GO 报告仍包含阻断项");
  }

  const sources = report?.sources;
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    fail("源证据绑定不是对象");
  } else {
    for (const source of Object.values(sources)) {
      if (
        !exactKeys(source, new Set(["file", "sha256", "generatedAt"])) ||
        !SAFE_FILE_NAMES.has(source.file) ||
        !SHA256_PATTERN.test(source.sha256 || "") ||
        !Number.isFinite(Date.parse(source.generatedAt))
      ) {
        fail("源证据绑定结构、文件名、摘要或时间无效");
        break;
      }
    }
    const boundFiles = new Set(Object.values(sources).map((source) => source.file));
    if (
      requireGo &&
      (Object.keys(sources).length !== 3 ||
        boundFiles.size !== SAFE_FILE_NAMES.size ||
        [...SAFE_FILE_NAMES].some((file) => !boundFiles.has(file)))
    ) {
      fail("源证据文件集合不完整或重复");
    }
  }

  if (requireGo && (failed !== 0 || checks.some((check) => check.pass !== true))) {
    fail("GO 报告仍存在未通过检查项");
  }

  if (!COMMIT_PATTERN.test(expectedCommit || "")) fail("预期提交不是完整 SHA");
  if (!new Set(["standard", "tencent"]).has(deployTarget)) fail("预期部署架构无效");
  if (!expectedBranch) fail("预期分支不能为空");
  if (
    !Number.isFinite(Number(maxAgeHours)) ||
    Number(maxAgeHours) <= 0 ||
    Number(maxAgeHours) > 168
  ) {
    fail("预期证据时效必须大于 0 且不超过 168 小时");
  }

  const forbiddenPatterns = [
    /(?:postgres(?:ql)?|redis(?:s)?|https?|wss?):\/\//iu,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /[A-Za-z]:\\[^"\r\n]+/u,
    /\/(?:opt|home|root|Users)\/[^"\r\n]+/u,
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(raw))) {
    fail("统一判定报告包含连接串、网址、私钥或本机路径");
  }

  return { success: errors.length === 0, errors };
}

function parseArguments(args) {
  let reportFile = "";
  const options = {
    expectedBranch: "",
    expectedCommit: "",
    deployTarget: "",
    maxAgeHours: 24,
    safetyOnly: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--") continue;
    if (arg === "--safety-only") {
      options.safetyOnly = true;
      continue;
    }
    if (!arg.startsWith("--") && !reportFile) {
      reportFile = arg;
      continue;
    }
    if (
      ["--expected-branch", "--expected-commit", "--deploy-target", "--max-age-hours"].includes(arg)
    ) {
      if (!next || next.startsWith("--")) throw new Error(`${arg} 后必须提供值`);
      if (arg === "--expected-branch") options.expectedBranch = next;
      if (arg === "--expected-commit") options.expectedCommit = next.toLowerCase();
      if (arg === "--deploy-target") options.deployTarget = next.toLowerCase();
      if (arg === "--max-age-hours") options.maxAgeHours = Number(next);
      index += 1;
      continue;
    }
    throw new Error(`未知参数 ${arg}`);
  }
  if (!reportFile) throw new Error("必须提供预接入统一判定报告路径");
  return { reportFile, options };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const { reportFile, options } = parseArguments(process.argv.slice(2));
    const raw = readFileSync(path.resolve(reportFile), "utf8");
    const report = JSON.parse(raw);
    const result = verifyPredeployDecision(report, {
      ...options,
      raw,
      requireGo: !options.safetyOnly,
    });
    if (!result.success) {
      for (const error of result.errors) console.error(`BLOCK ${error}`);
      process.exitCode = 1;
    } else {
      console.log(
        options.safetyOnly
          ? `GO 预接入判定可安全归档：decision=${report.decision}`
          : `GO 预接入判定验真通过：branch=${options.expectedBranch} commit=${options.expectedCommit} target=${options.deployTarget}`,
      );
    }
  } catch (error) {
    console.error(`BLOCK ${error.message}`);
    process.exitCode = 2;
  }
}
