import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { PrismaService } from "../../../prisma/prisma.service";
import { RolePermissionOverrides, resolvePermission } from "../governance/circle-governance.constants";

/**
 * 圈子-共享叶子域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：跨域复用的权限/成员校验私有辅助（checkOwnership/checkAdmin/ensureMember/checkPermission），
 * 被多个业务域单向注入，确保无循环依赖（破环点）。
 */
@Injectable()
export class CircleSharedService {
  constructor(private prisma: PrismaService) {}

  async checkOwnership(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.ownerId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主可执行此操作");
    }
  }

  async checkAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "权限不足");
    }
  }

  async ensureMember(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子");
  }

  /**
   * 权限矩阵校验（治理体系 #8·2026-07-10）：
   * 圈主恒通过；锁定项（资金/移出）非圈主恒拒；其余按 CircleGovernanceConfig.rolePermissions
   * 覆盖位判断，缺省回落设计稿默认矩阵（见 governance/circle-governance.constants）。
   */
  async checkPermission(circleId: string, userId: string, permission: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子");
    if (member.role === "OWNER") return;
    const config = await this.prisma.circleGovernanceConfig.findUnique({
      where: { circleId },
      select: { rolePermissions: true },
    });
    const allowed = resolvePermission(
      member.role,
      permission,
      (config?.rolePermissions as RolePermissionOverrides | null) ?? null,
    );
    if (!allowed) throw new BusinessException(ErrorCode.FORBIDDEN, "权限不足");
  }
}
