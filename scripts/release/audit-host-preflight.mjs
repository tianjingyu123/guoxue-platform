#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let projectDirectory = "";
let envFile = "";
let releaseId = "";
let reportArgument = "";
let allowOccupiedPorts = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--") {
    continue;
  } else if (arg === "--project-dir" && next) {
    projectDirectory = next;
    index += 1;
  } else if (arg === "--env-file" && next) {
    envFile = next;
    index += 1;
  } else if (arg === "--release-id" && next) {
    releaseId = next.trim();
    index += 1;
  } else if (arg === "--report" && next) {
    reportArgument = next;
    index += 1;
  } else if (arg === "--allow-occupied-ports") {
    allowOccupiedPorts = true;
  } else {
    throw new Error(`未知或缺少值的参数：${arg}`);
  }
}

if (!projectDirectory) throw new Error("必须通过 --project-dir 指定已解压的固定发布目录");
if (!envFile) throw new Error("必须通过 --env-file 指定生产环境文件");
if (!/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  throw new Error("必须通过 --release-id 提供 8-80 位固定发布标识");
}
if (!reportArgument) throw new Error("必须通过 --report 指定主机预检证据文件");

const projectDir = path.resolve(projectDirectory);
const productionEnvFile = path.resolve(envFile);
const reportPath = path.resolve(reportArgument);
const preflightScript = path.join(projectDir, "scripts", "release", "preflight-host.sh");
const releaseIdPath = path.join(projectDir, ".release-id");
const observedReleaseId = (await readFile(releaseIdPath, "utf8")).trim();
if (observedReleaseId !== releaseId) {
  throw new Error(`固定发布目录标识与预期不一致：${observedReleaseId || "missing"}`);
}

const scriptContent = await readFile(preflightScript);
const machineIdentityParts = [os.hostname()];
try {
  machineIdentityParts.push((await readFile("/etc/machine-id", "utf8")).trim());
} catch {
  machineIdentityParts.push(`${os.platform()}:${os.arch()}`);
}

const command = process.platform === "win32" ? "bash.exe" : "bash";
const execution = spawnSync(command, [preflightScript], {
  cwd: projectDir,
  encoding: "utf8",
  timeout: 180_000,
  env: {
    ...process.env,
    PROJECT_DIR: projectDir,
    ENV_FILE: productionEnvFile,
    REQUIRE_DOCKER: process.env.REQUIRE_DOCKER || "true",
    REQUIRE_RELEASE_MANIFEST: "true",
    REQUIRE_BASE_TOOLS: "true",
    REQUIRE_TIME_SYNC: "true",
    ALLOW_OCCUPIED_PORTS: allowOccupiedPorts ? "true" : "false",
  },
});

if (execution.stdout) process.stdout.write(execution.stdout);
if (execution.stderr) process.stderr.write(execution.stderr);

const rawOutput = `${execution.stdout || ""}\n${execution.stderr || ""}`;
const parsed = [];
for (const line of rawOutput.split(/\r?\n/u)) {
  const match = line.match(/^\[(PASS|WARN|FAIL)\]\s+(.+)$/u);
  if (!match) continue;
  parsed.push({
    id: `host-check-${String(parsed.length + 1).padStart(2, "0")}`,
    status: match[1],
    fingerprint: createHash("sha256").update(match[2]).digest("hex"),
  });
}

const summary = {
  passed: parsed.filter((item) => item.status === "PASS").length,
  warned: parsed.filter((item) => item.status === "WARN").length,
  failed: parsed.filter((item) => item.status === "FAIL").length,
  total: parsed.length,
};
const executionSucceeded = execution.status === 0 && !execution.error && !execution.signal;
const success = executionSucceeded && summary.failed === 0 && summary.passed > 0;
const report = {
  schemaVersion: 1,
  kind: "guoxue-host-preflight-readiness",
  generatedAt: new Date().toISOString(),
  releaseId,
  success,
  execution: {
    exitCode: Number.isInteger(execution.status) ? execution.status : null,
    timedOut: execution.error?.code === "ETIMEDOUT",
    signal: execution.signal || null,
  },
  summary,
  hostIdentitySha256: createHash("sha256").update(machineIdentityParts.join("\n")).digest("hex"),
  preflightScriptSha256: createHash("sha256").update(scriptContent).digest("hex"),
  sourceOutputSha256: createHash("sha256").update(rawOutput).digest("hex"),
  checks: parsed,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(reportPath, 0o600).catch(() => undefined);

console.log(
  `主机预检证据：${success ? "PASS" : "FAIL"}（PASS=${summary.passed} WARN=${summary.warned} FAIL=${summary.failed}）`,
);
console.log(`证据报告：${reportPath}`);
if (!success) process.exitCode = Number.isInteger(execution.status) && execution.status !== 0 ? execution.status : 1;
