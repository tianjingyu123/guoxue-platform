import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "release", "finalize-launch-acceptance.mjs");
const releaseId = "release-final-test";
const requiredChecks = [
  "environment_credentials",
  "database_reconciliation",
  "payment_refund",
  "core_clients",
  "harmony_client",
  "client_artifacts",
  "monitoring_backup_restore",
  "dns_rollback",
  "legal_privacy_support",
];

function freshTime(offsetHours = 0) {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString();
}

async function prepareScenario(t, mutate = () => undefined) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-final-acceptance-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "manual"), { recursive: true });

  const machineDecision = {
    schemaVersion: 1,
    generatedAt: freshTime(),
    releaseId,
    decision: "GO",
    summary: { passed: 9, failed: 0, total: 9 },
    sources: Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => [`source${index}`, { sha256: "a".repeat(64) }]),
    ),
  };
  const acceptance = {
    schemaVersion: 1,
    releaseId,
    confirmation: `approve:${releaseId}`,
    changeTicket: "CHANGE-20260731-001",
    completedAt: freshTime(),
    approvers: {
      technical: { name: "技术甲", role: "技术负责人", approvedAt: freshTime() },
      business: { name: "业务乙", role: "业务负责人", approvedAt: freshTime() },
    },
    checks: requiredChecks.map((id) => ({
      id,
      status: "PASS",
      completedAt: freshTime(),
      evidence: [`manual/${id}.txt`],
    })),
  };

  mutate({ machineDecision, acceptance, directory });
  await writeFile(
    path.join(directory, "launch-decision.json"),
    `${JSON.stringify(machineDecision, null, 2)}\n`,
    "utf8",
  );
  for (const id of requiredChecks) {
    await writeFile(path.join(directory, "manual", `${id}.txt`), `${id} verified\n`, "utf8");
  }
  const acceptancePath = path.join(directory, "production-cutover-acceptance.json");
  await writeFile(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, "utf8");
  return { directory, acceptancePath };
}

async function runScenario(t, mutate) {
  const { directory, acceptancePath } = await prepareScenario(t, mutate);
  const reportPath = path.join(directory, "final-launch-decision.json");
  const result = spawnSync(
    process.execPath,
    [
      script,
      "--release-id",
      releaseId,
      "--evidence-dir",
      directory,
      "--acceptance",
      acceptancePath,
      "--report",
      reportPath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  return { result, report };
}

test("可在发布证据目录安全初始化待签字验收表且拒绝覆盖", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-final-acceptance-init-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const command = [script, "--release-id", releaseId, "--evidence-dir", directory, "--init"];
  const first = spawnSync(process.execPath, command, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  const acceptance = JSON.parse(
    await readFile(path.join(directory, "production-cutover-acceptance.json"), "utf8"),
  );
  assert.equal(acceptance.releaseId, releaseId);
  assert.equal(acceptance.confirmation, `approve:${releaseId}`);
  assert.equal(acceptance.checks.length, 9);
  assert.ok(acceptance.checks.every((item) => item.status === "PENDING"));

  const second = spawnSync(process.execPath, command, { cwd: repoRoot, encoding: "utf8" });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /拒绝覆盖/u);
});

test("标准部署机器九证据与双负责人九项验收完整时给出最终 GO", async (t) => {
  const { result, report } = await runScenario(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.decision, "GO");
  assert.equal(report.summary.requiredManualChecks, 9);
  assert.equal(report.summary.archivedEvidenceFiles, 9);
  assert.match(report.sources.manualAcceptance.sha256, /^[a-f0-9]{64}$/u);
});

test("腾讯部署机器十证据与双负责人九项验收完整时给出最终 GO", async (t) => {
  const { result, report } = await runScenario(t, ({ machineDecision }) => {
    machineDecision.summary = { passed: 10, failed: 0, total: 10 };
    machineDecision.sources.source9 = { sha256: "b".repeat(64) };
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.decision, "GO");
  assert.equal(report.sources.machineDecision.sha256.length, 64);
});

test("机器上线判定不是 GO 时阻断最终上线", async (t) => {
  const { result, report } = await runScenario(t, ({ machineDecision }) => {
    machineDecision.decision = "BLOCK";
    machineDecision.summary = { passed: 8, failed: 1, total: 9 };
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("不是 GO")));
});

test("缺少任一人工检查项时阻断最终上线", async (t) => {
  const { result, report } = await runScenario(t, ({ acceptance }) => {
    acceptance.checks = acceptance.checks.filter((item) => item.id !== "payment_refund");
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("payment_refund")));
});

test("技术与业务负责人是同一人时阻断最终上线", async (t) => {
  const { result, report } = await runScenario(t, ({ acceptance }) => {
    acceptance.approvers.business.name = acceptance.approvers.technical.name;
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("不同人员")));
});

test("证据路径逃逸发布证据目录时阻断最终上线", async (t) => {
  const { result, report } = await runScenario(t, ({ acceptance }) => {
    acceptance.checks[0].evidence = ["../outside.txt"];
  });
  assert.equal(result.status, 1);
  assert.equal(report.decision, "BLOCK");
  assert.ok(report.errors.some((item) => item.includes("证据目录内")));
});
