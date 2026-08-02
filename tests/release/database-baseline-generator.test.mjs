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
