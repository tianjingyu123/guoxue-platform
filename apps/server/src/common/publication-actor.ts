import { Prisma } from "@prisma/client";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

/** 发布事务内核对并锁定当前身份，外层角色快照不能作为平台豁免。 */
export async function assertPublicationActorInTransaction(tx: Prisma.TransactionClient, userId: string, platformRequired: boolean) {
  const users = await tx.$queryRaw<Array<{ id: string; status: string; deletedAt: Date | null }>>`SELECT id, status, "deletedAt"
    FROM "User" WHERE id=${userId} FOR SHARE`;
  if (users.length !== 1 || users[0].status !== "ACTIVE" || users[0].deletedAt) {
    throw new BusinessException(ErrorCode.FORBIDDEN, "发布操作账号不可用");
  }
  if (!platformRequired) return;
  const roles = await tx.$queryRaw<Array<{ roleType: string; bindId: string | null }>>`SELECT "roleType", "bindId" FROM "UserRole"
    WHERE "userId"=${userId} ORDER BY id FOR SHARE`;
  if (!roles.some(role => role.bindId === null && ["SUPER_ADMIN", "OPERATION_ADMIN"].includes(role.roleType))) {
    throw new BusinessException(ErrorCode.FORBIDDEN, "平台管理权限已变化，请刷新后重试");
  }
}
