import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "release", "verify-public-content-remediation.mjs");
const releaseId = "release-content-test";

test("仓库示例只记录脱敏汇总且默认不能冒充已完成", async () => {
  const example = JSON.parse(
    await readFile(
      path.join(repoRoot, "config", "release", "public-content-remediation.example.json"),
      "utf8",
    ),
  );
  assert.deepEqual(example.counts, {
    LIVE_STATUS_STALE: 2,
    UPCOMING_LIVE_EXPIRED: 3,
  });
  assert.equal(example.total, 5);
  assert.equal(example.historicalRecordsDeleted, false);
  assert.equal(example.publicFeedExclusionVerified, false);
  assert.equal(/"(?:ids?|titles?|businessId|contentId)"/iu.test(JSON.stringify(example)), false);
});

async function runScenario(t, mutate = () => undefined) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-content-remediation-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const action = {
    schemaVersion: 1,
    kind: "guoxue-public-content-remediation",
    releaseId,
    confirmation: `remediate-public-content:${releaseId}`,
    target: "https://api.example.com",
    completedAt: new Date(Date.now() - 60_000).toISOString(),
    actionMode: "MIXED",
    counts: { LIVE_STATUS_STALE: 2, UPCOMING_LIVE_EXPIRED: 3 },
    total: 5,
    historicalRecordsDeleted: false,
    publicFeedExclusionVerified: true,
  };
  const freshness = {
    schemaVersion: 1,
    kind: "guoxue-public-content-freshness",
    target: "https://api.example.com",
    generatedAt: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    totalItems: 10,
    blockers: 0,
    findings: [],
  };
  mutate({ action, freshness });
  const actionPath = path.join(directory, "remediation.json");
  const freshnessPath = path.join(directory, "freshness.json");
  const reportPath = path.join(directory, "verification.json");
  await writeFile(actionPath, `${JSON.stringify(action, null, 2)}\n`, "utf8");
  await writeFile(freshnessPath, `${JSON.stringify(freshness, null, 2)}\n`, "utf8");
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--release-id",
      releaseId,
      "--remediation",
      actionPath,
      "--freshness-report",
      freshnessPath,
      "--report",
      reportPath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  return { result, report };
}

test("五条旧公开状态处理后与生产新鲜度 PASS 报告形成脱敏闭环", async (t) => {
  const { result, report } = await runScenario(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.decision, "PASS");
  assert.equal(report.remediation.total, 5);
  assert.equal(report.freshness.blockers, 0);
  assert.match(report.sources.remediationSha256, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(report).includes("contentId"), false);
});

test("处理数量不是两条 stale live 与三条 expired upcoming 时阻断", async (t) => {
  const { result, report } = await runScenario(t, ({ action }) => {
    action.counts.LIVE_STATUS_STALE = 1;
    action.total = 4;
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("LIVE_STATUS_STALE")));
});

test("生产公开流仍含 P0 内容时阻断", async (t) => {
  const { result, report } = await runScenario(t, ({ freshness }) => {
    freshness.blockers = 1;
    freshness.findings = [{ severity: "P0", code: "UPCOMING_LIVE_EXPIRED" }];
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("仍存在 P0")));
});

test("处理记录包含业务 ID 或标题时拒绝归档", async (t) => {
  const { result, report } = await runScenario(t, ({ action }) => {
    action.ids = ["business-record-1"];
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("业务身份字段")));
});

test("新鲜度门禁早于处理完成时间时阻断", async (t) => {
  const { result, report } = await runScenario(t, ({ action, freshness }) => {
    action.completedAt = new Date().toISOString();
    freshness.checkedAt = new Date(Date.now() - 60_000).toISOString();
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("处理完成后")));
});
