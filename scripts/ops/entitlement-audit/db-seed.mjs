#!/usr/bin/env node
/**
 * 把 fixtures.mjs 的合成快照写成 SQL，灌进**隔离测试库**的真实表结构。
 *
 * 用途：验证检测候选在真实 Prisma 结构（字段、类型、外键、枚举）下同样成立，
 * 而不是只在内存对象上成立。
 *
 * 边界：
 *  - 只输出 SQL 到 stdout，本身不连接数据库。由调用方用**写权限账号**执行，
 *    与运行检测的只读账号分开。
 *  - 数据全部来自 fixtures.mjs，id 一律 `syn-` 前缀，不含任何真实用户数据。
 *  - 不简化字段：缺失的必填列按表结构补最小合法值，不删列、不改类型。
 *
 * 用法：
 *   node scripts/ops/entitlement-audit/db-seed.mjs > /tmp/seed.sql
 *   psql -v ON_ERROR_STOP=1 --single-transaction --file=/tmp/seed.sql "<写账号 DSN>"
 */

import { buildSnapshot } from "./fixtures.mjs";

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null ? "NULL" : Number(v));
const b = (v) => (v ? "true" : "false");
const ts = (v) => (v == null ? "NULL" : `'${new Date(v).toISOString()}'::timestamp`);

const snap = buildSnapshot({ includeSchemaImpossible: false });
const out = [];
const nowIso = new Date(snap.now).toISOString();

out.push("-- 合成数据，全部 syn- 前缀，无真实用户数据。由写权限账号执行。");
out.push("BEGIN;");

// ── 依赖主体：User ──
const userIds = new Set();
for (const o of snap.orders) userIds.add(o.userId);
for (const u of snap.users) userIds.add(u.id);
for (const m of snap.circleMembers) userIds.add(m.userId);
for (const s of snap.stations) userIds.add(s.userId);
for (const op of snap.operators) userIds.add(op.userId);
for (const p of snap.practitionerProfiles) userIds.add(p.userId);
for (const l of snap.entitlementLedger) userIds.add(l.userId);
for (const bal of snap.entitlementBalance) userIds.add(bal.userId);
// 圈主
userIds.add("syn-owner");

const userState = new Map(snap.users.map((u) => [u.id, u]));
for (const id of [...userIds].sort()) {
  const u = userState.get(id);
  out.push(
    `INSERT INTO "User"(id,nickname,"memberLevel","memberExpire","updatedAt","createdAt") VALUES (` +
      `${q(id)},${q("合成用户" + id.slice(-3))},` +
      `${u?.memberLevel ? `'${u.memberLevel}'::"MemberLevel"` : `'NONE'::"MemberLevel"`},` +
      `${ts(u?.memberExpire)},'${nowIso}'::timestamp,'${nowIso}'::timestamp);`,
  );
}

// ── Circle（圈子履约真源的父表） ──
const circleIds = new Set();
for (const o of snap.orders) {
  if (o.type === "CIRCLE_JOIN" || o.type === "CIRCLE_RENEW") circleIds.add(o.targetId);
}
for (const m of snap.circleMembers) circleIds.add(m.circleId);
for (const c of snap.circles ?? []) circleIds.add(c.id);
// 圈子状态以 snapshot.circles 为准（未决规则判别依赖它，不能一律写死 ACTIVE）
const circleState = new Map((snap.circles ?? []).map((c) => [c.id, c]));
for (const id of [...circleIds].sort()) {
  const c = circleState.get(id);
  out.push(
    `INSERT INTO "Circle"(id,name,intro,"ownerId",type,price,status,"updatedAt","createdAt") VALUES (` +
      `${q(id)},${q("合成圈子" + id.slice(-1))},${q("用于隔离验证的合成圈子")},${q("syn-owner")},` +
      `'${c?.type ?? "YEARLY"}'::"CircleType",199,` +
      `'${c?.status ?? "ACTIVE"}'::"CircleStatus",'${nowIso}'::timestamp,'${nowIso}'::timestamp);`,
  );
}

// ── CircleMember ──
let mi = 0;
for (const m of snap.circleMembers) {
  out.push(
    `INSERT INTO "CircleMember"(id,"circleId","userId",role,"joinedAt","expireAt") VALUES (` +
      `${q("syn-cm-" + ++mi)},${q(m.circleId)},${q(m.userId)},'MEMBER'::"CircleMemberRole",` +
      `${ts(m.joinedAt)},${ts(m.expireAt)});`,
  );
}

// ── Order ──
for (const o of snap.orders) {
  out.push(
    `INSERT INTO "Order"(id,"userId",type,"targetId",quantity,amount,"payAmount",status,` +
      `"payMethod","payTransactionId","paidAt","refundedAt","completedAt","createdAt","updatedAt") VALUES (` +
      `${q(o.id)},${q(o.userId)},'${o.type}'::"OrderType",${q(o.targetId)},${n(o.quantity)},` +
      `${n(o.amount)},${n(o.payAmount)},'${o.status}'::"OrderStatus",${q(o.payMethod)},` +
      `${q(o.payTransactionId)},${ts(o.paidAt)},${ts(o.refundedAt)},${ts(o.completedAt)},` +
      `${ts(o.createdAt)},'${nowIso}'::timestamp);`,
  );
}

// ── EntitlementLedger ──
for (const l of snap.entitlementLedger) {
  out.push(
    `INSERT INTO "EntitlementLedger"(id,"userId","entitlementKey",kind,"resourceType","resourceId",scope,` +
      `action,quantity,unlimited,"validFrom","validUntil","sourceType","sourceId","reversesLedgerId",` +
      `"idempotencyKey","createdAt") VALUES (` +
      `${q(l.id)},${q(l.userId)},${q(l.entitlementKey)},${q(l.kind)},${q(l.resourceType ?? "")},` +
      `${q(l.resourceId ?? "")},${q(l.scope ?? "GLOBAL")},${q(l.action)},${n(l.quantity)},${b(l.unlimited)},` +
      `${ts(l.validFrom)},${ts(l.validUntil)},${q(l.sourceType)},${q(l.sourceId)},${q(l.reversesLedgerId)},` +
      `${q(l.idempotencyKey)},${ts(l.createdAt)});`,
  );
}

// ── EntitlementBalance ──
let bi = 0;
for (const x of snap.entitlementBalance) {
  out.push(
    `INSERT INTO "EntitlementBalance"(id,"userId","entitlementKey",kind,"resourceType","resourceId",scope,` +
      `quantity,unlimited,"validFrom","validUntil",status,version,"createdAt","updatedAt") VALUES (` +
      `${q("syn-bal-" + ++bi)},${q(x.userId)},${q(x.entitlementKey)},${q("ACCESS")},` +
      `${q(x.resourceType ?? "")},${q(x.resourceId ?? "")},${q(x.scope ?? "GLOBAL")},` +
      `${n(x.quantity)},${b(x.unlimited)},'${nowIso}'::timestamp,${ts(x.validUntil)},${q(x.status)},0,` +
      `'${nowIso}'::timestamp,${ts(x.updatedAt)});`,
  );
}

// ── MemberPurchase ──
for (const p of snap.memberPurchases) {
  out.push(
    `INSERT INTO "MemberPurchase"(id,"userId","orderId","memberType",amount,"paidAt","expireAt","refundedAt") VALUES (` +
      `${q(p.id)},${q(p.userId)},${q(p.orderId)},'${p.memberType}'::"MemberLevel",365,` +
      `${ts(p.paidAt)},${ts(p.expireAt)},${ts(p.refundedAt)});`,
  );
}

// ── Station / Operator / PractitionerProfile ──
for (const s of snap.stations) {
  out.push(
    `INSERT INTO "Station"(id,"userId",name,code,status,"expireAt","updatedAt","createdAt") VALUES (` +
      `${q(s.id)},${q(s.userId)},${q("合成分站")},${q(s.id.slice(-6))},${q(s.status)},` +
      `${ts(s.expireAt)},'${nowIso}'::timestamp,'${nowIso}'::timestamp);`,
  );
}
let oi = 0;
for (const op of snap.operators) {
  out.push(
    `INSERT INTO "Operator"(id,"userId",level,status,"expireAt","createdAt") VALUES (` +
      `${q("syn-op-" + ++oi)},${q(op.userId)},'${op.level}'::"OperatorLevel",` +
      `${q(op.status)},${ts(op.expireAt)},'${nowIso}'::timestamp);`,
  );
}
let pi = 0;
for (const p of snap.practitionerProfiles) {
  out.push(
    `INSERT INTO "PractitionerProfile"(id,"userId","proExpireAt","updatedAt","createdAt") VALUES (` +
      `${q("syn-pp-" + ++pi)},${q(p.userId)},${ts(p.proExpireAt)},'${nowIso}'::timestamp,'${nowIso}'::timestamp);`,
  );
}

out.push("COMMIT;");
process.stdout.write(out.join("\n") + "\n");
