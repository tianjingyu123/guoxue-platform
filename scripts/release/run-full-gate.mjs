#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { resolvePnpmInvocation } from "./resolve-pnpm-invocation.mjs";

const args = process.argv.slice(2);
let envFile = "";
let deployTarget = "";
let infrastructureIntake = "";
let reportDirectory = "release-evidence";
let expectedBranch = "";
let expectedCommit = "";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--") {
    continue;
  }
  if (arg === "--env-file") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--env-file 后必须提供正式环境文件路径");
      process.exit(2);
    }
    envFile = next;
    index += 1;
    continue;
  }
  if (arg === "--deploy-target") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--deploy-target 后必须提供 standard 或 tencent");
      process.exit(2);
    }
    deployTarget = next.trim().toLowerCase();
    index += 1;
    continue;
  }
  if (arg === "--infrastructure-intake") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--infrastructure-intake 后必须提供新基础设施接入清单路径");
      process.exit(2);
    }
    infrastructureIntake = next;
    index += 1;
    continue;
  }
  if (arg === "--report-dir") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--report-dir 后必须提供证据目录");
      process.exit(2);
    }
    reportDirectory = next;
    index += 1;
    continue;
  }
  if (arg === "--expected-branch") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--expected-branch 后必须提供正式来源分支");
      process.exit(2);
    }
    expectedBranch = next;
    index += 1;
    continue;
  }
  if (arg === "--expected-commit") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--expected-commit 后必须提供 40 位源提交 SHA");
      process.exit(2);
    }
    expectedCommit = next;
    index += 1;
    continue;
  }
  console.error(`错误：未知参数 ${arg}`);
  process.exit(2);
}

if (!envFile) {
  console.error("错误：完整上线门禁必须显式传入 --env-file，禁止静默使用仓库内历史环境文件");
  process.exit(2);
}
if (!["standard", "tencent"].includes(deployTarget)) {
  console.error("错误：--deploy-target 仅允许 standard 或 tencent");
  process.exit(2);
}
if (!infrastructureIntake) {
  console.error("错误：完整上线门禁必须显式传入 --infrastructure-intake");
  process.exit(2);
}
if (!expectedBranch) {
  console.error("错误：完整上线门禁必须显式传入 --expected-branch");
  process.exit(2);
}
if (!/^[a-f0-9]{40}$/iu.test(expectedCommit)) {
  console.error("错误：完整上线门禁必须显式传入 40 位 --expected-commit");
  process.exit(2);
}

const resolvedEnvFile = path.resolve(envFile);
if (!existsSync(resolvedEnvFile)) {
  console.error(`错误：找不到正式环境文件 ${resolvedEnvFile}`);
  process.exit(2);
}
const resolvedInfrastructureIntake = path.resolve(infrastructureIntake);
if (!existsSync(resolvedInfrastructureIntake)) {
  console.error(`错误：找不到新基础设施接入清单 ${resolvedInfrastructureIntake}`);
  process.exit(2);
}

const resolvedReportDirectory = path.resolve(reportDirectory);
const pnpm = resolvePnpmInvocation();
if (!pnpm) {
  console.error("错误：Windows 构建机找不到可由 Node 直接运行的 pnpm 或 Corepack CLI");
  process.exit(2);
}

function run(label, commandArgs) {
  console.log(`\n[full-gate] ${label}`);
  const result = spawnSync(pnpm.command, [...pnpm.prefix, ...commandArgs], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`[full-gate] 无法启动 ${label}：${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[full-gate] ${label} 失败，退出码 ${result.status}`);
    process.exit(result.status || 1);
  }
}

run("生产源代码冻结检查", [
  "release:audit-source-freeze",
  "--strict",
  "--report",
  path.join(resolvedReportDirectory, "source-freeze-readiness.json"),
  "--expected-branch",
  expectedBranch,
  "--expected-commit",
  expectedCommit,
]);
run("新基础设施接入与责任人检查", [
  "release:audit-infra-intake",
  "--input",
  resolvedInfrastructureIntake,
  "--stage",
  "launch",
  "--expected-deploy-target",
  deployTarget,
  "--env-file",
  resolvedEnvFile,
  "--report",
  path.join(resolvedReportDirectory, "infrastructure-intake-readiness.json"),
]);
run("正式环境与部署架构检查", [
  "migration:check-env",
  resolvedEnvFile,
  "--full",
  "--deploy-target",
  deployTarget,
  "--report",
  path.join(resolvedReportDirectory, "environment-readiness.json"),
]);
run("当前工作树全量代码、测试与六端构建验证", ["release:verify:local"]);
run("使用同一份正式公开配置重建五类客户端", ["release:build:clients", resolvedEnvFile]);
run("审计五类客户端正式域名、源码映射与配置残留", [
  "release:audit-client-artifacts",
  resolvedEnvFile,
  "--report",
  path.join(resolvedReportDirectory, "client-artifact-audit.json"),
]);

console.log("\n[full-gate] 完整上线门禁通过");
