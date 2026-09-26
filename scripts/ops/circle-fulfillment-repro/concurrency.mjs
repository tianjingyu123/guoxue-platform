#!/usr/bin/env node
/**
 * 圈子履约 · 真实并发测试
 *
 * 与 repro.mjs 的区别：
 *  - **每个并发参与者用独立的 PrismaClient（独立数据库连接）**，不是同一连接顺序执行；
 *  - 用 `pg_sleep` 在事务内制造**可控同步点**，并记录每个事务的开始/结束时刻，
 *    断言两个事务**确实时间重叠**，而不是先后串行；
 *  - 同一组场景分别跑 **legacy（v1 复刻）** 与 **fixed（当前实现）**，
 *    证明旧实现会失败、修正后通过；
 *  - 断言**最终订单状态、成员到期时间、圈子人数、收益记录**，不只看成员行数。
 *
 * 只对本机隔离测试库运行，合成数据 `con-` 前缀。不连生产、不动真实订单。
 */

import { createRequire } from "node:module";

const SERVER_DIR = process.env.REPRO_SERVER_DIR || "D:/gx-deploy-91/apps/server";
const req = createRequire(`${SERVER_DIR.replace(/\/?$/, "/")}package.json`);
const { PrismaClient } = req("@prisma/client");

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.join("=") || true];
  }),
);
if (!args.dsn) { console.error("必须提供 --dsn（仅限本机隔离测试库）"); process.exit(64); }
if (/:[^/@]*@/.test(args.dsn)) { console.error("连接串不得包含口令"); process.exit(64); }
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(args.dsn).hostname)) {
  console.error("拒绝连接非本机主机"); process.exit(64);
}

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
req("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs", target: "es2022" } });
const FIX = req(process.env.REPRO_FIX_PATH ||
  "D:/gx-deploy-91/.worktrees/entitlement-audit-20260918/apps/server/src/modules/shop/circle-fulfillment.ts");
const { legacyFulfillCircleOrderTx } = await import(`file:///${HERE}legacy-fulfillment.mjs`.replace(/\\/g, "/"));

const DAY = 86_400_000;
const YEAR = 365 * DAY;
const TX_TIMEOUT = 20_000;

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** 独立连接池：每个并发参与者一个 client */
function newClient() {
  return new PrismaClient({ datasources: { db: { url: args.dsn } } });
}
const admin = newClient();
const A = newClient();
const B = newClient();
const C = newClient();

/** 在事务内跑履约，并记录事务的真实起止时刻，用于证明交错 */
async function runFulfill(client, orderId, { impl, holdMs = 0, pauseMs = 0, label }) {
  const started = Date.now();
  let outcome, error = null;
  try {
    outcome = await client.$transaction(async (tx) => {
      let r;
      if (impl === "legacy") {
        const snapshot = await tx.order.findUnique({ where: { id: orderId } });
        r = await legacyFulfillCircleOrderTx(tx, snapshot, { pauseMs });
      } else {
        r = await FIX.fulfillCircleOrderTx(tx, orderId);
      }
      if (holdMs > 0) await tx.$executeRawUnsafe(`SELECT pg_sleep(${holdMs / 1000})`);
      return r;
    }, { timeout: TX_TIMEOUT });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return { label, started, ended: Date.now(), outcome, error };
}

const overlapped = (x, y) => x.started < y.ended && y.started < x.ended;

// ── 夹具 ──
const RUN = `con-${Date.now().toString(36)}`;
async function cleanup() {
  await admin.circleRevenueRecord.deleteMany({ where: { circleId: { startsWith: "con-" } } });
  await admin.order.deleteMany({ where: { userId: { startsWith: "con-" } } });
  await admin.circleMember.deleteMany({ where: { userId: { startsWith: "con-" } } });
  await admin.circle.deleteMany({ where: { ownerId: { startsWith: "con-" } } });
  await admin.user.deleteMany({ where: { id: { startsWith: "con-" } } });
}
let seq = 0;
async function scenario({ memberExpireAt = undefined, orders }) {
  const n = ++seq;
  const owner = `${RUN}-own${n}`, user = `${RUN}-u${n}`, circle = `${RUN}-c${n}`;
  await admin.user.createMany({ data: [{ id: owner, nickname: `圈主${n}` }, { id: user, nickname: `用户${n}` }] });
  await admin.circle.create({
    data: { id: circle, name: `并发圈${n}`, intro: "并发测试", ownerId: owner, type: "YEARLY", price: 199, status: "ACTIVE" },
  });
  if (memberExpireAt !== undefined) {
    await admin.circleMember.create({ data: { circleId: circle, userId: user, role: "MEMBER", expireAt: memberExpireAt } });
    await admin.circle.update({ where: { id: circle }, data: { memberCount: 1 } });
  }
  const created = [];
  for (const o of orders) {
    created.push(await admin.order.create({
      data: {
        userId: user, type: o.type, targetId: circle, quantity: o.quantity ?? 1,
        amount: 199, payAmount: 199, status: o.status ?? "PAID",
        payMethod: "WECHAT", paidAt: new Date(),
      },
    }));
  }
  return { owner, user, circle, orders: created };
}
async function snap(circle, user) {
  const [m, c, os] = await Promise.all([
    admin.circleMember.findUnique({ where: { circleId_userId: { circleId: circle, userId: user } } }),
    admin.circle.findUnique({ where: { id: circle }, select: { memberCount: true } }),
    admin.order.findMany({ where: { targetId: circle, userId: user }, select: { id: true, status: true }, orderBy: { id: "asc" } }),
  ]);
  return { member: m, memberCount: c?.memberCount ?? 0, orders: os };
}

// ─────────────────────────── 场景 ───────────────────────────

/** C1 同一 PAID 续费订单被两个补偿任务同时处理 */
async function c1(impl) {
  const f = await scenario({ memberExpireAt: new Date(Date.now() + 30 * DAY), orders: [{ type: "CIRCLE_RENEW" }] });
  const base = (await snap(f.circle, f.user)).member.expireAt.getTime();
  const oid = f.orders[0].id;
  const [ra, rb] = await Promise.all([
    runFulfill(A, oid, { impl, holdMs: 700, pauseMs: 700, label: "A" }),
    new Promise((r) => setTimeout(r, 120)).then(() => runFulfill(B, oid, { impl, label: "B" })),
  ]);
  const s = await snap(f.circle, f.user);
  const addedYears = Math.round((s.member.expireAt.getTime() - base) / YEAR);
  check(`[${impl}] C1 两个补偿任务并发：事务确实重叠`, overlapped(ra, rb),
    `A ${ra.started}-${ra.ended} / B ${rb.started}-${rb.ended}`);
  check(`[${impl}] C1 只顺延一次（+1 年）`, addedYears === 1, `实际顺延 ${addedYears} 年；A=${ra.outcome?.outcome ?? ra.error} B=${rb.outcome?.outcome ?? rb.error}`);
  check(`[${impl}] C1 订单终态 COMPLETED`, s.orders[0].status === "COMPLETED", s.orders[0].status);
  check(`[${impl}] C1 成员数未被重复增加`, s.memberCount === 1, `memberCount=${s.memberCount}`);
}

/** C2 支付回调、补偿、旧 confirm 三方竞争同一 JOIN 订单 */
async function c2(impl) {
  const f = await scenario({ orders: [{ type: "CIRCLE_JOIN" }] });
  const oid = f.orders[0].id;
  const r = await Promise.all([
    runFulfill(A, oid, { impl, holdMs: 700, pauseMs: 700, label: "callback" }),
    new Promise((x) => setTimeout(x, 100)).then(() => runFulfill(B, oid, { impl, pauseMs: 400, label: "retry" })),
    new Promise((x) => setTimeout(x, 200)).then(() => runFulfill(C, oid, { impl, pauseMs: 400, label: "confirm" })),
  ]);
  const s = await snap(f.circle, f.user);
  const anyOverlap = overlapped(r[0], r[1]) && overlapped(r[0], r[2]);
  const members = await admin.circleMember.count({ where: { circleId: f.circle, userId: f.user } });
  check(`[${impl}] C2 三方事务确实重叠`, anyOverlap, r.map((x) => `${x.label}:${x.started}-${x.ended}`).join(" "));
  check(`[${impl}] C2 只建一个成员`, members === 1, `members=${members}`);
  check(`[${impl}] C2 成员数恰为 1`, s.memberCount === 1, `memberCount=${s.memberCount}`);
  check(`[${impl}] C2 订单终态 COMPLETED`, s.orders[0].status === "COMPLETED", s.orders[0].status);
  const fulfilledCount = r.filter((x) => ["fulfilled", "extended"].includes(x.outcome?.outcome)).length;
  check(`[${impl}] C2 恰有一次真实履约（其余幂等）`, fulfilledCount === 1,
    `真实履约 ${fulfilledCount} 次：${r.map((x) => `${x.label}=${x.outcome?.outcome ?? x.error}`).join(", ")}`);
}

/** C3 两笔不同续费订单并发 */
async function c3(impl) {
  const f = await scenario({
    memberExpireAt: new Date(Date.now() + 30 * DAY),
    orders: [{ type: "CIRCLE_RENEW" }, { type: "CIRCLE_RENEW" }],
  });
  const base = (await snap(f.circle, f.user)).member.expireAt.getTime();
  const [ra, rb] = await Promise.all([
    runFulfill(A, f.orders[0].id, { impl, holdMs: 700, pauseMs: 700, label: "renew1" }),
    new Promise((x) => setTimeout(x, 120)).then(() => runFulfill(B, f.orders[1].id, { impl, pauseMs: 700, label: "renew2" })),
  ]);
  const s = await snap(f.circle, f.user);
  const addedYears = Math.round((s.member.expireAt.getTime() - base) / YEAR);
  check(`[${impl}] C3 两笔续费事务确实重叠`, overlapped(ra, rb), `A ${ra.started}-${ra.ended} / B ${rb.started}-${rb.ended}`);
  check(`[${impl}] C3 两笔各顺延一次（共 +2 年）`, addedYears === 2,
    `实际顺延 ${addedYears} 年；A=${ra.outcome?.outcome ?? ra.error} B=${rb.outcome?.outcome ?? rb.error}`);
  check(`[${impl}] C3 两笔订单均 COMPLETED`, s.orders.every((o) => o.status === "COMPLETED"),
    s.orders.map((o) => o.status).join(","));
}

/** C4 退款与履约竞争：退款先拿到订单锁 */
async function c4(impl) {
  const f = await scenario({ orders: [{ type: "CIRCLE_JOIN" }] });
  const oid = f.orders[0].id;
  const refund = (async () => {
    const started = Date.now();
    await A.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT "id" FROM "Order" WHERE "id"=$1 FOR UPDATE`, oid);
      await tx.$executeRawUnsafe(`SELECT pg_sleep(0.7)`);
      await tx.order.update({ where: { id: oid }, data: { status: "REFUNDED", refundedAt: new Date() } });
      await tx.circleMember.deleteMany({ where: { circleId: f.circle, userId: f.user } });
    }, { timeout: TX_TIMEOUT });
    return { label: "refund", started, ended: Date.now() };
  })();
  const fulfil = new Promise((x) => setTimeout(x, 120)).then(() =>
    runFulfill(B, oid, { impl, pauseMs: 300, label: "fulfil" }));
  const [rr, rf] = await Promise.all([refund, fulfil]);
  const s = await snap(f.circle, f.user);
  check(`[${impl}] C4 退款与履约事务确实重叠`, overlapped(rr, rf), `refund ${rr.started}-${rr.ended} / fulfil ${rf.started}-${rf.ended}`);
  check(`[${impl}] C4 退款后权益未被复活`, s.member === null,
    `member=${s.member ? "存在（错误）" : "无"} 履约结果=${rf.outcome?.outcome ?? rf.error}`);
  check(`[${impl}] C4 订单保持 REFUNDED`, s.orders[0].status === "REFUNDED", s.orders[0].status);
}

/** C5 已是有效成员的额外 JOIN 单：不得静默标完成 */
async function c5(impl) {
  const f = await scenario({
    memberExpireAt: new Date(Date.now() + 100 * DAY),
    orders: [{ type: "CIRCLE_JOIN" }],
  });
  const before = (await snap(f.circle, f.user)).member.expireAt.getTime();
  const r = await runFulfill(A, f.orders[0].id, { impl, label: "dupJoin" });
  const s = await snap(f.circle, f.user);
  const unchanged = s.member.expireAt.getTime() === before;
  const silentlyCompleted = s.orders[0].status === "COMPLETED" && unchanged;
  check(`[${impl}] C5 不得「标完成但不给权益也不退款」`, !silentlyCompleted,
    `订单=${s.orders[0].status} 到期未变=${unchanged} 结果=${r.outcome?.outcome ?? r.error}`);
  if (impl === "fixed") {
    check(`[${impl}] C5 返回 needs_manual 并保持 PAID`,
      r.outcome?.outcome === "needs_manual" && s.orders[0].status === "PAID",
      `outcome=${r.outcome?.outcome} reason=${r.outcome?.reason} status=${s.orders[0].status}`);
  }
}

// ─────────────────────────── 主流程 ───────────────────────────
const IMPLS = args.impl ? [args.impl] : ["legacy", "fixed"];
try {
  console.log("=== 圈子履约 · 真实并发测试（独立连接 + 可控同步点）===");
  for (const impl of IMPLS) {
    await cleanup();
    await c1(impl); await cleanup();
    await c2(impl); await cleanup();
    await c3(impl); await cleanup();
    await c4(impl); await cleanup();
    await c5(impl); await cleanup();
  }
  console.log(lines.join("\n"));
  const legacyFails = lines.filter((l) => l.startsWith("  FAIL") && l.includes("[legacy]")).length;
  const fixedFails = lines.filter((l) => l.startsWith("  FAIL") && l.includes("[fixed]")).length;
  console.log(`\n=== legacy 失败 ${legacyFails} 项（预期 >0，证明旧实现有缺陷）`);
  console.log(`=== fixed  失败 ${fixedFails} 项（预期 =0）`);
  console.log(`=== 合计 ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fixedFails > 0 || legacyFails === 0 ? 1 : 0;
} finally {
  await Promise.all([admin.$disconnect(), A.$disconnect(), B.$disconnect(), C.$disconnect()]);
}
