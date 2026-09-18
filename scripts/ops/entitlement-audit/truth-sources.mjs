/**
 * 订单类型 → 实际权益真源映射表（本检测的唯一口径来源）
 *
 * 依据（均为 2026-09-18 只读源码核对，基线 release/integration-20260801 @ 2e458597）：
 *  - apps/server/src/modules/shop/shop-payment.service.ts:827-836  paidPostProcessors 映射
 *  - apps/server/src/modules/course/course-purchase.service.ts:143-166  checkAccess（课程访问判定）
 *  - apps/server/src/modules/circle/services/circle-membership.service.ts:176-256, 380-437
 *  - apps/server/src/modules/entitlement/entitlement.service.ts:273-335, 394-404
 *
 * 关键结论（决定了各规则的严重级别，勿随意改动）：
 *  1) 课程的实际访问判定读的是 Order（checkAccess），不是 EntitlementBalance。
 *  2) 全仓检索中，entitlementBalance 在 entitlement 模块之外没有任何读取点，
 *     即权益中心当前是「用户可见的权益展示 + 管理员发放/冲正」，不是访问控制真源。
 *     因此「台账缺 GRANT」= 数据一致性问题，不等于「用户用不了」。
 *  3) 会员被权益读模型显式排除（entitlement.service.ts:394-397），真源是
 *     User.memberLevel/memberExpire 与 PractitionerProfile.proExpireAt。
 *  4) CIRCLE_JOIN / CIRCLE_RENEW 不在 paidPostProcessors 中，履约真源是 CircleMember。
 */

/** 严重级别。high = 可能影响用户实际可用；medium = 数据一致性；low/info = 观察项 */
export const SEVERITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
});

/**
 * accessTruth:
 *   'circle_member'      → CircleMember 行
 *   'user_member'        → User.memberLevel/memberExpire（+ MemberPurchase 对账）
 *   'practitioner'       → PractitionerProfile.proExpireAt
 *   'station'            → Station.expireAt
 *   'operator'           → Operator.expireAt
 *   'order_only'         → 访问判定直接读 Order，本身不需要额外真源
 *   'none'               → 实物/无权益
 *   'unverified'         → 本次未定位到统一访问判定入口，只做台账一致性观察
 * ledgerExpected: 支付后处理器是否会写 EntitlementLedger(sourceType='ORDER')
 */
export const ORDER_TYPE_TRUTH = Object.freeze({
  COURSE: {
    accessTruth: "order_only",
    ledgerExpected: true,
    note: "checkAccess 只读 Order(PAID/COMPLETED)+validityDays；台账缺失不影响访问",
  },
  BUNDLE: { accessTruth: "unverified", ledgerExpected: true, note: "未定位到统一访问判定入口" },
  BOT_SERVICE: { accessTruth: "unverified", ledgerExpected: true, note: "未定位到统一访问判定入口" },
  PAIPAN: { accessTruth: "unverified", ledgerExpected: true, note: "未定位到统一访问判定入口" },
  LIVESTREAM: { accessTruth: "unverified", ledgerExpected: true, note: "未定位到统一访问判定入口" },

  MEMBER: {
    accessTruth: "user_member",
    ledgerExpected: true,
    note: "台账被权益读模型排除，真源 User.memberLevel/memberExpire",
  },
  PRACTITIONER_PRO: {
    accessTruth: "practitioner",
    ledgerExpected: true,
    note: "真源 PractitionerProfile.proExpireAt",
  },

  CIRCLE_JOIN: {
    accessTruth: "circle_member",
    ledgerExpected: false,
    note: "不在 paidPostProcessors；由用户态接口 /circles/:id/join/confirm 创建 CircleMember",
  },
  CIRCLE_RENEW: {
    accessTruth: "circle_member",
    ledgerExpected: false,
    note: "不在 paidPostProcessors；/circles/:id/renew/confirm 顺延 expireAt，且要求成员已存在",
  },

  STATION_MASTER: { accessTruth: "station", ledgerExpected: false, note: "processStationMasterPaid 顺延 Station.expireAt" },
  OPERATOR: { accessTruth: "operator", ledgerExpected: false, note: "processOperatorPaid 建/续 Operator" },

  PRODUCT: { accessTruth: "none", ledgerExpected: false, note: "实物订单，无权益，审计必须排除" },
});

/** 视为「已付款」的订单状态（与 dashboard-daily.service.ts 的 PAID_ORDER_STATUSES 同口径） */
export const PAID_STATUSES = Object.freeze(["PAID", "SHIPPED", "COMPLETED"]);

/** 台账中视为「发放」的动作 */
export const GRANT_ACTIONS = Object.freeze(["GRANT", "MIGRATE"]);
