#!/usr/bin/env node
/**
 * 圈子付费履约风险 · 隔离库复现与回归
 *
 * 只对**本机独立测试集群**运行（端口由 --dsn 指定），全部数据 `rep-` 前缀合成。
 * 不连接生产、不创建真实订单、不调用真实支付、不自动补发真实权益。
 *
 * 场景（与评审要求一一对应）：
 *   S1 支付成功后用户立即关页 —— 仍能完成入圈
 *   S2 同一支付通知重复 / 并发到达 —— 不重复增加权益或续期
 *   S3 履约暂时失败后可安全重试
 *   S4 续费订单创建后成员到期被清理 —— 仍按明确规则履约
 *   S5 退款与履约并发 —— 不恢复已撤销的权益
 *   S6 已支付未履约订单不会诱导用户再次付款
 *
 * 用法：
 *   node repro.mjs --dsn=postgresql://user@127.0.0.1:55432/db [--mode=before|after]
 *     before = 复现当前主线行为（不加载修复候选）
 *     after  = 加载修复候选后回归
 */

import { createRequire } from "node:module";

// 工作树没有 node_modules；从主工作区的 apps/server 解析已生成的 Prisma Client。
// 仅做模块解析，不读取也不写入主工作区的任何业务文件。
const SERVER_DIR = process.env.REPRO_SERVER_DIR || "D:/gx-deploy-91/apps/server";
const req = createRequire(`${SERVER_DIR.replace(/\/?$/, "/")}package.json`);
const { PrismaClient } = req("@prisma/client");

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.join("=") || true];
  }),
);
if (!args.dsn) {
  console.error("必须提供 --dsn（仅限本机隔离测试库）");
  process.exit(64);
}
if (/:[^/@]*@/.test(args.dsn)) {
  console.error("连接串不得包含口令");
  process.exit(64);
}
const host = new URL(args.dsn).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`拒绝连接非本机主机 ${host}`);
  process.exit(64);
}
const MODE = args.mode === "after" ? "after" : "before";

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });
const DAY = 86_400_000;

let pass = 0;
let fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1;
  else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 被测履约逻辑 ──────────────────────────────────────────────
// before：模拟当前主线 —— 支付后处理器里没有圈子，履约只发生在用户态接口被调用时。
// after ：加载修复候选（与服务端 paidPostProcessors 调用的是同一份实现）。
let fulfillCircleOrderTx = null;
let findReusablePaidOrder = null;
if (MODE === "after") {
  // 直接加载**应用里的真实 TS 实现**（唯一实现，不做 .mjs 副本），用 ts-node 转译。
  req("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "commonjs", target: "es2022" },
  });
  const mod = req(
    (process.env.REPRO_FIX_PATH ||
      "D:/gx-deploy-91/.worktrees/entitlement-audit-20260918/apps/server/src/modules/shop/circle-fulfillment.ts"),
  );
  fulfillCircleOrderTx = mod.fulfillCircleOrderTx;
  findReusablePaidOrder = mod.findReusablePaidOrder;
}

/** 模拟支付回调：把订单翻 PAID，并在同一事务内跑支付后处理器 */
async function simulatePaymentCallback(orderId, { failFulfillment = false } = {}) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), payAmount: 199 },
    });
    if (updated.count === 0) return { applied: false, reason: "订单状态已变更" };
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (MODE === "after" && (order.type === "CIRCLE_JOIN" || order.type === "CIRCLE_RENEW")) {
      if (failFulfillment) throw new Error("模拟履约失败");
      await fulfillCircleOrderTx(tx, order);
    }
    return { applied: true };
  });
}

/** 模拟补偿重试入口：对已 PAID 但未履约的订单再跑一次履约（不改支付状态） */
async function simulateRetry(orderId) {
  if (MODE !== "after") return { retried: false };
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || !["PAID", "SHIPPED"].includes(order.status)) return { retried: false };
    await fulfillCircleOrderTx(tx, order);
    return { retried: true };
  });
}

/** 模拟 prepareJoin 的准入判断（当前主线：只看有效成员，不看未履约订单） */
async function simulatePrepareJoin(circleId, userId) {
  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (member && (!member.expireAt || member.expireAt > new Date())) {
    return { blocked: true, reason: "CIRCLE_MEMBER_EXISTS" };
  }
  if (MODE === "after") {
    const reusable = await findReusablePaidOrder(prisma, circleId, userId);
    if (reusable) return { blocked: true, reason: "PAID_ORDER_PENDING_FULFILLMENT", orderId: reusable.id };
  }
  const order = await prisma.order.create({
    data: {
      userId, type: "CIRCLE_JOIN", targetId: circleId,
      amount: 199, status: "PENDING", payMethod: "WECHAT",
    },
  });
  return { blocked: false, orderId: order.id };
}

/** 模拟 cleanupExpiredMembers（每日 3 点，硬删过期成员） */
async function simulateCleanup() {
  const expired = await prisma.circleMember.findMany({
    where: { expireAt: { lt: new Date() }, role: { not: "OWNER" } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;
  await prisma.circleMember.deleteMany({ where: { id: { in: expired.map((m) => m.id) } } });
  return expired.length;
}

/** 模拟退款：撤销权益并把订单置 REFUNDED（与 shop-refund 同事务语义） */
async function simulateRefund(orderId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return false;
    await tx.order.update({
      where: { id: orderId },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });
    await tx.circleMember.deleteMany({
      where: { circleId: order.targetId, userId: order.userId },
    });
    return true;
  });
}

// ── 夹具 ──────────────────────────────────────────────────────
const RUN = `rep-${Date.now().toString(36)}`;
async function reset() {
  await prisma.order.deleteMany({ where: { userId: { startsWith: "rep-" } } });
  await prisma.circleMember.deleteMany({ where: { userId: { startsWith: "rep-" } } });
  await prisma.circle.deleteMany({ where: { ownerId: { startsWith: "rep-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "rep-" } } });
}
async function mkUser(id) {
  return prisma.user.create({ data: { id, nickname: `复现用户${id.slice(-4)}` } });
}
async function mkCircle(id, ownerId) {
  return prisma.circle.create({
    data: { id, name: `复现圈子${id.slice(-4)}`, intro: "隔离复现用", ownerId, type: "YEARLY", price: 199, status: "ACTIVE" },
  });
}

// ── 场景 ──────────────────────────────────────────────────────
async function run() {
  await reset();
  const owner = `${RUN}-owner`;
  await mkUser(owner);

  // S1 支付成功后用户立即关页
  {
    const u = `${RUN}-u1`; const c = `${RUN}-c1`;
    await mkUser(u); await mkCircle(c, owner);
    const { orderId } = await simulatePrepareJoin(c, u);
    await simulatePaymentCallback(orderId); // 用户随即关页，不调 confirm
    const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: c, userId: u } } });
    check("S1 支付成功后立即关页仍完成入圈", MODE === "after" ? !!m : !m,
      MODE === "after" ? (m ? "已入圈" : "仍未入圈") : `复现当前主线：member=${m ? "有" : "无"}（预期无）`);
  }

  // S2 同一支付通知重复 + 并发
  {
    const u = `${RUN}-u2`; const c = `${RUN}-c2`;
    await mkUser(u); await mkCircle(c, owner);
    const { orderId } = await simulatePrepareJoin(c, u);
    const r1 = await simulatePaymentCallback(orderId);
    const r2 = await simulatePaymentCallback(orderId); // 重复通知
    const results = await Promise.allSettled([simulatePaymentCallback(orderId), simulatePaymentCallback(orderId)]);
    const members = await prisma.circleMember.findMany({ where: { circleId: c, userId: u } });
    const circle = await prisma.circle.findUnique({ where: { id: c }, select: { memberCount: true } });
    check("S2 重复支付通知不重复履约", members.length <= 1, `member 行数=${members.length}`);
    check("S2 重复通知只生效一次", r1.applied === true && r2.applied === false, `r1=${r1.applied} r2=${r2.applied}`);
    check("S2 并发通知不产生额外履约", members.length <= 1 && (circle?.memberCount ?? 0) <= 1,
      `memberCount=${circle?.memberCount} settled=${results.map((x) => x.status).join(",")}`);
  }

  // S3 履约暂时失败后可安全重试
  {
    const u = `${RUN}-u3`; const c = `${RUN}-c3`;
    await mkUser(u); await mkCircle(c, owner);
    const { orderId } = await simulatePrepareJoin(c, u);
    let threw = false;
    try { await simulatePaymentCallback(orderId, { failFulfillment: true }); } catch { threw = true; }
    const afterFail = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    check("S3 履约失败时支付状态不被单独提交", MODE === "after" ? (threw && afterFail.status === "PENDING") : true,
      `threw=${threw} status=${afterFail.status}`);
    // 重新收到通知（渠道会重试）
    await simulatePaymentCallback(orderId);
    const m1 = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: c, userId: u } } });
    // 再走一次补偿重试，必须幂等
    await simulateRetry(orderId);
    const members = await prisma.circleMember.findMany({ where: { circleId: c, userId: u } });
    check("S3 重试后完成履约", MODE === "after" ? !!m1 : !m1, `member=${m1 ? "有" : "无"}`);
    check("S3 重试幂等不重复加权益", members.length <= 1, `member 行数=${members.length}`);
  }

  // S4 续费订单创建后成员到期被清理
  {
    const u = `${RUN}-u4`; const c = `${RUN}-c4`;
    await mkUser(u); await mkCircle(c, owner);
    await prisma.circleMember.create({
      data: { circleId: c, userId: u, role: "MEMBER", expireAt: new Date(Date.now() - 2 * DAY) },
    });
    const renew = await prisma.order.create({
      data: { userId: u, type: "CIRCLE_RENEW", targetId: c, amount: 199, quantity: 1, status: "PENDING", payMethod: "WECHAT" },
    });
    const deleted = await simulateCleanup(); // 成员被硬删
    await simulatePaymentCallback(renew.id);
    const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: c, userId: u } } });
    check("S4 成员被清理后续费仍能履约", MODE === "after" ? !!m : !m,
      `清理=${deleted} member=${m ? `有，到期=${m.expireAt?.toISOString().slice(0, 10)}` : "无"}`);
    if (MODE === "after" && m) {
      check("S4 重建成员后到期时间在未来", m.expireAt && m.expireAt > new Date(),
        `expireAt=${m.expireAt?.toISOString()}`);
    }
  }

  // S5 退款与履约并发
  {
    const u = `${RUN}-u5`; const c = `${RUN}-c5`;
    await mkUser(u); await mkCircle(c, owner);
    const { orderId } = await simulatePrepareJoin(c, u);
    await simulatePaymentCallback(orderId);
    await simulateRefund(orderId);
    // 退款后补偿重试再次尝试履约：不得复活
    await simulateRetry(orderId).catch(() => {});
    const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: c, userId: u } } });
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    check("S5 退款后重试不复活权益", !m, `member=${m ? "有（错误）" : "无"} orderStatus=${o.status}`);
  }

  // S6 已支付未履约订单不诱导再次付款
  {
    const u = `${RUN}-u6`; const c = `${RUN}-c6`;
    await mkUser(u); await mkCircle(c, owner);
    const first = await simulatePrepareJoin(c, u);
    // 只翻 PAID，不履约（before 模式天然如此；after 模式手动制造未履约态）
    await prisma.order.update({ where: { id: first.orderId }, data: { status: "PAID", paidAt: new Date(), payAmount: 199 } });
    const second = await simulatePrepareJoin(c, u);
    const pendingCount = await prisma.order.count({ where: { userId: u, type: "CIRCLE_JOIN", status: "PENDING" } });
    check("S6 已支付未履约时不再新建待支付单",
      MODE === "after" ? second.blocked === true && pendingCount === 0 : second.blocked === false,
      `blocked=${second.blocked} reason=${second.reason ?? "-"} 新 PENDING 单=${pendingCount}`);
  }

  await reset();
}

try {
  console.log(`=== 圈子付费履约复现（mode=${MODE}）===`);
  await run();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
} finally {
  await prisma.$disconnect();
}
process.exit(fail > 0 ? 1 : 0);
