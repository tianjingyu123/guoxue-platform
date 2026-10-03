import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { MERCHANT_FEATURE_FLAGS } from "./merchant.types";

/**
 * 商家后台守卫 — 检查功能开关 + 商家 ACTIVE 状态
 * 用于商家后台（/merchant-backend/*）的所有端点
 */
@Injectable()
export class MerchantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const enabled = await this.featureFlag.isEnabled(MERCHANT_FEATURE_FLAGS.BACKEND, userId);
    if (!enabled) throw new NotFoundException("资源不存在");

    // 先按 owner 解析；不是 owner 再看是否为某店铺的 ACTIVE 操作员（多操作员支持·官方旗舰店等）。
    let merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    let role: "OWNER" | "OPERATOR" = "OWNER";
    if (!merchant) {
      const membership = await this.prisma.merchantMember.findFirst({
        where: { userId, status: "ACTIVE" },
        include: { merchant: true },
      });
      if (membership) {
        merchant = membership.merchant;
        role = "OPERATOR";
      }
    }
    if (!merchant || merchant.status !== "ACTIVE") {
      throw new ForbiddenException("商家账号未激活或不存在");
    }

    // merchant = 店铺(归属以 merchant.userId 为准)；actingUserId = 真实操作者(用于审计)；role = 身份
    request.merchant = merchant;
    request.merchantRole = role;
    request.actingUserId = userId;
    return true;
  }
}
