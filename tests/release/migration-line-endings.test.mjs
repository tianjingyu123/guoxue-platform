import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertMigrationSqlLineEndings } from "../../scripts/release/migration-line-endings.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrations = path.join(root, "apps/server/prisma/migrations");

test("固定包拒绝迁移 SQL 的 CRLF", () => {
  const name = "apps/server/prisma/migrations/example/migration.sql";
  assert.doesNotThrow(() => assertMigrationSqlLineEndings(name, Buffer.from("SELECT 1;\n")));
  assert.throws(() => assertMigrationSqlLineEndings(name, Buffer.from("SELECT 1;\r\n")), /CRLF/u);
});

test("当前全部迁移 SQL 的检出字节均为 LF", () => {
  const names = readdirSync(migrations).filter((name) => existsSync(path.join(migrations, name, "migration.sql")));
  assert.ok(names.length > 0);
  for (const name of names) {
    const relative = `apps/server/prisma/migrations/${name}/migration.sql`;
    assertMigrationSqlLineEndings(relative, readFileSync(path.join(root, relative)));
  }
});
