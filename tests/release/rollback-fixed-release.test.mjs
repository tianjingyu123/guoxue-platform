import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const rollbackSource = path.join(repoRoot, "scripts", "release", "rollback-fixed-release.sh");

function toBashPath(value) {
  return value.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function run(script, args, env = {}) {
  return spawnSync("bash", [toBashPath(script), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("非法回滚发布标识在读取服务器状态前被阻断", () => {
  const result = run(rollbackSource, ["../escape", "../escape"], {
    DEPLOY_TARGET: "standard",
    ROLLBACK_VERIFY_ONLY: "true",
  });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /目标发布标识格式无效/);
});

test("回滚确认值与目标版本不一致时被阻断", () => {
  const result = run(rollbackSource, ["release-20260731-001", "release-20260731-002"], {
    DEPLOY_TARGET: "standard",
    ROLLBACK_VERIFY_ONLY: "true",
  });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /回滚确认值必须与目标发布标识完全一致/);
});

test("只读演练允许复核当前版本作为滚动发布恢复基线", async () => {
  const source = await readFile(rollbackSource, "utf8");
  assert.match(
    source,
    /CURRENT_RELEASE_ID" = "\$TARGET_RELEASE_ID" \] && \[ "\$VERIFY_ONLY" != "true"/,
  );
});

async function createFixture({ laterMigration = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-rollback-"));
  const targetId = "release-20260731-001";
  const currentId = "release-20260731-002";
  const releasesDir = path.join(root, "releases");
  const targetDir = path.join(releasesDir, targetId);
  const currentDir = path.join(releasesDir, currentId);
  const currentScriptDir = path.join(currentDir, "scripts", "release");
  const packagesDir = path.join(root, "release-packages");
  const sharedDir = path.join(root, "shared");
  const stagingDir = path.join(root, "archive-staging");
  const fakeBin = path.join(root, "fake-bin");
  const manifest = `${JSON.stringify({ releaseId: targetId, commit: "a".repeat(40) })}\n`;

  await mkdir(targetDir, { recursive: true });
  await mkdir(currentScriptDir, { recursive: true });
  await mkdir(packagesDir, { recursive: true });
  await mkdir(sharedDir, { recursive: true });
  await mkdir(stagingDir, { recursive: true });
  await mkdir(fakeBin, { recursive: true });
  await writeFile(path.join(targetDir, ".release-id"), `${targetId}\n`, "utf8");
  await writeFile(path.join(currentDir, ".release-id"), `${currentId}\n`, "utf8");
  await writeFile(path.join(targetDir, "RELEASE-MANIFEST.json"), manifest, "utf8");
  await writeFile(path.join(stagingDir, "RELEASE-MANIFEST.json"), manifest, "utf8");
  await copyFile(rollbackSource, path.join(currentScriptDir, "rollback-fixed-release.sh"));
  await chmod(path.join(currentScriptDir, "rollback-fixed-release.sh"), 0o755);
  await symlink(currentDir, path.join(root, "current"), "dir");

  const envFile = path.join(sharedDir, ".env.production");
  await writeFile(envFile, "NODE_ENV=production\n", "utf8");
  await chmod(envFile, 0o600);

  const history =
    [
      `2026-07-31T10:00:00Z\tactivate\t${targetId}\t-\tfalse\t${"1".repeat(64)}`,
      `2026-07-31T11:00:00Z\tactivate\t${currentId}\t${targetId}\t${laterMigration ? "true" : "false"}\t${"2".repeat(64)}`,
    ].join("\n") + "\n";
  await writeFile(path.join(root, "release-history.tsv"), history, "utf8");

  const archive = path.join(packagesDir, `gx-deploy-91-${targetId}.tar.gz`);
  const tarResult = spawnSync("tar", ["-czf", archive, "-C", stagingDir, "."], {
    encoding: "utf8",
  });
  assert.equal(tarResult.status, 0, tarResult.stderr);
  await writeFile(`${archive}.sha256`, `${"3".repeat(64)}  ${path.basename(archive)}\n`, "utf8");

  const fakeNode = path.join(fakeBin, "node");
  await writeFile(
    fakeNode,
    `#!/usr/bin/env bash
set -euo pipefail
report=''
previous=''
for argument in "$@"; do
  if [ "$previous" = '--report' ]; then report="$argument"; break; fi
  previous="$argument"
done
if [ -n "$report" ]; then
  mkdir -p "$(dirname "$report")"
  printf '%s\n' '{"decision":"GO"}' > "$report"
fi
`,
    "utf8",
  );
  await chmod(fakeNode, 0o755);

  return {
    root,
    targetId,
    currentId,
    currentDir,
    script: path.join(currentScriptDir, "rollback-fixed-release.sh"),
    env: {
      ROOT_DIR: root,
      ENV_FILE: envFile,
      DEPLOY_TARGET: "standard",
      ROLLBACK_VERIFY_ONLY: "true",
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
    },
    history,
  };
}

test(
  "目标版本早于最近数据库迁移时默认阻断回滚",
  {
    skip: process.platform === "win32" ? "Windows NTFS 不提供可靠 POSIX 符号链接与权限语义" : false,
  },
  async (t) => {
    const fixture = await createFixture({ laterMigration: true });
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const result = run(fixture.script, [fixture.targetId, fixture.targetId], fixture.env);
    assert.equal(result.status, 64);
    assert.match(result.stderr, /目标版本早于最近一次数据库迁移/);
  },
);

test(
  "只读回滚演练复核固定包和目录且不改变 current 与发布历史",
  {
    skip: process.platform === "win32" ? "Windows NTFS 不提供可靠 POSIX 符号链接与权限语义" : false,
  },
  async (t) => {
    const fixture = await createFixture();
    t.after(() => rm(fixture.root, { recursive: true, force: true }));
    const result = run(fixture.script, [fixture.targetId, fixture.targetId], fixture.env);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /回滚只读演练通过/);
    assert.equal(
      await realpath(path.join(fixture.root, "current")),
      await realpath(fixture.currentDir),
    );
    assert.equal(
      await readFile(path.join(fixture.root, "release-history.tsv"), "utf8"),
      fixture.history,
    );

    const evidenceRoot = path.join(fixture.root, "release-evidence");
    const reportDirs = await readdir(evidenceRoot);
    assert.equal(reportDirs.length, 1);
    const reportDir = path.join(evidenceRoot, reportDirs[0]);
    assert.deepEqual((await readdir(reportDir)).sort(), [
      "package-verification.json",
      "release-directory-verification.json",
    ]);
  },
);
