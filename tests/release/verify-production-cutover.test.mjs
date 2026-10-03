import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const verifier = path.join(repoRoot, "scripts", "release", "verify-production-cutover.sh");

function toBashPath(value) {
  return value.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function run(env = {}) {
  return spawnSync("bash", [toBashPath(verifier)], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("非法发布标识在读取服务器状态前被阻断", () => {
  const result = run({ RELEASE_ID: "../escape", DEPLOY_TARGET: "standard" });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /发布标识格式无效/);
});

test("公网证据有效期不是受控值时被阻断", () => {
  const result = run({
    RELEASE_ID: "release-20260731-001",
    MAX_AGE_HOURS: "999",
    DEPLOY_TARGET: "standard",
  });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /仅允许 12、24 或 48 小时/);
});

test("部署架构未显式选择时被阻断", () => {
  const result = run({ RELEASE_ID: "release-20260731-001", DEPLOY_TARGET: "" });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /必须显式设置为 standard 或 tencent/);
});

test("正式切换在汇总 GO 前强制验证直播 rtc-config 路由", async () => {
  const runtimeVerifier = await readFile(
    path.join(repoRoot, "scripts", "release", "verify-runtime.mjs"),
    "utf8",
  );
  const cutoverVerifier = await readFile(verifier, "utf8");

  assert.match(
    runtimeVerifier,
    /\/api\/v1\/live\/rooms\/00000000-0000-4000-8000-000000000000\/rtc-config/u,
  );
  assert.match(runtimeVerifier, /\[401, 403\]\.includes\(response\.status\)/u);
  assert.match(runtimeVerifier, /response\.status === 404/u);
  assert.match(runtimeVerifier, /正式 API 缺少直播 rtc-config 路由/u);
  assert.ok(
    cutoverVerifier.indexOf("verify-runtime.mjs") <
      cutoverVerifier.indexOf("aggregate-launch-evidence.mjs"),
  );
});

test(
  "同版 current、最终数据库证据与共享配置齐全时重建证据并给出 GO",
  { skip: process.platform === "win32" ? "Windows NTFS 不提供可靠 POSIX 权限语义" : false },
  async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "gx-cutover-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const releaseId = "release-20260731-001";
    const releaseDir = path.join(root, "releases", releaseId);
    const reportDir = path.join(root, "release-evidence", releaseId);
    const sharedDir = path.join(root, "shared");
    await mkdir(path.join(releaseDir, "release-evidence"), { recursive: true });
    await mkdir(reportDir, { recursive: true });
    await mkdir(sharedDir, { recursive: true });
    await writeFile(path.join(releaseDir, ".release-id"), `${releaseId}\n`, "utf8");
    await writeFile(path.join(root, "current-release-id"), `${releaseId}\n`, "utf8");
    await writeFile(
      path.join(releaseDir, "RELEASE-MANIFEST.json"),
      JSON.stringify({ commit: "a".repeat(40) }),
      "utf8",
    );
    await writeFile(path.join(releaseDir, "release-evidence", "client-config-binding.json"), "{}\n", "utf8");
    await writeFile(path.join(reportDir, "database-migration-verification.json"), "{}\n", "utf8");
    const envFile = path.join(sharedDir, ".env.production");
    const intakeFile = path.join(sharedDir, "infrastructure-intake.json");
    await writeFile(envFile, "NODE_ENV=production\n", "utf8");
    await writeFile(intakeFile, "{}\n", "utf8");
    await chmod(envFile, 0o600);
    await chmod(intakeFile, 0o600);
    await symlink(releaseDir, path.join(root, "current"), "dir");
    assert.equal((await lstat(path.join(root, "current"))).isSymbolicLink(), true);

    const fakeNode = path.join(root, "fake-node.sh");
    await writeFile(
      fakeNode,
      `#!/bin/bash
set -euo pipefail
if [ "\${1:-}" = "-e" ]; then
  if [[ "\${2:-}" == *"manifest.commit"* ]]; then printf '%s' '${"a".repeat(40)}'; fi
  exit 0
fi
report=''
previous=''
for argument in "$@"; do
  if [ "$previous" = '--report' ]; then report="$argument"; break; fi
  previous="$argument"
done
if [ -n "$report" ]; then
  mkdir -p "$(dirname "$report")"
  if [[ "\${1:-}" == *'aggregate-launch-evidence.mjs' ]]; then
    printf '%s\n' '{"decision":"GO","summary":{"passed":9,"total":9}}' > "$report"
  else
    printf '%s\n' '{}' > "$report"
  fi
fi
`,
      "utf8",
    );
    await chmod(fakeNode, 0o755);

    const result = run({
      PLATFORM_ROOT: root,
      RELEASE_ID: releaseId,
      MAX_AGE_HOURS: "24",
      DEPLOY_TARGET: "standard",
      ENV_FILE: envFile,
      INFRASTRUCTURE_INTAKE_FILE: intakeFile,
      NODE_BIN: fakeNode,
    });
    assert.equal(result.status, 0, result.stderr);
    const decision = JSON.parse(await readFile(path.join(reportDir, "launch-decision.json"), "utf8"));
    assert.equal(decision.decision, "GO");
  },
);
