#!/usr/bin/env node
/**
 * 圈子履约 · 收益与真实入口验证（本轮新增，只覆盖本轮问题）
 *
 * 针对上一轮审核指出的四类缺口：
 *   R1 真实 `ShopOrderLifecycleService.adminPayOrder` 入口完成履约 + 缓存 + 收益
 *      （不手动补调生产路径不存在的方法）
 *   R2 事务回滚后不产生收益，也不留下可被消费的结果
 *   R3 同单并发：收益任务不丢失、不重复入账
 *   R4 收益服务首次失败后可恢复，最终只记一次
 *   R5 退款与延迟收益处理交错：退款后不再新增收益
 *   R6 用**真实 CommissionService** 验证记账与退款关联（看数据库结果，不看调用次数）
 *
 * 只对本机隔离测试库运行，合成数据 `rev-` 前缀。不连生产、不动真实订单。
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

req("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", target: "es2022", experimentalDecorators: true, emitDecoratorMetadata: true },
});
const ROOT = process.env.REPRO_SRC_ROOT ||
  "D:/gx-deploy-91/.worktrees/entitlement-audit-20260918/apps/server/src";
const { ShopPaymentService } = req(`${ROOT}/modules/shop/shop-payment.service.ts`);
const { ShopOrderLifecycleService } = req(`${ROOT}/modules/shop/shop-order-lifecycle.service.ts`);
const { CommissionService } = req(`${ROOT}/modules/commission/commission.service.ts`);
const { CIRCLE_REVENUE_TYPE } = req(`${ROOT}/modules/shop/circle-fulfillment.ts`);

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });
const prismaB = new PrismaClient({ datasources: { db: { url: args.dsn } } });

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 桩（只替真正的外部副作用；佣金用真实服务）──
const cacheDeleted = [];
const redisStub = {
  del: async (k) => { cacheDeleted.push(k); },
  getJson: async () => null, setJson: async () => {}, get: async () => null, set: async () => {},
  setNX: async () => true, delByPattern: async (p) => { cacheDeleted.push(`pattern:${p}`); },
  runExclusive: async (_k, _t, fn) => fn(), getClient: () => null,
};
const noop = new Proxy({}, { get: () => async () => undefined });

/** 真实 CommissionService（settlement 等可选依赖留空，圈子分成路径用不到） */
function makeCommission(client = prisma) {
  // 构造签名：(prisma, webhook, redis, ...可选)
  return new CommissionService(client, noop, redisStub);
}

function makePaymentService({ commission, client = prisma } = {}) {
  return new ShopPaymentService(
    client, redisStub, noop, noop, noop, noop, noop, noop, noop,
    { invalidateOrderCache: async () => {}, settleGroupBuyIfNeeded: async () => {}, getOrder: async () => null },
    undefined, commission ?? makeCommission(client), undefined,
  );
}

/** 真实 ShopOrderLifecycleService（管理员确认收款入口） */
function makeLifecycle(paymentSvc, client = prisma) {
  // 构造签名：(prisma, redis, attribution, orderSvc, paymentSvc)
  return new ShopOrderLifecycleService(
    client,
    redisStub,
    { recordOrderCommissionAndFee: async () => {}, recordOrderPlatformFee: async () => {} },
    { invalidateOrderCache: async () => {}, settleGroupBuyIfNeeded: async () => {} },
    paymentSvc,
  );
}

// ── 夹具 ──
const RUN = `rev-${Date.now().toString(36)}`;
let seq = 0;
async function cleanup() {
  for (const p of ["rev-"]) {
    await prisma.circleRevenueRecord.deleteMany({ where: { circleId: { startsWith: p } } });
    await prisma.order.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.circleMember.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.circle.deleteMany({ where: { ownerId: { startsWith: p } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: p } } });
  }
}
async function fixture({ status = "PENDING", type = "CIRCLE_JOIN" } = {}) {
  const n = ++seq;
  const owner = `${RUN}-own${n}`, user = `${RUN}-u${n}`, circle = `${RUN}-c${n}`;
  await prisma.user.createMany({ data: [{ id: owner, nickname: `圈主${n}` }, { id: user, nickname: `用户${n}` }] });
  await prisma.circle.create({
    data: { id: circle, name: `收益圈${n}`, intro: "收益验证", ownerId: owner, type: "YEARLY", price: 199, status: "ACTIVE" },
  });
  const order = await prisma.order.create({
    data: {
      userId: user, type, targetId: circle, quantity: 1, amount: 199, payAmount: 199,
      status, payMethod: "WECHAT", payTransactionId: `${RUN}-tx${n}`,
      ...(status === "PENDING" ? {} : { paidAt: new Date() }),
    },
  });
  return { owner, user, circle, order };
}
const revRows = (circleId) =>
  prisma.circleRevenueRecord.findMany({ where: { circleId }, orderBy: { createdAt: "asc" } });

// ─────────────────────────── 场景 ───────────────────────────

/** R1 真实管理员确认收款入口 */
async function r1() {
  cacheDeleted.length = 0;
  const f = await fixture();
  const pay = makePaymentService();
  const lifecycle = makeLifecycle(pay);
  await lifecycle.adminPayOrder(f.order.id, `${RUN}-manual-1`, `${RUN}-op`);

  const [m, o, rows] = await Promise.all([
    prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } }),
    prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true, payMethod: true } }),
    revRows(f.circle),
  ]);
  check("R1 真实 adminPayOrder 完成入圈", !!m, m ? "已入圈" : "未入圈");
  check("R1 订单被认领为 COMPLETED", o.status === "COMPLETED", `${o.status}/${o.payMethod}`);
  check("R1 真实入口做了缓存失效（未手工补调）",
    cacheDeleted.includes(`circles:member:${f.circle}:${f.user}`) && cacheDeleted.includes(`circles:detail:${f.circle}`),
    cacheDeleted.join(",") || "（空）");
  check("R1 真实入口记了收益且金额正确", rows.length === 1 && Number(rows[0].amount) === 199,
    JSON.stringify(rows.map((r) => ({ amount: Number(r.amount), orderId: r.orderId, sourceId: r.sourceId }))));
  check("R1 收益 orderId=订单 id、sourceId=成员 id（两把钥匙各司其职）",
    rows[0]?.orderId === f.order.id && rows[0]?.sourceId === m?.id,
    `orderId=${rows[0]?.orderId} sourceId=${rows[0]?.sourceId} memberId=${m?.id}`);
}

/** R2 事务回滚后不产生收益 */
async function r2() {
  const f = await fixture({ status: "PAID" });
  const pay = makePaymentService();
  let threw = false;
  try {
    await prisma.$transaction(async (tx) => {
      const o = await tx.order.findUnique({ where: { id: f.order.id } });
      await pay.runPaidPostProcessors(o, tx);
      throw new Error("模拟提交前失败");
    });
  } catch { threw = true; }
  const [m, o, rows] = await Promise.all([
    prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } }),
    prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } }),
    revRows(f.circle),
  ]);
  check("R2 回滚后无成员、订单仍 PAID", threw && !m && o.status === "PAID", `threw=${threw} member=${!!m} status=${o.status}`);
  check("R2 回滚后无任何收益记录", rows.length === 0, `记录数=${rows.length}`);
  // 回滚不得留下可被消费的结果：随后单独调收尾（模拟误用）也不应凭空记账
  await pay.settleCircleAfterCommit({ id: f.order.id, userId: f.user, targetId: f.circle, payAmount: 199, amount: 199 });
  const after = await revRows(f.circle);
  check("R2 回滚后再调收尾也不产生收益（无残留结果可消费）", after.length === 0, `记录数=${after.length}`);
}

/** R3 同单并发：不丢失、不重复入账 */
async function r3() {
  const f = await fixture({ status: "PAID" });
  const payA = makePaymentService({ client: prisma });
  const payB = makePaymentService({ client: prismaB, commission: makeCommission(prismaB) });
  const results = await Promise.allSettled([
    payA.retryCircleFulfillmentForOrder(f.order.id),
    new Promise((r) => setTimeout(r, 30)).then(() => payB.retryCircleFulfillmentForOrder(f.order.id)),
  ]);
  const rows = await revRows(f.circle);
  const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  check("R3 同单并发只入账一次", rows.length === 1, `记录数=${rows.length} 结果=${results.map((x) => x.status === "fulfilled" ? x.value.outcome : "rejected").join(",")}`);
  check("R3 同单并发收益未丢失且金额正确", rows.length === 1 && Number(rows[0].amount) === 199,
    rows.map((r) => Number(r.amount)).join(","));
  check("R3 同单并发只建一个成员", !!m, m ? "1" : "0");
}

/** R4 收益服务首次失败 → 可恢复，最终只记一次 */
async function r4() {
  const f = await fixture({ status: "PAID" });
  // 第一次：让分成解析抛错，模拟收益服务故障
  const brokenCommission = makeCommission();
  brokenCommission.resolveCircleRevenueSplit = async () => { throw new Error("模拟收益服务故障"); };
  const pay1 = makePaymentService({ commission: brokenCommission });
  await pay1.retryCircleFulfillmentForOrder(f.order.id);

  const mid = await revRows(f.circle);
  const o1 = await prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } });
  check("R4 收益失败不影响履约本身", o1.status === "COMPLETED", o1.status);
  check("R4 失败后留下占位行（挡住并发，等待补算）", mid.length === 1 && Number(mid[0].amount) === 0,
    mid.map((r) => `amount=${Number(r.amount)}`).join(","));

  // 恢复：用真实 CommissionService 跑对账补齐
  const pay2 = makePaymentService();
  const rec = await pay2.reconcileCircleRevenue(new Date(Date.now() - 3600_000), new Date(Date.now() + 3600_000), 50);
  const after = await revRows(f.circle);
  check("R4 对账补齐后金额正确", after.length === 1 && Number(after[0].amount) === 199,
    `${after.map((r) => Number(r.amount)).join(",")} rec=${JSON.stringify(rec)}`);
  check("R4 最终只有一条收益（不重复入账）", after.length === 1, `记录数=${after.length}`);
  // 再跑一次对账，必须不产生新行
  await pay2.reconcileCircleRevenue(new Date(Date.now() - 3600_000), new Date(Date.now() + 3600_000), 50);
  const again = await revRows(f.circle);
  check("R4 重复对账不新增收益", again.length === 1, `记录数=${again.length}`);
}

/** R5 退款与延迟收益处理交错：退款后不再新增收益 */
async function r5() {
  const f = await fixture({ status: "PAID" });
  // 履约成功但收益服务故障 → 没有收益行
  const broken = makeCommission();
  broken.resolveCircleRevenueSplit = async () => { throw new Error("模拟收益服务故障"); };
  const pay1 = makePaymentService({ commission: broken });
  await pay1.retryCircleFulfillmentForOrder(f.order.id);
  await prisma.circleRevenueRecord.deleteMany({ where: { orderId: f.order.id } }); // 模拟连占位行都没写成
  // 退款
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: f.order.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
    await tx.circleMember.deleteMany({ where: { circleId: f.circle, userId: f.user } });
  });
  // 延迟的收益处理此刻才跑
  const pay2 = makePaymentService();
  const rec = await pay2.reconcileCircleRevenue(new Date(Date.now() - 3600_000), new Date(Date.now() + 3600_000), 50);
  const rows = await revRows(f.circle);
  check("R5 退款后延迟对账不新增收益", rows.length === 0, `记录数=${rows.length} rec=${JSON.stringify(rec)}`);
  // 直接调收尾也不行（订单已退款，履约结果本身就是 skipped）
  const r = await pay2.retryCircleFulfillmentForOrder(f.order.id);
  const rows2 = await revRows(f.circle);
  check("R5 退款后再补履约也不产生收益", rows2.length === 0 && r.outcome === "skipped",
    `记录数=${rows2.length} outcome=${r.outcome}`);
}

/** R6 真实 CommissionService：分成金额与退款追回关联（看数据库结果） */
async function r6() {
  const f = await fixture();
  const pay = makePaymentService();
  const lifecycle = makeLifecycle(pay);
  await lifecycle.adminPayOrder(f.order.id, `${RUN}-manual-6`, `${RUN}-op`);
  const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  const rows = await revRows(f.circle);
  const rec = rows[0];
  const sumOk = rec && Math.abs(Number(rec.platformFee) + Number(rec.ownerShare) - Number(rec.amount)) < 0.01;
  check("R6 真实分成：平台抽成 + 圈主实得 = 金额", !!sumOk,
    rec ? `amount=${rec.amount} fee=${rec.platformFee} owner=${rec.ownerShare} rate=${rec.splitRate}` : "无记录");
  check("R6 分成比例落在 (0,1]", rec && Number(rec.splitRate) > 0 && Number(rec.splitRate) <= 1,
    `splitRate=${rec?.splitRate}`);
  // 退款追回用的原始查询（circle-refund.service.ts:229-231）
  const recall = await prisma.$queryRawUnsafe(
    `SELECT "ownerShare" FROM "CircleRevenueRecord" WHERE "sourceId"=$1 AND "type"=$2 ORDER BY "createdAt" DESC LIMIT 1`,
    m.id, CIRCLE_REVENUE_TYPE,
  );
  check("R6 退款追回原始查询能拿到圈主分成", recall.length === 1 && Number(recall[0].ownerShare) > 0,
    `命中=${recall.length} ownerShare=${recall[0]?.ownerShare}`);
  // 订单级唯一约束确实存在（不是靠代码自觉）
  let dupBlocked = false;
  try {
    await prisma.circleRevenueRecord.create({
      data: { circleId: f.circle, type: CIRCLE_REVENUE_TYPE, sourceId: m.id, orderId: f.order.id,
        amount: 1, platformFee: 0, ownerShare: 1, splitRate: 1 },
    });
  } catch { dupBlocked = true; }
  check("R6 (type, orderId) 唯一约束由数据库强制", dupBlocked, dupBlocked ? "重复插入被拒" : "竟然插入成功");
}

// ─────────────────────────── 主流程 ───────────────────────────
try {
  console.log("=== 圈子履约 · 收益与真实入口验证 ===");
  await cleanup();
  await r1(); await r2(); await r3(); await r4(); await r5(); await r6();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await Promise.all([prisma.$disconnect(), prismaB.$disconnect()]);
}
