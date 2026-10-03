import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectDatabaseBaselineSql } from "../../scripts/release/database-baseline-utils.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const generatorPath = path.join(repoRoot, "scripts", "release", "generate-database-baseline.mjs");
const auditPath = path.join(repoRoot, "scripts", "release", "audit-database-baseline.mjs");
const schemaPath = path.join(repoRoot, "apps", "server", "prisma", "schema.prisma");

test("空库初始化必须在历史迁移登记前同事务补齐多租户外部约束", async () => {
  const dir = path.join(repoRoot, "apps/server/prisma/migrations-deploy");
  const bootstrap = await readFile(path.join(dir, "bootstrap-empty-database.sh"), "utf8");
  const operational = await readFile(path.join(dir, "managed-operations.sql"), "utf8");
  assert.match(bootstrap, /\[ ! -f "\$MANAGED_OPERATIONS" \]/u);
  const apply = bootstrap.indexOf('--file="$MANAGED_OPERATIONS"');
  assert(apply > bootstrap.indexOf("--single-transaction"));
  assert(apply < bootstrap.indexOf("登记全量基线覆盖的历史迁移"));
  // Windows 的 psql 不接受连接 URI 之后的选项，避免退出 0 却未执行 DDL。
  assert.match(bootstrap, /--file="\$MANAGED_OPERATIONS" \\\n\s+"\$DATABASE_URL"/u);
  assert(bootstrap.indexOf("expectedTables.some") < bootstrap.indexOf('INSERT INTO "_prisma_migrations"'));
  assert(bootstrap.indexOf("requiredChecks.some") < bootstrap.indexOf('INSERT INTO "_prisma_migrations"'));
  for (const name of ["ManagedLeaseWriteFence_state_check", "ManagedLeaseWriteFence_epoch_check", "ManagedBrandRequest_order_shape"]) {
    assert.equal(operational.split(`ADD CONSTRAINT "${name}"`).length - 1, 1);
  }
  assert.doesNotMatch(operational, /\b(?:DROP|DELETE|UPDATE|TRUNCATE)\b/u);
});

function run(script, ...args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
}

test("没有精确确认词时拒绝写入数据库完整基线", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-db-baseline-confirm-"));
  const outputPath = path.join(tempDir, "full-baseline.sql");
  await writeFile(outputPath, "保留旧基线\n", "utf8");

  const result = run(generatorPath, "--schema", schemaPath, "--output", outputPath);

  assert.equal(result.status, 64, result.stderr || result.stdout);
  assert.equal(await readFile(outputPath, "utf8"), "保留旧基线\n");
});

test("生成器写入临时基线后可通过同一审计规则", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-db-baseline-generate-"));
  const outputPath = path.join(tempDir, "full-baseline.sql");
  await writeFile(outputPath, "待替换的旧基线\n", "utf8");

  const generated = run(
    generatorPath,
    "--schema",
    schemaPath,
    "--output",
    outputPath,
    "--confirm",
    "REGENERATE_FULL_BASELINE",
  );
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);
  assert.match(await readFile(outputPath, "utf8"), /CREATE TABLE/u);

  const audited = run(auditPath, "--schema", schemaPath, "--baseline", outputPath);
  assert.equal(audited.status, 0, audited.stderr || audited.stdout);
});

test("安全扫描允许外键级联但拒绝真实删除语句", () => {
  const safe = inspectDatabaseBaselineSql(`
    CREATE TABLE "Parent" ("id" TEXT PRIMARY KEY);
    CREATE TABLE "Child" ("id" TEXT PRIMARY KEY, "parentId" TEXT);
    ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE;
  `);
  assert.equal(safe.tableCount, 2);
  assert.throws(
    () => inspectDatabaseBaselineSql('CREATE TABLE "A" ("id" TEXT); DROP TABLE "A";'),
    /破坏性语句/u,
  );
});

test("Prisma 生成失败时保留旧基线且清理临时文件", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "guoxue-db-baseline-atomic-"));
  const invalidSchemaPath = path.join(tempDir, "invalid.prisma");
  const outputPath = path.join(tempDir, "full-baseline.sql");
  await writeFile(invalidSchemaPath, "这不是有效的 Prisma schema\n", "utf8");
  await writeFile(outputPath, "保留旧基线\n", "utf8");

  const result = run(
    generatorPath,
    "--schema",
    invalidSchemaPath,
    "--output",
    outputPath,
    "--confirm",
    "REGENERATE_FULL_BASELINE",
  );

  assert.notEqual(result.status, 0);
  assert.equal(await readFile(outputPath, "utf8"), "保留旧基线\n");
});
