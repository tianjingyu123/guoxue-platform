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
