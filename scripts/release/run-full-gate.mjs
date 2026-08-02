#!/usr/bin/env node

import { existsSync, mkdirSync, rmSync } from "node:fs";
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
let releaseId = "";
let stage = "launch";

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
  if (arg === "--release-id") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--release-id 后必须提供 8-80 位发布标识");
      process.exit(2);
    }
    releaseId = next.trim();
    index += 1;
    continue;
  }
  if (arg === "--stage") {
    if (!next || next.startsWith("--")) {
      console.error("错误：--stage 后必须提供 predeploy 或 launch");
      process.exit(2);
    }
    stage = next.trim().toLowerCase();
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
if (!["predeploy", "launch"].includes(stage)) {
  console.error("错误：--stage 仅允许 predeploy 或 launch");
  process.exit(2);
}
if (releaseId && !/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  console.error("错误：--release-id 必须是 8-80 位字母、数字、点、下划线或短横线");
  process.exit(2);
}
if (stage === "launch" && !releaseId) {
  console.error("错误：launch 阶段必须显式传入 --release-id，以绑定构建、验真与固定包证据");
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
const infrastructureReportName =
  stage === "launch"
    ? "infrastructure-intake-readiness.json"
    : "infrastructure-intake-predeploy.json";
const pnpm = resolvePnpmInvocation();
if (!pnpm) {
  console.error("错误：Windows 构建机找不到可由 Node 直接运行的 pnpm 或 Corepack CLI");
  process.exit(2);
}

const predeployStepFailures = [];

function run(label, commandArgs, { continueOnFailure = false } = {}) {
  console.log(`\n[full-gate] ${label}`);
  const result = spawnSync(pnpm.command, [...pnpm.prefix, ...commandArgs], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`[full-gate] 无法启动 ${label}：${result.error.message}`);
    if (!continueOnFailure) process.exit(1);
    predeployStepFailures.push({ label, status: 1, launchError: true });
    return false;
  }
  if (result.status !== 0) {
    console.error(`[full-gate] ${label} 失败，退出码 ${result.status}`);
    if (!continueOnFailure) process.exit(result.status || 1);
    predeployStepFailures.push({ label, status: result.status || 1 });
    return false;
  }
  return true;
}

if (stage === "predeploy") {
  mkdirSync(resolvedReportDirectory, { recursive: true });
  for (const reportName of [
    "source-freeze-readiness.json",
    infrastructureReportName,
    "environment-readiness.json",
    "predeploy-decision.json",
  ]) {
    rmSync(path.join(resolvedReportDirectory, reportName), { force: true });
  }
}

const predeployRunOptions = { continueOnFailure: stage === "predeploy" };

run(
  "生产源代码冻结检查",
  [
    "release:audit-source-freeze",
    "--strict",
    "--report",
    path.join(resolvedReportDirectory, "source-freeze-readiness.json"),
    "--expected-branch",
    expectedBranch,
    "--expected-commit",
    expectedCommit,
  ],
  predeployRunOptions,
);
run(
  "新基础设施接入与责任人检查",
  [
    "release:audit-infra-intake",
    "--input",
    resolvedInfrastructureIntake,
    "--stage",
    stage,
    "--expected-deploy-target",
    deployTarget,
    "--env-file",
    resolvedEnvFile,
    "--report",
    path.join(resolvedReportDirectory, infrastructureReportName),
  ],
  predeployRunOptions,
);
run(
  "正式环境与部署架构检查",
  [
    "migration:check-env",
    resolvedEnvFile,
    "--full",
    "--deploy-target",
    deployTarget,
    "--report",
    path.join(resolvedReportDirectory, "environment-readiness.json"),
  ],
  predeployRunOptions,
);

if (stage === "predeploy") {
  run(
    "聚合预接入证据并生成脱敏 GO/BLOCK 判定",
    [
      "release:aggregate-predeploy",
      "--evidence-dir",
      resolvedReportDirectory,
      "--expected-branch",
      expectedBranch,
      "--expected-commit",
      expectedCommit,
      "--deploy-target",
      deployTarget,
      "--report",
      path.join(resolvedReportDirectory, "predeploy-decision.json"),
    ],
    predeployRunOptions,
  );
  if (predeployStepFailures.length > 0) {
    console.error("\n[full-gate] 正式资源预接入门禁判定为 BLOCK：");
    for (const failure of predeployStepFailures) {
      console.error(`- ${failure.label}（退出码 ${failure.status}）`);
    }
    console.error(
      `[full-gate] 已继续执行其余只读审计；统一脱敏判定见 ${path.join(resolvedReportDirectory, "predeploy-decision.json")}`,
    );
    process.exit(1);
  }
  console.log(
    "\n[full-gate] 正式资源预接入门禁通过并生成 predeploy-decision.json；尚未执行耗时构建、客户端重建或 launch 现场验收",
  );
  process.exit(0);
}

run("当前工作树全量代码、测试与六端构建验证", ["release:verify:local"]);
run("使用同一份正式公开配置重建五类客户端", ["release:build:clients", resolvedEnvFile]);
run("审计五类客户端正式域名、源码映射与配置残留", [
  "release:audit-client-artifacts",
  resolvedEnvFile,
  "--release-id",
  releaseId,
  "--source-commit",
  expectedCommit,
  "--report",
  path.join(resolvedReportDirectory, "client-artifact-audit.json"),
]);

run("独立复验五类客户端成品文件数、字节数与内容指纹", [
  "release:verify-client-artifacts",
  path.join(resolvedReportDirectory, "client-artifact-audit.json"),
  "--expected-release-id",
  releaseId,
  "--expected-commit",
  expectedCommit,
  "--output",
  path.join(resolvedReportDirectory, "client-artifact-verification.json"),
]);
run("生成与发布标识、源提交绑定的客户端公开配置指纹", [
  "release:create-client-config-binding",
  resolvedEnvFile,
  "--release-id",
  releaseId,
  "--source-commit",
  expectedCommit,
  "--output",
  path.join(resolvedReportDirectory, "client-config-binding.json"),
]);

console.log("\n[full-gate] 构建机 launch 候选门禁通过；已生成固定包所需客户端证据");
console.log(
  "[full-gate] 尚未生成最终上线 GO；仍需固定包服务器验真、最终数据库对账、公网运行时与版本保留证据、release:aggregate-evidence 机器聚合，以及 release:finalize-launch 技术/业务双签",
);
