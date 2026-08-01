import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exporter = path.join(projectRoot, "scripts/migration/export-postgres.sh");
const restorer = path.join(projectRoot, "scripts/migration/restore-postgres.sh");
const bash = process.platform === "win32" ? "bash.exe" : "bash";

function toBashPath(value) {
  const normalized = path.resolve(value);
  if (/^[A-Za-z]:\\/.test(normalized)) {
    return `/${normalized[0].toLowerCase()}${normalized.slice(2).replaceAll("\\", "/")}`;
  }
  return normalized.replaceAll("\\", "/");
}

const psqlStub = `#!/usr/bin/env bash
set -Eeuo pipefail
joined="$*"
case "$joined" in
  *"select current_database()"*) printf 'guoxue\\n'; exit 0 ;;
  *"show server_version"*) printf '16.3\\n'; exit 0 ;;
  *"_prisma_migrations"*) printf '12\\n'; exit 0 ;;
  *"pg_extension"*) printf 'pg_trgm,plpgsql,vector\\n'; exit 0 ;;
  *"select count(*) from pg_tables"*) printf '%s\\n' "\${STUB_EXISTING_TABLES:-0}"; exit 0 ;;
esac

sql_file=""
while (($#)); do
  if [[ "$1" == "-f" ]]; then
    shift
    sql_file="$1"
    break
  fi
  shift
done

if [[ -n "$sql_file" ]]; then
  snapshot_output="$(awk -F"'" '/^\\\\o / { print $2; exit }' "$sql_file")"
  ready_file="$(awk -F"'" '/^\\\\! touch / { print $2; exit }' "$sql_file")"
  release_file="$(awk -F"'" '/^\\\\! while / { print $2; exit }' "$sql_file")"
  printf '00000003-0000001B-1\\n' >"$snapshot_output"
  touch "$ready_file"
  while [[ ! -f "$release_file" ]]; do sleep 0.02; done
  exit 0
fi

cat >/dev/null
printf '"public"."User"\\t2\\n'
`;

const pgDumpStub = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$@" >"$STUB_CAPTURE_DIR/pg-dump-args.txt"
dump_file=""
for argument in "$@"; do
  case "$argument" in
    --file=*) dump_file="\${argument#--file=}" ;;
  esac
done
[[ -n "$dump_file" ]]
printf 'fixture-dump\\n' >"$dump_file"
`;

const pgRestoreStub = `#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$1" == "--list" ]]; then
  [[ -s "$2" ]]
  exit 0
fi
printf '%s\\n' "$@" >"$STUB_CAPTURE_DIR/pg-restore-args.txt"
`;

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-export-snapshot-"));
  const bin = path.join(root, "bin");
  const backup = path.join(root, "backup");
  const capture = path.join(root, "capture");
  await Promise.all([mkdir(bin), mkdir(backup), mkdir(capture)]);
  const stubs = [
    ["psql", psqlStub],
    ["pg_dump", pgDumpStub],
    ["pg_restore", pgRestoreStub],
  ];
  for (const [name, content] of stubs) {
    const target = path.join(bin, name);
    await writeFile(target, content, "utf8");
    await chmod(target, 0o755);
  }
  return { root, bin, backup, capture };
}

function runExporter(fixture, overrides = {}) {
  return spawnSync(
    bash,
    ["-c", 'export PATH="$TEST_STUB_BIN:$PATH"; exec bash "$EXPORT_SCRIPT"'],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TEST_STUB_BIN: toBashPath(fixture.bin),
        EXPORT_SCRIPT: toBashPath(exporter),
        SOURCE_DATABASE_URL: "postgresql://fixture/guoxue",
        MIGRATION_BACKUP_DIR: toBashPath(fixture.backup),
        STUB_CAPTURE_DIR: toBashPath(fixture.capture),
        ...overrides,
      },
    },
  );
}

function runRestorer(fixture, dumpFile, overrides = {}) {
  return spawnSync(
    bash,
    ["-c", 'export PATH="$TEST_STUB_BIN:$PATH"; exec bash "$RESTORE_SCRIPT"'],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TEST_STUB_BIN: toBashPath(fixture.bin),
        RESTORE_SCRIPT: toBashPath(restorer),
        TARGET_DATABASE_URL: "postgresql://fixture/guoxue",
        BACKUP_FILE: toBashPath(dumpFile),
        RESTORE_CONFIRM: "guoxue",
        STUB_CAPTURE_DIR: toBashPath(fixture.capture),
        ...overrides,
      },
    },
  );
}

test("演练导出的归档与表计数绑定同一个 PostgreSQL 快照", async () => {
  const fixture = await createFixture();
  try {
    const result = runExporter(fixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const files = await readdir(fixture.backup);
    const manifestName = files.find((name) => name.endsWith(".manifest.txt"));
    assert.ok(manifestName, "应生成迁移清单");
    const manifest = await readFile(path.join(fixture.backup, manifestName), "utf8");
    assert.match(manifest, /^export_mode=rehearsal$/m);
    assert.match(manifest, /^consistent_snapshot=00000003-0000001B-1$/m);

    const dumpArgs = await readFile(path.join(fixture.capture, "pg-dump-args.txt"), "utf8");
    assert.match(dumpArgs, /^--snapshot=00000003-0000001B-1$/m);
    assert.ok(files.some((name) => name.endsWith(".table-counts.tsv")));
    assert.ok(files.some((name) => name.endsWith(".dump.sha256")));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("最终导出未确认旧站停写时必须阻断", async () => {
  const fixture = await createFixture();
  try {
    const result = runExporter(fixture, { MIGRATION_EXPORT_MODE: "final" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /最终导出前必须停止旧站全部写入/);
    assert.deepEqual(await readdir(fixture.backup), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("最终导出只有停写状态与源库名双重确认后才生成归档", async () => {
  const fixture = await createFixture();
  try {
    const result = runExporter(fixture, {
      MIGRATION_EXPORT_MODE: "final",
      SOURCE_WRITES_FROZEN: "true",
      MIGRATION_FREEZE_CONFIRM: "guoxue",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const files = await readdir(fixture.backup);
    const manifestName = files.find((name) => name.endsWith(".manifest.txt"));
    const manifest = await readFile(path.join(fixture.backup, manifestName), "utf8");
    assert.match(manifest, /^export_mode=final$/m);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("正式恢复拒绝演练归档", async () => {
  const fixture = await createFixture();
  try {
    const exportResult = runExporter(fixture);
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const dumpName = (await readdir(fixture.backup)).find((name) => name.endsWith(".dump"));
    const result = runRestorer(fixture, path.join(fixture.backup, dumpName), {
      MIGRATION_RESTORE_MODE: "final",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /正式恢复只接受最终停写后生成的 final 归档/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("正式恢复只在 final 清单、校验和与空目标库同时通过后执行", async () => {
  const fixture = await createFixture();
  try {
    const exportResult = runExporter(fixture, {
      MIGRATION_EXPORT_MODE: "final",
      SOURCE_WRITES_FROZEN: "true",
      MIGRATION_FREEZE_CONFIRM: "guoxue",
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const dumpName = (await readdir(fixture.backup)).find((name) => name.endsWith(".dump"));
    const result = runRestorer(fixture, path.join(fixture.backup, dumpName), {
      MIGRATION_RESTORE_MODE: "final",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const restoreArgs = await readFile(
      path.join(fixture.capture, "pg-restore-args.txt"),
      "utf8",
    );
    assert.match(restoreArgs, /^--single-transaction$/m);
    assert.match(restoreArgs, /^--exit-on-error$/m);
    assert.match(restoreArgs, /^--no-owner$/m);
    assert.match(restoreArgs, /^--no-privileges$/m);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("恢复始终拒绝非空目标库且不能用旧放行变量绕过", async () => {
  const fixture = await createFixture();
  try {
    const exportResult = runExporter(fixture, {
      MIGRATION_EXPORT_MODE: "final",
      SOURCE_WRITES_FROZEN: "true",
      MIGRATION_FREEZE_CONFIRM: "guoxue",
    });
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    const dumpName = (await readdir(fixture.backup)).find((name) => name.endsWith(".dump"));
    const result = runRestorer(fixture, path.join(fixture.backup, dumpName), {
      MIGRATION_RESTORE_MODE: "final",
      STUB_EXISTING_TABLES: "3",
      ALLOW_NONEMPTY_TARGET: "true",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /已有 3 张表，拒绝执行恢复/);
    await assert.rejects(
      readFile(path.join(fixture.capture, "pg-restore-args.txt"), "utf8"),
      /ENOENT/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
