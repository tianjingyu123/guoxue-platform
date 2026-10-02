import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const buildCheckNames = [
  "Android 构建号高于线上旧版",
  "iOS 构建号高于线上旧版",
  "鸿蒙构建号高于线上旧版",
];

async function withBuildFixture(t, callback) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-store-build-"));
  t.after(async () => {
    // 只清理本测试创建且位于系统临时目录内的目录。
    assert.equal(path.dirname(tempDir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(tempDir).startsWith("guoxue-store-build-"));
    await rm(tempDir, { recursive: true, force: true });
  });
  const baseline = JSON.parse(await readFile(path.join(repoRoot, "config/release/store-baseline.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(repoRoot, "apps/mobile/src/manifest.json"), "utf8"));
  const baselinePath = path.join(tempDir, "baseline.json");
  const manifestPath = path.join(tempDir, "manifest.json");
  const reportPath = path.join(tempDir, "report.json");
  await callback({ baseline, manifest, baselinePath, manifestPath, reportPath });
}

for (const [label, value] of [
  ["null", null], ["空字符串", ""], ["空白字符串", "  "],
  ["false", false], ["true", true], ["空数组", []], ["单元素数组", [1]],
  ["零占位", 0], ["负整数", -1], ["指数形式字符串", "1e2"],
  ["十六进制字符串", "0x7f"], ["小数形式字符串", "127.0"],
]) {
  test(`覆盖升级门禁拒绝旧构建号${label}，不将缺失值或非十进制输入当作已核验基线`, async (t) => {
    await withBuildFixture(t, async ({ baseline, baselinePath, reportPath }) => {
      baseline.android.versionCode = value;
      baseline.ios.buildNumber = value;
      baseline.harmony.versionCode = value;
      await writeFile(baselinePath, JSON.stringify(baseline));
      const result = runAudit("--strict", "--baseline", baselinePath, "--release-id", "store-build-invalid-001", "--report", reportPath);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      for (const name of buildCheckNames) assert.equal(report.checks.find(item => item.name === name)?.pass, false, name);
    });
  });
}

test("已核验的正整数数字和十进制字符串保持覆盖升级比较，等号不能作为升级", async (t) => {
  await withBuildFixture(t, async ({ baseline, manifest, baselinePath, reportPath }) => {
    for (const value of [127, "127", manifest.versionCode, String(manifest.versionCode)]) {
      baseline.android.versionCode = value;
      baseline.ios.buildNumber = value;
      baseline.harmony.versionCode = value;
      await writeFile(baselinePath, JSON.stringify(baseline));
      const result = runAudit("--baseline", baselinePath, "--release-id", "store-build-valid-001", "--report", reportPath);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      for (const name of buildCheckNames) assert.equal(report.checks.find(item => item.name === name)?.pass, Number(value) < Number(manifest.versionCode), name);
    }
  });
});

test("不能以超出安全整数范围的候选构建号通过正式版本检查", async (t) => {
  await withBuildFixture(t, async ({ manifest, manifestPath, reportPath }) => {
    for (const value of [Number.MAX_SAFE_INTEGER + 1, "9007199254740993"]) {
      manifest.versionCode = value;
      await writeFile(manifestPath, JSON.stringify(manifest));
      const result = runAudit("--strict", "--manifest", manifestPath, "--release-id", "store-build-overflow-001", "--report", reportPath);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      assert.equal(report.checks.find(item => item.name === "构建号格式有效")?.pass, false);
      for (const name of buildCheckNames) assert.equal(report.checks.find(item => item.name === name)?.pass, false, name);
    }
  });
});

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
      oldVersion: baseline.harmony.versionName,
      candidateVersion: manifest.versionName,
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
