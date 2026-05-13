import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

const PERM_CACHE_TTL = 600; // 10分钟
const PERM_CACHE_KEY = "automation:permissions:";

@Injectable()
export class AutomationPermissionService {
  private readonly logger = new Logger(AutomationPermissionService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 检查执行者是否有指定资源的操作权限 */
  async canExecute(
    executorType: string, // "CLAUDE" | "HUMAN"
    executorId: string | undefined,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // 人工操作始终通过
    if (executorType === "HUMAN") return true;

    // Claude 操作检查
    const cacheKey = `${PERM_CACHE_KEY}${executorId || "default"}:${resource}:${action}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached === "1";

    // 查询指定Claude实例的角色权限
    const rolePermissions = await this.prisma.automationRolePermission.findMany({
      where: {
        role: {
          name: "DIGITAL_EMPLOYEE",
          assignees: executorId
            ? { some: { userId: executorId, isActive: true } }
            : undefined,
        },
        permission: { resource, action },
      },
    });

    const allowed = rolePermissions.length > 0;
    await this.redis.set(cacheKey, allowed ? "1" : "0", PERM_CACHE_TTL);
    return allowed;
  }

  /** 初始化默认数字员工权限 */
  async seedDefaultPermissions() {
    const defaultPerms = [
      { resource: "task", action: "read" },
      { resource: "task", action: "write" },
      { resource: "content", action: "read" },
      { resource: "content", action: "write" },
      { resource: "user", action: "read" },
      { resource: "system", action: "read" },
      { resource: "finance", action: "read" },
    ];

    for (const perm of defaultPerms) {
      await this.prisma.automationPermission.upsert({
        where: { resource_action: { resource: perm.resource, action: perm.action } },
        create: { resource: perm.resource, action: perm.action },
        update: {},
      });
    }

    // 创建数字员工角色
    const role = await this.prisma.automationRole.upsert({
      where: { name: "DIGITAL_EMPLOYEE" },
      create: {
        name: "DIGITAL_EMPLOYEE",
        description: "Claude 数字员工默认角色",
        isSystem: true,
      },
      update: {},
    });

    // 关联权限
    const allPerms = await this.prisma.automationPermission.findMany();
    for (const perm of allPerms) {
      await this.prisma.automationRolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      });
    }

    this.logger.log(`数字员工角色已初始化: ${allPerms.length} 个权限`);
    return { role: role.name, permissions: allPerms.length };
  }
}
