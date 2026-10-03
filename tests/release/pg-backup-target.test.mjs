import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backupScript = path.join(projectRoot, "docker/pg-backup.sh");
const bash = process.platform === "win32" ? "bash.exe" : "bash";

function toBashPath(value) {
  const normalized = path.resolve(value);
  if (/^[A-Za-z]:\\/.test(normalized)) {
    return `/${normalized[0].toLowerCase()}${normalized.slice(2).replaceAll("\\", "/")}`;
  }
  return normalized.replaceAll("\\", "/");
}

const pgDumpStub = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$@" >"$STUB_CAPTURE_DIR/host-pg-dump-args.txt"
printf 'fixture-dump\\n'
`;

const psqlStub = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$@" >"$STUB_CAPTURE_DIR/host-psql-args.txt"
printf 'guoxue\\n'
`;

const pgRestoreStub = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$@" >"$STUB_CAPTURE_DIR/host-pg-restore-args.txt"
[[ "$1" == "--list" && -s "$2" ]]
`;

const dockerStub = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$*" >>"$STUB_CAPTURE_DIR/docker-args.txt"
if [[ "$1" == "inspect" ]]; then
  exit 0
fi
if [[ "$1" != "exec" ]]; then
  exit 91
fi
joined="$*"
if [[ "$joined" == *"pg_dump"* ]]; then
  IFS= read -r supplied_secret
  [[ -n "$supplied_secret" ]]
  printf 'fixture-dump\\n'
  exit 0
fi
if [[ "$joined" == *"select current_database()"* ]]; then
  IFS= read -r supplied_secret
  [[ -n "$supplied_secret" ]]
  printf 'guoxue\\n'
  exit 0
fi
if [[ "$joined" == *"pg_restore --list"* ]]; then
  test -s /dev/stdin
  exit 0
fi
exit 92
`;

const findStub = `#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$*" == *" -mtime "* ]]; then
  exit 0
fi
shopt -s nullglob
for archive in "$BACKUP_DIR"/guoxue_*.dump; do
  printf '%s\\n' "$archive"
done
`;

const flockStub = `#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "\${STUB_FLOCK_FAIL:-0}" == "1" ]]; then
  exit 1
fi
exit 0
`;

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-pg-backup-target-"));
  const bin = path.join(root, "bin");
  const backup = path.join(root, "backup");
  const capture = path.join(root, "capture");
  await Promise.all([mkdir(bin), mkdir(backup), mkdir(capture)]);
  for (const [name, content] of [
    ["pg_dump", pgDumpStub],
    ["psql", psqlStub],
    ["pg_restore", pgRestoreStub],
    ["docker", dockerStub],
    ["find", findStub],
    ["flock", flockStub],
  ]) {
    const target = path.join(bin, name);
    await writeFile(target, content, "utf8");
    await chmod(target, 0o755);
  }
  return { root, bin, backup, capture };
}

function runBackup(fixture, deployTarget, extraEnv = {}) {
  const env = {
    ...process.env,
    TEST_STUB_BIN: toBashPath(fixture.bin),
    BACKUP_SCRIPT: toBashPath(backupScript),
    BACKUP_DIR: toBashPath(fixture.backup),
    STUB_CAPTURE_DIR: toBashPath(fixture.capture),
    DATABASE_URL:
      "postgresql://backup_user:super-secret@db.example/guoxue?schema=public&connection_limit=12&pool_timeout=20&sslmode=require&connect_timeout=8",
    ENV_FILE: toBashPath(path.join(fixture.root, "missing.env")),
    ...extraEnv,
  };
  if (deployTarget !== undefined) {
    env.DEPLOY_TARGET = deployTarget;
  } else {
    delete env.DEPLOY_TARGET;
  }
  return spawnSync(
    bash,
    ["-c", 'export PATH="$TEST_STUB_BIN:$PATH"; exec bash "$BACKUP_SCRIPT" 30'],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env,
    },
  );
}

async function readManifest(backupDir) {
  const name = (await readdir(backupDir)).find((item) => item.endsWith(".manifest"));
  assert.ok(name, "应生成不含密钥的备份清单");
  return readFile(path.join(backupDir, name), "utf8");
}

test("托管数据库备份使用宿主机 PostgreSQL 客户端且不接触本地 Docker", async () => {
  const fixture = await createFixture();
  try {
    const result = runBackup(fixture, "tencent");
    assert.equal(result.status, 0, result.stderr || result.stdout);
    await assert.rejects(readFile(path.join(fixture.capture, "docker-args.txt"), "utf8"));
    const manifest = await readManifest(fixture.backup);
    assert.match(manifest, /^database_name=guoxue$/m);
    assert.match(manifest, /^source_mode=managed-database-url$/m);
    assert.doesNotMatch(manifest, /super-secret/);
    const files = await readdir(fixture.backup);
    assert.ok(files.some((name) => name.endsWith(".dump")));
    assert.ok(files.some((name) => name.endsWith(".sha256")));
    const pgDumpArgs = await readFile(
      path.join(fixture.capture, "host-pg-dump-args.txt"),
      "utf8",
    );
    const psqlArgs = await readFile(
      path.join(fixture.capture, "host-psql-args.txt"),
      "utf8",
    );
    for (const args of [pgDumpArgs, psqlArgs]) {
      assert.match(args, /\?sslmode=require&connect_timeout=8/u);
      assert.doesNotMatch(args, /schema=/u);
      assert.doesNotMatch(args, /connection_limit=/u);
      assert.doesNotMatch(args, /pool_timeout=/u);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("自建数据库备份通过容器执行且连接密钥不出现在 Docker 参数", async () => {
  const fixture = await createFixture();
  try {
    const result = runBackup(fixture, "standard");
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const dockerArgs = await readFile(path.join(fixture.capture, "docker-args.txt"), "utf8");
    assert.match(dockerArgs, /^inspect /m);
    assert.match(dockerArgs, /pg_dump/);
    assert.match(dockerArgs, /select current_database\(\)/);
    assert.match(dockerArgs, /pg_restore --list/);
    assert.doesNotMatch(dockerArgs, /super-secret/);
    const manifest = await readManifest(fixture.backup);
    assert.match(manifest, /^source_mode=database-url-via-container$/m);
    assert.doesNotMatch(manifest, /super-secret/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("未知部署目标在产生任何备份前失败", async () => {
  const fixture = await createFixture();
  try {
    const result = runBackup(fixture, "unknown");
    assert.notEqual(result.status, 0);
    assert.deepEqual(await readdir(fixture.backup), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("缺少部署目标时禁止默认按自建数据库备份", async () => {
  const fixture = await createFixture();
  try {
    const result = runBackup(fixture, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DEPLOY_TARGET/);
    assert.deepEqual(await readdir(fixture.backup), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("已有备份任务持锁时拒绝生成并发归档", async () => {
  const fixture = await createFixture();
  try {
    const result = runBackup(fixture, "standard", { STUB_FLOCK_FAIL: "1" });
    assert.equal(result.status, 75);
    assert.match(result.stderr, /已有数据库备份任务正在执行/);
    const generated = (await readdir(fixture.backup)).filter((name) => name !== ".backup.lock");
    assert.deepEqual(generated, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
