import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = path.join(repoRoot, "scripts", "release", "audit-capability-readiness.mjs");
const requiredFiles = [
  "package.json",
  "apps/mobile/src/pages.json",
  "apps/mobile/src/manifest.json",
  "apps/mobile/src/lib/voice-agent-runtime.ts",
  "apps/mobile/src/lib/agent-data.ts",
  "apps/mobile/src/pkg-agent/agent/voice-call.vue",
  "apps/mobile/src/pkg-agent/agent/chat.vue",
  "apps/mobile/src/pkg-classics/audiobooks/player.vue",
  "apps/server/src/modules/bot/bot.controller.ts",
  "apps/server/src/modules/bot/bot.service.ts",
  "apps/server/src/modules/bot/coze.service.ts",
  "apps/server/src/modules/tts/tts.controller.ts",
];

function runAudit(...args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

async function createFixture() {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "guoxue-capability-audit-"));
  await Promise.all(
    requiredFiles.map(async (relativePath) => {
      const target = path.join(fixtureRoot, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(repoRoot, relativePath), target);
    }),
  );
  return fixtureRoot;
}

test("当前仓库能力审计通过并生成可归档结构化报告", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-capability-report-"));
  const reportPath = path.join(tempDir, "capability-readiness.json");
  const result = runAudit(
    "--repo-root",
    repoRoot,
    "--release-id",
    "capability-test-001",
    "--report",
    reportPath,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.kind, "guoxue-capability-readiness");
  assert.equal(report.releaseId, "capability-test-001");
  assert.equal(report.success, true);
  assert.equal(report.summary.total, 12);
  assert.equal(report.summary.passed, 12);
  assert.equal(report.summary.failed, 0);
  assert.ok(report.summary.warnings >= 0);
  assert.equal(report.checks.length, 12);
});

test("语音运行时契约被删除时必须阻断发布", async () => {
  const fixtureRoot = await createFixture();
  const runtimePath = path.join(
    fixtureRoot,
    "apps/mobile/src/lib/voice-agent-runtime.ts",
  );
  const runtime = await readFile(runtimePath, "utf8");
  await writeFile(runtimePath, runtime.replaceAll("__GUOXUE_VOICE_AGENT_RUNTIME__", "REMOVED"));
  const reportPath = path.join(fixtureRoot, "capability-readiness.json");

  const result = runAudit("--repo-root", fixtureRoot, "--report", reportPath);

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.success, false);
  assert.equal(report.summary.failed, 1);
  assert.equal(
    report.checks.find((item) => item.name === "H5、小程序、App 共用稳定语音运行时契约")
      ?.pass,
    false,
  );
});

test("TTS Range 续取能力被删除时必须阻断古籍音频发布", async () => {
  const fixtureRoot = await createFixture();
  const controllerPath = path.join(
    fixtureRoot,
    "apps/server/src/modules/tts/tts.controller.ts",
  );
  const controller = await readFile(controllerPath, "utf8");
  await writeFile(controllerPath, controller.replaceAll("res.status(206)", "res.status(200)"));
  const reportPath = path.join(fixtureRoot, "capability-readiness.json");

  const result = runAudit("--repo-root", fixtureRoot, "--report", reportPath);

  assert.equal(result.status, 1);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.summary.failed, 1);
  assert.equal(
    report.checks.find((item) => item.name === "TTS 同时支持鉴权 POST、媒体 GET 和 Range 续取")
      ?.pass,
    false,
  );
});
