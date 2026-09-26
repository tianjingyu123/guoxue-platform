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

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 被测源码与依赖一律按**本脚本自身所在的工作树**解析，不再硬编码到别的目录。
// 硬编码默认值是一个安静的陷阱：脚本被复制到新工作树后仍会去测旧工作树的源码，
// 结果全绿却与本候选无关。环境变量仍可覆盖，但默认值必须指向自己这棵树。
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SERVER_DIR = process.env.REPRO_SERVER_DIR || `${REPO_ROOT}/apps/server`;
const SRC_ROOT = process.env.REPRO_SRC_ROOT || `${SERVER_DIR}/src`;
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
const ROOT = SRC_ROOT;
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

let refundSeq = 0;

/**
 * 走**真实退款入口**跑一次退款：先落一条与生产同形的 `CircleRefundRequest`
 * （圈主已通过、平台待审），再调 `adminReview(approve=true)`。
 *
 * 早先版本直接调私有的 `executeRefund` 并传一个合成对象，绕过了退款申请行本身。
 * 那样测不到平台审核的 CAS，也测不到执行体入口的退款单行锁 —— 而这两处正是
 * 「同一次审核被重放」的唯一防线。用测试脚本手工补调，等于把真实入口的缺口盖住。
 */
async function makeRefundRequest({ circleId, userId, orderId, paidAmount, actualRefund }) {
  const id = `${RUN}-refund-${(++refundSeq).toString(36)}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CircleRefundRequest"
       ("id","circleId","userId","orderId","paidAmount","dailyCost","usedDays","refundBase",
        "feeRate","feeAmount","actualRefund","refundType","ownerStatus","adminStatus","refundStatus","updatedAt")
     VALUES ($1,$2,$3,$4,$5,0,0,$5,0.20,$6,$7,'normal','approved','pending','pending',CURRENT_TIMESTAMP)`,
    id, circleId, userId, orderId, paidAmount, paidAmount - actualRefund, actualRefund,
  );
  return id;
}

async function runRefund(params) {
  const id = await makeRefundRequest(params);
  // 不注入 commissionService → 跳过站长佣金追回（本文件只验圈主分成一侧）
  await new CircleRefundService(prisma).adminReview(id, `${RUN}-admin`, true);
  return id;
}

/** 读取指定退款申请的追回台账 */
async function recallsOf(refundId) {
  return prisma.$queryRawUnsafe(
    `SELECT "amount","status","reason" FROM "CommissionRecall" WHERE "refundId"=$1 ORDER BY "createdAt" DESC`,
    refundId,
  );
}
const walletOf = async (userId) => {
  const rows = await prisma.$queryRawUnsafe(`SELECT "balance" FROM "UserWallet" WHERE "userId"=$1`, userId);
  return rows.length ? Number(rows[0].balance) : null;
};

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
  const expectedJoinRecall = Math.round(joinOwner * (150 / 199) * 100) / 100;
  check("R7 冲正取的是被退订单的分成，不是最新那笔",
    refundRows.length === 1 && Math.abs(Number(refundRows[0].ownerShare) + expectedJoinRecall) < 0.01,
    `冲正=${refundRows[0]?.ownerShare} 应为=${-expectedJoinRecall}（若错取最新会按 ${renewOwner} 计算）`);
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
  const rid = await runRefund({ circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150 });

  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R8 推断匹配（single）未获批准 → 不写任何冲正行", refundRows.length === 0,
    `冲正行数=${refundRows.length}（自动冲正会是 1）`);

  const recall = await recallsOf(rid);
  // 原因码必须是 inferred_match_not_approved 而不是 ambiguous_candidates：
  // 前者说明「0 元行确实被过滤掉了、判定也确实定位到了唯一候选」，只是策略不放行；
  // 后者会把「过滤失效导致消歧不出来」也一并盖住，两种情况必须能区分。
  check("R8 转人工原因码为「推断未获批准」而非「无法消歧」（证明 0 元行过滤仍生效）",
    recall.length === 1 && recall[0].status === "pending_manual" &&
      recall[0].reason === "inferred_match_not_approved" && Number(recall[0].amount) === 0,
    JSON.stringify(recall));
  check("R8 用户退款照常到账（账务存疑不扣住用户的钱）",
    Math.abs((await walletOf(f.user)) - 150) < 0.01, `余额=${await walletOf(f.user)} 圈主分成=${joinOwner}`);
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

    const rid = await runRefund({ circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150 });
    const refundRows = await prisma.circleRevenueRecord.findMany({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R11a 推断匹配（amount）未获批准 → 不写任何冲正行", refundRows.length === 0,
      `冲正行数=${refundRows.length}（自动冲正会是 1，金额 ${-joinOwner}）`);
    const recalls = await recallsOf(rid);
    check("R11a 转人工原因码为「推断未获批准」（消歧本身成功，仅策略不放行）",
      recalls.length === 1 && recalls[0].status === "pending_manual" &&
        recalls[0].reason === "inferred_match_not_approved",
      JSON.stringify(recalls));
    check("R11a 用户退款照常到账", Math.abs((await walletOf(f.user)) - 150) < 0.01,
      `余额=${await walletOf(f.user)}`);
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

    const rid = await runRefund({
      circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150,
    });

    const refundRows = await prisma.circleRevenueRecord.findMany({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R11b 消歧失败时不写任何冲正行（不拿猜出来的数字改账）", refundRows.length === 0,
      `冲正行数=${refundRows.length}`);

    const recalls = await recallsOf(rid);
    check("R11b 留下一条 pending_manual 追回台账（人工核对入口）且原因码为「无法消歧」",
      recalls.length === 1 && recalls[0].status === "pending_manual" &&
        Number(recalls[0].amount) === 0 && recalls[0].reason === "ambiguous_candidates",
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

/**
 * R13 `exact` 档的**归属核验**：`(type, orderId)` 唯一键只证明「这一行属于这个订单」，
 * 不证明「这个订单属于本次退款」。命中即用，等于把唯一键当成了归属证明。
 *
 * 构造：把收益行的 `sourceId` 改成别的成员（模拟数据订正/跨圈脏数据），
 * 退款仍带正确的 orderId。期望：不取值、转人工，而**不是**静默按错误的行冲正、
 * 也不是悄悄退化成「查不到」后走推断分支。
 */
async function r13() {
  const f = await fixture();
  const rev = await fulfillOrder(f.order.id);
  await prisma.circleRevenueRecord.update({
    where: { id: rev.id }, data: { sourceId: `${RUN}-not-this-member` },
  });

  const rid = await runRefund({
    circleId: f.circle, userId: f.user, orderId: f.order.id, paidAmount: 199, actualRefund: 150,
  });
  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R13 归属不符时不写冲正行", refundRows.length === 0, `冲正行数=${refundRows.length}`);
  const recalls = await recallsOf(rid);
  check("R13 归属不符转人工且原因码可辨（不退化成「查不到」）",
    recalls.length === 1 && recalls[0].status === "pending_manual" &&
      recalls[0].reason === "revenue_ownership_mismatch",
    JSON.stringify(recalls));
  check("R13 用户退款照常到账", Math.abs((await walletOf(f.user)) - 150) < 0.01,
    `余额=${await walletOf(f.user)}`);
}

/**
 * R14 `exact` 档的**金额核验**：收益行金额与本次退款的已付金额对不上，说明两者记的不是
 * 同一件事（例如促销单由旧 confirmJoin 按 `circle.price` 记账，而订单实付是折后价）。
 * 这种情况下任何取值都是猜，必须转人工。
 */
async function r14() {
  const f = await fixture();
  const rev = await fulfillOrder(f.order.id);
  await prisma.circleRevenueRecord.update({ where: { id: rev.id }, data: { amount: 149 } });

  const rid = await runRefund({
    circleId: f.circle, userId: f.user, orderId: f.order.id, paidAmount: 199, actualRefund: 150,
  });
  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R14 金额不符时不写冲正行", refundRows.length === 0, `冲正行数=${refundRows.length}`);
  const recalls = await recallsOf(rid);
  check("R14 金额不符转人工且原因码可辨",
    recalls.length === 1 && recalls[0].status === "pending_manual" &&
      recalls[0].reason === "revenue_amount_mismatch",
    JSON.stringify(recalls));
  check("R14 用户退款照常到账", Math.abs((await walletOf(f.user)) - 150) < 0.01,
    `余额=${await walletOf(f.user)}`);
}

/**
 * R15 `exact` 正常路径 + **重复处理保护（串行）**。
 *
 * 钱包入账是累加、成员删除与 memberCount 递减都不幂等，执行体重入一次就是多退一笔。
 * 这里先走真实入口退一次，再对同一条申请强行重入执行体，断言一行都不多写。
 */
async function r15() {
  const f = await fixture();
  const rev = await fulfillOrder(f.order.id);
  const ownerShare = Number(rev.ownerShare);

  const rid = await runRefund({
    circleId: f.circle, userId: f.user, orderId: f.order.id, paidAmount: 199, actualRefund: 150,
  });
  const after1 = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  const expectedRecall = Math.round(ownerShare * (150 / 199) * 100) / 100;
  check("R15 exact 归属与金额核验通过 → 按实际退款比例自动冲正",
    after1.length === 1 && Math.abs(Number(after1[0].ownerShare) + expectedRecall) < 0.01,
    `冲正=${after1[0]?.ownerShare} 应为=${-expectedRecall}`);
  check("R15 冲正行带 orderId（唯一约束因此覆盖 circle_join_refund）",
    after1.length === 1 && after1[0].orderId === f.order.id, `orderId=${after1[0]?.orderId}`);
  const balance1 = await walletOf(f.user);

  // 重放：直接拿库里那条真实申请行再跑一次执行体
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "CircleRefundRequest" WHERE id=$1`, rid);
  await new CircleRefundService(prisma).executeRefund(rows[0]);

  const after2 = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  check("R15 重放执行体不产生第二条冲正行", after2.length === 1, `冲正行数=${after2.length}`);
  check("R15 重放执行体不重复给用户加钱",
    Math.abs((await walletOf(f.user)) - balance1) < 0.01,
    `重放前=${balance1} 重放后=${await walletOf(f.user)}`);
  const recalls = await recallsOf(rid);
  check("R15 追回台账仍只有一条且为 completed",
    recalls.length === 1 && recalls[0].status === "completed" && recalls[0].reason === "exact",
    JSON.stringify(recalls));
  const txn = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "UserBalanceTransaction" WHERE "refId"=$1`, rid,
  );
  check("R15 退款流水也只有一条", txn[0].n === 1, `流水数=${txn[0].n}`);
}

/**
 * R16 **重复处理保护（并发）**：同一条退款申请被两个独立连接同时审核通过。
 *
 * 不靠重跑取绿：两个 `CircleRefundService` 各持有独立的 PrismaClient（独立连接），
 * 同时发起 `adminReview`，由 `adminStatus` 的 CAS 与执行体的退款单行锁共同保证只生效一次。
 */
async function r16() {
  const f = await fixture();
  const rev = await fulfillOrder(f.order.id);
  const ownerShare = Number(rev.ownerShare);
  const rid = await makeRefundRequest({
    circleId: f.circle, userId: f.user, orderId: f.order.id, paidAmount: 199, actualRefund: 150,
  });

  const svcA = new CircleRefundService(prisma);
  const svcB = new CircleRefundService(prismaB);
  const results = await Promise.allSettled([
    svcA.adminReview(rid, `${RUN}-adminA`, true),
    svcB.adminReview(rid, `${RUN}-adminB`, true),
  ]);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  check("R16 并发审核恰有一方成功", ok === 1,
    `成功=${ok} 结果=${results.map((r) => r.status).join(",")}`);

  const refundRows = await prisma.circleRevenueRecord.findMany({
    where: { circleId: f.circle, type: "circle_join_refund" },
  });
  const expectedRecall = Math.round(ownerShare * (150 / 199) * 100) / 100;
  check("R16 并发下只写一条冲正行",
    refundRows.length === 1 && Math.abs(Number(refundRows[0].ownerShare) + expectedRecall) < 0.01,
    `冲正行数=${refundRows.length}`);
  check("R16 并发下用户余额只加一次",
    Math.abs((await walletOf(f.user)) - 150) < 0.01, `余额=${await walletOf(f.user)}`);
  check("R16 并发下追回台账只有一条", (await recallsOf(rid)).length === 1,
    JSON.stringify(await recallsOf(rid)));
  const m = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: f.circle, userId: f.user } },
  });
  check("R16 成员身份失效且圈子人数不被重复递减", !m && (await prisma.circle.findUnique({
    where: { id: f.circle }, select: { memberCount: true },
  })).memberCount === 0, `member=${m ? "在" : "无"}`);
}

/**
 * R17 待人工核对的只读查询（`getManualRecalls`）。
 *
 * 转人工只有在「有人能看到、且看到的信息足以核对」时才算闭环。
 * 这里断言三件事：待办能被查出来、按原因码能统计出发生量（N9 决策的量化依据）、
 * 每条待办带得出候选收益行 —— 退款成功后成员行已被删除，若不留 `sourceId`，
 * 之后无法由 (circleId, userId) 反推成员 id，候选就再也关联不上。
 */
async function r17() {
  // 造一条 ambiguous 待办（两条同额候选）
  const f = await fixture();
  await fulfillOrder(f.order.id);                       // 199
  const ro = await renewOrder(f, 199);
  await fulfillOrder(ro.id);                            // 199，同额 → 消歧失败
  const m = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: f.circle, userId: f.user } },
  });
  const rid = await runRefund({
    circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150,
  });

  const page = await new CircleRefundService(prisma).getManualRecalls({ limit: 50 });
  const item = page.items.find((i) => i.refundId === rid);
  check("R17 待人工追回能被只读查询列出", !!item, `总数=${page.total}`);
  check("R17 待办带出退款事实（圈子、订单、金额）",
    !!item && item.circleId === f.circle && Number(item.paidAmount) === 199 &&
      item.reason === "ambiguous_candidates",
    JSON.stringify({ circleId: item?.circleId, paidAmount: item?.paidAmount, reason: item?.reason }));
  check("R17 待办记下了成员 id（成员行已被删，否则候选再也关联不上）",
    !!item && item.memberId === m.id && !(await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: f.circle, userId: f.user } },
    })), `memberId=${item?.memberId} 应为=${m.id}`);
  check("R17 待办带出两条候选收益行（人工据此挑被退的那一笔）",
    !!item && item.candidates.length === 2 &&
      item.candidates.every((c) => Number(c.amount) === 199),
    JSON.stringify(item?.candidates?.map((c) => Number(c.amount))));
  check("R17 按原因码给出发生量（N9 决策的量化依据）",
    page.summary.some((x) => x.reason === "ambiguous_candidates" && Number(x.count) >= 1),
    JSON.stringify(page.summary));
  check("R17 只读查询不产生任何写入",
    (await recallsOf(rid)).length === 1, JSON.stringify(await recallsOf(rid)));
}

/**
 * R18 平台费口径统一（决策项 N2 第一步：止血）。
 *
 * 同一笔圈子入圈，平台抽成此前被记两条：订单侧按 (订单类型, 订单id)，
 * 本路径按 (circle_join, 成员id)。`recordPlatformFee` 的幂等守卫是
 * `type + sourceId + platformFee > 0`，三个字段全不同，判不出重复。
 *
 * 改后：**有 orderId（订单来源）就不在收益路径写平台费**，由订单侧那一条负责；
 * 无 orderId 的来源（礼物等）订单侧不会记，行为必须保持不变。
 *
 * 这里必须先把费率配置种进去 —— 没有配置时 `calculatePlatformFee` 返回 null，
 * 两条分支都一条不写，断言会恒真而没有区分力。
 */
async function r18() {
  const keys = ["circle_join", "gift"];
  try {
    for (const k of keys) {
      await prisma.commissionConfig.upsert({
        where: { configKey: k },
        update: { rateB: 0.2 },
        create: { configKey: k, configName: `验证用-${k}`, rateA: 0.8, rateB: 0.2 },
      });
    }

    const f = await fixture();
    const m = await prisma.circleMember.create({
      data: { circleId: f.circle, userId: f.user, role: "MEMBER", expireAt: null },
    });
    const feesBefore = await prisma.platformFeeRecord.count({ where: { circleId: f.circle } });

    // ① 订单来源（带 orderId）→ 收益行照记，平台费**不在这里写**
    await makeCommission().recordCircleRevenue(f.circle, CIRCLE_REVENUE_TYPE, m.id, 199, f.order.id);
    const rev = await prisma.circleRevenueRecord.findUnique({
      where: { type_orderId: { type: CIRCLE_REVENUE_TYPE, orderId: f.order.id } },
    });
    check("R18 前置：费率配置生效（否则本组断言没有区分力）",
      !!rev && Math.abs(Number(rev.platformFee) - 39.8) < 0.01, `platformFee=${rev?.platformFee}`);
    check("R18 订单来源的收益行照常写入且分成正确",
      !!rev && Number(rev.amount) === 199 && Math.abs(Number(rev.ownerShare) - 159.2) < 0.01,
      `amount=${rev?.amount} ownerShare=${rev?.ownerShare}`);
    const feesAfterOrder = await prisma.platformFeeRecord.count({ where: { circleId: f.circle } });
    check("R18 订单来源不再重复写平台费（止血，不扩大双计）",
      feesAfterOrder === feesBefore, `${feesBefore} → ${feesAfterOrder}`);

    // ② 非订单来源（无 orderId）→ 行为必须不变，仍写平台费
    await makeCommission().recordCircleRevenue(f.circle, "gift", `${RUN}-gift-1`, 100);
    const feesAfterGift = await prisma.platformFeeRecord.count({ where: { circleId: f.circle } });
    check("R18 反证：非订单来源（礼物）仍照常写平台费，行为未被误伤",
      feesAfterGift === feesBefore + 1, `${feesAfterOrder} → ${feesAfterGift}`);

    await prisma.platformFeeRecord.deleteMany({ where: { circleId: f.circle } });
  } finally {
    await prisma.commissionConfig.deleteMany({ where: { configKey: { in: keys } } });
  }
}

/**
 * R19 处理时限（SLA）只标不做。
 *
 * 负责人与时限由业务指定（2026-09-19：7 天，自然日）。把超期待办标出来，
 * 是「转人工」这条路真正闭环的最后一环 —— 没有超期视图，待办堆着也没人知道。
 *
 * 同时断言**只标不做**：标记超期不得改状态、不得写任何冲正行。
 */
async function r19() {
  const { MANUAL_RECALL_SLA_DAYS } = req(`${ROOT}/modules/circle-refund/circle-refund.service.ts`);
  check("R19 处理时限取自具名常量且为业务指定值", MANUAL_RECALL_SLA_DAYS === 7,
    `slaDays=${MANUAL_RECALL_SLA_DAYS}`);

  // 造两条 ambiguous 待办：一条刚产生、一条回拨到超期之外
  const made = [];
  for (const tag of ["fresh", "stale"]) {
    const f = await fixture();
    await fulfillOrder(f.order.id);
    const ro = await renewOrder(f, 199);
    await fulfillOrder(ro.id);                       // 两条同额候选 → 消歧失败
    const rid = await runRefund({
      circleId: f.circle, userId: f.user, orderId: null, paidAmount: 199, actualRefund: 150,
    });
    made.push({ tag, rid, circleId: f.circle });
  }
  const stale = made.find((m) => m.tag === "stale");
  const fresh = made.find((m) => m.tag === "fresh");
  await prisma.$executeRawUnsafe(
    `UPDATE "CommissionRecall" SET "createdAt" = CURRENT_TIMESTAMP - make_interval(days => 9) WHERE "refundId" = $1`,
    stale.rid,
  );

  const svc = new CircleRefundService(prisma);
  const page = await svc.getManualRecalls({ limit: 100 });
  const staleItem = page.items.find((i) => i.refundId === stale.rid);
  const freshItem = page.items.find((i) => i.refundId === fresh.rid);

  check("R19 超期待办被标出（ageDays ≥ 时限）",
    !!staleItem && staleItem.overdue === true && staleItem.ageDays >= MANUAL_RECALL_SLA_DAYS,
    `overdue=${staleItem?.overdue} ageDays=${staleItem?.ageDays}`);
  check("R19 反证：未超期的待办不被标（否则这条断言没有区分力）",
    !!freshItem && freshItem.overdue === false && freshItem.ageDays === 0,
    `overdue=${freshItem?.overdue} ageDays=${freshItem?.ageDays}`);
  check("R19 汇总里的超期条数与逐条标记一致",
    page.overdue === page.items.filter((i) => i.overdue).length && page.overdue >= 1,
    `overdue=${page.overdue} 逐条=${page.items.filter((i) => i.overdue).length}`);
  check("R19 时限随结果返回，调用方不必自己猜", page.slaDays === MANUAL_RECALL_SLA_DAYS,
    `slaDays=${page.slaDays}`);

  // 只标不做：状态未变、这两个圈子下没有任何冲正行
  // （计数必须限定在本用例造的圈子上：R7/R15/R16 在同一个库里写过 circle_join_refund，
  //  不限定就会把别人的行算进来，断言随执行顺序变化 —— 那是假失败，不是发现问题）
  const after = await recallsOf(stale.rid);
  const reversals = await prisma.circleRevenueRecord.count({
    where: { type: "circle_join_refund", circleId: { in: made.map((m) => m.circleId) } },
  });
  check("R19 只标不做：超期不改状态、不写冲正行",
    after.length === 1 && after[0].status === "pending_manual" && reversals === 0,
    `台账=${JSON.stringify(after)} 本用例圈子下的冲正行=${reversals}`);
}

/**
 * R20 人工结案闭环：记录、凭据、两种结论、拒绝条件、幂等。
 *
 * 「能查看超期」不等于闭环 —— 待办必须有终点。这里验证终点本身：
 * 谁结的案、依据什么、认定哪一笔、有没有真的动钱、能不能查回来、能不能重复结案。
 */
async function r20() {
  const svc = new CircleRefundService(prisma);
  const OP = `${RUN}-operator`;
  await prisma.user.create({ data: { id: OP, nickname: "核对人" } });

  /** 造一条 ambiguous 待办，返回待办行与两条候选收益 */
  async function makePending({ withOrder = false } = {}) {
    const f = await fixture();
    const a = await fulfillOrder(f.order.id);          // 199
    const ro = await renewOrder(f, 199);
    const b = await fulfillOrder(ro.id);               // 199，同额 → 消歧失败
    const rid = await runRefund({
      circleId: f.circle, userId: f.user, orderId: withOrder ? f.order.id : null,
      // 有订单时故意制造金额不一致，让真实流程转人工，同时保留可核验的订单归属。
      paidAmount: withOrder ? 188 : 199, actualRefund: 150,
    });
    const recall = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "CommissionRecall" WHERE "refundId" = $1`, rid))[0];
    return { f, rid, recall, candidates: [a, b] };
  }

  // ── ① 结论：无需调整 ──
  {
    const { f, recall } = await makePending();
    const r = await svc.resolveManualRecall(recall.id, OP, {
      decision: "no_change", note: "已核对订单与收益行，本笔收益从未记上，无需冲正",
    });
    check("R20 无需调整：结案成功且不动资金", r.status === "manual_no_change" && r.ownerRecalled === 0,
      JSON.stringify(r));
    const rows = await prisma.circleRevenueRecord.count({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R20 无需调整：一条冲正行都不写", rows === 0, `冲正行=${rows}`);
    const after = (await prisma.$queryRawUnsafe(
      `SELECT "status","resolvedBy","resolutionNote","resolvedAt","resolvedRevenueId" FROM "CommissionRecall" WHERE "id"=$1`,
      recall.id))[0];
    check("R20 无需调整：留下操作人、时间与依据（凭据可复核）",
      after.status === "manual_no_change" && after.resolvedBy === OP &&
        !!after.resolvedAt && (after.resolutionNote ?? "").length >= 10 && after.resolvedRevenueId === null,
      JSON.stringify(after));
  }

  // ── ② 结论：确需调整，按人工指定的那一行冲正 ──
  let adjusted = null;
  {
    const { f, rid, recall, candidates } = await makePending({ withOrder: true });
    const pick = candidates[0];
    const r = await svc.resolveManualRecall(recall.id, OP, {
      decision: "adjust", revenueRecordId: pick.id,
      note: `经核对，被退订单对应入圈那一笔收益 ${pick.id}，按该笔追回圈主分成`,
    });
    const expectedRatio = 150 / 199;
    const expectedOwnerRecalled = Math.round(Number(pick.ownerShare) * expectedRatio * 100) / 100;
    const expectedRevenueRecalled = Math.round(Number(pick.amount) * expectedRatio * 100) / 100;
    check("R20 确需调整：按指定收益行及实际退款比例冲正",
      r.status === "manual_adjusted" && Math.abs(r.ownerRecalled - expectedOwnerRecalled) < 0.01 &&
        Math.abs(r.refundRatio - expectedRatio) < 0.000001 &&
        r.revenueRecordId === pick.id,
      JSON.stringify(r));
    const rows = await prisma.circleRevenueRecord.findMany({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R20 确需调整：恰写一条按实际退款比例计算的冲正行",
      rows.length === 1 && Math.abs(Number(rows[0].amount) + expectedRevenueRecalled) < 0.01 &&
        Math.abs(Number(rows[0].ownerShare) + expectedOwnerRecalled) < 0.01,
      JSON.stringify(rows.map((x) => ({ amount: x.amount, ownerShare: x.ownerShare }))));
    const req = (await prisma.$queryRawUnsafe(
      `SELECT "ownerRecalled" FROM "CircleRefundRequest" WHERE "id"=$1`, rid))[0];
    check("R20 确需调整：退款申请的圈主追回金额被回填（转人工时是 0）",
      Math.abs(Number(req.ownerRecalled) - expectedOwnerRecalled) < 0.01, `ownerRecalled=${req.ownerRecalled}`);
    adjusted = { rid, recallId: recall.id, pick, circleId: f.circle };
  }

  // ── ③ 幂等：重复结案被拒，不写第二条冲正行 ──
  {
    let err = null;
    await svc.resolveManualRecall(adjusted.recallId, OP, {
      decision: "no_change", note: "尝试重复结案，应当被拒绝，不得改写已有结论",
    }).catch((e) => { err = e; });
    check("R20 幂等：已结案的待办不可重复处理", !!err && /已结案/.test(err.message ?? ""),
      err ? err.message : "未拒绝（错误）");
    const rows = await prisma.circleRevenueRecord.count({
      where: { circleId: adjusted.circleId, type: "circle_join_refund" },
    });
    check("R20 幂等：重复提交不产生第二条冲正行", rows === 1, `冲正行=${rows}`);
  }

  // ── ④ 拒绝条件：凭据太短 / 未指定收益行 / 指定了不属于本笔的收益行 ──
  {
    const { recall } = await makePending({ withOrder: true });
    const other = await makePending({ withOrder: true }); // 另一笔退款的收益行，归属不符

    const cases = [
      ["凭据太短被拒", { decision: "no_change", note: "已核对" }, /不少于/],
      ["确需调整但未指定收益行被拒", { decision: "adjust", note: "确认需要调整这一笔的圈主分成" }, /必须指定/],
      ["结论取值非法被拒", { decision: "maybe", note: "这是一个不存在的结论取值用于验证" }, /结论必须是/],
      ["指定不属于本笔退款的收益行被拒",
        { decision: "adjust", revenueRecordId: other.candidates[0].id, note: "故意指向别笔退款的收益行以验证归属校验" },
        /不属于本笔退款/],
    ];
    for (const [name, body, re] of cases) {
      let err = null;
      await svc.resolveManualRecall(recall.id, OP, body).catch((e) => { err = e; });
      check(`R20 ${name}`, !!err && re.test(err.message ?? ""), err ? err.message : "未拒绝（错误）");
    }
    const still = (await prisma.$queryRawUnsafe(
      `SELECT "status" FROM "CommissionRecall" WHERE "id"=$1`, recall.id))[0];
    check("R20 被拒的提交不改变待办状态", still.status === "pending_manual", still.status);
  }

  // ── ⑤ 没有可核验订单时不允许在线动资金 ──
  {
    const { recall, candidates } = await makePending();
    let err = null;
    await svc.resolveManualRecall(recall.id, OP, {
      decision: "adjust", revenueRecordId: candidates[0].id,
      note: "该历史待办没有订单标识，尝试在线冲正必须被拒绝",
    }).catch((e) => { err = e; });
    check("R20 无订单待办不能在线冲正", !!err && /缺少可核验的原订单/.test(err.message ?? ""),
      err ? err.message : "未拒绝（错误）");
  }

  // ── ⑥ 同一订单累计最多冲正一次 ──
  {
    const duplicateRecallId = `${RUN}-recall-duplicate`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CommissionRecall"
        ("id","refundId","userId","userType","amount","balanceAfter","status","reason","sourceId","createdAt")
       SELECT $1,r."id",c."ownerId",'owner',0,0,'pending_manual','amount_mismatch',rr."sourceId",CURRENT_TIMESTAMP
       FROM "CircleRefundRequest" r
       JOIN "Circle" c ON c."id"=r."circleId"
       JOIN "CircleRevenueRecord" rr ON rr."id"=$2
       WHERE r."id"=$3`,
      duplicateRecallId, adjusted.pick.id, adjusted.rid,
    );
    let err = null;
    await svc.resolveManualRecall(duplicateRecallId, OP, {
      decision: "adjust", revenueRecordId: adjusted.pick.id,
      note: "同一订单已经冲正，第二次提交必须被累计上限拒绝",
    }).catch((e) => { err = e; });
    check("R20 同一订单不可累计重复冲正", !!err && /已存在圈主收益冲正/.test(err.message ?? ""),
      err ? err.message : "未拒绝（错误）");
  }

  // ── ⑦ 并发结案由台账行锁串行化 ──
  {
    const { f, recall, candidates } = await makePending({ withOrder: true });
    const svcB = new CircleRefundService(prismaB);
    const body = {
      decision: "adjust", revenueRecordId: candidates[0].id,
      note: "两个管理员同时提交同一待办，只允许其中一个完成冲正",
    };
    const results = await Promise.allSettled([
      svc.resolveManualRecall(recall.id, OP, body),
      svcB.resolveManualRecall(recall.id, OP, body),
    ]);
    check("R20 并发结案恰有一方成功", results.filter((x) => x.status === "fulfilled").length === 1,
      results.map((x) => x.status).join(","));
    const reversals = await prisma.circleRevenueRecord.count({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R20 并发结案只写一条冲正", reversals === 1, `冲正行=${reversals}`);
  }

  // ── ⑧ 待办记录的收益主体必须是该圈圈主 ──
  {
    const { recall, candidates } = await makePending({ withOrder: true });
    await prisma.$executeRawUnsafe(
      `UPDATE "CommissionRecall" SET "userId"=$2 WHERE "id"=$1`, recall.id, `${RUN}-operator`,
    );
    let err = null;
    await svc.resolveManualRecall(recall.id, OP, {
      decision: "adjust", revenueRecordId: candidates[0].id,
      note: "故意把待办收益主体改成非圈主，在线冲正必须被拒绝",
    }).catch((e) => { err = e; });
    check("R20 收益主体不是圈主时拒绝结案", !!err && /收益主体与圈主不一致/.test(err.message ?? ""),
      err ? err.message : "未拒绝（错误）");
  }

  // ── ⑨ 事务后段失败时，前段资金写入必须全部回滚 ──
  {
    const { f, rid, recall, candidates } = await makePending({ withOrder: true });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION "${RUN}_fail_manual_resolution"() RETURNS trigger AS $$
      BEGIN
        IF NEW."id" = '${recall.id}' AND NEW."status" = 'manual_adjusted' THEN
          RAISE EXCEPTION 'injected manual resolution failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${RUN}_fail_manual_resolution_trigger"
      BEFORE UPDATE ON "CommissionRecall"
      FOR EACH ROW EXECUTE FUNCTION "${RUN}_fail_manual_resolution"()
    `);
    let err = null;
    try {
      await svc.resolveManualRecall(recall.id, OP, {
        decision: "adjust", revenueRecordId: candidates[0].id,
        note: "注入事务后段失败，验证此前资金写入会随事务一起回滚",
      });
    } catch (e) {
      err = e;
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${RUN}_fail_manual_resolution_trigger" ON "CommissionRecall"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${RUN}_fail_manual_resolution"()`);
    }
    const afterRecall = (await prisma.$queryRawUnsafe(
      `SELECT "status" FROM "CommissionRecall" WHERE "id"=$1`, recall.id))[0];
    const afterRefund = (await prisma.$queryRawUnsafe(
      `SELECT "ownerRecalled" FROM "CircleRefundRequest" WHERE "id"=$1`, rid))[0];
    const reversals = await prisma.circleRevenueRecord.count({
      where: { circleId: f.circle, type: "circle_join_refund" },
    });
    check("R20 事务失败被完整回滚", !!err && afterRecall.status === "pending_manual" &&
      Number(afterRefund.ownerRecalled) === 0 && reversals === 0,
    `错误=${err?.message ?? "无"} 状态=${afterRecall.status} ownerRecalled=${afterRefund.ownerRecalled} 冲正行=${reversals}`);
  }

  // ── ⑩ 结案记录查得回来；待办列表不再包含已结案的 ──
  {
    const resolvedPage = await svc.getManualRecalls({ limit: 100, state: "resolved" });
    const hit = resolvedPage.items.find((i) => i.id === adjusted.recallId);
    check("R20 结案记录可查回（复核与对账用）",
      !!hit && hit.status === "manual_adjusted" && hit.resolvedBy === OP &&
        hit.resolvedRevenueId === adjusted.pick.id && (hit.resolutionNote ?? "").length >= 10,
      JSON.stringify({ status: hit?.status, by: hit?.resolvedBy, rev: hit?.resolvedRevenueId }));
    check("R20 结案记录带出操作人昵称（人能看懂是谁处理的）",
      hit?.resolvedByNickname === "核对人", `nickname=${hit?.resolvedByNickname}`);
    const pendingPage = await svc.getManualRecalls({ limit: 200 });
    check("R20 已结案的不再出现在待办列表里",
      !pendingPage.items.some((i) => i.id === adjusted.recallId), `待办 ${pendingPage.total} 条`);
    check("R20 已结案的不参与超期统计",
      resolvedPage.items.every((i) => i.overdue === false), "resolved 列表不标超期");
  }
}

// ─────────────────────────── 主流程 ───────────────────────────
try {
  console.log("=== 圈子履约 · 收益与真实入口验证 ===");
  await cleanup();
  await r1(); await r2(); await r3(); await r4(); await r5(); await r6();
  await r7(); await r8(); await r9(); await r10(); await r11(); await r12();
  await r13(); await r14(); await r15(); await r16();
  await r17(); await r18(); await r19();
  await r20();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await Promise.all([prisma.$disconnect(), prismaB.$disconnect()]);
}
