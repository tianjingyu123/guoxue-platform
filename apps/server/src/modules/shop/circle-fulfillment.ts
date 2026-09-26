import { Prisma, OrderStatus, OrderType } from "@prisma/client";

/**
 * 圈子付费履约（服务端内部实现·修复候选 v2）
 *
 * 背景：`CIRCLE_JOIN` / `CIRCLE_RENEW` 此前不在 `ShopPaymentService.paidPostProcessors` 中，
 * 履约只发生在用户态 HTTP 接口 `POST /circles/:id/join|renew/confirm` 被调用时
 * （`pkg-shop/paying/index.vue` 支付成功后补调，失败仅 console.warn）。
 * 用户支付后立即关页、断网或接口报错，就会出现「订单 PAID 但没进圈」。
 *
 * ── v2 相对 v1（206d775a）的修正 ───────────────────────────────────────────
 * v1 的并发设计不成立，已整体重写：
 *   1. v1 接收**外部传入的订单快照**，用快照里的 status/refundedAt 做判断。并发下快照会
 *      过期（例如退款事务已把订单改成 REFUNDED），照样履约 = 复活权益。
 *      v2 只接收 `orderId`，**在事务内重新加锁读取订单**，一切判断以锁内事实为准。
 *   2. v1 只对 `CircleMember` 加行锁，靠成员唯一约束兜底。但「同一续费订单被两个补偿任务
 *      同时处理」「两笔不同续费订单并发」都不会触发唯一约束，v1 会重复顺延。
 *      v2 改为**订单级串行化**：先 `SELECT ... FOR UPDATE` 锁住订单行。
 *   3. v1 先写权益再条件更新订单，且**不检查 `updateMany.count`**，认领失败也当成功。
 *      v2 校验认领结果，`count !== 1` 抛错让整个事务回滚，权益与状态一起回滚。
 *   4. v1 对「已是有效成员却又来一笔 JOIN 单」直接标 COMPLETED —— 等于收了钱不给任何额外
 *      权益也不退款。v2 改为 `needs_manual`：**不动订单状态、不写任何权益**，留待人工。
 *
 * ── 统一加锁顺序（全局约定，改动本文件必须遵守）─────────────────────────────
 *   Order → CircleMember → Circle
 * 依据：
 *   - `shop-refund.service.ts` 退款事务先改 `Order` 再撤权益 → Order 在前；
 *   - `circle-refund.service.ts:225-247` 先读/删 `CircleMember` 再 `Circle.update(memberCount)`
 *     → Member 在 Circle 前；该事务不锁 Order，与本顺序不构成环；
 *   - `cleanupExpiredMembers` 只操作 `CircleMember`，单一资源，无环。
 *
 * ── 刻意不做的事 ───────────────────────────────────────────────────────────
 *   - 不发 Redis 缓存失效（调用方在事务提交后处理，见 ShopPaymentService）；
 *   - 不记圈子收益（`recordCircleRevenue` 依赖 commission 模块的费率解析，无法在本事务内
 *     调用；由调用方在提交后按「每单恰好一次」的语义记账，见 ShopPaymentService）；
 *   - 不做圈规确认（`assertRuleAck`）—— 事务内拿不到治理服务；见决策点 D3；
 *   - 不自动补发历史订单：补偿入口由调用方显式触发，受时间窗与条数上限约束。
 */

export const CIRCLE_ORDER_TYPES = ["CIRCLE_JOIN", "CIRCLE_RENEW"] as const;
type CircleOrderType = (typeof CIRCLE_ORDER_TYPES)[number];

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** 锁内读到的订单事实（只取履约需要的列） */
type LockedOrder = {
  id: string;
  userId: string;
  type: string;
  targetId: string;
  quantity: number | null;
  status: string;
  paidAt: Date | null;
  refundedAt: Date | null;
};

export type FulfillOutcome =
  /** 本次真正建立了权益 */
  | "fulfilled"
  /** 本次真正顺延了权益 */
  | "extended"
  /** 本单此前已履约过，本次无操作（幂等命中） */
  | "already"
  /** 明确不该履约（退款/已取消/非圈子单等），无操作 */
  | "skipped"
  /** 规则未决，**暂停自动处理**，订单保持原状待人工 */
  | "needs_manual";

export type FulfillResult = {
  outcome: FulfillOutcome;
  /** 履约后的成员到期时间；needs_manual / skipped 时为当前值或 null */
  expireAt: Date | null;
  /**
   * 成员行 id。调用方记圈子收益需要它：`CircleRevenueRecord.sourceId` 必须是成员 id，
   * 因为 `circle-refund.service.ts:229-231` 按 `sourceId = member.id` 追回圈主分成。
   */
  memberId: string | null;
  /** 本次是否产生了需要记账的收入（仅 fulfilled / extended 为 true） */
  shouldRecordRevenue: boolean;
  /** 原因说明（skipped / needs_manual 必填） */
  reason?: string;
};

/** 需要人工处理的原因码（供审计检测与运营工单使用） */
export const MANUAL_REASONS = {
  /** 已是有效成员，却又来一笔 JOIN 单：给不给额外权益、是否退款，规则未定 */
  DUPLICATE_ACTIVE_JOIN: "duplicate_active_join",
  /** 成员行已被 cleanupExpiredMembers 硬删后收到 RENEW 单：续期还是新购、起算点，规则未定 */
  RENEW_WITHOUT_MEMBER: "renew_without_member",
  /** 圈子已下架/停用：是否仍履约，规则未定 */
  CIRCLE_NOT_ACTIVE: "circle_not_active",
} as const;

/**
 * 在给定事务内履约一笔圈子订单。
 *
 * **幂等与并发**：入口即对订单行 `SELECT ... FOR UPDATE`，同一订单的并发履约被数据库排队；
 * 认领动作是条件更新 `status ∈ (PAID, SHIPPED) → COMPLETED` 且校验影响行数必须为 1。
 * 权益写入与认领在同一事务，任一失败整体回滚。
 *
 * @param tx      事务客户端（调用方必须保证是真事务，不能是裸 PrismaClient）
 * @param orderId 订单 id。**不接受订单快照**：快照在并发下会过期。
 */
export async function fulfillCircleOrderTx(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<FulfillResult> {
  // ── ① 订单级串行化：锁住订单行，并以锁内事实为准 ──
  const lockedRows = await tx.$queryRaw<LockedOrder[]>`
    SELECT "id", "userId", "type"::text AS "type", "targetId", "quantity",
           "status"::text AS "status", "paidAt", "refundedAt"
    FROM "Order"
    WHERE "id" = ${orderId}
    FOR UPDATE`;
  const order = lockedRows[0];
  const none = { expireAt: null, memberId: null, shouldRecordRevenue: false } as const;

  if (!order) return { outcome: "skipped", ...none, reason: "订单不存在" };
  if (!CIRCLE_ORDER_TYPES.includes(order.type as CircleOrderType)) {
    return { outcome: "skipped", ...none, reason: "非圈子订单" };
  }
  // 退款优先：锁内看到已退款/已取消，一律不履约（补偿重试不会复活已撤销的权益）。
  if (order.refundedAt || order.status === "REFUNDED" || order.status === "CANCELLED") {
    return { outcome: "skipped", ...none, reason: "订单已退款或已取消" };
  }
  if (order.status === "COMPLETED") {
    // 本单此前已被履约（支付回调 / 补偿 / 旧 confirm 接口任一）。幂等返回当前成员态。
    const cur = await tx.circleMember.findUnique({
      where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
      select: { id: true, expireAt: true },
    });
    return {
      outcome: "already",
      expireAt: cur?.expireAt ?? null,
      memberId: cur?.id ?? null,
      shouldRecordRevenue: false,
    };
  }
  if (order.status !== "PAID" && order.status !== "SHIPPED") {
    return { outcome: "skipped", ...none, reason: `订单状态 ${order.status} 不可履约` };
  }

  const circle = await tx.circle.findUnique({
    where: { id: order.targetId },
    select: { id: true, type: true, status: true },
  });
  if (!circle) return { outcome: "skipped", ...none, reason: "圈子不存在" };
  if (circle.status !== "ACTIVE") {
    // 决策点 D5：圈子已下架/停用时是否仍履约，无明确依据 → 暂停自动处理，订单保持 PAID。
    return { outcome: "needs_manual", ...none, reason: MANUAL_REASONS.CIRCLE_NOT_ACTIVE };
  }

  // ── ② 成员行锁（顺序：Order → CircleMember） ──
  const memberRows = await tx.$queryRaw<Array<{ id: string; expireAt: Date | null }>>`
    SELECT "id", "expireAt" FROM "CircleMember"
    WHERE "circleId" = ${order.targetId} AND "userId" = ${order.userId}
    FOR UPDATE`;
  const existing = memberRows[0];

  const years = order.quantity === 2 ? 2 : 1;
  const isYearly = circle.type === "YEARLY";
  const nowTs = Date.now();

  // ── ③ 决策 ──
  if (!existing) {
    if (order.type === "CIRCLE_RENEW") {
      // 决策点 D1：成员行已被 cleanupExpiredMembers 硬删后收到续费单。
      // 「续期」没有可顺延的基线，「新购」的起算点与时长口径未定，且既有 confirmRenew
      // 在这种情况下是直接报错的。无明确依据 → 暂停自动处理，不自行扩展收费规则。
      return { outcome: "needs_manual", ...none, reason: MANUAL_REASONS.RENEW_WITHOUT_MEMBER };
    }
    const expireAt = isYearly ? new Date(nowTs + years * YEAR_MS) : null;
    const created = await tx.circleMember.create({
      data: { circleId: order.targetId, userId: order.userId, role: "MEMBER", expireAt },
      select: { id: true },
    });
    await tx.circle.update({
      where: { id: order.targetId },
      data: { memberCount: { increment: 1 } },
    });
    await claimOrder(tx, order.id);
    return { outcome: "fulfilled", expireAt, memberId: created.id, shouldRecordRevenue: true };
  }

  if (order.type === "CIRCLE_JOIN") {
    const stillActive = !existing.expireAt || existing.expireAt.getTime() > nowTs;
    if (stillActive) {
      // 决策点 D4：已是有效成员却又付了一笔 JOIN 单。
      // 既不能默默标完成（等于收钱不给货），也不能自行决定叠加时长或退款。
      // → 暂停自动处理，订单保持 PAID，由只读检测暴露、人工处置。
      return {
        outcome: "needs_manual",
        expireAt: existing.expireAt,
        memberId: existing.id,
        shouldRecordRevenue: false,
        reason: MANUAL_REASONS.DUPLICATE_ACTIVE_JOIN,
      };
    }
    // 成员行还在但已过期（清理任务尚未跑到）：按新购处理，从现在起算。
    const expireAt = isYearly ? new Date(nowTs + years * YEAR_MS) : null;
    await tx.circleMember.update({
      where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
      data: { expireAt },
    });
    await claimOrder(tx, order.id);
    return { outcome: "fulfilled", expireAt, memberId: existing.id, shouldRecordRevenue: true };
  }

  // CIRCLE_RENEW 且成员存在：未过期从原到期时间顺延，已过期从现在起算
  // —— 与既有 confirmRenew（circle-membership.service.ts:410-413）完全相同的口径，未改收费规则。
  const base =
    existing.expireAt && existing.expireAt.getTime() > nowTs ? existing.expireAt : new Date(nowTs);
  const expireAt = new Date(base.getTime() + years * YEAR_MS);
  await tx.circleMember.update({
    where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
    data: { expireAt },
  });
  await claimOrder(tx, order.id);
  return { outcome: "extended", expireAt, memberId: existing.id, shouldRecordRevenue: true };
}

/**
 * 认领订单：条件更新 PAID/SHIPPED → COMPLETED，并**校验影响行数必须为 1**。
 *
 * 正常路径下本事务已持有该订单行锁，条件更新不会落空；这里仍然校验，是为了在逻辑被改坏
 * （例如有人去掉入口处的 FOR UPDATE）时立刻炸掉而不是静默丢权益。抛错让整个事务回滚，
 * 权益写入与订单状态一起撤销。
 */
async function claimOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "SHIPPED"] as OrderStatus[] } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new Error(
      `[circle-fulfillment] 订单认领失败 order=${orderId} affected=${claimed.count}，事务回滚`,
    );
  }
}

/**
 * 下单前复用：查该用户在该圈子是否已有「已付款但未履约」的订单。
 * 用于 `prepareJoin` / `renewCircle`，避免让用户为同一件事付第二次钱。
 */
export async function findReusablePaidOrder(
  db: Pick<Prisma.TransactionClient, "order">,
  circleId: string,
  userId: string,
): Promise<{ id: string; type: OrderType; paidAt: Date | null } | null> {
  return db.order.findFirst({
    where: {
      userId,
      targetId: circleId,
      type: { in: [...CIRCLE_ORDER_TYPES] as OrderType[] },
      status: { in: ["PAID", "SHIPPED"] as OrderStatus[] },
      refundedAt: null,
    },
    orderBy: { paidAt: "desc" },
    select: { id: true, type: true, paidAt: true },
  });
}

/**
 * 补偿重试的候选订单查询（只读，供定时任务/运维触发使用）。
 * 注意：调用方必须自行加时间窗与数量上限；本函数不负责限流。
 */
export function buildRetryCandidateWhere(since: Date, until: Date): Prisma.OrderWhereInput {
  return {
    type: { in: [...CIRCLE_ORDER_TYPES] as OrderType[] },
    status: { in: ["PAID", "SHIPPED"] as OrderStatus[] },
    refundedAt: null,
    paidAt: { gte: since, lte: until },
  };
}
