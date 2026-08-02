import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
  const result = runAudit("--release-id", "release-store-test-001", "--report", reportPath);

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

test("正式语音与鸿蒙签名必须同时绑定候选包和真机证据", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-evidence-"));
  const releaseId = "release-store-evidence-001";
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "apps/mobile/src/manifest.json"), "utf8"),
  );
  manifest["app-plus"].nativePlugins = { "Tencent-TRTC": {} };
  const manifestPath = path.join(tempDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));

  const baseline = JSON.parse(
    await readFile(path.join(repoRoot, "config/release/store-baseline.json"), "utf8"),
  );
  baseline.harmony.signingProfileVerified = true;
  const baselinePath = path.join(tempDir, "baseline.json");
  await writeFile(baselinePath, JSON.stringify(baseline));

  const artifactPaths = {
    android: path.join(tempDir, "candidate.apk"),
    ios: path.join(tempDir, "candidate.ipa"),
    harmony: path.join(tempDir, "candidate.app"),
  };
  await Promise.all(
    Object.entries(artifactPaths).map(([platform, artifactPath]) =>
      writeFile(artifactPath, `signed-${platform}-candidate`),
    ),
  );
  const artifactSha256 = Object.fromEntries(
    Object.entries(artifactPaths).map(([platform, artifactPath]) => [
      platform,
      createHash("sha256").update(`signed-${platform}-candidate`).digest("hex"),
    ]),
  );
  const evidence = {
    schemaVersion: 1,
    kind: "guoxue-store-release-evidence",
    releaseId,
    nativeVoiceRtc: {
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "移动端验收组",
      evidenceId: "VOICE-RTC-001",
      platforms: {
        android: {
          artifactPath: artifactPaths.android,
          artifactSha256: artifactSha256.android,
          deviceModel: "Android 测试真机",
          osVersion: "Android 15",
          microphonePermissionPassed: true,
          callRoundTripPassed: true,
        },
        ios: {
          artifactPath: artifactPaths.ios,
          artifactSha256: artifactSha256.ios,
          deviceModel: "iPhone 测试真机",
          osVersion: "iOS 19",
          microphonePermissionPassed: true,
          callRoundTripPassed: true,
        },
      },
    },
    harmonySigning: {
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "鸿蒙发布验收组",
      evidenceId: "HARMONY-COVER-001",
      artifactPath: artifactPaths.harmony,
      artifactSha256: artifactSha256.harmony,
      signatureSha256: "a".repeat(64),
      deviceModel: "HarmonyOS 测试真机",
      osVersion: "HarmonyOS NEXT",
      oldVersion: "1.0.3",
      candidateVersion: "1.1.0",
      coverInstallPassed: true,
    },
  };
  const evidencePath = path.join(tempDir, "store-release-evidence.json");
  const reportPath = path.join(tempDir, "store-readiness.json");
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = runAudit(
    "--strict",
    "--release-id",
    releaseId,
    "--manifest",
    manifestPath,
    "--baseline",
    baselinePath,
    "--evidence",
    evidencePath,
    "--report",
    reportPath,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.success, true);
  assert.equal(report.summary.passed, 23);
  assert.equal(report.summary.failed, 0);
});

test("无关原生插件不能冒充语音 RTC 能力", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-plugin-"));
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "apps/mobile/src/manifest.json"), "utf8"),
  );
  manifest["app-plus"].nativePlugins = { "Some-Map-Plugin": {} };
  const manifestPath = path.join(tempDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));

  const result = runAudit("--manifest", manifestPath);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /可识别的 TRTC\/RTC\/voice\/audio 原生插件/u);
});

test("候选包内容变化后旧哈希证据必须失效", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-tamper-"));
  const releaseId = "release-store-tamper-001";
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "apps/mobile/src/manifest.json"), "utf8"),
  );
  manifest["app-plus"].nativePlugins = { "Tencent-TRTC": {} };
  const manifestPath = path.join(tempDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));

  const baseline = JSON.parse(
    await readFile(path.join(repoRoot, "config/release/store-baseline.json"), "utf8"),
  );
  baseline.harmony.signingProfileVerified = true;
  const baselinePath = path.join(tempDir, "baseline.json");
  await writeFile(baselinePath, JSON.stringify(baseline));

  const androidArtifactPath = path.join(tempDir, "candidate.apk");
  const iosArtifactPath = path.join(tempDir, "candidate.ipa");
  const harmonyArtifactPath = path.join(tempDir, "candidate.app");
  await writeFile(androidArtifactPath, "tampered-candidate");
  await writeFile(iosArtifactPath, "ios-candidate");
  await writeFile(harmonyArtifactPath, "harmony-candidate");

  const evidence = {
    schemaVersion: 1,
    kind: "guoxue-store-release-evidence",
    releaseId,
    nativeVoiceRtc: {
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "移动端验收组",
      evidenceId: "VOICE-RTC-TAMPER-001",
      platforms: {
        android: {
          artifactPath: androidArtifactPath,
          artifactSha256: "0".repeat(64),
          deviceModel: "Android 测试真机",
          osVersion: "Android 15",
          microphonePermissionPassed: true,
          callRoundTripPassed: true,
        },
        ios: {
          artifactPath: iosArtifactPath,
          artifactSha256: createHash("sha256").update("ios-candidate").digest("hex"),
          deviceModel: "iPhone 测试真机",
          osVersion: "iOS 19",
          microphonePermissionPassed: true,
          callRoundTripPassed: true,
        },
      },
    },
    harmonySigning: {
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "鸿蒙发布验收组",
      evidenceId: "HARMONY-COVER-TAMPER-001",
      artifactPath: harmonyArtifactPath,
      artifactSha256: createHash("sha256").update("harmony-candidate").digest("hex"),
      signatureSha256: "a".repeat(64),
      deviceModel: "HarmonyOS 测试真机",
      osVersion: "HarmonyOS NEXT",
      oldVersion: baseline.harmony.versionName,
      candidateVersion: manifest.versionName,
      coverInstallPassed: true,
    },
  };
  const evidencePath = path.join(tempDir, "store-release-evidence.json");
  const reportPath = path.join(tempDir, "store-readiness.json");
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = runAudit(
    "--release-id",
    releaseId,
    "--manifest",
    manifestPath,
    "--baseline",
    baselinePath,
    "--evidence",
    evidencePath,
    "--report",
    reportPath,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(report.success, false);
  assert.equal(
    report.checks.find((item) => item.name === "App 原生 SDK/插件配置已完成")?.pass,
    false,
  );
  assert.equal(report.checks.find((item) => item.name === "鸿蒙正式签名资料已核验")?.pass, true);
});
