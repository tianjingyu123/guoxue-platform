#!/usr/bin/env node
/**
 * 圈子履约 · 真实业务入口集成验证
 *
 * repro.mjs / concurrency.mjs 直接调履约函数，覆盖不到「服务是否真的接上了」。
 * 本文件实例化**真实的 ShopPaymentService 与 CircleMembershipService**，走：
 *   I1 ShopPaymentService.runPaidPostProcessors（支付回调与管理员确认收款的共用入口）
 *   I2 ShopPaymentService.retryCircleFulfillment（补偿入口）
 *   I3 真实 CircleMembershipService.confirmJoin / confirmRenew 在服务端已履约后的重复调用
 *   I4 confirmJoin / confirmRenew 的归属校验（跨用户、跨圈子、跨订单不得被认定为已履约）
 *   I5 收益记账参数正确且不双记（sourceId 必须是成员 id，退款追回依赖它）
 *   I6 三条路径（首次回调 / 管理员确认 / 补偿）提交后都做了缓存失效
 *
 * 只对本机隔离测试库运行，合成数据 `int-` 前缀。不连生产、不动真实订单、不发真实通知。
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

req("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs", target: "es2022", experimentalDecorators: true, emitDecoratorMetadata: true } });
const ROOT = process.env.REPRO_SRC_ROOT ||
  "D:/gx-deploy-91/.worktrees/entitlement-audit-20260918/apps/server/src";
const { ShopPaymentService } = req(`${ROOT}/modules/shop/shop-payment.service.ts`);
const { CircleMembershipService } = req(`${ROOT}/modules/circle/services/circle-membership.service.ts`);
const { CommissionService } = req(`${ROOT}/modules/commission/commission.service.ts`);
const { ShopOrderLifecycleService } = req(`${ROOT}/modules/shop/shop-order-lifecycle.service.ts`);
const { CIRCLE_REVENUE_TYPE } = req(`${ROOT}/modules/shop/circle-fulfillment.ts`);

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });
const DAY = 86_400_000;

let pass = 0, fail = 0;
const lines = [];
function check(name, ok, detail = "") {
  if (ok) pass += 1; else fail += 1;
  lines.push(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── 桩：只记录调用，不产生任何外部副作用 ──
const cacheDeleted = [];
const redisStub = {
  del: async (k) => { cacheDeleted.push(k); },
  getJson: async () => null,
  setJson: async () => {},
  get: async () => null,
  set: async () => {},
  delByPattern: async (p) => { cacheDeleted.push(`pattern:${p}`); },
  setNX: async () => true,
  runExclusive: async (_k, _t, fn) => fn(),
  getClient: () => null,
};
const noop = new Proxy({}, { get: () => async () => undefined });

// 佣金用**真实 CommissionService**：断言看数据库里的 CircleRevenueRecord，不看调用次数。
// （早期版本用「记录调用次数」的桩，新实现改为服务自己按订单幂等落库后，该桩已失效。）
const makeCommission = () => new CommissionService(prisma, noop, redisStub);
const revRows = (circleId) =>
  prisma.circleRevenueRecord.findMany({ where: { circleId, type: CIRCLE_REVENUE_TYPE } });

function makePaymentService() {
  const svc = new ShopPaymentService(
    prisma,          // prisma
    redisStub,       // redis
    noop,            // wechatPay
    noop,            // alipay
    noop,            // unionpay
    noop,            // webhook
    noop,            // memberBenefit
    noop,            // entitlement
    noop,            // attribution
    { invalidateOrderCache: async () => {}, settleGroupBuyIfNeeded: async () => {}, getOrder: async () => null },
    undefined,       // huifu
    makeCommission(), // commissionSvc（真实服务）
    undefined,       // coinSvc
  );
  return svc;
}
function makeCircleService() {
  return new CircleMembershipService(
    prisma,
    redisStub,
    { calculateTargetPrice: async () => ({ effectivePrice: 199, originalPrice: 199, appliedPromotion: null }) },
    {},              // shared
    undefined,       // coinService
    makeCommission(), // commissionService（真实服务）
    undefined,       // notificationService
    undefined,       // governance
  );
}

// ── 夹具 ──
const RUN = `int-${Date.now().toString(36)}`;
let seq = 0;
/**
 * 清理所有合成前缀。
 * 必须连 `syn-`（检测器夹具）一起清：`retryCircleFulfillment` 是按时间窗**全局扫描**的，
 * 残留的检测器夹具会被一并扫到，污染本文件对补偿入口的断言。
 * 检测器夹具可随时用 db-seed.mjs 确定性重建。
 */
const SYNTH_PREFIXES = ["int-", "syn-", "rep-", "con-"];
async function cleanup() {
  for (const p of SYNTH_PREFIXES) {
    await prisma.circleRevenueRecord.deleteMany({ where: { circleId: { startsWith: p } } });
    await prisma.order.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.circleMember.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.circle.deleteMany({ where: { ownerId: { startsWith: p } } });
    // 检测器夹具还带这些关联表，必须先删才能删 User（外键）
    await prisma.entitlementLedger.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.entitlementBalance.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.memberPurchase.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.station.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.operator.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.practitionerProfile.deleteMany({ where: { userId: { startsWith: p } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: p } } });
  }
}
async function fixture({ type = "CIRCLE_JOIN", memberExpireAt, status = "PAID", quantity = 1 } = {}) {
  const n = ++seq;
  const owner = `${RUN}-own${n}`, user = `${RUN}-u${n}`, circle = `${RUN}-c${n}`;
  await prisma.user.createMany({ data: [{ id: owner, nickname: `圈主${n}` }, { id: user, nickname: `用户${n}` }] });
  await prisma.circle.create({
    data: { id: circle, name: `集成圈${n}`, intro: "集成验证", ownerId: owner, type: "YEARLY", price: 199, status: "ACTIVE" },
  });
  if (memberExpireAt !== undefined) {
    await prisma.circleMember.create({ data: { circleId: circle, userId: user, role: "MEMBER", expireAt: memberExpireAt } });
    await prisma.circle.update({ where: { id: circle }, data: { memberCount: 1 } });
  }
  const order = await prisma.order.create({
    data: {
      userId: user, type, targetId: circle, quantity, amount: 199, payAmount: 199,
      status, payMethod: "WECHAT", payTransactionId: `${RUN}-tx${n}`, paidAt: new Date(),
    },
  });
  return { owner, user, circle, order };
}

/** 真实 ShopOrderLifecycleService（管理员线下确认收款：真实公开入口，内部走
 *  runPaidPostProcessors + settleCircleAfterCommit 的完整链路） */
function makeLifecycle(paymentSvc) {
  return new ShopOrderLifecycleService(
    prisma,
    redisStub,
    { recordOrderCommissionAndFee: async () => {}, recordOrderPlatformFee: async () => {} },
    { invalidateOrderCache: async () => {}, settleGroupBuyIfNeeded: async () => {} },
    paymentSvc,
  );
}

let manualSeq = 0;
/**
 * 走**真实入口**把订单变成已支付并完成后处理。
 * 早期版本在这里手搓了一段「事务内翻 PAID + 调 runPaidPostProcessors + 调 settleCircleAfterCommit」，
 * 等于测试自己补了生产路径里不存在的调用，把 adminPayOrder 漏掉收尾的缺口盖住了。
 * 现在一律走 ShopOrderLifecycleService.adminPayOrder。
 */
async function payViaRealEntry(svc, orderId) {
  const lifecycle = makeLifecycle(svc);
  return lifecycle.adminPayOrder(orderId, `${RUN}-manual-${++manualSeq}`, `${RUN}-op`);
}

/**
 * 走**真实网关回调路径**：直接调用 ShopPaymentService 的 processPaidOrder。
 * 它是私有方法，但它是生产里微信/支付宝回调实际执行的那段代码（见 :641 / :764 调用点），
 * 直接调用等于跑完整真实链路，而不是另写一份。这里不额外补任何生产不存在的调用。
 */
async function payViaGatewayPath(svc, orderId, tradeNo) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  return svc["processPaidOrder"](
    { id: o.id, type: o.type, userId: o.userId, amount: o.amount, targetId: o.targetId, referrerId: o.referrerId },
    "WECHAT",
    tradeNo,
    Number(o.amount),
  );
}

// ─────────────────────────── 场景 ───────────────────────────

async function i1() {
  cacheDeleted.length = 0;
  const svc = makePaymentService();
  const f = await fixture({ status: "PENDING" });
  await payViaRealEntry(svc, f.order.id);
  const [m, o] = await Promise.all([
    prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } }),
    prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } }),
  ]);
  check("I1 真实 runPaidPostProcessors 完成入圈", !!m, m ? `到期=${m.expireAt?.toISOString().slice(0, 10)}` : "无成员");
  check("I1 订单被认领为 COMPLETED", o.status === "COMPLETED", o.status);
  check("I1 提交后清了成员与圈子详情缓存",
    cacheDeleted.includes(`circles:member:${f.circle}:${f.user}`) && cacheDeleted.includes(`circles:detail:${f.circle}`),
    cacheDeleted.join(","));
  const rows1 = await revRows(f.circle);
  check("I1 库里恰有一条圈子收益且金额正确", rows1.length === 1 && Number(rows1[0].amount) > 0,
    JSON.stringify(rows1.map((r) => ({ amount: Number(r.amount), orderId: r.orderId, sourceId: r.sourceId }))));
  check("I1 收益 sourceId=成员 id、orderId=订单 id", rows1[0]?.sourceId === m?.id && rows1[0]?.orderId === f.order.id,
    `sourceId=${rows1[0]?.sourceId} memberId=${m?.id} orderId=${rows1[0]?.orderId}`);
  return f;
}

async function i2() {
  cacheDeleted.length = 0;
  const svc = makePaymentService();
  const f = await fixture();                  // 已 PAID 但未履约
  const r = await svc.retryCircleFulfillment(new Date(Date.now() - DAY), new Date(Date.now() + DAY), 50);
  const [m, o] = await Promise.all([
    prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } }),
    prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } }),
  ]);
  check("I2 真实补偿入口完成履约", !!m && o.status === "COMPLETED", `member=${!!m} status=${o.status} r=${JSON.stringify(r)}`);
  check("I2 补偿也做了缓存失效",
    cacheDeleted.includes(`circles:member:${f.circle}:${f.user}`), cacheDeleted.join(","));
  const mine = await revRows(f.circle);
  check("I2 补偿也在库里记了一次收益", mine.length === 1 && Number(mine[0].amount) > 0,
    JSON.stringify(mine.map((r) => Number(r.amount))));
  // 再跑一次补偿：本单已 COMPLETED，不应再被扫到，也不得重复履约或重复记账
  const before = (await revRows(f.circle)).length;
  const r2 = await svc.retryCircleFulfillment(new Date(Date.now() - DAY), new Date(Date.now() + DAY), 50);
  const stillCandidate = await prisma.order.count({
    where: { id: f.order.id, status: { in: ["PAID", "SHIPPED"] } },
  });
  check("I2 二次补偿不再把本单当候选（已 COMPLETED）", stillCandidate === 0, `候选=${stillCandidate} r2=${JSON.stringify(r2)}`);
  const after2 = (await revRows(f.circle)).length;
  check("I2 二次补偿未重复记账", after2 === before, `${before} → ${after2}`);
}

async function i3(f1) {
  cacheDeleted.length = 0;
  const circleSvc = makeCircleService();
  const beforeRows = (await revRows(f1.circle)).length;
  // I1 里服务端已履约，客户端仍会补调 confirmJoin
  const res = await circleSvc.confirmJoin(f1.circle, f1.user, { orderId: f1.order.id, payMethod: "WECHAT" })
    .then((r) => ({ ok: true, r })).catch((e) => ({ ok: false, e: e?.message }));
  check("I3 旧 confirmJoin 重复调用返回已完成结果，不再抛错", res.ok && res.r?.alreadyFulfilled === true,
    res.ok ? `alreadyFulfilled=${res.r?.alreadyFulfilled}` : `抛错：${res.e}`);
  const afterRows = (await revRows(f1.circle)).length;
  check("I3 旧 confirmJoin 未重复记账", afterRows === beforeRows, `${beforeRows} → ${afterRows}`);
  const cnt = await prisma.circleMember.count({ where: { circleId: f1.circle, userId: f1.user } });
  check("I3 旧 confirmJoin 未重复履约", cnt === 1, `members=${cnt}`);

  // confirmRenew：服务端已履约续费单后，客户端补调
  const f = await fixture({ type: "CIRCLE_RENEW", memberExpireAt: new Date(Date.now() + 30 * DAY), status: "PENDING" });
  const svc = makePaymentService();
  await payViaRealEntry(svc, f.order.id);
  const after = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  const expAfterServer = after.expireAt.getTime();
  const res2 = await circleSvc.confirmRenew(f.circle, f.user, { orderId: f.order.id })
    .then((r) => ({ ok: true, r })).catch((e) => ({ ok: false, e: e?.message }));
  const final = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  check("I3 旧 confirmRenew 重复调用返回已完成结果", res2.ok && res2.r?.alreadyFulfilled === true,
    res2.ok ? `alreadyFulfilled=${res2.r?.alreadyFulfilled}` : `抛错：${res2.e}`);
  check("I3 旧 confirmRenew 未重复顺延", final.expireAt.getTime() === expAfterServer,
    `服务端后=${new Date(expAfterServer).toISOString()} confirm 后=${final.expireAt.toISOString()}`);
}

async function i4() {
  const circleSvc = makeCircleService();
  const a = await fixture({ status: "PENDING" });
  const b = await fixture({ status: "PENDING" });
  const svc = makePaymentService();
  await payViaRealEntry(svc, a.order.id);   // a 已履约
  // 用 a 的订单去 confirm b 的圈子 → 归属不符，不得被认定为已履约
  const crossCircle = await circleSvc.confirmJoin(b.circle, b.user, { orderId: a.order.id })
    .then(() => ({ ok: true })).catch((e) => ({ ok: false, e: e?.message }));
  check("I4 跨圈子订单不被认定为已履约", !crossCircle.ok, crossCircle.ok ? "错误地通过了" : `已拒绝：${crossCircle.e}`);
  // 用 a 的订单、b 的用户身份去 confirm a 的圈子 → 归属不符
  const crossUser = await circleSvc.confirmJoin(a.circle, b.user, { orderId: a.order.id })
    .then(() => ({ ok: true })).catch((e) => ({ ok: false, e: e?.message }));
  check("I4 跨用户订单不被认定为已履约", !crossUser.ok, crossUser.ok ? "错误地通过了" : `已拒绝：${crossUser.e}`);
  const bMember = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: b.circle, userId: b.user } } });
  check("I4 未给未支付的 b 建成员", !bMember, bMember ? "错误地建了成员" : "无");
}

async function i5() {
  cacheDeleted.length = 0;
  const svc = makePaymentService();
  const f = await fixture({ status: "PENDING" });
  await payViaRealEntry(svc, f.order.id);
  const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  // 用 circle-refund.service.ts:229-231 的原始查询验证追回链路能找到这条收益
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "ownerShare" FROM "CircleRevenueRecord" WHERE "sourceId"=$1 AND "type"='circle_join' ORDER BY "createdAt" DESC LIMIT 1`,
    m.id,
  );
  check("I5 退款追回的原始查询能命中本次收益记录", rows.length === 1, `命中 ${rows.length} 行`);
  const all = await prisma.circleRevenueRecord.count({ where: { circleId: f.circle, type: "circle_join" } });
  check("I5 同一单只有一条 circle_join 收益", all === 1, `记录数=${all}`);
}

async function i6() {
  cacheDeleted.length = 0;
  const svc = makePaymentService();
  const f = await fixture({ status: "PENDING" });
  await payViaRealEntry(svc, f.order.id); // 真实 adminPayOrder
  const m = await prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } });
  const rows = await revRows(f.circle);
  check("I6 真实 adminPayOrder 完成履约", !!m, m ? "已入圈" : "未入圈");
  check("I6 真实 adminPayOrder 做了缓存失效",
    cacheDeleted.includes(`circles:member:${f.circle}:${f.user}`), cacheDeleted.join(","));
  check("I6 真实 adminPayOrder 记了收益", rows.length === 1 && Number(rows[0].amount) > 0,
    JSON.stringify(rows.map((r) => Number(r.amount))));
}

/** I7 真实网关回调路径（processPaidOrder）同样完成履约 + 缓存 + 收益 */
async function i7() {
  cacheDeleted.length = 0;
  const svc = makePaymentService();
  const f = await fixture({ status: "PENDING" });
  await payViaGatewayPath(svc, f.order.id, `${RUN}-gw-tx`);
  const [m, o, rows] = await Promise.all([
    prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: f.circle, userId: f.user } } }),
    prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } }),
    revRows(f.circle),
  ]);
  check("I7 真实网关回调路径完成履约", !!m && o.status === "COMPLETED", `member=${!!m} status=${o.status}`);
  check("I7 网关路径做了缓存失效",
    cacheDeleted.includes(`circles:member:${f.circle}:${f.user}`) && cacheDeleted.includes(`circles:detail:${f.circle}`),
    cacheDeleted.join(","));
  check("I7 网关路径记了收益", rows.length === 1 && Number(rows[0].amount) > 0,
    JSON.stringify(rows.map((r) => Number(r.amount))));
}

// ─────────────────────────── 主流程 ───────────────────────────
try {
  console.log("=== 圈子履约 · 真实业务入口集成验证 ===");
  await cleanup();
  const f1 = await i1();
  await i2();
  await i3(f1);
  await i4();
  await i5();
  await i6();
  await i7();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
