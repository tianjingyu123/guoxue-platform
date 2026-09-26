/**
 * **测试专用**：提交 206d775a（v1）圈子履约逻辑的等价复刻，用于证明「旧实现会失败」。
 *
 * 这不是应用代码，不会被服务端引用。它逐字对应 v1 的关键特征：
 *   - 接收外部传入的**订单快照**，用快照里的 status/refundedAt 做判断；
 *   - 只对 CircleMember 加行锁，不锁订单；
 *   - 先写权益，再条件更新订单，且**不检查 updateMany.count**；
 *   - 「已是有效成员的额外 JOIN 单」直接标 COMPLETED。
 *
 * `pauseMs` 是**只存在于本复刻中**的同步点，用来把「读成员 → 写成员」之间的竞态窗口
 * 放大到可观测。生产代码里没有、也不需要这种钩子：v2 在入口就锁订单，天然串行。
 */

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const CIRCLE_TYPES = ["CIRCLE_JOIN", "CIRCLE_RENEW"];

export async function legacyFulfillCircleOrderTx(tx, order, { pauseMs = 0 } = {}) {
  if (!CIRCLE_TYPES.includes(order.type)) return { outcome: "skipped", reason: "非圈子订单" };
  if (order.refundedAt || order.status === "REFUNDED" || order.status === "CANCELLED") {
    return { outcome: "skipped", reason: "订单已退款或已取消" };
  }
  if (!["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) {
    return { outcome: "skipped", reason: `订单状态 ${order.status} 不可履约` };
  }
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

  // v1：只锁成员行
  const locked = await tx.$queryRawUnsafe(
    `SELECT "id", "expireAt" FROM "CircleMember" WHERE "circleId" = $1 AND "userId" = $2 FOR UPDATE`,
    order.targetId,
    order.userId,
  );
  const existing = locked[0];

  // 测试同步点：放大「读成员 → 写成员」的竞态窗口
  if (pauseMs > 0) await tx.$executeRawUnsafe(`SELECT pg_sleep(${Number(pauseMs) / 1000})`);

  const years = order.quantity === 2 ? 2 : 1;
  const isYearly = circle.type === "YEARLY";

  if (!existing) {
    const expireAt = isYearly ? new Date(Date.now() + years * YEAR_MS) : null;
    await tx.circleMember.create({
      data: { circleId: order.targetId, userId: order.userId, role: "MEMBER", expireAt },
    });
    await tx.circle.update({ where: { id: order.targetId }, data: { memberCount: { increment: 1 } } });
    await legacyMarkCompleted(tx, order.id);
    return { outcome: "fulfilled", expireAt };
  }

  if (order.type === "CIRCLE_JOIN") {
    if (!existing.expireAt || existing.expireAt > new Date()) {
      await legacyMarkCompleted(tx, order.id); // v1：收了钱只标完成，不给任何额外权益
      return { outcome: "already", expireAt: existing.expireAt };
    }
    const expireAt = isYearly ? new Date(Date.now() + years * YEAR_MS) : null;
    await tx.circleMember.update({
      where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
      data: { expireAt },
    });
    await legacyMarkCompleted(tx, order.id);
    return { outcome: "fulfilled", expireAt };
  }

  const base = existing.expireAt && existing.expireAt > new Date() ? existing.expireAt : new Date();
  const expireAt = new Date(base.getTime() + years * YEAR_MS);
  await tx.circleMember.update({
    where: { circleId_userId: { circleId: order.targetId, userId: order.userId } },
    data: { expireAt },
  });
  await legacyMarkCompleted(tx, order.id);
  return { outcome: "extended", expireAt };
}

/** v1：条件更新但**不检查影响行数** */
async function legacyMarkCompleted(tx, orderId) {
  await tx.order.updateMany({
    where: { id: orderId, status: { in: ["PAID", "SHIPPED"] } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}
