import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const verifier = path.join(projectRoot, "scripts/migration/verify-postgres.sh");
const prismaMigrationRunner = path.join(
  projectRoot,
  "scripts/migration/run-prisma-migrations.sh",
);
const bash = process.platform === "win32" ? "bash.exe" : "bash";
const releaseId = "release-db-proof-test";

function toBashPath(value) {
  const normalized = path.resolve(value);
  if (/^[A-Za-z]:\\/u.test(normalized)) {
    return `/${normalized[0].toLowerCase()}${normalized.slice(2).replaceAll("\\", "/")}`;
  }
  return normalized.replaceAll("\\", "/");
}

const psqlStub = `#!/usr/bin/env bash
set -Eeuo pipefail
joined="$*"
case "$joined" in
  *"select current_database()"*) printf 'guoxue_target\\n'; exit 0 ;;
  *'select count(*) from "public"."User"'*) printf '2\\n'; exit 0 ;;
  *"select count(*)"*) printf '1\\n'; exit 0 ;;
esac
exit 0
`;

const dockerStub = `#!/usr/bin/env bash
set -Eeuo pipefail
if [[ -n "\${DOCKER_STUB_LOG:-}" ]]; then
  printf '%s\\n' "$*" >> "$DOCKER_STUB_LOG"
fi
if [[ "$*" == *" run "* && "\${PRISMA_CONTAINER_STUB_FAIL:-false}" == "true" ]]; then
  echo "存在待执行的 Prisma 迁移" >&2
  exit 23
fi
exit 0
`;

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function createFixture(exportMode = "final") {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-db-proof-"));
  const bin = path.join(root, "bin");
  await mkdir(bin);
  const psql = path.join(bin, "psql");
  const docker = path.join(bin, "docker");
  await writeFile(psql, psqlStub, "utf8");
  await writeFile(docker, dockerStub, "utf8");
  await chmod(psql, 0o755);
  await chmod(docker, 0o755);

  const counts = path.join(root, "source.table-counts.tsv");
  const manifest = path.join(root, "source.manifest.txt");
  const dump = path.join(root, "source.dump");
  const checksum = path.join(root, "source.dump.sha256");
  const report = path.join(root, "database-migration-verification.json");
  const composeEnv = path.join(root, ".env.production");
  const dockerLog = path.join(root, "docker.log");
  const countsContent = '"public"."User"\t2\n';
  const manifestContent = [
    "created_at_utc=20260731T120000Z",
    "database_name=guoxue_source",
    `export_mode=${exportMode}`,
    "consistent_snapshot=00000003-0000001B-1",
    "server_version=16.3",
    "dump_file=source.dump",
    "counts_file=source.table-counts.tsv",
    "",
  ].join("\n");
  const dumpContent = "fixture-database-archive\n";
  await writeFile(dump, dumpContent, "utf8");
  await writeFile(composeEnv, "PUBLIC_DOMAIN=fixture.invalid\n", "utf8");
  await writeFile(counts, countsContent, "utf8");
  await writeFile(manifest, manifestContent, "utf8");
  await writeFile(
    checksum,
    `${hash(dumpContent)}  ${path.basename(dump)}\n${hash(countsContent)}  ${path.basename(counts)}\n${hash(manifestContent)}  ${path.basename(manifest)}\n`,
    "utf8",
  );
  return {
    root,
    bin,
    counts,
    manifest,
    dump,
    checksum,
    report,
    composeEnv,
    dockerLog,
  };
}

function runVerifier(fixture, overrides = {}) {
  return spawnSync(
    bash,
    ["-c", 'export PATH="$TEST_STUB_BIN:$PATH"; exec bash "$VERIFY_SCRIPT"'],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TEST_STUB_BIN: toBashPath(fixture.bin),
        VERIFY_SCRIPT: toBashPath(verifier),
        TARGET_DATABASE_URL: "postgresql://fixture/guoxue_target",
        SOURCE_COUNTS_FILE: toBashPath(fixture.counts),
        SOURCE_CHECKSUM_FILE: toBashPath(fixture.checksum),
        SOURCE_MANIFEST_FILE: toBashPath(fixture.manifest),
        MIGRATION_VERIFICATION_MODE: "final",
        TARGET_RELEASE_ID: releaseId,
        MIGRATION_VERIFICATION_REPORT: toBashPath(fixture.report),
        PRISMA_COMPOSE_ENV_FILE: toBashPath(fixture.composeEnv),
        DOCKER_STUB_LOG: toBashPath(fixture.dockerLog),
        ...overrides,
      },
    },
  );
}

function runPrismaMigration(fixture, action, overrides = {}) {
  return spawnSync(
    bash,
    ["-c", 'export PATH="$TEST_STUB_BIN:$PATH"; exec bash "$PRISMA_RUNNER" "$ACTION"'],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TEST_STUB_BIN: toBashPath(fixture.bin),
        PRISMA_RUNNER: toBashPath(prismaMigrationRunner),
        ACTION: action,
        TARGET_DATABASE_URL: "postgresql://secret-user:secret-pass@fixture/guoxue_target",
        TARGET_RELEASE_ID: releaseId,
        PRISMA_COMPOSE_ENV_FILE: toBashPath(fixture.composeEnv),
        DOCKER_STUB_LOG: toBashPath(fixture.dockerLog),
        ...overrides,
      },
    },
  );
}

test("正式数据库核验生成与发布版本绑定的结构化证据", async (t) => {
  const fixture = await createFixture("final");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const result = runVerifier(fixture);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(fixture.report, "utf8"));
  assert.equal(report.releaseId, releaseId);
  assert.equal(report.verificationMode, "final");
  assert.equal(report.sourceExportMode, "final");
  assert.equal(report.targetDatabaseName, "guoxue_target");
  assert.equal(report.tableCount, 1);
  assert.equal(report.mismatchedTableCount, 0);
  assert.equal(report.prismaMigrationStatusPassed, true);
  assert.match(report.sources.manifest.sha256, /^[a-f0-9]{64}$/u);
});

test("Prisma 迁移状态异常时阻断数据库证据生成", async (t) => {
  const fixture = await createFixture("final");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const result = runVerifier(fixture, { PRISMA_CONTAINER_STUB_FAIL: "true" });
  assert.equal(result.status, 23);
  assert.match(result.stderr, /待执行的 Prisma 迁移/u);
  await assert.rejects(readFile(fixture.report, "utf8"));
});

test("Prisma deploy 必须二次确认并通过生产镜像执行", async (t) => {
  const fixture = await createFixture("final");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const rejected = runPrismaMigration(fixture, "deploy");
  assert.equal(rejected.status, 64);
  assert.match(rejected.stderr, /MIGRATION_DEPLOY_CONFIRM/u);

  const accepted = runPrismaMigration(fixture, "deploy", {
    MIGRATION_DEPLOY_CONFIRM: `migrate:${releaseId}`,
  });
  assert.equal(accepted.status, 0, accepted.stderr);
  const dockerLog = await readFile(fixture.dockerLog, "utf8");
  assert.match(dockerLog, /compose .* build server/u);
  assert.match(dockerLog, /run --rm --no-deps -e DATABASE_URL/u);
  assert.match(dockerLog, /pnpm --dir \/app\/apps\/server exec prisma/u);
  assert.match(dockerLog, /prisma migrate deploy/u);
  assert.doesNotMatch(dockerLog, /secret-pass/u);
});

test("正式数据库核验拒绝演练归档", async (t) => {
  const fixture = await createFixture("rehearsal");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const result = runVerifier(fixture);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /正式核验只接受/u);
});

test("缺少发布标识时数据库核验在连接目标库前阻断", async (t) => {
  const fixture = await createFixture("final");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const result = runVerifier(fixture, { TARGET_RELEASE_ID: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TARGET_RELEASE_ID/u);
});

test("数据库核验拒绝混用其他归档目录的表计数", async (t) => {
  const fixture = await createFixture("final");
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const otherDirectory = path.join(fixture.root, "other-archive");
  await mkdir(otherDirectory);
  const otherCounts = path.join(otherDirectory, "source.table-counts.tsv");
  await writeFile(otherCounts, '"public"."User"\t2\n', "utf8");
  const result = runVerifier(fixture, { SOURCE_COUNTS_FILE: toBashPath(otherCounts) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /必须来自同一目录/u);
});
