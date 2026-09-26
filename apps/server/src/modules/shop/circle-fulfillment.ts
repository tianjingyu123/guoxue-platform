import { Prisma, OrderStatus, OrderType } from "@prisma/client";

/**
 * 圈子付费履约（服务端内部实现·修复候选）
 *
 * 背景：`CIRCLE_JOIN` / `CIRCLE_RENEW` 此前不在 `ShopPaymentService.paidPostProcessors` 中，
 * 履约只发生在用户态 HTTP 接口 `POST /circles/:id/join|renew/confirm` 被调用时
 * （`pkg-shop/paying/index.vue` 支付成功后补调，失败仅 console.warn）。
 * 用户支付后立即关页、断网或接口报错，就会出现「订单 PAID 但没进圈」。
 *
 * 本文件把履约抽成**不依赖登录态、不依赖 HTTP、只依赖事务客户端**的纯内部逻辑，
 * 以便：
 *   1) 支付回调事务内直接履约（与订单翻 PAID 同成同败）；
 *   2) 管理员线下确认收款（`runPaidPostProcessors`）走同一份逻辑；
 *   3) 已 PAID 订单的补偿重试走同一份逻辑（不只补首次回调）。
 *
 * 刻意不做的事：
 *   - 不发 Redis 缓存失效（调用方在事务提交后处理，见 ShopPaymentService）；
 *   - 不记分佣（沿用既有的 `recordCircleRevenue` 旁路，避免与 commission 幂等冲突）；
 *   - 不做圈规确认（`assertRuleAck`）—— 那是用户态准入校验，钱已收，不能因此不发货；
 *     若需保留该门槛，应在**下单前**校验，不是在履约时（已列为决策点 D3）。
 *   - 不自动补发历史订单：补偿入口由调用方显式触发，并受时间窗与开关约束。
 */

export type CircleOrderLike = {
  id: string;
  userId: string;
  type: string;
  targetId: string;
  quantity: number | null;
  status: string;
  paidAt: Date | null;
  refundedAt: Date | null;
};

export const CIRCLE_ORDER_TYPES = ["CIRCLE_JOIN", "CIRCLE_RENEW"] as const;

/** 视为「钱已到账且未退」的订单状态 */
const FULFILLABLE_STATUSES = new Set(["PAID", "SHIPPED", "COMPLETED"]);

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type FulfillResult =
  | { outcome: "fulfilled"; expireAt: Date | null }
  | { outcome: "extended"; expireAt: Date | null }
  | { outcome: "already"; expireAt: Date | null }
  | { outcome: "skipped"; reason: string };

/**
 * 在给定事务内履约一笔圈子订单。**幂等**：重复调用不会重复加成员、不会重复顺延。
 *
 * 幂等依据（不新建一套支付体系，复用既有约束）：
 *   - `CircleMember` 有 `@@unique([circleId, userId])`，成员天然唯一；
 *   - 「是否已为本单顺延过」由 `Order.status === 'COMPLETED'` 标记，
 *     与既有 `confirmJoin`/`confirmRenew` 的收尾动作完全一致，不引入新状态位。
 */
export async function fulfillCircleOrderTx(
  tx: Prisma.TransactionClient,
  order: CircleOrderLike,
): Promise<FulfillResult> {
  if (!CIRCLE_ORDER_TYPES.includes(order.type as (typeof CIRCLE_ORDER_TYPES)[number])) {
    return { outcome: "skipped", reason: "非圈子订单" };
  }
  // 退款优先：已退款/退款中的订单一律不履约，防止补偿重试复活已撤销的权益。
  if (order.refundedAt || order.status === "REFUNDED" || order.status === "CANCELLED") {
    return { outcome: "skipped", reason: "订单已退款或已取消" };
  }
  if (!FULFILLABLE_STATUSES.has(order.status)) {
    return { outcome: "skipped", reason: `订单状态 ${order.status} 不可履约` };
  }
  // 已标记完成 = 本单已履约过（confirmJoin/confirmRenew 或上一次回调），直接幂等返回。
  if (order.status === "COMPLETED") {
    const cur = await tx.circleMember.findUnique({
      where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
      select: { expireAt: true },
    });
    return { outcome: "already", expireAt: cur?.expireAt ?? null };
  }

  const circle = await tx.circle.findUnique({
    where: { id: order.targetId },
    select: { id: true, type: true, status: true },
  });
  if (!circle) return { outcome: "skipped", reason: "圈子不存在" };
  // 圈子被下架不影响已付费用户的履约（钱已收），仅记录，不阻断。

  // 以行锁读取现有成员，避免并发回调同时判断「不存在」后各插一行。
  const locked = await tx.$queryRaw<Array<{ id: string; expireAt: Date | null }>>`
    SELECT "id", "expireAt" FROM "CircleMember"
    WHERE "circleId" = ${order.targetId} AND "userId" = ${order.userId}
    FOR UPDATE`;
  const existing = locked[0];

  const years = order.quantity === 2 ? 2 : 1;
  const isYearly = circle.type === "YEARLY";

  if (!existing) {
    // 成员不存在：JOIN 正常建号；RENEW 也建号 —— 见决策点 D1。
    // 语义：钱已收，用户应当拥有对应时长的权益；成员行被 cleanupExpiredMembers
    // 硬删过并不改变这一点。起算点取 max(paidAt, now) 的保守口径见 D2。
    const expireAt = isYearly ? new Date(Date.now() + years * YEAR_MS) : null;
    await tx.circleMember.create({
      data: { circleId: order.targetId, userId: order.userId, role: "MEMBER", expireAt },
    });
    await tx.circle.update({
      where: { id: order.targetId },
      data: { memberCount: { increment: 1 } },
    });
    await markOrderCompleted(tx, order.id);
    return { outcome: "fulfilled", expireAt };
  }

  // 成员已存在
  if (order.type === "CIRCLE_JOIN") {
    if (!existing.expireAt || existing.expireAt > new Date()) {
      // 已是有效成员：这笔 JOIN 单不再叠加时长（与既有 confirmJoin 抛
      // CIRCLE_MEMBER_EXISTS 的行为一致），只把订单收尾，避免长期滞留 PAID。
      await markOrderCompleted(tx, order.id);
      return { outcome: "already", expireAt: existing.expireAt };
    }
    // 成员行还在但已过期（清理任务尚未跑到）：按新购处理，从现在起算。
    const expireAt = isYearly ? new Date(Date.now() + years * YEAR_MS) : null;
    await tx.circleMember.update({
      where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
      data: { expireAt },
    });
    await markOrderCompleted(tx, order.id);
    return { outcome: "fulfilled", expireAt };
  }

  // CIRCLE_RENEW：未过期从原到期时间顺延，已过期从现在起算
  // —— 与既有 confirmRenew（circle-membership.service.ts:410-413）完全相同的口径。
  const base = existing.expireAt && existing.expireAt > new Date() ? existing.expireAt : new Date();
  const expireAt = new Date(base.getTime() + years * YEAR_MS);
  await tx.circleMember.update({
    where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
    data: { expireAt },
  });
  await markOrderCompleted(tx, order.id);
  return { outcome: "extended", expireAt };
}

/**
 * 标记订单已履约。用 `updateMany + where status IN (可履约态)` 做条件更新，
 * 并发下只有一个事务能把它从 PAID 翻成 COMPLETED。
 */
async function markOrderCompleted(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  await tx.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "SHIPPED"] } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

/**
 * 下单前复用：查该用户在该圈子是否已有「已付款但未履约」的订单。
 * 用于 `prepareJoin` / `renewCircle` 避免让用户为同一件事付第二次钱。
 *
 * 判据只用既有字段：状态在可履约态、未退款、且尚未 COMPLETED。
 */
export async function findReusablePaidOrder(
  db: { order: { findFirst: (args: unknown) => Promise<{ id: string; type: string; paidAt: Date | null } | null> } },
  circleId: string,
  userId: string,
): Promise<{ id: string; type: string; paidAt: Date | null } | null> {
  return db.order.findFirst({
    where: {
      userId,
      targetId: circleId,
      type: { in: [...CIRCLE_ORDER_TYPES] },
      status: { in: ["PAID", "SHIPPED"] },
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
