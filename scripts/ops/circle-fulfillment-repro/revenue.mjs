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
 * 2026-09-18 追加（占位行财务影响核查后的修正，见交付说明 §3.5b）：
 *   R7 退款冲正在「入圈 + 续费」两笔收益并存时，取的是**被退那一笔**
 *   R8 存量 0 元 circle_join 行不得被回落查询选中（否则圈主分成按 0 追回）
 *   R9 收益服务故障时**不留 0 元行**，对账补记后金额正确且只有一条
 *   R10 客户端 confirm-join 与支付后处理器跨入口不双记（唯一约束是唯一挡板）
 *   R11 历史行无 orderId 且多条候选时：能消歧就消歧，消不掉**转人工**而不是猜最新一条
 *   R12 收益失败→对账补记后，金额确实出现在**圈主看得到的那两个接口**里（最终到账）
 *
 * 只对本机隔离测试库运行，合成数据 `rev-` 前缀。不连生产、不动真实订单。
 */

import { createRequire } from "node:module";
import { loadCandidatePrisma } from "../prisma-candidate/client.mjs";

const SERVER_DIR = process.env.REPRO_SERVER_DIR || "D:/gx-deploy-91/apps/server";
const req = createRequire(`${SERVER_DIR.replace(/\/?$/, "/")}package.json`);
// Prisma 客户端走**独立生成**的候选产物，不碰共享 node_modules。
// loadCandidatePrisma() 同时接管进程内 `@prisma/client` 的解析，
// 让 ts-node 加载的被测源码也拿到同一份 —— 否则源码里的
// `instanceof Prisma.PrismaClientKnownRequestError` 会跨模块实例恒为 false。
const { PrismaClient, resolved: PRISMA_CLIENT_PATH } = loadCandidatePrisma();
// 硬门禁：拿错客户端就直接停，不让验证在「看起来通过」的状态下跑完。
if (!PRISMA_CLIENT_PATH.includes(".prisma-candidate")) {
  throw new Error(`拒绝运行：加载的不是候选 Prisma 客户端（${PRISMA_CLIENT_PATH}）`);
}

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
const { CircleRefundService } = req(`${ROOT}/modules/circle-refund/circle-refund.service.ts`);

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
    await prisma.$executeRawUnsafe(`DELETE FROM "CommissionRecall" WHERE "userId" LIKE $1`, `${p}%`);
    await prisma.$executeRawUnsafe(`DELETE FROM "UserBalanceTransaction" WHERE "userId" LIKE $1`, `${p}%`);
    await prisma.$executeRawUnsafe(`DELETE FROM "UserWallet" WHERE "userId" LIKE $1`, `${p}%`);
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
  // 改为单段式后，失败留下的是「没有行」而不是 0 元占位行。
  // 0 元行会被退款冲正的回落查询选中并把圈主分成读成 0，见 R8。
  check("R4 失败后不留 0 元占位行", mid.length === 0,
    mid.map((r) => `amount=${Number(r.amount)}`).join(",") || "（无行）");

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
  await prisma.circleRevenueRecord.deleteMany({ where: { orderId: f.order.id } }); // 单段式下本就无行，再删一次确保起点干净
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

/** 改动前 circle-refund.service.ts 用的原始取值 SQL，保留用于反证 */
const legacyRecallQuery = (memberId) => prisma.$queryRawUnsafe(
  `SELECT "ownerShare" FROM "CircleRevenueRecord" WHERE "sourceId"=$1 AND "type"='circle_join' ORDER BY "createdAt" DESC LIMIT 1`,
  memberId,
);

/** 履约一笔订单并返回其收益行（复用真实入口） */
async function fulfillOrder(orderId) {
  const pay = makePaymentService();
  await makeLifecycle(pay).adminPayOrder(orderId, `${RUN}-manual-${orderId.slice(-6)}`, `${RUN}-op`);
  return prisma.circleRevenueRecord.findUnique({
    where: { type_orderId: { type: CIRCLE_REVENUE_TYPE, orderId } },
  });
}

/** 造一笔同圈同人的续费订单 */
async function renewOrder(f, payAmount) {
  return prisma.order.create({
    data: {
      userId: f.user, type: "CIRCLE_RENEW", targetId: f.circle, quantity: 1,
      amount: payAmount, payAmount, status: "PENDING", payMethod: "WECHAT",
      payTransactionId: `${RUN}-tx-renew-${Date.now().toString(36)}`,
    },
  });
}

/** 直接跑真实退款执行体（私有方法，运行时可调用；不依赖 CircleRefundRequest 行） */
async function runRefund({ circleId, userId, orderId, paidAmount, actualRefund }) {
  const svc = new CircleRefundService(prisma); // 不注入 commissionService → 跳过站长佣金追回
  await svc.executeRefund({
    id: `${RUN}-refund-${Date.now().toString(36)}`,
    circleId, userId, orderId, paidAmount, actualRefund,
  });
}

/**
 * R7 入圈 + 续费两笔收益并存时，退款冲正必须取**被退那一笔**。
 *
 * 原实现取的是「该成员最新一条 circle_join」。在圈子订单履约补齐之前，续费根本不产生
 * 收益行，这个偏差撞不上；履约补齐后会。
 */
async function r7() {
  const f = await fixture();
  const joinRev = await fulfillOrder(f.order.id);          // 199
  const ro = await renewOrder(f, 99);
  const renewRev = await fulfillOrder(ro.id);              // 99，createdAt 更晚

  check("R7 前置：入圈与续费各记一条收益，金额不同",
    !!joinRev && !!renewRev && Number(joinRev.amount) === 199 && Number(renewRev.amount) === 99,
    `join=${joinRev?.amount} renew=${renewRev?.amount}`);
  const joinOwner = Number(joinRev.ownerShare);
  const renewOwner = Number(renewRev.ownerShare);
  check("R7 前置：两笔圈主分成确实不同（否则这条断言没有区分力）",
    Math.abs(joinOwner - renewOwner) > 0.01, `join=${joinOwner} renew=${renewOwner}`);

  // 反证：同一份数据上，改动前的原始 SQL 取到的是续费那一笔（少追回 joinOwner-renewOwner）
  const mForLegacy = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: f.circle, userId: f.user } },
  });
  const legacy7 = await legacyRecallQuery(mForLegacy.id);
  check("R7 反证：旧 SQL 在同一份数据上确实取错（取到续费那笔）",
    legacy7.length === 1 && Math.abs(Number(legacy7[0].ownerShare) - renewOwner) < 0.01,
    `旧 SQL=${legacy7[0]?.ownerShare} 被退那笔应为=${joinOwner}`);

  // 退的是入圈那一笔
  await runRefund({ circleId: f.circle, userId: f.user, orderId: f.order.id, paidAmount: 199, actualRefund: 150 });

  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R7 退款产生一条冲正记录", refundRows.length === 1, `条数=${refundRows.length}`);
  check("R7 冲正取的是被退订单的分成，不是最新那笔",
    refundRows.length === 1 && Math.abs(Number(refundRows[0].ownerShare) + joinOwner) < 0.01,
    `冲正=${refundRows[0]?.ownerShare} 应为=${-joinOwner}（若取最新会是 ${-renewOwner}）`);
}

/**
 * R8 存量 0 元 circle_join 行不得被回落查询选中。
 *
 * 场景：退款申请没有 orderId（该字段可空，历史数据大量为空）→ 走回落查询。
 * 若回落不过滤 amount>0，就会选中 0 元行，圈主分成按 0 追回，而用户已全额退款。
 */
async function r8() {
  const f = await fixture();
  const joinRev = await fulfillOrder(f.order.id);
  const m = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: f.circle, userId: f.user } },
  });
  // 手工插入一条更晚的 0 元行，模拟早先两段式版本遗留的占位行
  await prisma.circleRevenueRecord.create({
    data: {
      circleId: f.circle, type: CIRCLE_REVENUE_TYPE, sourceId: m.id, orderId: null,
      amount: 0, platformFee: 0, ownerShare: 0, splitRate: 0,
      createdAt: new Date(Date.now() + 60_000),
    },
  });
  const joinOwner = Number(joinRev.ownerShare);

  // 反证：改动前的原始 SQL 不过滤金额，会选中那条 0 元行 → 圈主分成一分追不回
  const legacy8 = await legacyRecallQuery(m.id);
  check("R8 反证：旧 SQL 在同一份数据上取到 0 元行",
    legacy8.length === 1 && Number(legacy8[0].ownerShare) === 0,
    `旧 SQL=${legacy8[0]?.ownerShare} 真实分成应为=${joinOwner}`);

  // orderId 传 null → 强制走回落查询
  await runRefund({ circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150 });

  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R8 回落查询跳过 0 元行，仍追回真实分成",
    refundRows.length === 1 && Math.abs(Number(refundRows[0].ownerShare) + joinOwner) < 0.01,
    `冲正=${refundRows[0]?.ownerShare} 应为=${-joinOwner}（不过滤会是 0）`);
  const recall = await prisma.$queryRawUnsafe(
    `SELECT "amount" FROM "CommissionRecall" WHERE "refundId" LIKE $1`, `${RUN}-refund-%`,
  );
  check("R8 圈主追回台账金额同样非零",
    recall.length >= 1 && Math.abs(Number(recall[0].amount) + joinOwner) < 0.01,
    `台账=${recall[0]?.amount}`);
}

/** R9 单段式：收益服务故障时一行都不写，对账后恰好一条且金额正确 */
async function r9() {
  const f = await fixture({ status: "PAID" });
  const broken = makeCommission();
  broken.resolveCircleRevenueSplit = async () => { throw new Error("模拟收益服务故障"); };
  await makePaymentService({ commission: broken }).retryCircleFulfillmentForOrder(f.order.id);
  const mid = await revRows(f.circle);
  check("R9 故障时不写任何收益行（不留 0 元残留）", mid.length === 0, `记录数=${mid.length}`);

  const pay = makePaymentService();
  await pay.reconcileCircleRevenue(new Date(Date.now() - 3600_000), new Date(Date.now() + 3600_000), 50);
  const after = await revRows(f.circle);
  check("R9 对账后恰好一条且金额正确",
    after.length === 1 && Number(after[0].amount) === 199 && Number(after[0].ownerShare) > 0,
    after.map((r) => `${Number(r.amount)}/${Number(r.ownerShare)}`).join(","));
}

/**
 * R10 跨入口不双记。
 *
 * 客户端付完款仍会调 confirm-join，那条路径也会记一次圈子收益。两边各自的幂等判断
 * 依据的都是「成员是否存在 / 订单是否 COMPLETED」这类读到即过期的状态，交错执行时挡不住。
 * 现在两边都传 orderId，由 `(type, orderId)` 唯一约束在数据库层互斥。
 */
async function r10() {
  const f = await fixture();
  await fulfillOrder(f.order.id); // 支付后处理器先记
  const m = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: f.circle, userId: f.user } },
  });

  // confirm-join 路径用的就是这个调用（circle-membership.service.ts 现在传第 5 个参数）
  let blocked = false;
  try {
    await makeCommission().recordCircleRevenue(f.circle, CIRCLE_REVENUE_TYPE, m.id, 199, f.order.id);
  } catch { blocked = true; }
  const rows = await revRows(f.circle);
  check("R10 confirm-join 路径重复记账被唯一约束拦下", blocked, blocked ? "已拦下" : "竟然写进去了");
  check("R10 同一订单最终只有一条收益", rows.length === 1, `记录数=${rows.length}`);

  // 反证：不传 orderId 就拦不住（说明这个参数是必要的，不是装饰）
  await makeCommission().recordCircleRevenue(f.circle, CIRCLE_REVENUE_TYPE, m.id, 199);
  const rows2 = await revRows(f.circle);
  check("R10 反证：不传 orderId 则唯一约束不生效（orderId=NULL 不受约束）", rows2.length === 2,
    `记录数=${rows2.length}`);
}

/** 读取本次退款写下的追回台账 */
async function recallRows(refundPrefix) {
  return prisma.$queryRawUnsafe(
    `SELECT "amount","status" FROM "CommissionRecall" WHERE "refundId" LIKE $1 ORDER BY "createdAt" DESC`,
    `${refundPrefix}%`,
  );
}

/**
 * R11 无 orderId 的历史退款、且成员名下有多条候选收益时的处理。
 *
 * 规则：能靠金额唯一对上就用它；对不上（或对上多条）就**不取值**，
 * 写一条 `status='pending_manual'` 的追回台账转人工，绝不猜「最新一条」。
 */
async function r11() {
  // ── R11a 两条候选、金额可区分 → 仍能自动判定 ──
  {
    const f = await fixture();
    const joinRev = await fulfillOrder(f.order.id);   // 199
    const ro = await renewOrder(f, 99);
    await fulfillOrder(ro.id);                        // 99
    const joinOwner = Number(joinRev.ownerShare);

    await runRefund({ circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150 });
    const refundRows = await prisma.circleRevenueRecord.findMany({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R11a 两条候选但金额可唯一对上 → 按该笔追回",
      refundRows.length === 1 && Math.abs(Number(refundRows[0].ownerShare) + joinOwner) < 0.01,
      `冲正=${refundRows[0]?.ownerShare} 期望=${-joinOwner}`);
  }

  // ── R11b 两条候选、金额相同 → 消歧失败，转人工 ──
  {
    const f = await fixture();
    await fulfillOrder(f.order.id);                   // 199
    const ro = await renewOrder(f, 199);
    await fulfillOrder(ro.id);                        // 199，与上一笔同额
    const before = await revRows(f.circle);
    check("R11b 前置：两条同额候选收益", before.length === 2,
      before.map((r) => Number(r.amount)).join("/"));

    const tag = `${RUN}-amb`;
    const svc = new CircleRefundService(prisma);
    await svc.executeRefund({
      id: `${tag}-1`, circleId: f.circle, userId: f.user,
      orderId: null, paidAmount: 199, actualRefund: 150,
    });

    const refundRows = await prisma.circleRevenueRecord.findMany({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R11b 消歧失败时不写任何冲正行（不拿猜出来的数字改账）", refundRows.length === 0,
      `冲正行数=${refundRows.length}`);

    const recalls = await recallRows(tag);
    check("R11b 留下一条 pending_manual 追回台账（人工核对入口）",
      recalls.length === 1 && recalls[0].status === "pending_manual" && Number(recalls[0].amount) === 0,
      JSON.stringify(recalls));

    // 用户那一侧照退，不因账务存疑而卡住用户的钱
    const wallet = await prisma.$queryRawUnsafe(
      `SELECT "balance" FROM "UserWallet" WHERE "userId"=$1`, f.user,
    );
    check("R11b 用户退款照常到账（不因账务存疑而扣住用户的钱）",
      wallet.length === 1 && Math.abs(Number(wallet[0].balance) - 150) < 0.01,
      `余额=${wallet[0]?.balance}`);

    // 成员身份仍然失效（退款该有的效果不受影响）
    const m = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: f.circle, userId: f.user } },
    });
    check("R11b 成员身份仍然失效", !m, m ? "仍是成员（错误）" : "已移除");
  }
}

/**
 * R12 「最终到账」：收益服务失败后，对账补记的金额必须真的出现在**圈主看得到的接口**里。
 *
 * 只证明「库里有一条金额正确的行」是不够的 —— 要证明它走到了圈主收益汇总与明细。
 * 注：`CircleRevenueRecord.settled` 在当前源码里**没有任何写入方**，
 * 所以 `settledAmount` 恒为 0；圈子收益是台账口径，不存在独立的打款环节。
 * 「到账」在本系统中的终态就是这两个接口能看到金额（见交付说明 §3.5c）。
 */
async function r12() {
  const f = await fixture({ status: "PAID" });
  const broken = makeCommission();
  broken.resolveCircleRevenueSplit = async () => { throw new Error("模拟收益服务故障"); };
  await makePaymentService({ commission: broken }).retryCircleFulfillmentForOrder(f.order.id);

  const commission = makeCommission();
  const before = await commission.getCircleRevenueSummary(f.circle);
  check("R12 失败后圈主汇总为 0（确实没记上）",
    Number(before.totalOwnerShare) === 0 && before.totalRecords === 0,
    `owner=${before.totalOwnerShare} 条数=${before.totalRecords}`);

  await makePaymentService().reconcileCircleRevenue(
    new Date(Date.now() - 3600_000), new Date(Date.now() + 3600_000), 50);

  const after = await commission.getCircleRevenueSummary(f.circle);
  check("R12 对账后圈主汇总出现金额（最终到账）",
    Number(after.totalAmount) === 199 && Number(after.totalOwnerShare) > 0 && after.totalRecords === 1,
    `amount=${after.totalAmount} owner=${after.totalOwnerShare} 条数=${after.totalRecords}`);

  const list = await commission.getCircleRevenueRecords(f.circle, 1, 20);
  check("R12 圈主收益明细也能看到该笔",
    list.total === 1 && Number(list.records[0].amount) === 199 && list.records[0].orderId === f.order.id,
    `total=${list.total} amount=${list.records[0]?.amount} orderId=${list.records[0]?.orderId}`);

  check("R12 已结算金额仍为 0（settled 无写入方，属台账口径，不是漏到账）",
    Number(after.settledAmount) === 0, `settled=${after.settledAmount}`);
}

// ─────────────────────────── 主流程 ───────────────────────────
try {
  console.log("=== 圈子履约 · 收益与真实入口验证 ===");
  await cleanup();
  await r1(); await r2(); await r3(); await r4(); await r5(); await r6();
  await r7(); await r8(); await r9(); await r10(); await r11(); await r12();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await Promise.all([prisma.$disconnect(), prismaB.$disconnect()]);
}
