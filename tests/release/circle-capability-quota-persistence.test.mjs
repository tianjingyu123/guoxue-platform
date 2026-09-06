import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = p => readFileSync(path.join(root, p), "utf8");
const migration = read("apps/server/prisma/migrations/manual_add_circle_capability_02_quota_ledger/migration.sql");
const statements = sql => sql.replace(/--[^\n]*/g, "").split(";").map(s => s.trim().replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1")).filter(Boolean);

test("新圈子迁移按 Prisma 字典序先建授权与额度，再建派发和直授", () => {
  const names = ["manual_add_circle_capability_01_workflow", "manual_add_circle_capability_02_quota_ledger", "manual_add_circle_capability_03_dispatch", "manual_add_circle_platform_direct_grant"];
  assert.deepEqual([...names].sort(), names);
  for (const name of names) assert.ok(read(`apps/server/prisma/migrations/${name}/migration.sql`).length > 0);
  const pgTest = read("apps/server/test/circle-capability-quota-pg.integration-spec.ts");
  assert.match(pgTest, /\]\.sort\(\)\.map\(name =>/);
});

test("配额迁移只新增2表2枚举8索引4限制外键，无数据写入", () => {
  assert.equal((migration.match(/CREATE TABLE/g) || []).length, 2); assert.equal((migration.match(/CREATE TYPE/g) || []).length, 2);
  assert.equal((migration.match(/CREATE (?:UNIQUE )?INDEX/g) || []).length, 8); assert.equal((migration.match(/ON DELETE RESTRICT/g) || []).length, 4);
  for (const sql of statements(migration)) assert.match(sql, /^(?:CREATE (?:TYPE|TABLE|(?:UNIQUE )?INDEX)\b|ALTER TABLE "[^"]+" ADD CONSTRAINT "[^"]+" FOREIGN KEY\b)/);
});
test("完整空库基线精确包含配额迁移", () => {
  const all = new Set(statements(read("apps/server/prisma/migrations-deploy/full-baseline.sql")));
  for (let sql of statements(migration)) {
    if (sql.startsWith('CREATE TABLE "CircleCapabilityQuota"')) sql = sql.replace('"circleGrantId" TEXT NOT NULL', '"circleGrantId" TEXT').replace('"circleGrantRevision" INTEGER NOT NULL', '"circleGrantRevision" INTEGER');
    assert.ok(all.has(sql), `缺少：${sql.slice(0, 160)}`);
  }
  const direct = statements(read("apps/server/prisma/migrations/manual_add_circle_platform_direct_grant/migration.sql"));
  for (const col of ["circleGrantId", "circleGrantRevision"]) assert.ok(direct.includes(`ALTER TABLE "CircleCapabilityQuota" ALTER COLUMN "${col}" DROP NOT NULL`));
});
test("业务、请求、操作键及回执版本由数据库唯一约束保护", () => {
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityQuota_business_key" ON "CircleCapabilityQuota"\("businessType", "businessId"\)/);
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityQuota_requestKey_key"/);
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityQuotaReceipt_operationKey_key"/);
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityQuotaReceipt_revision_key"/);
  assert.match(migration, /"state" "CircleCapabilityQuotaState" NOT NULL DEFAULT 'HELD'/);
});
test("额度只由业务模块事务接入，不提供公共修改接口或独立提交事务", () => {
  for (const domain of ["video", "live", "consult-call"]) {
    assert.match(read(`apps/server/src/modules/${domain}/${domain}.module.ts`), /CircleCapabilityQuotaService/);
  }
  const service = read("apps/server/src/modules/circle/circle-capability-quota.service.ts");
  assert.doesNotMatch(service, /@Controller|@(?:Post|Put|Delete)\(|new PrismaClient|\$transaction\(/);
  assert.match(service, /reserveInTransaction/); assert.match(service, /settleInTransaction/);
});
test("账本与授权事务锁键一致，避免变成两个互不相干的锁", () => {
  for (const file of ["circle-capability.repository.ts", "circle-capability-quota.repository.ts"]) {
    const src = read(`apps/server/src/modules/circle/${file}`);
    assert.ok(src.includes("circle-capability:${circleId}")); assert.ok(src.includes("pg_advisory_xact_lock"));
  }
});
