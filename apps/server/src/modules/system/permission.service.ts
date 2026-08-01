import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private prisma: PrismaService) {}

  /** 获取某角色的权限列表 */
  async getRolePermissions(roleType: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleType: roleType as any },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.key);
  }

  /**
   * 更新某角色的权限（提权类高危操作）。
   * 审计留痕(后端审计P1)：记录旧/新权限集合 + 差异 + rollbackData（旧集合），支持一键回滚。
   * 全局 AuditInterceptor 已记基础 who/when，此处补「改了什么」这层无法从拦截器拿到的信息。
   */
  async setRolePermissions(roleType: string, permissionKeys: string[], operatorId?: string) {
    // 变更前快照旧权限集合，用于差异审计与回滚
    const oldKeys = await this.getRolePermissions(roleType);

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleType: roleType as any } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleType: roleType as any,
            permissionId: p.id,
          })),
        });
      }
    });

    const newKeys = permissions.map((p) => p.key);
    const added = newKeys.filter((k) => !oldKeys.includes(k));
    const removed = oldKeys.filter((k) => !newKeys.includes(k));

    // 详细审计（含 rollbackData=旧集合，可一键还原）。写库失败不回滚业务操作，仅告警。
    await this.prisma.auditLog
      .create({
        data: {
          userId: operatorId,
          executor: operatorId || "UNKNOWN",
          action: "ROLE_PERMISSION_CHANGE",
          targetType: "ROLE",
          targetId: roleType,
          detail: JSON.stringify({ roleType, oldKeys, newKeys, added, removed }),
          rollbackData: { roleType, permissionKeys: oldKeys } as any,
        },
      })
      .catch((err) => this.logger.warn(`角色权限变更审计写入失败 [${roleType}]`, err instanceof Error ? err.message : err));

    return { permissions: newKeys };
  }

  /** 获取所有权限定义 */
  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
  }

  /** 获取当前用户的权限列表 */
  async getUserPermissions(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { roleType: true },
    });
    if (userRoles.length === 0) return [];

    const roleTypes = userRoles.map((r) => r.roleType);
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleType: { in: roleTypes } },
      include: { permission: { select: { key: true } } },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission.key))];
  }
}
