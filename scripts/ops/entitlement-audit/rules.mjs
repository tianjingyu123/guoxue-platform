/**
 * 权益异常只读检测 —— 纯函数规则集。
 *
 * 本文件不访问数据库、不访问网络、不写任何文件。输入是一个已归一化的快照对象，
 * 输出是发现列表。这样规则可以用合成数据完整自测，无需连接任何数据库。
 *
 * 设计约束：
 *  - 只读：不返回任何「建议执行的写操作」，不提供补发接口。
 *  - 不把「到期」「退款」「续费」「重复回调」算成异常。
 *  - 默认输出脱敏标识与汇总；调用方决定是否展开明细。
 */

import { createHmac, randomBytes } from "node:crypto";
import { ORDER_TYPE_TRUTH, PAID_STATUSES, GRANT_ACTIONS, SEVERITY } from "./truth-sources.mjs";

// ───────────────────────── 脱敏 ─────────────────────────

/**
 * 脱敏引用盐。
 *  - 默认每次运行随机生成：同一份报告内可区分记录，跨报告无法关联，泄露面最小。
 *  - 需要跨报告追踪同一条记录时，由调用方显式设置 AUDIT_REF_SALT（自行承担可关联性）。
 * 盐本身不出现在任何输出中。
 */
let REF_SALT = process.env.AUDIT_REF_SALT || randomBytes(16).toString("hex");

/** 仅供自测使用：固定盐以获得可重复的脱敏引用 */
export function setRefSalt(salt) {
  REF_SALT = String(salt);
}

/**
 * 脱敏引用：前 4 位 + 长度 + HMAC 短摘要。
 * 保留前 4 位只为让人看出这是订单还是用户；摘要保证不同记录不会撞成同一个引用
 * （早期版本只取首尾各 4 位，syn-ord-circle-gap / syn-ord-member-gap 会撞成同一串）。
 * 摘要不可逆，需要完整订单号处置时由有权限的人按 rule + 时间窗在后台自行定位。
 */
export function maskRef(id) {
  if (id == null) return null;
  const s = String(id);
  const digest = createHmac("sha256", REF_SALT).update(s).digest("hex").slice(0, 8);
  return `${s.slice(0, 4)}…${s.length}#${digest}`;
}

/** 金额只输出量级桶，不输出精确金额 */
export function amountBucket(v) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 10) return "<10";
  if (n < 100) return "10-100";
  if (n < 1000) return "100-1k";
  if (n < 10000) return "1k-10k";
  return ">=10k";
}

/** 时长只输出桶，不输出精确毫秒 */
export function durationBucket(ms) {
  if (ms == null || !Number.isFinite(ms)) return "unknown";
  if (ms < 0) return "negative";
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return "<1m";
  if (ms < 15 * 60_000) return "<15m";
  if (ms < 60 * 60_000) return "<1h";
  if (ms < 24 * 60 * 60_000) return "<1d";
  return ">=1d";
}

// ───────────────────────── 工具 ─────────────────────────

const toTime = (v) => (v == null ? null : new Date(v).getTime());
const isPaidStatus = (s) => PAID_STATUSES.includes(s);
const isRefunded = (o) => o.status === "REFUNDED" || o.refundedAt != null;

function finding(rule, severity, order, extra = {}) {
  return {
    rule,
    severity,
    orderRef: maskRef(order.id),
    userRef: maskRef(order.userId),
    orderType: order.type,
    targetRef: maskRef(order.targetId),
    amountBucket: amountBucket(order.payAmount ?? order.amount),
    ...extra,
  };
}

/** 按 sourceId 归组台账 */
function indexLedgerByOrder(ledger) {
  const bySource = new Map();
  for (const row of ledger) {
    if (row.sourceType !== "ORDER" || !row.sourceId) continue;
    if (!bySource.has(row.sourceId)) bySource.set(row.sourceId, []);
    bySource.get(row.sourceId).push(row);
  }
  return bySource;
}

/** 台账中被 REVOKE 冲正掉的 GRANT id 集合 */
function reversedGrantIds(ledger) {
  const set = new Set();
  for (const row of ledger) {
    if (row.action === "REVOKE" && row.reversesLedgerId) set.add(row.reversesLedgerId);
  }
  return set;
}

/**
 * 实际可用判据（依据 entitlement.service.ts:273-335 与读模型 :400-404）：
 * status=ACTIVE 且 未过期 且 (unlimited 或 quantity>0)。
 * 注意：status='REVOKED' 既可能是退款冲正，也可能只是自然到期后重算的结果，
 * 因此不能只看 status。
 */
export function balanceUsable(balance, now) {
  if (!balance) return false;
  if (balance.status !== "ACTIVE") return false;
  const until = toTime(balance.validUntil);
  if (until != null && until <= now) return false;
  return Boolean(balance.unlimited) || Number(balance.quantity ?? 0) > 0;
}

// ───────────────────── 真源生效判定 ─────────────────────

/**
 * 判断某笔已支付订单对应的「实际权益真源」在支付之后是否生效。
 * 返回 { verdict: 'ok' | 'gap' | 'skip' | 'needs_review', reason }
 *
 * 判定一律以「订单 paidAt 之后真源是否被推进」为准，而不是「现在是否还有效」，
 * 这样自然到期不会被算成缺口。
 */
export function evaluateAccessTruth(order, snap) {
  const spec = ORDER_TYPE_TRUTH[order.type];
  if (!spec) return { verdict: "needs_review", reason: `未登记的订单类型 ${order.type}` };

  const paidAt = toTime(order.paidAt);
  switch (spec.accessTruth) {
    case "none":
      return { verdict: "skip", reason: "实物订单无权益" };

    case "order_only":
      // 访问判定直接读 Order，订单本身已 PAID 即视为可用；只做台账一致性观察
      return { verdict: "skip", reason: "访问判定直接读 Order" };

    case "unverified":
      return { verdict: "needs_review", reason: "未定位到统一访问判定入口，仅做台账观察" };

    case "circle_member": {
      const m = snap.circleMembers.find(
        (x) => x.circleId === order.targetId && x.userId === order.userId,
      );
      if (m) {
        // 成员存在：对 JOIN 视为已履约；对 RENEW 还需确认到期时间确实被顺延到 paidAt 之后
        if (order.type === "CIRCLE_RENEW") {
          const exp = toTime(m.expireAt);
          if (exp == null) return { verdict: "ok", reason: "永久成员" };
          if (exp > paidAt) return { verdict: "ok", reason: "到期时间在支付之后" };
          return { verdict: "gap", reason: "续费已支付但到期时间未顺延" };
        }
        return { verdict: "ok", reason: "成员存在" };
      }
      // 成员不存在。必须区分「从未履约」与「履约后又离开/被移出/自然到期被清理」。
      // 判别依据：confirmJoin/confirmRenew 成功后会把订单置为 COMPLETED
      // （circle-membership.service.ts:239-255 与 :414-426）。
      if (order.status === "COMPLETED") {
        return {
          verdict: "skip",
          reason: "订单已 COMPLETED，说明曾成功履约；成员缺失属退出/移出/到期清理",
        };
      }
      return { verdict: "gap", reason: "已支付且订单未 COMPLETED，但无 CircleMember" };
    }

    case "user_member": {
      const u = snap.users.find((x) => x.id === order.userId);
      if (!u) return { verdict: "needs_review", reason: "用户不存在" };
      const exp = toTime(u.memberExpire);
      const levelOk = u.memberLevel && u.memberLevel !== "NONE";
      // 终身会员 memberExpire 为空（course-purchase.service.ts:181-186 同口径）
      if (levelOk && exp == null) return { verdict: "ok", reason: "终身会员" };
      if (levelOk && exp != null && exp > paidAt) return { verdict: "ok", reason: "会员到期在支付之后" };
      return { verdict: "gap", reason: "已支付但会员态未推进" };
    }

    case "practitioner": {
      const p = snap.practitionerProfiles.find((x) => x.userId === order.userId);
      if (!p) return { verdict: "gap", reason: "已支付但无 PractitionerProfile" };
      const exp = toTime(p.proExpireAt);
      if (exp != null && exp > paidAt) return { verdict: "ok", reason: "从业者会员到期在支付之后" };
      return { verdict: "gap", reason: "已支付但 proExpireAt 未顺延" };
    }

    case "station": {
      const s = snap.stations.find((x) => x.id === order.targetId);
      if (!s) return { verdict: "needs_review", reason: "订单指向的分站不存在" };
      const exp = toTime(s.expireAt);
      if (exp != null && exp > paidAt) return { verdict: "ok", reason: "分站到期在支付之后" };
      return { verdict: "gap", reason: "已支付但 Station.expireAt 未顺延" };
    }

    case "operator": {
      const op = snap.operators.find((x) => x.userId === order.userId);
      if (!op) return { verdict: "gap", reason: "已支付但无 Operator 记录" };
      const exp = toTime(op.expireAt);
      if (exp != null && exp > paidAt) return { verdict: "ok", reason: "运营商到期在支付之后" };
      return { verdict: "gap", reason: "已支付但 Operator.expireAt 未顺延" };
    }

    default:
      return { verdict: "needs_review", reason: `未处理的真源 ${spec.accessTruth}` };
  }
}

/**
 * 「未决规则暂停」的原因码。
 *
 * ⚠️ 必须与服务端 `apps/server/src/modules/shop/circle-fulfillment.ts` 的 `MANUAL_REASONS` 一致。
 * 这里是独立的 .mjs 检测器，不引 TS 源码；selftest 有一条断言会去读那个文件比对，防止两边漂移。
 */
export const PAUSED_REASONS = Object.freeze({
  DUPLICATE_ACTIVE_JOIN: "duplicate_active_join",
  RENEW_WITHOUT_MEMBER: "renew_without_member",
  CIRCLE_NOT_ACTIVE: "circle_not_active",
});

/**
 * 判断一笔已支付的圈子订单是否命中「未决规则」的数据形状。
 *
 * 重要限制（必须如实写进报告）：检测器只看数据库状态，**推断**这笔订单会被履约逻辑判为
 * needs_manual；它无法区分「服务端真的跑过并主动暂停」与「服务端根本没跑过、只是状态恰好长这样」。
 * 在修复上线前，这些形状同样存在，只是当时没有任何代码会去暂停它们。
 * 因此结果里带 `inferred: true`，不要当成「服务端已处理过」的证据。
 *
 * 判别顺序与 `fulfillCircleOrderTx` 的决策顺序保持一致：
 *   圈子非 ACTIVE → 无成员且是 RENEW → 有有效成员且是 JOIN
 *
 * @returns 原因码，或 null（不是未决规则形状）
 */
export function classifyPausedReason(order, snap) {
  if (order.type !== "CIRCLE_JOIN" && order.type !== "CIRCLE_RENEW") return null;
  const circle = snap.circles?.find((c) => c.id === order.targetId);
  // 圈子信息拿不到时不猜：宁可让它落回 fulfillment_gap，也不要报一个可能错的原因码。
  if (!circle) return null;
  if (circle.status !== "ACTIVE") return PAUSED_REASONS.CIRCLE_NOT_ACTIVE;

  const member = snap.circleMembers.find(
    (m) => m.circleId === order.targetId && m.userId === order.userId,
  );
  if (!member) {
    return order.type === "CIRCLE_RENEW" ? PAUSED_REASONS.RENEW_WITHOUT_MEMBER : null;
  }
  if (order.type === "CIRCLE_JOIN") {
    const exp = toTime(member.expireAt);
    const stillActive = exp == null || exp > snap.now;
    if (!stillActive) return null;
    // 关键区分：成员是**这一单**建的，还是本来就存在？
    //  - joinedAt >= paidAt：成员就是这笔支付带来的，只是订单状态没同步 → 属 F4 订单状态滞留，
    //    对用户无损，改个状态就行；
    //  - joinedAt <  paidAt：用户付款前就已经是有效成员 → 这笔钱没换来任何额外权益，
    //    属 F7 未决规则（duplicate_active_join），要人拍板。
    // 只看「有没有成员」会把这两种完全不同的情况混成一类。
    const joinedAt = toTime(member.joinedAt);
    const paidAt = toTime(order.paidAt);
    if (joinedAt != null && paidAt != null && joinedAt < paidAt) {
      return PAUSED_REASONS.DUPLICATE_ACTIVE_JOIN;
    }
    return null;
  }
  return null;
}

/** 各原因码对应的处置提示（给运营看的，不是给代码用的） */
const PAUSED_ACTION = Object.freeze({
  duplicate_active_join: "用户已是有效成员却又付了一笔入圈单：需产品/财务决定叠加时长还是退款（决策点 D4）",
  renew_without_member: "成员行已被到期清理后收到续费单：需产品决定按续期还是新购、起算点（决策点 D1）",
  circle_not_active: "圈子已下架/停用时收到支付：需产品/内容治理决定是否仍履约或退款（决策点 D5）",
});

// ───────────────────────── 规则 ─────────────────────────

/**
 * F1 履约缺口：已支付，但实际权益真源未被推进。
 * 只覆盖真源明确的类型；order_only / unverified 不进本规则。
 */
export function ruleFulfillmentGap(snap, opts) {
  const out = [];
  const graceMs = opts.graceMinutes * 60_000;
  for (const o of snap.orders) {
    if (!isPaidStatus(o.status) || o.paidAt == null) continue;
    if (isRefunded(o)) continue; // 退款单交 F3
    if (snap.now - toTime(o.paidAt) < graceMs) continue; // 允许的发放延迟

    // 命中未决规则的形状归 fulfillment_paused，不混进「从未处理」的缺口里：
    // 两者的处置完全不同 —— 一个要修代码/补履约，一个要人拍板业务规则。
    if (classifyPausedReason(o, snap)) continue;

    const r = evaluateAccessTruth(o, snap);
    if (r.verdict !== "gap" && r.verdict !== "needs_review") continue;
    if (r.verdict === "needs_review") continue; // needs_review 单独计数，不进 F1

    out.push(
      finding("fulfillment_gap", SEVERITY.HIGH, o, {
        accessTruth: ORDER_TYPE_TRUTH[o.type].accessTruth,
        reason: r.reason,
        ageBucket: durationBucket(snap.now - toTime(o.paidAt)),
      }),
    );
  }
  return out;
}

/**
 * F2 台账一致性：支付后处理器应写 EntitlementLedger 却没有对应 GRANT。
 * 明确标注 impactsAccess，避免把「台账缺失」说成「用户拿不到」。
 */
export function ruleLedgerInconsistent(snap, opts) {
  const out = [];
  const graceMs = opts.graceMinutes * 60_000;
  const bySource = indexLedgerByOrder(snap.entitlementLedger);
  for (const o of snap.orders) {
    const spec = ORDER_TYPE_TRUTH[o.type];
    if (!spec || !spec.ledgerExpected) continue;
    if (!isPaidStatus(o.status) || o.paidAt == null) continue;
    if (isRefunded(o)) continue;
    if (snap.now - toTime(o.paidAt) < graceMs) continue;

    const rows = bySource.get(o.id) || [];
    const hasGrant = rows.some((r) => GRANT_ACTIONS.includes(r.action));
    if (hasGrant) continue;

    out.push(
      finding("ledger_inconsistent", SEVERITY.MEDIUM, o, {
        impactsAccess: spec.accessTruth === "order_only" ? false : "unknown",
        note: spec.note,
        ageBucket: durationBucket(snap.now - toTime(o.paidAt)),
      }),
    );
  }
  return out;
}

/**
 * F3 退款后权益仍可用。
 * 会员类需先排除「该用户还有其他未退款的有效会员单」，否则续费场景会误报。
 */
export function ruleRefundNotRevoked(snap) {
  const out = [];
  const reversed = reversedGrantIds(snap.entitlementLedger);
  const bySource = indexLedgerByOrder(snap.entitlementLedger);

  for (const o of snap.orders) {
    if (!isRefunded(o)) continue;
    const spec = ORDER_TYPE_TRUTH[o.type];
    if (!spec || spec.accessTruth === "none") continue;

    // ① 台账侧：存在未被冲正的 GRANT
    if (spec.ledgerExpected) {
      const grants = (bySource.get(o.id) || []).filter((r) => GRANT_ACTIONS.includes(r.action));
      const live = grants.filter((g) => !reversed.has(g.id));
      if (live.length > 0) {
        out.push(
          finding("refund_not_revoked", SEVERITY.HIGH, o, {
            aspect: "ledger",
            liveGrantCount: live.length,
          }),
        );
        continue;
      }
    }

    // ② 真源侧
    if (spec.accessTruth === "circle_member") {
      const m = snap.circleMembers.find(
        (x) => x.circleId === o.targetId && x.userId === o.userId,
      );
      const exp = m ? toTime(m.expireAt) : null;
      if (m && (exp == null || exp > snap.now)) {
        out.push(finding("refund_not_revoked", SEVERITY.HIGH, o, { aspect: "circle_member" }));
      }
    } else if (spec.accessTruth === "user_member") {
      // 排除：该用户还有别的未退款已支付会员单在生效
      const otherLive = snap.orders.some(
        (x) =>
          x.id !== o.id &&
          x.userId === o.userId &&
          x.type === "MEMBER" &&
          isPaidStatus(x.status) &&
          !isRefunded(x),
      );
      if (otherLive) continue;
      const u = snap.users.find((x) => x.id === o.userId);
      const exp = u ? toTime(u.memberExpire) : null;
      if (u && u.memberLevel && u.memberLevel !== "NONE" && (exp == null || exp > snap.now)) {
        out.push(finding("refund_not_revoked", SEVERITY.HIGH, o, { aspect: "user_member" }));
      }
    }
  }
  return out;
}

/**
 * F4 幂等健康度。预期恒为 0；非 0 即说明唯一约束或幂等键构造有问题。
 * 这里不产出订单级 finding，而是产出计数项，避免泄露成组主键。
 */
export function ruleIdempotency(snap) {
  const out = [];

  // ① 同一订单 + 同一 entitlementKey 出现多条 GRANT
  const grantKey = new Map();
  for (const r of snap.entitlementLedger) {
    if (r.sourceType !== "ORDER" || !r.sourceId) continue;
    if (!GRANT_ACTIONS.includes(r.action)) continue;
    const k = `${r.sourceId}|${r.entitlementKey}|${r.resourceType ?? ""}|${r.resourceId ?? ""}`;
    grantKey.set(k, (grantKey.get(k) ?? 0) + 1);
  }
  const dupGrants = [...grantKey.values()].filter((n) => n > 1).length;
  if (dupGrants > 0) {
    out.push({
      rule: "idempotency_violation",
      severity: SEVERITY.CRITICAL,
      aspect: "duplicate_grant",
      count: dupGrants,
    });
  }

  // ② 同一 payTransactionId 对应多单（空值不计）
  const tx = new Map();
  for (const o of snap.orders) {
    if (!o.payTransactionId) continue;
    tx.set(o.payTransactionId, (tx.get(o.payTransactionId) ?? 0) + 1);
  }
  const dupTx = [...tx.values()].filter((n) => n > 1).length;
  if (dupTx > 0) {
    out.push({
      rule: "idempotency_violation",
      severity: SEVERITY.CRITICAL,
      aspect: "duplicate_pay_transaction",
      count: dupTx,
    });
  }

  // ③ 同一 MemberPurchase.orderId 出现多条（空值不计）
  const mp = new Map();
  for (const p of snap.memberPurchases) {
    if (!p.orderId) continue;
    mp.set(p.orderId, (mp.get(p.orderId) ?? 0) + 1);
  }
  const dupMp = [...mp.values()].filter((n) => n > 1).length;
  if (dupMp > 0) {
    out.push({
      rule: "idempotency_violation",
      severity: SEVERITY.CRITICAL,
      aspect: "duplicate_member_purchase",
      count: dupMp,
    });
  }

  return out;
}

/**
 * F5 台账-投影漂移（观察项，不告警）。
 *  a) Balance 与按 ledger 重算结果不一致
 *  b) status='ACTIVE' 但已过期（已知设计：余额不定时重算，读模型用 effectiveStatus 兜底）
 */
export function ruleBalanceDrift(snap) {
  const reversed = reversedGrantIds(snap.entitlementLedger);
  const byIdentity = new Map();
  for (const r of snap.entitlementLedger) {
    const k = `${r.userId}|${r.entitlementKey}|${r.resourceType ?? ""}|${r.resourceId ?? ""}|${r.scope ?? "GLOBAL"}`;
    if (!byIdentity.has(k)) byIdentity.set(k, []);
    byIdentity.get(k).push(r);
  }

  let driftCount = 0;
  let staleActiveCount = 0;

  for (const b of snap.entitlementBalance) {
    const k = `${b.userId}|${b.entitlementKey}|${b.resourceType ?? ""}|${b.resourceId ?? ""}|${b.scope ?? "GLOBAL"}`;
    const rows = byIdentity.get(k) ?? [];
    // 复算（与 rebuildBalanceWithTx 同口径）
    const activeGrants = rows.filter(
      (r) =>
        GRANT_ACTIONS.includes(r.action) &&
        !reversed.has(r.id) &&
        (r.validUntil == null || toTime(r.validUntil) > snap.now),
    );
    const adjustments = rows
      .filter((r) => ["CONSUME", "ADJUST"].includes(r.action))
      .reduce((s, r) => s + Number(r.quantity ?? 0), 0);
    const expectQty = Math.max(
      0,
      activeGrants.reduce((s, r) => s + Number(r.quantity ?? 0), 0) + adjustments,
    );
    const expectUnlimited = activeGrants.some((r) => r.unlimited);
    const expectStatus = activeGrants.length ? "ACTIVE" : "REVOKED";

    if (
      Number(b.quantity ?? 0) !== expectQty ||
      Boolean(b.unlimited) !== expectUnlimited ||
      b.status !== expectStatus
    ) {
      driftCount += 1;
    }

    const until = toTime(b.validUntil);
    if (b.status === "ACTIVE" && until != null && until <= snap.now) staleActiveCount += 1;
  }

  const out = [];
  if (driftCount > 0) {
    out.push({ rule: "balance_drift", severity: SEVERITY.INFO, aspect: "recompute_mismatch", count: driftCount });
  }
  if (staleActiveCount > 0) {
    out.push({
      rule: "balance_drift",
      severity: SEVERITY.INFO,
      aspect: "active_but_expired",
      count: staleActiveCount,
      note: "已知设计：余额只在 grant/consume/revoke 时重算，读模型用 effectiveStatus 兜底",
    });
  }
  return out;
}

/**
 * F6 订单状态滞留：圈子订单已履约（成员存在）但订单仍停在 PAID。
 * 典型成因：confirmJoin 抛「已是圈子成员」被客户端吞掉，订单未被置 COMPLETED。
 * 不影响用户可用，属数据一致性观察。
 */
export function ruleOrderStatusStale(snap, opts) {
  const out = [];
  const graceMs = opts.graceMinutes * 60_000;
  for (const o of snap.orders) {
    if (o.type !== "CIRCLE_JOIN" && o.type !== "CIRCLE_RENEW") continue;
    if (o.status !== "PAID" || o.paidAt == null) continue;
    if (isRefunded(o)) continue;
    if (snap.now - toTime(o.paidAt) < graceMs) continue;
    const m = snap.circleMembers.find((x) => x.circleId === o.targetId && x.userId === o.userId);
    if (!m) continue; // 无成员的情况归 F1
    // 已被 F1 判为履约缺口的（如续费未顺延）不重复计入，避免同一笔订单双报
    if (evaluateAccessTruth(o, snap).verdict === "gap") continue;
    // 「已是有效成员又来一笔 JOIN 单」不是订单状态滞留，而是待人工的未决规则，归 F7。
    if (classifyPausedReason(o, snap)) continue;
    out.push(
      finding("order_status_stale", SEVERITY.LOW, o, {
        ageBucket: durationBucket(snap.now - toTime(o.paidAt)),
      }),
    );
  }
  return out;
}

/**
 * F7 未决规则暂停：已支付、未履约，且命中一条**尚未拍板**的业务规则。
 *
 * 与 F1 `fulfillment_gap` 的区别：
 *  - F1 = 系统本该履约却没履约 → 修代码 / 跑补偿；
 *  - F7 = 规则没定，系统**主动不处理** → 需要人拍板，补偿跑多少次都不会变。
 * 混在一起会让运营把「等人决策」当成「系统坏了」，反复触发补偿也毫无效果。
 *
 * 严重级别定为 medium 而非 high：用户的钱已经收了但权益没给，确实要处理；
 * 但它不是故障，重跑补偿解决不了，需要的是决策而不是抢修。
 */
export function ruleFulfillmentPaused(snap, opts) {
  const out = [];
  const graceMs = opts.graceMinutes * 60_000;
  for (const o of snap.orders) {
    if (!isPaidStatus(o.status) || o.paidAt == null) continue;
    if (o.status === "COMPLETED") continue; // 已履约完成，不是暂停
    if (isRefunded(o)) continue;
    if (snap.now - toTime(o.paidAt) < graceMs) continue;
    const reason = classifyPausedReason(o, snap);
    if (!reason) continue;
    out.push(
      finding("fulfillment_paused", SEVERITY.MEDIUM, o, {
        pausedReason: reason,
        suggestedAction: PAUSED_ACTION[reason],
        // 只能从数据形状推断，不代表服务端真的跑过并暂停过。见 classifyPausedReason 的注释。
        inferred: true,
        ageBucket: durationBucket(snap.now - toTime(o.paidAt)),
      }),
    );
  }
  return out;
}

/** 发放延迟分布（观察项）：台账首条 GRANT 与 paidAt 的差值分桶 */
export function measureGrantDelay(snap) {
  const bySource = indexLedgerByOrder(snap.entitlementLedger);
  const buckets = new Map();
  for (const o of snap.orders) {
    const spec = ORDER_TYPE_TRUTH[o.type];
    if (!spec?.ledgerExpected) continue;
    if (!isPaidStatus(o.status) || o.paidAt == null) continue;
    const grants = (bySource.get(o.id) || []).filter((r) => GRANT_ACTIONS.includes(r.action));
    if (grants.length === 0) continue;
    const first = Math.min(...grants.map((g) => toTime(g.createdAt)));
    const b = durationBucket(first - toTime(o.paidAt));
    const k = `${o.type}|${b}`;
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([k, count]) => {
    const [orderType, bucket] = k.split("|");
    return { orderType, bucket, count };
  });
}

/** 未覆盖项计数：真源未定位的订单类型，避免「没报异常」被误读为「全都正常」 */
export function measureNeedsReview(snap, opts) {
  const graceMs = opts.graceMinutes * 60_000;
  const counts = new Map();
  for (const o of snap.orders) {
    if (!isPaidStatus(o.status) || o.paidAt == null) continue;
    if (isRefunded(o)) continue;
    if (snap.now - toTime(o.paidAt) < graceMs) continue;
    if (classifyPausedReason(o, snap)) continue;
    const r = evaluateAccessTruth(o, snap);
    if (r.verdict !== "needs_review") continue;
    counts.set(o.type, (counts.get(o.type) ?? 0) + 1);
  }
  return [...counts.entries()].map(([orderType, count]) => ({ orderType, count }));
}

// ───────────────────────── 汇总 ─────────────────────────

export const DEFAULT_OPTS = Object.freeze({
  graceMinutes: 15,
  maxFindingsPerRule: 20,
});

/**
 * 运行全部规则。
 * @param snap 归一化快照（见 fixtures.mjs 的形状说明）
 * @param userOpts { graceMinutes, maxFindingsPerRule }
 * @returns { summary, findings, observations }
 */
export function runRules(snap, userOpts = {}) {
  const opts = { ...DEFAULT_OPTS, ...userOpts };
  const findings = [
    ...ruleFulfillmentGap(snap, opts),
    ...ruleLedgerInconsistent(snap, opts),
    ...ruleRefundNotRevoked(snap),
    ...ruleOrderStatusStale(snap, opts),
    ...ruleFulfillmentPaused(snap, opts),
  ];
  const observations = [
    ...ruleIdempotency(snap),
    ...ruleBalanceDrift(snap),
  ];

  const summary = {};
  for (const f of findings) {
    const k = `${f.rule}:${f.severity}`;
    summary[k] = (summary[k] ?? 0) + 1;
  }
  for (const o of observations) {
    const k = `${o.rule}:${o.severity}:${o.aspect}`;
    summary[k] = (summary[k] ?? 0) + (o.count ?? 1);
  }

  // 每条规则截断，避免报告过大
  const byRule = new Map();
  const capped = [];
  for (const f of findings) {
    const n = byRule.get(f.rule) ?? 0;
    if (n < opts.maxFindingsPerRule) capped.push(f);
    byRule.set(f.rule, n + 1);
  }

  return {
    summary,
    findings: capped,
    truncated: findings.length > capped.length,
    observations,
    grantDelay: measureGrantDelay(snap),
    needsReview: measureNeedsReview(snap, opts),
  };
}
