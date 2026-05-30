import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  /** 获取某角色的权限列表 */
  async getRolePermissions(roleType: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleType: roleType as any },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.key);
  }

  /** 更新某角色的权限 */
  async setRolePermissions(roleType: string, permissionKeys: string[]) {
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

    return { permissions: permissions.map((p) => p.key) };
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
