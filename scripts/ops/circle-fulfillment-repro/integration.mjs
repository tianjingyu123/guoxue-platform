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
 *   I8 旧 confirmRenew 两笔不同续费订单并发：共顺延 2 年（含对旧「事务外读基线」算法的反证）
 *   I9 旧 confirmJoin 对「成员行已过期」的订单能正常履约（旧实现会撞唯一约束报「已加入该圈子」）
 *   I10 圈规确认前移到下单前：未确认的用户连待支付订单都建不出来（决策点 D3）
 *
 * 只对本机隔离测试库运行，合成数据 `int-` 前缀。不连生产、不动真实订单、不发真实通知。
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

req("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs", target: "es2022", experimentalDecorators: true, emitDecoratorMetadata: true } });
const ROOT = SRC_ROOT;
const { ShopPaymentService } = req(`${ROOT}/modules/shop/shop-payment.service.ts`);
const { CircleMembershipService } = req(`${ROOT}/modules/circle/services/circle-membership.service.ts`);
const { CommissionService } = req(`${ROOT}/modules/commission/commission.service.ts`);
const { ShopOrderLifecycleService } = req(`${ROOT}/modules/shop/shop-order-lifecycle.service.ts`);
const { CIRCLE_REVENUE_TYPE } = req(`${ROOT}/modules/shop/circle-fulfillment.ts`);

const prisma = new PrismaClient({ datasources: { db: { url: args.dsn } } });
// 第二条**独立连接**：并发用例必须让两侧各自持有自己的事务，同一个连接串不起来真并发。
const prismaB = new PrismaClient({ datasources: { db: { url: args.dsn } } });
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
function makeCircleService(client = prisma, governance = undefined) {
  return new CircleMembershipService(
    client,
    redisStub,
    { calculateTargetPrice: async () => ({ effectivePrice: 199, originalPrice: 199, appliedPromotion: null }) },
    {},              // shared
    undefined,       // coinService
    makeCommission(), // commissionService（真实服务）
    undefined,       // notificationService
    governance,      // governance（I10 注入，用于圈规确认门禁）
  );
}

/**
 * 两方可控屏障：双方都到达后才一起放行。
 * 并发反证不能靠「碰运气重叠」——重跑几次总有一次不重叠，绿了也不说明问题。
 */
function makeBarrier(parties) {
  let arrived = 0, release;
  const gate = new Promise((r) => { release = r; });
  return async function wait() {
    arrived += 1;
    if (arrived >= parties) release();
    return gate;
  };
}

/**
 * 有界等待某个条件成立。**只用于等待代码里明确声明的 fire-and-forget 异步写入完成**，
 * 不是「失败就重试直到变绿」：超时即判失败，由调用方断言。
 */
async function waitFor(fn, { timeoutMs = 4000, stepMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, stepMs));
  }
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
  // 平台费双计（N2）是既有缺陷，本候选**不得扩大**它。旧路径的 `recordCircleRevenue` 内部是
  // 「写收益行」与「写平台费」两件事并行发起：收益行撞唯一约束被拒，平台费那一条照样落库。
  // 所以「不扩大」必须断言在**调用层面**——本单已由服务端履约时，旧路径整个不进记账。
  // 只数 PlatformFeeRecord 行数不行：费率未配置时它本来就一条都不写，断言会恒真而无区分力。
  const revenueCalls = [];
  const spyCommission = makeCommission();
  const realRecord = spyCommission.recordCircleRevenue.bind(spyCommission);
  spyCommission.recordCircleRevenue = async (...a) => { revenueCalls.push(a); return realRecord(...a); };
  circleSvc.commissionService = spyCommission;
  // I1 里服务端已履约，客户端仍会补调 confirmJoin
  const res = await circleSvc.confirmJoin(f1.circle, f1.user, { orderId: f1.order.id, payMethod: "WECHAT" })
    .then((r) => ({ ok: true, r })).catch((e) => ({ ok: false, e: e?.message }));
  check("I3 旧 confirmJoin 重复调用返回已完成结果，不再抛错", res.ok && res.r?.alreadyFulfilled === true,
    res.ok ? `alreadyFulfilled=${res.r?.alreadyFulfilled}` : `抛错：${res.e}`);
  const afterRows = (await revRows(f1.circle)).length;
  check("I3 旧 confirmJoin 未重复记账", afterRows === beforeRows, `${beforeRows} → ${afterRows}`);
  const cnt = await prisma.circleMember.count({ where: { circleId: f1.circle, userId: f1.user } });
  check("I3 旧 confirmJoin 未重复履约", cnt === 1, `members=${cnt}`);
  check("I3 旧 confirmJoin 补调根本不进记账（因此不扩大既有平台费双计）",
    revenueCalls.length === 0,
    `recordCircleRevenue 调用 ${revenueCalls.length} 次（改动前为 1 次：收益行被唯一约束拒掉，平台费仍会写）`);

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

/**
 * I8 旧 `confirmRenew` 的**并发顺延**。
 *
 * 原实现虽然把顺延与订单完结放进同一事务，却在**事务外**读 `member.expireAt` 当基线。
 * 两笔不同的续费订单并发时，双方读到同一个基线，各自写「基线 + 1 年」，后写覆盖先写 ——
 * 用户付了两笔只拿到一年，而且两笔订单都 COMPLETED，账面看不出问题。
 *
 * 现在 `confirmRenew` 调用真实履约实现（订单行锁 + 成员行锁内重新读到期时间），
 * 第二笔必然在第一笔提交后的新基线上顺延。
 *
 * 反证放在同一份数据形态上跑：先用旧算法复现「丢一年」，再用真实入口跑一遍对照。
 */
async function i8() {
  const base = new Date(Date.now() + 30 * DAY);

  // ── 反证：旧算法（事务外读基线，各自 +1 年）──
  {
    const f = await fixture({ type: "CIRCLE_RENEW", memberExpireAt: base });
    const o2 = await prisma.order.create({
      data: {
        userId: f.user, type: "CIRCLE_RENEW", targetId: f.circle, quantity: 1,
        amount: 199, payAmount: 199, status: "PAID", payMethod: "WECHAT",
        payTransactionId: `${RUN}-legacy-renew2`, paidAt: new Date(),
      },
    });
    // 旧算法：两侧都先在事务外读同一个 expireAt，再各自写 base+1 年。
    // 用屏障保证「两边都读完之后才开始写」——这正是旧实现无法排除的交错，
    // 不靠反复重跑去碰这个时序。
    const barrier = makeBarrier(2);
    const legacyRenew = async (client, orderId) => {
      const m = await client.circleMember.findUnique({
        where: { circleId_userId: { circleId: f.circle, userId: f.user } },
      });
      const next = new Date(new Date(m.expireAt).getTime() + 365 * DAY);
      await barrier(); // ← 两侧都读到同一个基线后才继续
      await client.$transaction(async (tx) => {
        await tx.circleMember.update({
          where: { circleId_userId: { circleId: f.circle, userId: f.user } }, data: { expireAt: next },
        });
        await tx.order.update({ where: { id: orderId }, data: { status: "COMPLETED", completedAt: new Date() } });
      });
    };
    await Promise.all([legacyRenew(prisma, f.order.id), legacyRenew(prismaB, o2.id)]);
    const m = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: f.circle, userId: f.user } },
    });
    const years = Math.round((new Date(m.expireAt).getTime() - base.getTime()) / (365 * DAY));
    check("I8 反证：旧算法在同一份数据上确实丢一年", years === 1,
      `旧算法顺延 ${years} 年（两笔订单应为 2 年）`);
  }

  // ── 真实入口：两笔续费并发 ──
  {
    const f = await fixture({ type: "CIRCLE_RENEW", memberExpireAt: base });
    const o2 = await prisma.order.create({
      data: {
        userId: f.user, type: "CIRCLE_RENEW", targetId: f.circle, quantity: 1,
        amount: 199, payAmount: 199, status: "PAID", payMethod: "WECHAT",
        payTransactionId: `${RUN}-renew2`, paidAt: new Date(),
      },
    });
    const svcA = makeCircleService(prisma);
    const svcB = makeCircleService(prismaB);
    const rs = await Promise.allSettled([
      svcA.confirmRenew(f.circle, f.user, { orderId: f.order.id }),
      svcB.confirmRenew(f.circle, f.user, { orderId: o2.id }),
    ]);
    check("I8 两笔并发续费均成功", rs.every((r) => r.status === "fulfilled"),
      rs.map((r) => r.status + (r.reason ? `:${r.reason.message}` : "")).join(","));

    const m = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: f.circle, userId: f.user } },
    });
    const years = Math.round((new Date(m.expireAt).getTime() - base.getTime()) / (365 * DAY));
    check("I8 旧 confirmRenew 并发下共顺延 2 年（不丢单）", years === 2, `实际顺延 ${years} 年`);

    const orders = await prisma.order.findMany({
      where: { id: { in: [f.order.id, o2.id] } }, select: { status: true },
    });
    check("I8 两笔订单均被认领为 COMPLETED",
      orders.every((o) => o.status === "COMPLETED"), orders.map((o) => o.status).join(","));

    const rows = await revRows(f.circle);
    check("I8 两笔续费各记一条收益（按订单幂等，不多不少）", rows.length === 2,
      JSON.stringify(rows.map((r) => Number(r.amount))));
  }
}

/**
 * I9 旧 `confirmJoin` 对「成员行仍在但已过期」的订单。
 *
 * 原实现走 `createMembership`，撞成员唯一约束直接抛「已加入该圈子」——
 * 用户已经付了钱却进不去，只能找客服。真实履约实现对这种情况是更新到期时间按新购处理。
 */
async function i9() {
  const expired = new Date(Date.now() - 10 * DAY);
  const f = await fixture({ memberExpireAt: expired });
  const svc = makeCircleService();
  let err = null;
  const r = await svc.confirmJoin(f.circle, f.user, { orderId: f.order.id, payMethod: "WECHAT" })
    .catch((e) => { err = e; return null; });

  check("I9 已过期成员再次入圈不再被误判为「已加入」", !err, err ? err.message : "未抛错");
  check("I9 到期时间被重新起算（按新购）",
    !!r?.expireAt && new Date(r.expireAt).getTime() > Date.now(), `到期=${r?.expireAt}`);
  const order = await prisma.order.findUnique({ where: { id: f.order.id }, select: { status: true } });
  check("I9 订单在同一事务内被认领为 COMPLETED", order.status === "COMPLETED", order.status);
  // confirmJoin 的收益记账是**声明好的 fire-and-forget**（不阻塞主流程，失败由对账补齐），
  // 因此这里有界等待它落库；超时即判失败，不重跑场景。
  const rows = await waitFor(async () => {
    const r = await revRows(f.circle);
    return r.length ? r : null;
  }) ?? [];
  check("I9 恰记一条收益且金额为实付价", rows.length === 1 && Number(rows[0].amount) === 199,
    JSON.stringify(rows.map((r) => Number(r.amount))));
}

/**
 * I10 圈规确认前移到下单前（决策点 D3）。
 *
 * 改动前这道门只在 `confirmJoin` 上，即**付款之后**；而服务端履约路径拿不到治理服务、
 * 根本不校验。结果要么是「未确认圈规的用户照样进圈」（门槛形同虚设），
 * 要么是「已收款之后被拒」（收钱不给货）。两种都不可接受。
 *
 * 前移到 `prepareJoin` 之后，未确认的用户**连待支付订单都建不出来**。
 * 断言的重点不是「抛错」，而是**一张 PENDING 订单都没留下** —— 抛错但订单已建，
 * 用户仍可能从别处把那张单付掉。
 */
async function i10() {
  // ── 未确认圈规 ──
  {
    const f = await fixture({ status: "COMPLETED" }); // 夹具订单置为终态，不干扰下面的计数
    const denying = {
      assertRuleAck: async () => {
        throw new Error("RULE_ACK_REQUIRED：请先阅读并确认圈规");
      },
    };
    const svc = makeCircleService(prisma, denying);
    const before = await prisma.order.count({ where: { userId: f.user, targetId: f.circle, status: "PENDING" } });
    let err = null;
    await svc.prepareJoin(f.circle, f.user, { payMethod: "WECHAT" }).catch((e) => { err = e; });
    check("I10 未确认圈规时下单被拒", !!err && /RULE_ACK_REQUIRED/.test(err.message ?? ""),
      err ? err.message : "未抛错（错误）");
    const after = await prisma.order.count({ where: { userId: f.user, targetId: f.circle, status: "PENDING" } });
    check("I10 被拒时一张待支付订单都没建（用户根本付不了钱）", after === before,
      `PENDING 订单 ${before} → ${after}`);
  }

  // ── 反证：已确认圈规（或该圈不要求）时行为完全不变 ──
  {
    const f = await fixture({ status: "COMPLETED" });
    const allowing = { assertRuleAck: async () => undefined };
    const svc = makeCircleService(prisma, allowing);
    const r = await svc.prepareJoin(f.circle, f.user, { payMethod: "WECHAT" });
    check("I10 反证：已确认圈规时照常建出待支付订单（门禁不误伤）",
      !!r?.orderId && r.needPayment === true, JSON.stringify({ orderId: r?.orderId, need: r?.needPayment }));
    const o = await prisma.order.findUnique({ where: { id: r.orderId }, select: { status: true, payAmount: true } });
    check("I10 反证：订单为 PENDING 且金额取自价格引擎",
      o?.status === "PENDING" && Number(o.payAmount) === 199, `${o?.status} / ${o?.payAmount}`);
  }
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
  await i8();
  await i9();
  await i10();
  await cleanup();
  console.log(lines.join("\n"));
  console.log(`=== ${pass} 通过 / ${fail} 失败 ===`);
  process.exitCode = fail > 0 ? 1 : 0;
} finally {
  await Promise.all([prisma.$disconnect(), prismaB.$disconnect()]);
}
