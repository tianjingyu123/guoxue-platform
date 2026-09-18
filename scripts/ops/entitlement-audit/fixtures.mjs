/**
 * 合成数据集（不含任何真实用户、订单或支付数据）。
 *
 * 覆盖评审要求的八类场景：
 *   1 正常到账      2 允许的发放延迟   3 已支付未到账    4 退款
 *   5 自然到期      6 续费             7 多次购买        8 重复支付回调
 * 另加：会员到账/未到账、台账漂移、订单状态滞留、真源未覆盖类型。
 *
 * 所有 id 均为 'syn-' 前缀的合成值，便于在任何输出中一眼识别为非真实数据。
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** 基准时刻：固定值，保证自测可重复 */
export const NOW = Date.parse("2026-09-18T12:00:00+08:00");

const at = (offsetMs) => new Date(NOW + offsetMs).toISOString();

export function buildSnapshot() {
  const orders = [];
  const entitlementLedger = [];
  const entitlementBalance = [];
  const circleMembers = [];
  const memberPurchases = [];
  const users = [];
  const practitionerProfiles = [];
  const stations = [];
  const operators = [];

  // ───────── 场景 1：正常到账 ─────────
  // 1a 课程：已支付 + 台账有 GRANT
  orders.push({
    id: "syn-ord-course-ok", userId: "syn-u1", type: "COURSE", targetId: "syn-course-1",
    quantity: 1, amount: 99, payAmount: 99, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-1", paidAt: at(-2 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-2 * HOUR - 60_000),
  });
  entitlementLedger.push({
    id: "syn-led-1", userId: "syn-u1", entitlementKey: "course.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-2 * HOUR), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-course-ok", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-course-ok:course.access",
    resourceType: "COURSE", resourceId: "syn-course-1", scope: "GLOBAL", createdAt: at(-2 * HOUR),
  });
  entitlementBalance.push({
    userId: "syn-u1", entitlementKey: "course.access", resourceType: "COURSE",
    resourceId: "syn-course-1", scope: "GLOBAL", quantity: 1, unlimited: false,
    validUntil: null, status: "ACTIVE", updatedAt: at(-2 * HOUR),
  });

  // 1b 圈子：已支付 + 成员存在 + 订单 COMPLETED
  orders.push({
    id: "syn-ord-circle-ok", userId: "syn-u2", type: "CIRCLE_JOIN", targetId: "syn-circle-1",
    quantity: 1, amount: 199, payAmount: 199, status: "COMPLETED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-2", paidAt: at(-3 * HOUR), refundedAt: null,
    completedAt: at(-3 * HOUR + 5_000), createdAt: at(-3 * HOUR - 60_000),
  });
  circleMembers.push({
    circleId: "syn-circle-1", userId: "syn-u2", joinedAt: at(-3 * HOUR), expireAt: at(362 * DAY),
  });

  // ───────── 场景 2：允许的发放延迟 ─────────
  // 刚支付 5 分钟，圈子成员尚未创建 —— 在 grace(15min) 内，不应报
  orders.push({
    id: "syn-ord-circle-grace", userId: "syn-u3", type: "CIRCLE_JOIN", targetId: "syn-circle-2",
    quantity: 1, amount: 99, payAmount: 99, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-3", paidAt: at(-5 * 60_000), refundedAt: null,
    completedAt: null, createdAt: at(-6 * 60_000),
  });

  // ───────── 场景 3：已支付未到账 ─────────
  // 3a 圈子：支付 6 小时，订单仍 PAID，无成员 → fulfillment_gap(high)
  orders.push({
    id: "syn-ord-circle-gap", userId: "syn-u4", type: "CIRCLE_JOIN", targetId: "syn-circle-3",
    quantity: 1, amount: 299, payAmount: 299, status: "PAID", payMethod: "ALIPAY",
    payTransactionId: "syn-tx-4", paidAt: at(-6 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-6 * HOUR - 60_000),
  });
  // 3b 课程：已支付但台账无 GRANT → ledger_inconsistent(medium)，且 impactsAccess=false
  orders.push({
    id: "syn-ord-course-noledger", userId: "syn-u5", type: "COURSE", targetId: "syn-course-2",
    quantity: 1, amount: 49, payAmount: 49, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-5", paidAt: at(-4 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-4 * HOUR - 60_000),
  });
  // 3c 会员：已支付但会员态未推进 → fulfillment_gap(high) + ledger_inconsistent(medium)
  orders.push({
    id: "syn-ord-member-gap", userId: "syn-u6", type: "MEMBER", targetId: "syn-plan-1",
    quantity: 1, amount: 365, payAmount: 365, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-6", paidAt: at(-5 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-5 * HOUR - 60_000),
  });
  users.push({ id: "syn-u6", memberLevel: "NONE", memberExpire: null });

  // 会员正常到账对照组
  orders.push({
    id: "syn-ord-member-ok", userId: "syn-u7", type: "MEMBER", targetId: "syn-plan-1",
    quantity: 1, amount: 365, payAmount: 365, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-7", paidAt: at(-5 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-5 * HOUR - 60_000),
  });
  users.push({ id: "syn-u7", memberLevel: "SCHOOL", memberExpire: at(360 * DAY) });
  memberPurchases.push({
    id: "syn-mp-1", userId: "syn-u7", orderId: "syn-ord-member-ok", memberType: "SCHOOL",
    paidAt: at(-5 * HOUR), expireAt: at(360 * DAY), refundedAt: null,
  });
  entitlementLedger.push({
    id: "syn-led-2", userId: "syn-u7", entitlementKey: "membership.school", kind: "MEMBERSHIP",
    action: "GRANT", quantity: 0, unlimited: true, validFrom: at(-5 * HOUR), validUntil: at(360 * DAY),
    sourceType: "ORDER", sourceId: "syn-ord-member-ok", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-member-ok:membership.school",
    resourceType: "MEMBER_PLAN", resourceId: "", scope: "GLOBAL", createdAt: at(-5 * HOUR),
  });

  // ───────── 场景 4：退款 ─────────
  // 4a 已退款且已正确冲正 → 不应报
  orders.push({
    id: "syn-ord-refund-ok", userId: "syn-u8", type: "COURSE", targetId: "syn-course-3",
    quantity: 1, amount: 99, payAmount: 99, status: "REFUNDED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-8", paidAt: at(-3 * DAY), refundedAt: at(-2 * DAY),
    completedAt: null, createdAt: at(-3 * DAY - 60_000),
  });
  entitlementLedger.push({
    id: "syn-led-3", userId: "syn-u8", entitlementKey: "course.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-3 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-refund-ok", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-refund-ok:course.access",
    resourceType: "COURSE", resourceId: "syn-course-3", scope: "GLOBAL", createdAt: at(-3 * DAY),
  });
  entitlementLedger.push({
    id: "syn-led-4", userId: "syn-u8", entitlementKey: "course.access", kind: "ACCESS",
    action: "REVOKE", quantity: -1, unlimited: false, validFrom: at(-2 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-refund-ok", reversesLedgerId: "syn-led-3",
    idempotencyKey: "order:syn-ord-refund-ok:course.access:revoke",
    resourceType: "COURSE", resourceId: "syn-course-3", scope: "GLOBAL", createdAt: at(-2 * DAY),
  });
  entitlementBalance.push({
    userId: "syn-u8", entitlementKey: "course.access", resourceType: "COURSE",
    resourceId: "syn-course-3", scope: "GLOBAL", quantity: 0, unlimited: false,
    validUntil: null, status: "REVOKED", updatedAt: at(-2 * DAY),
  });

  // 4b 已退款但台账未冲正 → refund_not_revoked(high)
  orders.push({
    id: "syn-ord-refund-bad", userId: "syn-u9", type: "COURSE", targetId: "syn-course-4",
    quantity: 1, amount: 99, payAmount: 99, status: "REFUNDED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-9", paidAt: at(-3 * DAY), refundedAt: at(-2 * DAY),
    completedAt: null, createdAt: at(-3 * DAY - 60_000),
  });
  entitlementLedger.push({
    id: "syn-led-5", userId: "syn-u9", entitlementKey: "course.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-3 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-refund-bad", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-refund-bad:course.access",
    resourceType: "COURSE", resourceId: "syn-course-4", scope: "GLOBAL", createdAt: at(-3 * DAY),
  });

  // 4c 会员退款但该用户另有一笔未退款会员单在生效 → 不应报（续费/多单场景）
  orders.push({
    id: "syn-ord-member-refunded", userId: "syn-u10", type: "MEMBER", targetId: "syn-plan-1",
    quantity: 1, amount: 365, payAmount: 365, status: "REFUNDED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-10", paidAt: at(-10 * DAY), refundedAt: at(-9 * DAY),
    completedAt: null, createdAt: at(-10 * DAY - 60_000),
  });
  orders.push({
    id: "syn-ord-member-live", userId: "syn-u10", type: "MEMBER", targetId: "syn-plan-1",
    quantity: 1, amount: 365, payAmount: 365, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-11", paidAt: at(-8 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-8 * DAY - 60_000),
  });
  users.push({ id: "syn-u10", memberLevel: "SCHOOL", memberExpire: at(350 * DAY) });
  for (const [lid, oid, ts] of [
    ["syn-led-6", "syn-ord-member-refunded", -10 * DAY],
    ["syn-led-8", "syn-ord-member-live", -8 * DAY],
  ]) {
    entitlementLedger.push({
      id: lid, userId: "syn-u10", entitlementKey: "membership.school", kind: "MEMBERSHIP",
      action: "GRANT", quantity: 0, unlimited: true, validFrom: at(ts), validUntil: at(350 * DAY),
      sourceType: "ORDER", sourceId: oid, reversesLedgerId: null,
      idempotencyKey: `order:${oid}:membership.school`,
      resourceType: "MEMBER_PLAN", resourceId: "", scope: "GLOBAL", createdAt: at(ts),
    });
  }
  // 退款单的 GRANT 已被冲正
  entitlementLedger.push({
    id: "syn-led-7", userId: "syn-u10", entitlementKey: "membership.school", kind: "MEMBERSHIP",
    action: "REVOKE", quantity: 0, unlimited: false, validFrom: at(-9 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-member-refunded", reversesLedgerId: "syn-led-6",
    idempotencyKey: "order:syn-ord-member-refunded:membership.school:revoke",
    resourceType: "MEMBER_PLAN", resourceId: "", scope: "GLOBAL", createdAt: at(-9 * DAY),
  });
  memberPurchases.push({
    id: "syn-mp-2", userId: "syn-u10", orderId: "syn-ord-member-refunded", memberType: "SCHOOL",
    paidAt: at(-10 * DAY), expireAt: at(-9 * DAY), refundedAt: at(-9 * DAY),
  });
  memberPurchases.push({
    id: "syn-mp-3", userId: "syn-u10", orderId: "syn-ord-member-live", memberType: "SCHOOL",
    paidAt: at(-8 * DAY), expireAt: at(350 * DAY), refundedAt: null,
  });

  // ───────── 场景 5：自然到期 ─────────
  // 5a 圈子：一年前入圈，成员已被 cleanupExpiredMembers 硬删，订单已 COMPLETED → 不应报
  orders.push({
    id: "syn-ord-circle-expired", userId: "syn-u11", type: "CIRCLE_JOIN", targetId: "syn-circle-4",
    quantity: 1, amount: 199, payAmount: 199, status: "COMPLETED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-12", paidAt: at(-400 * DAY), refundedAt: null,
    completedAt: at(-400 * DAY + 5_000), createdAt: at(-400 * DAY - 60_000),
  });
  // 5b 权益余额自然到期：ACTIVE 但 validUntil 已过（已知设计滞后）→ 仅 observation
  entitlementBalance.push({
    userId: "syn-u12", entitlementKey: "course.access", resourceType: "COURSE",
    resourceId: "syn-course-5", scope: "GLOBAL", quantity: 1, unlimited: false,
    validUntil: at(-1 * DAY), status: "ACTIVE", updatedAt: at(-31 * DAY),
  });
  entitlementLedger.push({
    id: "syn-led-9", userId: "syn-u12", entitlementKey: "course.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-31 * DAY), validUntil: at(-1 * DAY),
    sourceType: "ORDER", sourceId: "syn-ord-course-expired", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-course-expired:course.access",
    resourceType: "COURSE", resourceId: "syn-course-5", scope: "GLOBAL", createdAt: at(-31 * DAY),
  });
  orders.push({
    id: "syn-ord-course-expired", userId: "syn-u12", type: "COURSE", targetId: "syn-course-5",
    quantity: 1, amount: 29, payAmount: 29, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-13", paidAt: at(-31 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-31 * DAY - 60_000),
  });

  // ───────── 场景 6：续费 ─────────
  // 6a 正常续费：成员到期时间已顺延到支付之后 → 不应报
  orders.push({
    id: "syn-ord-renew-ok", userId: "syn-u13", type: "CIRCLE_RENEW", targetId: "syn-circle-5",
    quantity: 1, amount: 199, payAmount: 199, status: "COMPLETED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-14", paidAt: at(-2 * DAY), refundedAt: null,
    completedAt: at(-2 * DAY + 5_000), createdAt: at(-2 * DAY - 60_000),
  });
  circleMembers.push({
    circleId: "syn-circle-5", userId: "syn-u13", joinedAt: at(-370 * DAY), expireAt: at(363 * DAY),
  });
  // 6b 续费已支付但到期时间未顺延 → fulfillment_gap(high)
  orders.push({
    id: "syn-ord-renew-gap", userId: "syn-u14", type: "CIRCLE_RENEW", targetId: "syn-circle-6",
    quantity: 1, amount: 199, payAmount: 199, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-15", paidAt: at(-2 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-2 * DAY - 60_000),
  });
  circleMembers.push({
    circleId: "syn-circle-6", userId: "syn-u14", joinedAt: at(-360 * DAY), expireAt: at(-3 * DAY),
  });

  // ───────── 场景 7：多次购买 ─────────
  // 同一课程两单：一单有台账、一单没有 → 只应报没有的那一单
  orders.push({
    id: "syn-ord-multi-1", userId: "syn-u15", type: "COURSE", targetId: "syn-course-6",
    quantity: 1, amount: 59, payAmount: 59, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-16", paidAt: at(-5 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-5 * DAY - 60_000),
  });
  entitlementLedger.push({
    id: "syn-led-10", userId: "syn-u15", entitlementKey: "course.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-5 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-multi-1", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-multi-1:course.access",
    resourceType: "COURSE", resourceId: "syn-course-6", scope: "GLOBAL", createdAt: at(-5 * DAY + 400),
  });
  orders.push({
    id: "syn-ord-multi-2", userId: "syn-u15", type: "COURSE", targetId: "syn-course-6",
    quantity: 1, amount: 59, payAmount: 59, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-17", paidAt: at(-4 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-4 * DAY - 60_000),
  });

  // ───────── 场景 8：重复支付回调 ─────────
  // 8a 正常：同一订单只有一条 paidAt、一条 GRANT（由 payTransactionId 唯一 + idempotencyKey 唯一保证）
  //     已由 1a 覆盖。
  // 8b 异常注入：两单共用同一 payTransactionId → idempotency_violation(critical)
  orders.push({
    id: "syn-ord-dup-tx-a", userId: "syn-u16", type: "COURSE", targetId: "syn-course-7",
    quantity: 1, amount: 39, payAmount: 39, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-dup", paidAt: at(-6 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-6 * DAY - 60_000),
  });
  orders.push({
    id: "syn-ord-dup-tx-b", userId: "syn-u16", type: "COURSE", targetId: "syn-course-7",
    quantity: 1, amount: 39, payAmount: 39, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-dup", paidAt: at(-6 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-6 * DAY - 60_000),
  });
  for (const [lid, oid] of [["syn-led-11", "syn-ord-dup-tx-a"], ["syn-led-12", "syn-ord-dup-tx-b"]]) {
    entitlementLedger.push({
      id: lid, userId: "syn-u16", entitlementKey: "course.access", kind: "ACCESS",
      action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-6 * DAY), validUntil: null,
      sourceType: "ORDER", sourceId: oid, reversesLedgerId: null,
      idempotencyKey: `order:${oid}:course.access`,
      resourceType: "COURSE", resourceId: "syn-course-7", scope: "GLOBAL", createdAt: at(-6 * DAY),
    });
  }

  // ───────── 附加：订单状态滞留 ─────────
  // 圈子成员已存在但订单仍 PAID（confirmJoin 抛「已是圈子成员」被客户端吞掉）
  orders.push({
    id: "syn-ord-circle-stale", userId: "syn-u17", type: "CIRCLE_JOIN", targetId: "syn-circle-7",
    quantity: 1, amount: 99, payAmount: 99, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-18", paidAt: at(-2 * HOUR), refundedAt: null,
    completedAt: null, createdAt: at(-2 * HOUR - 60_000),
  });
  circleMembers.push({
    circleId: "syn-circle-7", userId: "syn-u17", joinedAt: at(-2 * HOUR), expireAt: at(363 * DAY),
  });

  // ───────── 附加：实物订单（必须被排除） ─────────
  orders.push({
    id: "syn-ord-product", userId: "syn-u18", type: "PRODUCT", targetId: "syn-prod-1",
    quantity: 2, amount: 158, payAmount: 158, status: "SHIPPED", payMethod: "WECHAT",
    payTransactionId: "syn-tx-19", paidAt: at(-2 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-2 * DAY - 60_000),
  });

  // ───────── 附加：真源未覆盖类型（需在报告里如实计数） ─────────
  orders.push({
    id: "syn-ord-livestream", userId: "syn-u19", type: "LIVESTREAM", targetId: "syn-live-1",
    quantity: 1, amount: 19, payAmount: 19, status: "PAID", payMethod: "WECHAT",
    payTransactionId: "syn-tx-20", paidAt: at(-3 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-3 * DAY - 60_000),
  });
  entitlementLedger.push({
    id: "syn-led-13", userId: "syn-u19", entitlementKey: "livestream.access", kind: "ACCESS",
    action: "GRANT", quantity: 1, unlimited: false, validFrom: at(-3 * DAY), validUntil: null,
    sourceType: "ORDER", sourceId: "syn-ord-livestream", reversesLedgerId: null,
    idempotencyKey: "order:syn-ord-livestream:livestream.access",
    resourceType: "LIVESTREAM", resourceId: "syn-live-1", scope: "GLOBAL", createdAt: at(-3 * DAY),
  });

  // ───────── 附加：B 端（分站/运营商）────────
  orders.push({
    id: "syn-ord-station-ok", userId: "syn-u20", type: "STATION_MASTER", targetId: "syn-station-1",
    quantity: 1, amount: 9800, payAmount: 9800, status: "PAID", payMethod: "OFFLINE",
    payTransactionId: "syn-tx-21", paidAt: at(-7 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-7 * DAY - 60_000),
  });
  stations.push({ id: "syn-station-1", userId: "syn-u20", status: "ACTIVE", expireAt: at(358 * DAY) });

  orders.push({
    id: "syn-ord-operator-gap", userId: "syn-u21", type: "OPERATOR", targetId: "GOLD",
    quantity: 1, amount: 29800, payAmount: 29800, status: "PAID", payMethod: "OFFLINE",
    payTransactionId: "syn-tx-22", paidAt: at(-7 * DAY), refundedAt: null,
    completedAt: null, createdAt: at(-7 * DAY - 60_000),
  });
  // 故意不建 Operator 记录 → fulfillment_gap

  // ───────── 附加：台账-投影漂移 ─────────
  entitlementBalance.push({
    userId: "syn-u22", entitlementKey: "quota.ai", resourceType: "", resourceId: "",
    scope: "GLOBAL", quantity: 99, unlimited: false, validUntil: null,
    status: "ACTIVE", updatedAt: at(-1 * DAY),
  });
  entitlementLedger.push({
    id: "syn-led-14", userId: "syn-u22", entitlementKey: "quota.ai", kind: "QUOTA",
    action: "GRANT", quantity: 10, unlimited: false, validFrom: at(-1 * DAY), validUntil: null,
    sourceType: "ACTIVITY", sourceId: "syn-act-1", reversesLedgerId: null,
    idempotencyKey: "activity:syn-act-1:quota.ai",
    resourceType: "", resourceId: "", scope: "GLOBAL", createdAt: at(-1 * DAY),
  });

  return {
    now: NOW,
    windowFrom: NOW - 31 * DAY,
    windowTo: NOW,
    orders, entitlementLedger, entitlementBalance, circleMembers,
    memberPurchases, users, practitionerProfiles, stations, operators,
  };
}

/**
 * 期望结果（自测断言依据）。
 * key = `${rule}:${orderRefSuffix}`，值为 severity。
 */
export const EXPECTED_FINDINGS = Object.freeze([
  // 场景 3a：圈子已支付未到账
  { rule: "fulfillment_gap", orderId: "syn-ord-circle-gap", severity: "high" },
  // 场景 3c：会员已支付未到账
  { rule: "fulfillment_gap", orderId: "syn-ord-member-gap", severity: "high" },
  // 场景 6b：续费已支付但未顺延
  { rule: "fulfillment_gap", orderId: "syn-ord-renew-gap", severity: "high" },
  // 附加：运营商已支付无记录
  { rule: "fulfillment_gap", orderId: "syn-ord-operator-gap", severity: "high" },

  // 场景 3b：课程台账缺失（不影响访问）
  { rule: "ledger_inconsistent", orderId: "syn-ord-course-noledger", severity: "medium" },
  // 场景 3c 会员同时也缺台账
  { rule: "ledger_inconsistent", orderId: "syn-ord-member-gap", severity: "medium" },
  // 场景 7：多次购买中缺台账的那一单
  { rule: "ledger_inconsistent", orderId: "syn-ord-multi-2", severity: "medium" },

  // 场景 4b：退款未冲正
  { rule: "refund_not_revoked", orderId: "syn-ord-refund-bad", severity: "high" },

  // 附加：订单状态滞留
  { rule: "order_status_stale", orderId: "syn-ord-circle-stale", severity: "low" },
]);

/** 期望「不出现」的订单（误报边界断言） */
export const EXPECTED_CLEAN = Object.freeze([
  "syn-ord-course-ok",        // 正常到账
  "syn-ord-circle-ok",        // 正常到账
  "syn-ord-circle-grace",     // 允许的发放延迟
  "syn-ord-member-ok",        // 会员正常
  "syn-ord-refund-ok",        // 退款已正确冲正
  "syn-ord-member-refunded",  // 退款但另有有效会员单
  "syn-ord-member-live",      // 有效会员单
  "syn-ord-circle-expired",   // 自然到期 + 成员被清理 + 订单 COMPLETED
  "syn-ord-renew-ok",         // 正常续费
  "syn-ord-multi-1",          // 多次购买中正常的那一单
  "syn-ord-product",          // 实物订单
  "syn-ord-station-ok",       // 分站正常顺延
  "syn-ord-livestream",       // 真源未覆盖，只计 needsReview，不报异常
  "syn-ord-course-expired",   // 自然到期（余额滞后只进 observation）
]);

/** 期望的 observation（按 rule:aspect 计） */
export const EXPECTED_OBSERVATIONS = Object.freeze([
  { rule: "idempotency_violation", aspect: "duplicate_pay_transaction", minCount: 1 },
  { rule: "balance_drift", aspect: "recompute_mismatch", minCount: 1 },
  { rule: "balance_drift", aspect: "active_but_expired", minCount: 1 },
]);
