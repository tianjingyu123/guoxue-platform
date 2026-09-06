import { Prisma } from "@prisma/client";

/** 既有咨询角色保持不变；这只是基础准入，不等于新的音视频能力审批。 */
export const CIRCLE_EXPERT_ROLES = ["OWNER", "PARTNER", "GUEST"] as const;

export function circleExpertWhere(
  kind: "QUESTION" | "CALL" | "ANY" | "CONFIG" = "ANY",
  now = new Date(),
): Prisma.CircleMemberWhereInput {
  const where: Prisma.CircleMemberWhereInput = {
    role: { in: [...CIRCLE_EXPERT_ROLES] },
    circle: { status: "ACTIVE", deletedAt: null },
    user: { status: "ACTIVE", deletedAt: null },
    AND: [{ OR: [{ expireAt: null }, { expireAt: { gt: now } }] }],
  };
  if (kind === "QUESTION") where.questionPriceCoin = { gt: 0 };
  else if (kind === "CALL") where.callPricePerMinuteCoin = { gt: 0 };
  else if (kind === "ANY") {
    where.OR = [{ questionPriceCoin: { gt: 0 } }, { callPricePerMinuteCoin: { gt: 0 } }];
  }
  return where;
}

/**
 * 新增业务在同一事务内锁定圈子、服务者及成员行，再重读状态和价格。
 * 普通 UPDATE/DELETE 与 FOR SHARE 冲突，防审核等待期间的撤角色/停用在扣费前漏检。
 * 已有订单的回答、退款和申诉不调用此门禁，避免停用后丢失既有权益。
 */
export async function lockCircleExpertRows(tx: Prisma.TransactionClient, circleId: string, userId: string) {
  const circles = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Circle" WHERE "id" = ${circleId} FOR SHARE`;
  const users = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR SHARE`;
  const members = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "CircleMember" WHERE "circleId" = ${circleId} AND "userId" = ${userId} FOR SHARE`;
  // 新增通话还需绑定实际锁定行，缺行时不能接受随后出现而未被锁定的新成员。
  return { circleIds: circles.map(row => row.id), userIds: users.map(row => row.id), memberIds: members.map(row => row.id) };
}
