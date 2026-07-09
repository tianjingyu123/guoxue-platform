import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { isUniqueConstraintError } from "../../../common/prisma-errors";
import { safePagination } from "../../../common/pagination";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CoinService } from "../../coin/coin.service";
import { CommissionService } from "../../commission/commission.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import { NotificationService } from "../../notification/notification.service";
import { JoinCircleDto, UpdateMemberRoleDto } from "../circle.dto";
import { Prisma, CircleMemberRole } from "@prisma/client";
import { CircleSharedService } from "./circle-shared.service";

/**
 * 圈子-成员与入圈支付域（从 circle.service 拆出·纯搬家不改逻辑）。
 * 职责：加入/退出/续费/入圈支付（虚拟币/外部支付事务）+ 入圈申请 + 成员角色/移除/列表
 * + 过期清理与到期提醒定时任务（@Cron）。
 * ⚠️ 含资金/扣费方法（prepareJoin/confirmJoin/renewCircle），逐字搬迁，跨域调用改注入。
 * 依赖：共享叶子域（checkOwnership/checkAdmin）·单向不循环。
 */
@Injectable()
export class CircleMembershipService {
  private readonly logger = new Logger(CircleMembershipService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private shared: CircleSharedService,
    @Optional() private coinService?: CoinService,
    @Optional() private commissionService?: CommissionService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  /**
   * 加入圈子：免费圈直接加入，付费圈需先调用 prepareJoin 创建订单并支付后调用 confirmJoin
   */
  async join(circleId: string, userId: string, dto?: JoinCircleDto) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) {
      // 如果已加入但已过期（年费圈），提示续费
      if (existing.expireAt && new Date(existing.expireAt) < new Date()) {
        throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "会员已过期，请续费后重新加入");
      }
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
    }

    // 免费圈子
    if (circle.type === "FREE") {
      // needApproval 列绕过 generate 锁，原生查（circle 对象不含该字段）
      const appr = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "needApproval" FROM "Circle" WHERE id=$1`,
        circleId,
      );
      // 需审批的免费圈：不直接进，产生入圈申请等圈主审核
      if (appr?.[0]?.needApproval === true) {
        return this.createJoinRequest(circleId, userId);
      }
      // 普通免费圈：直接加入
      return this.createMembership(circleId, userId, null, dto?.referrerId);
    }

    // 付费圈子需要先支付
    throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "付费圈子请先完成支付");
  }

  /**
   * 产生入圈申请（需审批的免费圈）。幂等：已有 PENDING 申请则提示等待。
   * 审批由 growth.reviewJoinRequest 处理（通过则建成员 + memberCount+1）。
   * CircleJoinRequest 表绕过 generate 锁，用原生 SQL 访问。
   */
  private async createJoinRequest(circleId: string, userId: string) {
    const pending = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "CircleJoinRequest" WHERE "circleId"=$1 AND "userId"=$2 AND "status"='PENDING' LIMIT 1`,
      circleId, userId,
    );
    if (pending.length) {
      return { status: "pending", message: "您的入圈申请正在审核中，请耐心等待" };
    }
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CircleJoinRequest" ("id","circleId","userId","status","createdAt") VALUES ($1,$2,$3,'PENDING',CURRENT_TIMESTAMP)`,
      randomUUID(), circleId, userId,
    );
    return { status: "pending", message: "入圈申请已提交，等待圈主审核" };
  }

  /**
   * 我的入圈申请列表（申请人视角）。CircleJoinRequest 绕 generate 锁，
   * 原生 SQL join Circle 取圈子名/封面；按申请时间倒序。
   */
  async getMyJoinRequests(userId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r."id", r."circleId", r."status", r."message", r."reviewedAt", r."rejectReason", r."createdAt",
              c."name" AS "circleName", c."cover" AS "circleCover"
       FROM "CircleJoinRequest" r
       LEFT JOIN "Circle" c ON c.id = r."circleId"
       WHERE r."userId"=$1
       ORDER BY r."createdAt" DESC`,
      userId,
    );
  }

  /** 创建付费入圈订单（返回订单信息供前端拉起支付） */
  async prepareJoin(circleId: string, userId: string, dto?: { payMethod?: string; referrerId?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    if (circle.type === "FREE") throw new BusinessException(ErrorCode.BAD_REQUEST, "免费圈子无需支付");

    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing && (!existing.expireAt || new Date(existing.expireAt) > new Date())) {
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已是圈子成员");
    }

    const priceYuan = Number(circle.price);
    if (priceYuan <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "圈子价格配置异常");

    // 通过统一价格引擎计算实付价格（检查限时折扣）
    const pricing = await this.unifiedPricing.calculateTargetPrice(circleId, "CIRCLE", userId);
    const effectivePriceYuan = pricing.effectivePrice;

    // 尝试虚拟币支付
    if (!dto?.payMethod || dto.payMethod === "COIN") {
      if (!this.coinService) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用");
      const balance = await this.coinService.getBalance(userId);
      const coinNeeded = Math.ceil(effectivePriceYuan * 10); // 1元=10币
      if (balance.balance >= coinNeeded) {
        // 币够直接扣
        return this.confirmJoin(circleId, userId, { payMethod: "COIN", referrerId: dto?.referrerId });
      }
      // 币不够，返回充值提示
      return {
        needPayment: true,
        payMethod: "COIN",
        priceYuan: effectivePriceYuan,
        coinNeeded,
        currentBalance: balance.balance,
        shortage: coinNeeded - balance.balance,
        orderNo: `CIRCLE_JOIN_${circleId}_${userId}_${Date.now()}`,
        message: "虚拟币余额不足，请先充值",
      };
    }

    // 微信/支付宝支付 — 创建待支付订单
    const orderNo = `CIRCLE_JOIN_${circleId.slice(0, 8)}_${Date.now()}`;
    const orderData: any = {
      userId,
      type: "CIRCLE_JOIN",
      targetId: circleId,
      amount: effectivePriceYuan,
      payAmount: effectivePriceYuan,
      originalAmount: pricing.originalPrice > effectivePriceYuan ? pricing.originalPrice : undefined,
      status: "PENDING",
      payMethod: dto.payMethod,
      referrerId: dto.referrerId || undefined,
    };
    if (pricing.appliedPromotion) {
      orderData.promotionType = pricing.appliedPromotion.type;
      orderData.promotionId = pricing.appliedPromotion.id;
    }
    const order = await this.prisma.order.create({ data: orderData });

    return {
      needPayment: true,
      payMethod: dto.payMethod,
      priceYuan: effectivePriceYuan,
      coinNeeded: 0,
      orderNo,
      orderId: order.id,
      message: "请完成支付",
    };
  }

  /** 支付完成后确认入圈（由支付回调或前端调用） */
  async confirmJoin(circleId: string, userId: string, dto: { payMethod?: string; orderNo?: string; orderId?: string; referrerId?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");

    // 再次校验是否已加入
    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing && (!existing.expireAt || new Date(existing.expireAt) > new Date())) {
      throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已是圈子成员");
    }

    // 计算到期时间
    let expireAt: Date | null = null;
    if (circle.type === "YEARLY") {
      expireAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    let member: any;

    // 虚拟币支付：扣币与建成员关系在同一事务内，防止钱货两空
    if (dto.payMethod === "COIN") {
      const coinPricing = await this.unifiedPricing.calculateTargetPrice(circleId, "CIRCLE", userId);
      const priceYuan = coinPricing.effectivePrice;
      const coinNeeded = Math.ceil(priceYuan * 10);
      if (!this.coinService) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用");

      member = await this.prisma.$transaction(async (tx) => {
        await this.coinService!.spend(userId, {
          amountCoin: coinNeeded,
          scene: "CIRCLE_JOIN",
          refId: circleId,
          description: `加入圈子: ${circle.name}`,
        }, tx);

        return this.createMembershipTx(circleId, userId, expireAt, dto.referrerId, tx);
      });
    } else if (dto.orderNo || dto.orderId) {
      // 外部支付：校验订单状态
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: dto.orderId || "" },
            { payTransactionId: dto.orderNo || "" },
          ],
          type: "CIRCLE_JOIN",
          targetId: circleId,
          userId,
        },
      });
      if (!order || order.status !== "PAID") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单未支付或不存在");
      }
      member = await this.createMembership(circleId, userId, expireAt, dto.referrerId);
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供支付方式或订单号");
    }

    // 缓存清理（事务外操作）
    await Promise.all([
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    // 记录圈子收益（fire-and-forget，不影响主流程）
    const priceYuan = Number(circle.price);
    if (priceYuan > 0 && this.commissionService) {
      this.commissionService.recordCircleRevenue(circleId, "circle_join", member.id, priceYuan).catch(
        (err) => this.logger.warn("记录入圈收益失败", err),
      );
    }

    // 更新订单状态
    if (dto.orderNo || dto.orderId) {
      await this.prisma.order.updateMany({
        where: {
          OR: [
            { id: dto.orderId || "" },
            { id: dto.orderNo || "" },
          ],
          type: "CIRCLE_JOIN",
          userId,
          status: "PAID",
        },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return member;
  }

  /** 续费年费圈子 */
  async renewCircle(circleId: string, userId: string, dto?: { payMethod?: string }) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.status !== "ACTIVE") throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    if (circle.type !== "YEARLY") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅年费圈子支持续费");

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");

    const priceYuan = Number(circle.price);
    const coinNeeded = Math.ceil(priceYuan * 10);

    // 续费仅支持虚拟币支付
    if (dto?.payMethod && dto.payMethod !== "COIN") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "续费仅支持虚拟币支付");
    }
    if (!this.coinService) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用");

    // 延长到期时间：从当前到期时间或现在开始 +365天
    const baseDate = member.expireAt && new Date(member.expireAt) > new Date()
      ? new Date(member.expireAt)
      : new Date();
    const newExpireAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    // 扣币与续费在同一事务，防止钱已扣但未延期
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.coinService!.spend(userId, {
        amountCoin: coinNeeded,
        scene: "CIRCLE_RENEW",
        refId: circleId,
        description: `续费圈子: ${circle.name}`,
      }, tx);

      return tx.circleMember.update({
        where: { circleId_userId: { circleId, userId } },
        data: { expireAt: newExpireAt },
      });
    });

    // 记录续费收益
    if (priceYuan > 0 && this.commissionService) {
      this.commissionService.recordCircleRevenue(circleId, "circle_join", member.id, priceYuan).catch(
        (err) => this.logger.warn("记录续费收益失败", err),
      );
    }

    await this.redis.del(`circles:member:${circleId}:${userId}`);
    return { ...updated, newExpireAt: newExpireAt.toISOString() };
  }

  /** 检查用户加入状态 */
  async getJoinStatus(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { id: true, role: true, joinedAt: true, expireAt: true },
    });
    if (!member) return { joined: false };
    const expired = member.expireAt ? new Date(member.expireAt) < new Date() : false;
    return {
      joined: !expired,
      expired,
      role: member.role,
      joinedAt: member.joinedAt,
      expireAt: member.expireAt,
    };
  }

  /** 每日定时清理过期成员（分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredMembers() {
    await this.redis.runExclusive("circle_cleanup_expired_members", 600, () =>
      this._cleanupExpiredMembers(),
    );
  }

  private async _cleanupExpiredMembers() {
    const expired = await this.prisma.circleMember.findMany({
      where: {
        expireAt: { lt: new Date() },
        role: { not: "OWNER" },
      },
      select: { id: true, circleId: true, userId: true },
    });

    if (expired.length === 0) return;

    // 分批处理
    const batchSize = 100;
    for (let i = 0; i < expired.length; i += batchSize) {
      const batch = expired.slice(i, i + batchSize);
      const ids = batch.map((m) => m.id);

      await this.prisma.$transaction(async (tx) => {
        await tx.circleMember.deleteMany({ where: { id: { in: ids } } });
        // 批量获取各圈子成员数
        const circleIds = [...new Set(batch.map((m) => m.circleId))];
        const counts = await tx.circleMember.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds } },
          _count: { id: true },
        });
        for (const { circleId, _count } of counts) {
          await tx.circle.update({
            where: { id: circleId },
            data: { memberCount: _count.id },
          });
        }
      });

      // 清除缓存（pipeline 批量删除）+ 发送通知
      const redis = this.redis.getClient();
      if (redis) {
        const pipeline = redis.pipeline();
        for (const m of batch) {
          pipeline.del(`circles:member:${m.circleId}:${m.userId}`);
        }
        await pipeline.exec();
      }
      for (const m of batch) {
        if (this.notificationService) {
          this.notificationService.send(m.userId, {
            type: "CIRCLE_EXPIRED",
            title: "圈子会员已过期",
            content: "您的圈子会员已过期，可续费重新加入",
            targetType: "CIRCLE",
            targetId: m.circleId,
          }).catch((err) => this.logger.warn("圈子通知发送失败", err));
        }
      }
    }

    this.logger.log(`已清理 ${expired.length} 个过期圈子成员`);
  }

  /** 到期前提醒（提前7天/3天/1天·分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendExpirationReminders() {
    await this.redis.runExclusive("circle_send_expiration_reminders", 600, () =>
      this._sendExpirationReminders(),
    );
  }

  private async _sendExpirationReminders() {
    const remindDays = [7, 3, 1];
    for (const days of remindDays) {
      const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const expiringSoon = await this.prisma.circleMember.findMany({
        where: {
          expireAt: { gte: startOfDay, lt: endOfDay },
          role: { not: "OWNER" },
        },
        select: { userId: true, circleId: true },
        take: 500,
      });

      for (const m of expiringSoon) {
        if (this.notificationService) {
          this.notificationService.send(m.userId, {
            type: "CIRCLE_EXPIRING",
            title: "圈子即将到期",
            content: `您的圈子会员将于 ${days} 天后到期，请及时续费`,
            targetType: "CIRCLE",
            targetId: m.circleId,
          }).catch((err) => this.logger.warn("圈子通知发送失败", err));
        }
      }

      if (expiringSoon.length > 0) {
        this.logger.log(`发送了 ${expiringSoon.length} 条 ${days} 天到期提醒`);
      }
    }
  }

  /** 内部方法：创建成员关系 */
  private async createMembership(circleId: string, userId: string, expireAt: Date | null, referrerId?: string) {
    let member: Awaited<ReturnType<typeof this.prisma.circleMember.create>> | undefined;
    try {
      member = await this.prisma.circleMember.create({
        data: { circleId, userId, role: "MEMBER", expireAt },
      });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
      throw e;
    }

    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    // 处理推荐人奖励
    if (referrerId && this.commissionService) {
      this.commissionService.recordCircleRevenue(circleId, "circle_join_referral", member.id, 0).catch(
        (err) => this.logger.warn("记录推荐收益失败", err),
      );
    }

    return member;
  }

  /**
   * 事务内创建成员关系（供 confirmJoin 等需要与扣币同事务的场景使用）。
   * Redis 缓存清理在外部调用方处理。
   */
  private async createMembershipTx(
    circleId: string,
    userId: string,
    expireAt: Date | null,
    referrerId: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    try {
      const member = await tx.circleMember.create({
        data: { circleId, userId, role: "MEMBER", expireAt },
      });
      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      });
      return member;
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
      throw e;
    }
  }

  async leave(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "未加入该圈子");
    if (member.role === "OWNER") throw new BusinessException(ErrorCode.FORBIDDEN, "圈主不能退出，请先转让圈子");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  async updateMemberRole(circleId: string, operatorId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    await this.shared.checkOwnership(circleId, operatorId);

    if (dto.role === "OWNER") {
      // 转让圈主
      await this.prisma.$transaction([
        this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: operatorId } },
          data: { role: "MEMBER" },
        }),
        this.prisma.circleMember.update({
          where: { circleId_userId: { circleId, userId: targetUserId } },
          data: { role: "OWNER" },
        }),
        this.prisma.circle.update({
          where: { id: circleId },
          data: { ownerId: targetUserId },
        }),
      ]);
    } else {
      const existing = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId: targetUserId } },
      });
      if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "该用户不是圈子成员");
      await this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: dto.role as CircleMemberRole },
      });
    }

    await this.redis.del(`circles:member:${circleId}:${targetUserId}`);
    return { success: true };
  }

  async removeMember(circleId: string, operatorId: string, targetUserId: string) {
    await this.shared.checkAdmin(circleId, operatorId);

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (member.role === "OWNER") throw new BusinessException(ErrorCode.FORBIDDEN, "不能移除圈主");

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    await Promise.all([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      }),
      this.redis.del(`circles:member:${circleId}:${targetUserId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    return { success: true };
  }

  async listMembers(circleId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.circleMember.count({ where: { circleId } }),
    ]);

    return { members, total, page, pageSize };
  }
}
