import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "release", "audit-store-readiness.mjs");

function runAudit(...args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("非严格商店审计会写入可归档的结构化阻断报告", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-audit-"));
  const reportPath = path.join(tempDir, "store-readiness.json");
  const result = runAudit(
    "--release-id",
    "release-store-test-001",
    "--report",
    reportPath,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.kind, "guoxue-store-readiness");
  assert.equal(report.releaseId, "release-store-test-001");
  assert.equal(report.success, false);
  assert.equal(report.summary.total, 23);
  assert.equal(report.summary.passed, 21);
  assert.equal(report.summary.failed, 2);
  assert.equal(report.summary.externalBlockers, 2);
  assert.equal(report.summary.configurationBlockers, 0);
  assert.equal(report.summary.codeBlockers, 0);
  assert.equal(report.checks.length, 23);
  const failedChecks = report.checks.filter((item) => item.pass === false);
  assert.deepEqual(
    failedChecks.map((item) => item.name),
    ["App 原生 SDK/插件配置已完成", "鸿蒙正式签名资料已核验"],
  );
  assert.ok(failedChecks.every((item) => item.kind === "外部"));
});

test("严格商店审计失败前仍写入报告，便于留存阻断证据", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-strict-"));
  const reportPath = path.join(tempDir, "store-readiness.json");
  const result = runAudit(
    "--strict",
    "--release-id",
    "release-store-test-002",
    "--report",
    reportPath,
  );

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.strict, true);
  assert.equal(report.success, false);
  assert.equal(report.summary.failed, 2);
});

test("正式商店报告拒绝缺失或非法发布标识", () => {
  const result = runAudit("--report", "tmp/store-readiness.json");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /release-id|发布标识/u);
});
