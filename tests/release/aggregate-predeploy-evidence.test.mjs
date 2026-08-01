import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const aggregator = path.join(
  repoRoot,
  "scripts/release/aggregate-predeploy-evidence.mjs",
);
const branch = "release/integration-20260801";
const commit = "0123456789abcdef0123456789abcdef01234567";

function createEvidence(overrides = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "guoxue-predeploy-"));
  const generatedAt = new Date().toISOString();
  const reports = {
    "source-freeze-readiness.json": {
      schemaVersion: 2,
      generatedAt,
      sourceCommit: commit,
      branch,
      gitBranch: branch,
      expectedBranch: branch,
      expectedCommit: commit,
      clean: true,
      strict: true,
      readyForProductionPackage: true,
      counts: {
        total: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0,
        conflicted: 0,
      },
      problems: [],
    },
    "infrastructure-intake-predeploy.json": {
      schemaVersion: 1,
      kind: "guoxue-infrastructure-intake-readiness",
      generatedAt,
      stage: "predeploy",
      deployTarget: "tencent",
      inputSha256: "a".repeat(64),
      configurationBinding: { success: true },
      success: true,
      summary: { passed: 2, failed: 0, total: 2 },
      checks: [
        { name: "resource", pass: true, detail: "ok" },
        { name: "binding", pass: true, detail: "ok" },
      ],
    },
    "environment-readiness.json": {
      generatedAt,
      fullCheck: true,
      deployTarget: "tencent",
      nodeRole: "app",
      success: true,
      counts: { configuredKeys: 64, errors: 0, warnings: 0 },
      errors: [],
      warnings: [],
    },
  };

  for (const [fileName, changes] of Object.entries(overrides)) {
    reports[fileName] = { ...reports[fileName], ...changes };
  }
  for (const [fileName, content] of Object.entries(reports)) {
    writeFileSync(path.join(directory, fileName), JSON.stringify(content), "utf8");
  }
  return directory;
}

function run(directory, extra = []) {
  return spawnSync(
    process.execPath,
    [
      "--",
      aggregator,
      "--",
      "--evidence-dir",
      directory,
      "--expected-branch",
      branch,
      "--expected-commit",
      commit,
      "--deploy-target",
      "tencent",
      ...extra,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

test("三份有效证据聚合为脱敏 GO 判定", () => {
  const directory = createEvidence();
  try {
    const result = run(directory);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const raw = readFileSync(path.join(directory, "predeploy-decision.json"), "utf8");
    const report = JSON.parse(raw);
    assert.equal(report.decision, "GO");
    assert.equal(report.summary.failed, 0);
    assert.doesNotMatch(raw, /postgres(?:ql)?:\/\//iu);
    assert.doesNotMatch(raw, /redis(?:s)?:\/\//iu);
    assert.doesNotMatch(raw, /SECRET|PASSWORD|PRIVATE_KEY/u);
    assert.match(report.sources.infrastructure.sha256, /^[a-f0-9]{64}$/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("源码提交或分支身份不一致时判定 BLOCK", () => {
  const directory = createEvidence({
    "source-freeze-readiness.json": { sourceCommit: "f".repeat(40) },
  });
  try {
    const result = run(directory);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(
      readFileSync(path.join(directory, "predeploy-decision.json"), "utf8"),
    );
    assert.equal(report.decision, "BLOCK");
    assert.ok(report.checks.some((check) => check.name === "源码冻结身份一致" && !check.pass));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("基础设施报告不是 predeploy 阶段时判定 BLOCK", () => {
  const directory = createEvidence({
    "infrastructure-intake-predeploy.json": { stage: "launch" },
  });
  try {
    const result = run(directory);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("正式环境失败或部署架构不一致时判定 BLOCK", () => {
  const directory = createEvidence({
    "environment-readiness.json": {
      deployTarget: "standard",
      success: false,
      counts: { configuredKeys: 50, errors: 1, warnings: 0 },
      errors: ["missing"],
    },
  });
  try {
    const result = run(directory);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("过期证据即使内容通过也判定 BLOCK", () => {
  const generatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const directory = createEvidence({
    "source-freeze-readiness.json": { generatedAt },
  });
  try {
    const result = run(directory);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /BLOCK/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
