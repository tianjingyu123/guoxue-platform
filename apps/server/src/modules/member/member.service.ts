import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "@guoxue/shared";

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 获取所有启用的会员套餐 */
  async getPlans() {
    return this.prisma.memberConfig.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }

  /** 购买会员 */
  async purchase(userId: string, planId: string) {
    const plan = await this.prisma.memberConfig.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "套餐不存在或已下架");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const now = new Date();
    let expireAt: Date | null = null;
    switch (plan.level) {
      case "MONTHLY": expireAt = new Date(now.getTime() + 30 * 86400000); break;
      case "YEARLY":  expireAt = new Date(now.getTime() + 365 * 86400000); break;
      case "LIFETIME": expireAt = null; break;
    }

    const [purchase] = await this.prisma.$transaction([
      this.prisma.memberPurchase.create({
        data: { userId, memberType: plan.level as any, amount: plan.price, paidAt: now, expireAt },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { memberLevel: plan.level as any, memberExpire: expireAt },
      }),
    ]);

    this.logger.log(`用户 ${userId} 购买会员 ${plan.level}`);
    return { id: purchase.id, level: plan.level, amount: plan.price, expireAt };
  }

  /** 查询我的会员状态 */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const now = new Date();
    const isActive = user.memberLevel !== "NONE"
      && (!user.memberExpire || user.memberExpire > now);
    const remainingDays = user.memberExpire
      ? Math.max(0, Math.ceil((user.memberExpire.getTime() - now.getTime()) / 86400000))
      : (user.memberLevel === "LIFETIME" ? -1 : 0);

    return {
      memberLevel: user.memberLevel,
      memberExpire: user.memberExpire?.toISOString() ?? null,
      isActive,
      remainingDays,
    };
  }

  /** 续费会员 */
  async renew(userId: string, planId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.memberLevel === "NONE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "你还不是会员，请先购买");
    }
    return this.purchase(userId, planId);
  }

  /** 获取当前会员权益 */
  async getBenefits(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true, memberExpire: true },
    });
    if (!user || user.memberLevel === "NONE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "你还不是会员");
    }

    const config = await this.prisma.memberConfig.findUnique({
      where: { level: user.memberLevel },
    });
    if (!config) throw new BusinessException(ErrorCode.NOT_FOUND, "会员配置不存在");

    return {
      level: config.level,
      name: config.name,
      benefits: config.benefits,
      coinBonus: config.coinBonus,
      maxBorrowDays: config.maxBorrowDays,
    };
  }
}
