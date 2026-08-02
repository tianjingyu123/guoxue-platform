import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const runner = path.join(repoRoot, "scripts/release/run-full-gate.mjs");
const validCommit = "0123456789abcdef0123456789abcdef01234567";

function run(args) {
  return spawnSync(process.execPath, ["--", runner, "--", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("完整上线门禁缺少预期正式分支时在构建前阻断", () => {
  const result = run([
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-commit",
    validCommit,
  ]);

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /--expected-branch/u);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /\[full-gate\]/u);
});

test("完整上线门禁拒绝缺失或非法的四十位源提交", () => {
  for (const commit of ["", "abc123", `${validCommit}00`]) {
    const args = [
      "--env-file",
      "not-needed.env",
      "--deploy-target",
      "standard",
      "--infrastructure-intake",
      "not-needed.json",
      "--expected-branch",
      "main",
    ];
    if (commit) args.push("--expected-commit", commit);

    const result = run(args);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /40 位 --expected-commit/u);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /\[full-gate\]/u);
  }
});

test("预接入与完整上线门禁拒绝未知阶段且不会启动子门禁", () => {
  const result = run([
    "--stage",
    "preview",
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-branch",
    "main",
    "--expected-commit",
    validCommit,
  ]);

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /--stage 仅允许 predeploy 或 launch/u);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /\[full-gate\]/u);
});

test("launch 阶段缺少发布标识时在读取文件和启动子门禁前阻断", () => {
  const result = run([
    "--stage",
    "launch",
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-branch",
    "main",
    "--expected-commit",
    validCommit,
  ]);

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /launch.*--release-id/u);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /\[full-gate\]/u);
});

test("launch 阶段拒绝非法发布标识", () => {
  const result = run([
    "--stage",
    "launch",
    "--release-id",
    "bad id",
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-branch",
    "main",
    "--expected-commit",
    validCommit,
  ]);

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /--release-id/u);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /\[full-gate\]/u);
});

test("predeploy 阶段不要求发布标识", () => {
  const result = run([
    "--stage",
    "predeploy",
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-branch",
    "main",
    "--expected-commit",
    validCommit,
  ]);

  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /launch.*--release-id/u);
  assert.match(`${result.stdout}\n${result.stderr}`, /not-needed\.env/u);
});

test("predeploy 证据时效必须合法并贯通到聚合判定", async () => {
  const invalid = run([
    "--stage",
    "predeploy",
    "--max-age-hours",
    "0",
    "--env-file",
    "not-needed.env",
    "--deploy-target",
    "standard",
    "--infrastructure-intake",
    "not-needed.json",
    "--expected-branch",
    "main",
    "--expected-commit",
    validCommit,
  ]);
  assert.equal(invalid.status, 2, `${invalid.stdout}\n${invalid.stderr}`);
  assert.match(`${invalid.stdout}\n${invalid.stderr}`, /--max-age-hours/u);
  assert.doesNotMatch(`${invalid.stdout}\n${invalid.stderr}`, /\[full-gate\]/u);

  const source = await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8"));
  assert.match(source, /"--max-age-hours",\s*String\(maxAgeHours\)/u);
});

test("完整门禁源码把同一发布标识和提交传给三份客户端证据", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8"));

  for (const command of [
    "release:audit-client-artifacts",
    "release:verify-client-artifacts",
    "release:create-client-config-binding",
  ]) {
    assert.match(source, new RegExp(command, "u"));
  }
  assert.match(source, /client-artifact-verification\.json/u);
  assert.match(source, /client-config-binding\.json/u);
  assert.match(source, /"--release-id",\s*releaseId/u);
  assert.match(source, /"--source-commit",\s*expectedCommit/u);
});

test("构建机 launch 候选门禁不得冒充最终上线 GO", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8"));

  assert.doesNotMatch(source, /完整上线门禁通过/u);
  assert.match(source, /构建机 launch 候选门禁通过/u);
  assert.match(source, /尚未生成最终上线 GO/u);
  assert.match(source, /release:aggregate-evidence/u);
  assert.match(source, /release:finalize-launch/u);
});

test("predeploy 子审计失败后仍继续聚合并输出统一 BLOCK 报告", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8"));

  assert.match(source, /const predeployStepFailures = \[\]/u);
  assert.match(source, /continueOnFailure: stage === "predeploy"/u);
  assert.match(source, /predeployStepFailures\.push/u);
  assert.match(source, /已继续执行其余只读审计/u);
  assert.match(source, /predeploy-decision\.json/u);
});

test("predeploy 启动前清理固定报告名以阻断旧证据误判", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8"));

  assert.match(
    source,
    /rmSync\(path\.join\(resolvedReportDirectory, reportName\), \{ force: true \}\)/u,
  );
  for (const reportName of [
    "source-freeze-readiness.json",
    "environment-readiness.json",
    "predeploy-decision.json",
  ]) {
    assert.match(source, new RegExp(reportName.replace(".", "\\."), "u"));
  }
});
