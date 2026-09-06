import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = p => readFileSync(path.join(root, p), "utf8");
const migration = read("apps/server/prisma/migrations/manual_add_circle_capability_01_workflow/migration.sql");
const baseline = read("apps/server/prisma/migrations-deploy/full-baseline.sql");
const schema = read("apps/server/prisma/schema.prisma");
const statements = sql => sql.replace(/--[^\n]*/g, "").split(";").map(s => s.trim().replace(/\s+/g, " ").replace(/\s*([(),])\s*/g, "$1")).filter(Boolean);

test("独立迁移只新增2表2枚举，不写数据、不修改旧授权", () => {
  assert.equal((migration.match(/CREATE TABLE/g) || []).length, 2);
  assert.equal((migration.match(/CREATE TYPE/g) || []).length, 2);
  // 按语句判定，不把保护历史的 ON DELETE RESTRICT 误识别为删数据。
  for (const statement of statements(migration)) {
    assert.match(statement, /^(?:CREATE (?:TYPE|TABLE|(?:UNIQUE )?INDEX)\b|ALTER TABLE "[^"]+" ADD CONSTRAINT "[^"]+" FOREIGN KEY\b)/);
  }
  assert.equal((migration.match(/ON DELETE RESTRICT/g) || []).length, 2);
});
test("完整空库基线包含工作流及后继直授来源列，防止仅增量可用", () => {
  const all = new Set(statements(baseline));
  for (let statement of statements(migration)) {
    if (statement.startsWith('CREATE TABLE "CircleCapabilityGrant"')) statement = statement.replace('"capability" "CircleCapabilityType" NOT NULL,', '"capability" "CircleCapabilityType" NOT NULL,"source" VARCHAR(24) NOT NULL DEFAULT \'CIRCLE_APPLICATION\',');
    assert.ok(all.has(statements(statement)[0]), `完整基线缺少：${statement.slice(0, 140)}`);
  }
  const direct = read("apps/server/prisma/migrations/manual_add_circle_platform_direct_grant/migration.sql");
  assert.ok(statements(direct).includes(statements('ALTER TABLE "CircleCapabilityGrant" ADD COLUMN "source" VARCHAR(24) NOT NULL DEFAULT \'CIRCLE_APPLICATION\'')[0]));
});
test("同作用域历史序号、审计版本唯一，默认不启用", () => {
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityGrant_scope_sequence_key"/);
  assert.match(migration, /UNIQUE INDEX "CircleCapabilityAudit_grantId_revision_key"/);
  assert.match(migration, /"enabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /"state" "CircleCapabilityGrantState" NOT NULL DEFAULT 'PENDING'/);
  assert.match(schema, /@@unique\(\[circleId, capability, subjectKey, sequence\]/);
  assert.match(schema, /@@unique\(\[grantId, revision\]\)/);
});
test("独立发布授权入口注册并保留身份与红线保护，不提供删除审计入口", () => {
  const module = read("apps/server/src/modules/circle/circle.module.ts");
  const controller = read("apps/server/src/modules/circle/circle-capability.controller.ts");
  assert.match(module, /controllers:\s*\[[^\]]*CircleCapabilityController/); assert.match(module, /CircleCapabilityRepository/);
  assert.match(controller, /@UseGuards\(JwtAuthGuard, RedLineGuard\)/);
  assert.equal((controller.match(/@RedLineGate\(RedLine.EXTERNAL_PUBLISH\)/g) || []).length, 4);
  assert.match(controller, /admin\/circles\/:circleId\/direct-grants/);
  assert.doesNotMatch(controller, /@Delete\(/);
});
test("后台审核中心注册角色受限的授权页面，不以公开路由替代权限", () => {
  const router = read("apps/admin/src/router/index.ts");
  assert.match(router, /path: "circle-capabilities",\s*name: "CircleCapabilityList",\s*component:.*CircleCapabilityList.vue.*\n\s*meta: \{ title: "发布能力授权", roles: \["SUPER_ADMIN", "OPERATION_ADMIN"\]/);
  assert.match(read("apps/admin/src/lib/menu-structure.ts"), /M\("\/circle-capabilities"\)/);
});
