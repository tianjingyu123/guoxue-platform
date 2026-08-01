import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "release", "audit-host-preflight.mjs");
const releaseId = "host-preflight-test";

async function runScenario(t, lines, exitCode = 0, expectedReleaseId = releaseId) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "gx-host-preflight-"));
  t.after(() => rm(projectDir, { recursive: true, force: true }));
  const releaseScriptDir = path.join(projectDir, "scripts", "release");
  await mkdir(releaseScriptDir, { recursive: true });
  await writeFile(path.join(projectDir, ".release-id"), `${releaseId}\n`, "utf8");
  const envFile = path.join(projectDir, ".env.production");
  await writeFile(envFile, "PUBLIC_DOMAIN=example.invalid\n", "utf8");
  const fakePreflight = path.join(releaseScriptDir, "preflight-host.sh");
  await writeFile(
    fakePreflight,
    `#!/usr/bin/env bash\nprintf '%s\\n' ${lines.map((line) => `'${line.replaceAll("'", "'\\''")}'`).join(" ")}\nexit ${exitCode}\n`,
    "utf8",
  );
  await chmod(fakePreflight, 0o755).catch(() => undefined);
  const reportPath = path.join(projectDir, "host-preflight-readiness.json");
  const result = spawnSync(
    process.execPath,
    [
      "--",
      script,
      "--",
      "--project-dir",
      projectDir,
      "--env-file",
      envFile,
      "--release-id",
      expectedReleaseId,
      "--report",
      reportPath,
      "--allow-occupied-ports",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const report = await readFile(reportPath, "utf8").then(JSON.parse).catch(() => null);
  return { result, report };
}

test("主机预检通过时生成脱敏且绑定版本的机器证据", async (t) => {
  const { result, report } = await runScenario(t, [
    "[PASS] 操作系统为 Linux",
    "[WARN] 端口 80,443 已被占用；已显式放行",
    "[PASS] Docker Server 可用: 26.1.0",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.success, true);
  assert.equal(report.releaseId, releaseId);
  assert.deepEqual(report.summary, { passed: 2, warned: 1, failed: 0, total: 3 });
  assert.match(report.hostIdentitySha256, /^[a-f0-9]{64}$/u);
  assert.ok(report.checks.every((item) => !Object.hasOwn(item, "detail")));
  assert.doesNotMatch(JSON.stringify(report), /Docker Server|80,443|example\.invalid/u);
});

test("主机预检失败时仍落盘阻断证据并返回失败", async (t) => {
  const { result, report } = await runScenario(
    t,
    ["[PASS] 操作系统为 Linux", "[FAIL] 可用内存不足"],
    1,
  );
  assert.notEqual(result.status, 0);
  assert.equal(report.success, false);
  assert.equal(report.summary.failed, 1);
});

test("发布目录身份与预期不一致时拒绝执行预检", async (t) => {
  const { result, report } = await runScenario(
    t,
    ["[PASS] 不应执行"],
    0,
    "host-preflight-other",
  );
  assert.notEqual(result.status, 0);
  assert.equal(report, null);
  assert.match(result.stderr, /标识与预期不一致/u);
});
