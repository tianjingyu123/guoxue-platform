import { Prisma } from "@prisma/client";

/** 既有圈子先锁圈子；新建圈子仅创建本事务的新行，可先锁创建者。共享用户锁阻止落库期间注销或封禁改变账号状态。 */
export async function lockCircleUserActive(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status::text AS status FROM "User" WHERE id=${userId} FOR SHARE`;
  return rows[0]?.status === "ACTIVE";
}
