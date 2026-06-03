import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MemberLevel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MEMBER_LEVELS_KEY } from "./member.decorator";

const MEMBER_HIERARCHY: Record<MemberLevel, number> = {
  NONE: 0,
  MONTHLY: 1,
  YEARLY: 2,
  LIFETIME: 3,
};

/**
 * 会员权限守卫 — 检查用户是否拥有所需会员等级且未过期。
 *
 * 用法:
 * @UseGuards(JwtAuthGuard, MemberGuard)
 * @RequireMember("MONTHLY", "YEARLY")
 *
 * LIFETIME 会员自动通过 MONTHLY/YEARLY 检查。
 * 未认证用户返回 false；认证但等级不足抛出 ForbiddenException。
 */
@Injectable()
export class MemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevels = this.reflector.getAllAndOverride<MemberLevel[]>(
      MEMBER_LEVELS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredLevels || requiredLevels.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("会员专享功能");

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!dbUser) throw new ForbiddenException("会员专享功能");

    const now = new Date();
    const isActive =
      dbUser.memberLevel !== "NONE" &&
      (!dbUser.memberExpire || dbUser.memberExpire > now);
    if (!isActive) {
      throw new ForbiddenException("需要有效会员身份才能访问此内容");
    }

    const userLevel = MEMBER_HIERARCHY[dbUser.memberLevel];
    const minRequired = Math.min(
      ...requiredLevels.map((l) => MEMBER_HIERARCHY[l]),
    );
    if (userLevel < minRequired) {
      throw new ForbiddenException("当前会员等级不足以访问此内容");
    }

    return true;
  }
}
