import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "release", "aggregate-launch-evidence.mjs");
const releaseId = "release-evidence-test";
const sourceCommit = "c".repeat(40);
const configFingerprint = "f".repeat(64);

function freshTime(offsetHours = 0) {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString();
}

async function writeEvidence(directory, overrides = {}, omittedFiles = []) {
  const reports = {
    "host-preflight-readiness.json": {
      schemaVersion: 1,
      kind: "guoxue-host-preflight-readiness",
      generatedAt: freshTime(),
      releaseId,
      success: true,
      summary: { passed: 31, warned: 1, failed: 0, total: 32 },
      hostIdentitySha256: "4".repeat(64),
      preflightScriptSha256: "5".repeat(64),
      sourceOutputSha256: "6".repeat(64),
      checks: [{ id: "host-check-01", status: "PASS", fingerprint: "7".repeat(64) }],
    },
    "infrastructure-intake-readiness.json": {
      schemaVersion: 1,
      kind: "guoxue-infrastructure-intake-readiness",
      generatedAt: freshTime(),
      stage: "launch",
      deployTarget: "tencent",
      inputSha256: "9".repeat(64),
      success: true,
      summary: { passed: 18, failed: 0, total: 18 },
      checks: [{ name: "新基础设施接入", pass: true, detail: "ok" }],
    },
    "tencent-cloud-readiness.json": {
      schemaVersion: 1,
      kind: "guoxue-tencent-cloud-readiness",
      generatedAt: freshTime(),
      releaseId,
      targetBinding: {
        region: "ap-guangzhou",
        clbId: "lb-NewTarget123",
        cdnDomain: "assets.new-guoxue.test",
        certificateDomain: "new-guoxue.test",
      },
      success: true,
      summary: { failed: 0, failures: [] },
    },
    "package-verification.json": {
      schemaVersion: 1,
      generatedAt: freshTime(),
      releaseId,
      commit: sourceCommit,
      expectedCommit: sourceCommit,
      allowDirty: false,
      success: true,
      errorCount: 0,
      errors: [],
    },
    "release-directory-verification.json": {
      schemaVersion: 1,
      generatedAt: freshTime(),
      releaseId,
      commit: sourceCommit,
      success: true,
      errorCount: 0,
      errors: [],
    },
    "client-config-binding-verification.json": {
      schemaVersion: 1,
      generatedAt: freshTime(),
      success: true,
      releaseId,
      expectedReleaseId: releaseId,
      sourceCommit,
      expectedCommit: sourceCommit,
      fingerprintAlgorithm: "sha256",
      expectedFingerprint: configFingerprint,
      actualFingerprint: configFingerprint,
      errorCount: 0,
      errors: [],
    },
    "database-migration-verification.json": {
      schemaVersion: 1,
      generatedAt: freshTime(),
      releaseId,
      success: true,
      verificationMode: "final",
      sourceExportMode: "final",
      consistentSnapshot: "00000003-0000001B-1",
      sourceDatabaseName: "guoxue_source",
      targetDatabaseName: "guoxue_target",
      tableCount: 42,
      mismatchedTableCount: 0,
      businessIntegrityPassed: true,
      prismaMigrationStatusPassed: true,
      sources: {
        counts: { file: "source.table-counts.tsv", sha256: "1".repeat(64) },
        checksum: { file: "source.dump.sha256", sha256: "2".repeat(64) },
        manifest: { file: "source.manifest.txt", sha256: "3".repeat(64) },
      },
    },
    "environment-readiness.json": {
      generatedAt: freshTime(),
      fullCheck: true,
      success: true,
      counts: { errors: 0 },
      errors: [],
    },
    "runtime-verification.json": {
      schemaVersion: 1,
      kind: "guoxue-runtime-verification",
      generatedAt: freshTime(),
      allowDegraded: false,
      expectedReleaseId: releaseId,
      observedReleaseId: releaseId,
      summary: { failed: 0 },
      results: [{ name: "health", status: "PASS", detail: "ok" }],
      tlsCertificates: [
        {
          origin: "https://new-guoxue.test",
          chainAuthorized: true,
          hostnameMatched: true,
          validTo: freshTime(24 * 30),
          daysRemaining: 30,
          fingerprintSha256: "a".repeat(64),
        },
      ],
    },
    "retention-audit.json": {
      schemaVersion: 1,
      generatedAt: freshTime(),
      currentReleaseId: releaseId,
      disk: { freeBytes: 30 * 1024 ** 3, minFreeGb: 20 },
      errors: [],
      destructiveActionPerformed: false,
    },
  };
  for (const [file, report] of Object.entries(reports)) {
    if (omittedFiles.includes(file)) continue;
    await writeFile(
      path.join(directory, file),
      `${JSON.stringify({ ...report, ...(overrides[file] || {}) })}\n`,
      "utf8",
    );
  }
}

async function runScenario(t, overrides = {}, extraArgs = [], omittedFiles = []) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-launch-evidence-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeEvidence(directory, overrides, omittedFiles);
  const report = path.join(directory, "launch-decision.json");
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--release-id",
      releaseId,
      "--evidence-dir",
      directory,
      "--report",
      report,
      ...extraArgs,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const decision = JSON.parse(await readFile(report, "utf8"));
  return { result, decision };
}

test("腾讯部署十份证据一致且有效时给出 GO", async (t) => {
  const { result, decision } = await runScenario(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(decision.decision, "GO");
  assert.deepEqual(decision.summary, { passed: 10, failed: 0, total: 10 });
  assert.match(decision.sources.runtime.sha256, /^[a-f0-9]{64}$/u);
});

test("标准部署无需腾讯云证据且九份证据有效时给出 GO", async (t) => {
  const { result, decision } = await runScenario(
    t,
    { "infrastructure-intake-readiness.json": { deployTarget: "standard" } },
    [],
    ["tencent-cloud-readiness.json"],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(decision.decision, "GO");
  assert.deepEqual(decision.summary, { passed: 9, failed: 0, total: 9 });
  assert.equal(decision.sources.tencentCloud, undefined);
});

test("腾讯部署缺少云资源现场审计时阻断上线", async (t) => {
  const { result, decision } = await runScenario(
    t,
    {},
    [],
    ["tencent-cloud-readiness.json"],
  );
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(decision.sources.tencentCloud.sha256, null);
});

test("腾讯云资源现场审计失败时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "tencent-cloud-readiness.json": {
      success: false,
      summary: { failed: 1, failures: ["CLB 未找到监听器"] },
    },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(
    decision.checks.find((item) => item.source === "tencent-cloud-readiness.json")?.pass,
    false,
  );
});

test("主机预检未通过时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "host-preflight-readiness.json": {
      success: false,
      summary: { passed: 30, warned: 0, failed: 1, total: 31 },
    },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(
    decision.checks.find((item) => item.source === "host-preflight-readiness.json")?.pass,
    false,
  );
});

test("新基础设施接入未达到 launch 阶段时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "infrastructure-intake-readiness.json": { stage: "procurement" },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.match(
    decision.checks.find((item) => item.source === "infrastructure-intake-readiness.json")
      ?.detail || "",
    /不是 launch 阶段/u,
  );
});

test("数据库核验不是 final 模式时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "database-migration-verification.json": {
      verificationMode: "rehearsal",
      sourceExportMode: "rehearsal",
    },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(
    decision.checks.find((item) => item.source === "database-migration-verification.json")?.pass,
    false,
  );
});

test("Prisma 迁移状态未通过时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "database-migration-verification.json": {
      prismaMigrationStatusPassed: false,
    },
  });
  assert.notEqual(result.status, 0);
  assert.equal(decision.decision, "BLOCK");
  const databaseCheck = decision.checks.find(
    (item) => item.source === "database-migration-verification.json",
  );
  assert.equal(databaseCheck?.pass, false);
  assert.match(databaseCheck?.detail || "", /Prisma 迁移状态未通过/u);
});

test("客户端配置指纹不一致时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "client-config-binding-verification.json": { actualFingerprint: "e".repeat(64) },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(
    decision.checks.find((item) => item.source === "client-config-binding-verification.json")?.pass,
    false,
  );
});

test("运行实例版本不一致时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "runtime-verification.json": { observedReleaseId: "release-old-version" },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(decision.checks.find((item) => item.name.includes("运行时"))?.pass, false);
});

test("公网证书剩余不足 14 天或缺少可信指纹时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "runtime-verification.json": {
      tlsCertificates: [
        {
          origin: "https://new-guoxue.test",
          chainAuthorized: true,
          hostnameMatched: true,
          validTo: freshTime(24 * 7),
          daysRemaining: 7,
          fingerprintSha256: "invalid",
        },
      ],
    },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.match(
    decision.checks.find((item) => item.name.includes("运行时"))?.detail || "",
    /公网 TLS 证书链、域名、有效期或指纹证据无效/u,
  );
});

test("现场环境证据过期时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "environment-readiness.json": { generatedAt: freshTime(-30) },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.match(
    decision.checks.find((item) => item.name.includes("环境"))?.detail || "",
    /超过 24 小时有效期/u,
  );
});

test("固定包验真允许 dirty 时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "package-verification.json": { allowDirty: true },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.match(
    decision.checks.find((item) => item.name.includes("固定发布包"))?.detail || "",
    /dirty 包/u,
  );
});

test("版本保留审计执行破坏性操作时阻断上线", async (t) => {
  const { result, decision } = await runScenario(t, {
    "retention-audit.json": { destructiveActionPerformed: true },
  });
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.match(
    decision.checks.find((item) => item.name.includes("版本保留"))?.detail || "",
    /破坏性操作/u,
  );
});

test("任一来源证据缺失时阻断上线", async (t) => {
  const missingFile = "client-config-binding-verification.json";
  const { result, decision } = await runScenario(t, {}, [], [missingFile]);
  assert.equal(result.status, 1);
  assert.equal(decision.decision, "BLOCK");
  assert.equal(decision.sources.clientConfigBinding.sha256, null);
  assert.match(
    decision.checks.find((item) => item.source === missingFile)?.detail || "",
    /无法读取或解析证据/u,
  );
});
