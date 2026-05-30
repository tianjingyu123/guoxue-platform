import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { randomInt } from "crypto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CoinService } from "../coin/coin.service";
import { CommissionService } from "../commission/commission.service";
import { NotificationService } from "../notification/notification.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";
import { Prisma, CircleMemberRole, CircleType, PostType } from "@prisma/client";

@Injectable()
export class CircleService {
  private readonly logger = new Logger(CircleService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() private coinService?: CoinService,
    @Optional() private commissionService?: CommissionService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  // ───────── 圈子 CRUD ─────────

  async create(ownerId: string, dto: CreateCircleDto) {
    const circle = await this.prisma.circle.create({
      data: {
        name: dto.name,
        intro: dto.intro,
        cover: dto.cover,
        tags: dto.tags,
        type: dto.type as CircleType,
        price: dto.price ?? 0,
        depositAmount: dto.depositAmount ?? 0,
        stationId: dto.stationId || undefined,
        ownerId,
        members: {
          create: { userId: ownerId, role: "OWNER" },
        },
        memberCount: 1,
      },
      include: { members: { select: { userId: true, role: true } } },
    });

    // 给创建者分配圈主角色
    await this.prisma.userRole.upsert({
      where: { userId_roleType_bindId: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id } },
      create: { userId: ownerId, roleType: "CIRCLE_OWNER", bindId: circle.id },
      update: {},
    });

    await this.redis.delByPattern("circles:list:*");
    return circle;
  }

  async update(circleId: string, userId: string, dto: UpdateCircleDto) {
    await this.checkOwnership(circleId, userId);
    const updated = await this.prisma.circle.update({
      where: { id: circleId },
      data: dto,
    });
    await Promise.all([
      this.redis.delByPattern("circles:list:*"),
      this.redis.del(`circles:detail:${circleId}`),
    ]);
    return updated;
  }

  async getDetail(circleId: string, userId?: string) {
    const cacheKey = `circles:detail:${circleId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      if (userId) {
        // 成员关系独立缓存，避免缓存命中后重复查 DB
        const memKey = `circles:member:${circleId}:${userId}`;
        let membership = await this.redis.getJson<any>(memKey);
        if (membership === null) {
          membership = await this.prisma.circleMember.findUnique({
            where: { circleId_userId: { circleId, userId } },
          });
          await this.redis.setJson(memKey, membership, 300);
        }
        return { ...cached, membership: membership || null };
      }
      return cached;
    }

    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { posts: true, articles: true, courses: true } },
      },
    });
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");

    // 检查当前用户是否已加入
    let membership = null;
    if (userId) {
      membership = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
      });
      const memKey = `circles:member:${circleId}:${userId}`;
      await this.redis.setJson(memKey, membership, 60);
    }

    const data = { ...circle, membership };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  async listCircles(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    tag?: string;
    type?: string;
    stationId?: string;
  }) {
    const { page, pageSize, keyword, tag, type, stationId } = params;
    const filterHash = `${keyword ?? ""}:${tag ?? ""}:${type ?? ""}`;
    const cacheKey = `circles:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.CircleWhereInput = { status: "ACTIVE" };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { intro: { contains: keyword } },
      ];
    }
    if (tag) where.tags = { has: tag };
    if (type) where.type = type as CircleType;
    if (stationId) where.stationId = stationId;

    const [circles, total] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        select: {
          id: true, name: true, intro: true, cover: true, tags: true,
          type: true, price: true, memberCount: true, postCount: true,
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.circle.count({ where }),
    ]);

    const data = { circles, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  async getMyCircles(userId: string) {
    return this.prisma.circleMember.findMany({
      where: { userId },
      include: {
        circle: {
          select: {
            id: true, name: true, cover: true, type: true,
            memberCount: true, postCount: true, updatedAt: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
  }

  // ───────── 圈子公告 ─────────

  async getAnnouncement(circleId: string) {
    const latest = await this.prisma.circleAnnouncement.findFirst({
      where: { circleId, isTop: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, nickname: true, avatar: true } } },
    });
    if (latest) return { ...latest, content: latest.content, updatedAt: latest.updatedAt.toISOString() };
    const fallback = await this.prisma.circleAnnouncement.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
    });
    return { content: fallback?.content || "", updatedAt: fallback?.updatedAt?.toISOString() || null };
  }

  async setAnnouncement(circleId: string, userId: string, content: string, isTop?: boolean) {
    await this.checkAdmin(circleId, userId);
    if (isTop) {
      await this.prisma.circleAnnouncement.updateMany({
        where: { circleId, isTop: true },
        data: { isTop: false },
      });
    }
    const announcement = await this.prisma.circleAnnouncement.create({
      data: { circleId, userId, content, isTop: isTop ?? true },
    });
    return { ...announcement, content: announcement.content, updatedAt: announcement.updatedAt.toISOString() };
  }

  async listAnnouncements(circleId: string, page = 1, pageSize = 20) {
    const [list, total] = await Promise.all([
      this.prisma.circleAnnouncement.findMany({
        where: { circleId },
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.circleAnnouncement.count({ where: { circleId } }),
    ]);
    return { list, total, page, pageSize };
  }

  async deleteAnnouncement(circleId: string, userId: string, announcementId: string) {
    await this.checkAdmin(circleId, userId);
    await this.prisma.circleAnnouncement.delete({ where: { id: announcementId } });
    return { success: true };
  }

  // ───────── 圈子邀请 ─────────

  async generateInviteCode(circleId: string, userId: string, maxUses = 0) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.CIRCLE_NOT_MEMBER, "你不是该圈子成员");

    const existing = await this.prisma.circleInviteCode.findFirst({
      where: { circleId, userId, expiredAt: { gte: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    const prefix = circleId.replace(/-/g, "").slice(0, 6).toUpperCase();
    const random = randomInt(0, 36 ** 6).toString(36).padStart(6, "0").toUpperCase();
    const code = `${prefix}${random}`;

    return this.prisma.circleInviteCode.create({
      data: { circleId, userId, code, maxUses },
    });
  }

  async joinByInviteCode(code: string, inviteeId: string) {
    const inviteCode = await this.prisma.circleInviteCode.findUnique({ where: { code } });
    if (!inviteCode) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码无效");
    if (inviteCode.expiredAt && new Date(inviteCode.expiredAt) < new Date()) {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码已过期");
    }
    if (inviteCode.maxUses > 0 && inviteCode.useCount >= inviteCode.maxUses) {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "邀请码已达使用上限");
    }

    const circle = await this.prisma.circle.findUnique({ where: { id: inviteCode.circleId } });
    if (!circle || circle.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在或已下架");
    }

    const existingMember = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: inviteCode.circleId, userId: inviteeId } },
    });
    if (existingMember) throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");

    await this.prisma.$transaction(async (tx) => {
      await tx.circleMember.create({
        data: { circleId: inviteCode.circleId, userId: inviteeId, role: "MEMBER" },
      });
      await tx.circleInviteCode.update({
        where: { id: inviteCode.id },
        data: { useCount: { increment: 1 } },
      });
      await tx.circleInvitation.create({
        data: {
          circleId: inviteCode.circleId,
          inviterId: inviteCode.userId,
          inviteeId,
          inviteCodeId: inviteCode.id,
        },
      });
      await tx.circle.update({
        where: { id: inviteCode.circleId },
        data: { memberCount: { increment: 1 } },
      });
    });

    return { success: true, circleId: inviteCode.circleId };
  }

  async listMyInviteCodes(circleId: string, userId: string) {
    return this.prisma.circleInviteCode.findMany({
      where: { circleId, userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInvitationStats(circleId: string, userId: string) {
    const [total, records] = await Promise.all([
      this.prisma.circleInvitation.count({ where: { circleId, inviterId: userId } }),
      this.prisma.circleInvitation.findMany({
        where: { circleId, inviterId: userId },
        include: { invitee: { select: { id: true, nickname: true, avatar: true } } },
        orderBy: { joinedAt: "desc" },
        take: 20,
      }),
    ]);
    return { total, records };
  }

  // ───────── 成员管理 ─────────

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

    // 免费圈子直接加入
    if (circle.type === "FREE") {
      return this.createMembership(circleId, userId, null, dto?.referrerId);
    }

    // 付费圈子需要先支付
    throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "付费圈子请先完成支付");
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

    // 尝试虚拟币支付
    if (!dto?.payMethod || dto.payMethod === "COIN") {
      if (!this.coinService) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付服务暂不可用");
      const balance = await this.coinService.getBalance(userId);
      const coinNeeded = Math.ceil(priceYuan * 10); // 1元=10币
      if (balance.balance >= coinNeeded) {
        // 币够直接扣
        return this.confirmJoin(circleId, userId, { payMethod: "COIN", referrerId: dto?.referrerId });
      }
      // 币不够，返回充值提示
      return {
        needPayment: true,
        payMethod: "COIN",
        priceYuan,
        coinNeeded,
        currentBalance: balance.balance,
        shortage: coinNeeded - balance.balance,
        orderNo: `CIRCLE_JOIN_${circleId}_${userId}_${Date.now()}`,
        message: "虚拟币余额不足，请先充值",
      };
    }

    // 微信/支付宝支付 — 创建待支付订单
    const orderNo = `CIRCLE_JOIN_${circleId.slice(0, 8)}_${Date.now()}`;
    const order = await this.prisma.order.create({
      data: {
        userId,
        type: "CIRCLE_JOIN",
        targetId: circleId,
        amount: circle.price,
        payAmount: circle.price,
        status: "PENDING",
        payMethod: dto.payMethod,
        referrerId: dto.referrerId || undefined,
      },
    });

    return {
      needPayment: true,
      payMethod: dto.payMethod,
      priceYuan,
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

    // 虚拟币支付：扣币
    if (dto.payMethod === "COIN") {
      const priceYuan = Number(circle.price);
      const coinNeeded = Math.ceil(priceYuan * 10);
      if (this.coinService) {
        await this.coinService.spend(userId, {
          amountCoin: coinNeeded,
          scene: "CIRCLE_JOIN",
          refId: circleId,
          description: `加入圈子: ${circle.name}`,
        });
      }
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
    }

    // 计算到期时间
    let expireAt: Date | null = null;
    if (circle.type === "YEARLY") {
      expireAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const member = await this.createMembership(circleId, userId, expireAt, dto.referrerId);

    // 记录圈子收益
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
    await this.coinService.spend(userId, {
      amountCoin: coinNeeded,
      scene: "CIRCLE_RENEW",
      refId: circleId,
      description: `续费圈子: ${circle.name}`,
    });

    // 延长到期时间：从当前到期时间或现在开始 +365天
    const baseDate = member.expireAt && new Date(member.expireAt) > new Date()
      ? new Date(member.expireAt)
      : new Date();
    const newExpireAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: { expireAt: newExpireAt },
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

  /** 每日定时清理过期成员 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredMembers() {
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

  /** 到期前提醒（提前7天/3天/1天） */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendExpirationReminders() {
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
      if ((e as { code?: string })?.code === "P2002") throw new BusinessException(ErrorCode.CIRCLE_MEMBER_EXISTS, "已加入该圈子");
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
    await this.checkOwnership(circleId, operatorId);

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
      await this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { role: dto.role as CircleMemberRole },
      });
    }

    await this.redis.del(`circles:member:${circleId}:${targetUserId}`);
    return { success: true };
  }

  async removeMember(circleId: string, operatorId: string, targetUserId: string) {
    await this.checkAdmin(circleId, operatorId);

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

  async listMembers(circleId: string, page = 1, pageSize = 20) {
    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.circleMember.count({ where: { circleId } }),
    ]);

    return { members, total, page, pageSize };
  }

  // ───────── 帖子 ─────────

  async createPost(circleId: string, userId: string, dto: CreatePostDto) {
    await this.ensureMember(circleId, userId);

    const post = await this.prisma.post.create({
      data: {
        circleId,
        userId,
        type: dto.type as PostType,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        videoUrl: dto.videoUrl,
        fileUrl: dto.fileUrl,
        linkUrl: dto.linkUrl,
        status: dto.status ?? "PUBLISHED",
      },
    });

    // 只有发布状态的帖子才计入统计
    if (!dto.status || dto.status === "PUBLISHED") {
      await this.prisma.circle.update({
        where: { id: circleId },
        data: { postCount: { increment: 1 } },
      });
    }

    return post;
  }

  /** 获取我的草稿列表 */
  async getMyDrafts(userId: string, page = 1, pageSize = 20) {
    const where = { userId, status: "DRAFT" };
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: { circle: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.post.count({ where }),
    ]);
    return { posts, total, page, pageSize };
  }

  /** 发布草稿 */
  async publishPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能发布自己的帖子");
    if (post.status !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "该帖子不是草稿");

    await this.prisma.circle.update({
      where: { id: post.circleId },
      data: { postCount: { increment: 1 } },
    });

    return this.prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED", createdAt: new Date() },
    });
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的帖子");

    return this.prisma.post.update({ where: { id: postId }, data: dto as Prisma.PostUpdateInput });
  }

  async deletePost(postId: string, userId: string, circleId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    // 检查权限：作者、圈主、管理员可删除
    if (post.userId !== userId) {
      await this.checkAdmin(circleId, userId);
    }

    await this.prisma.post.delete({ where: { id: postId } });
    await this.prisma.circle.update({
      where: { id: circleId },
      data: { postCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async getPosts(circleId: string, query: { type?: string; isEssence?: string; page?: number; pageSize?: number }) {
    const { type, isEssence, page = 1, pageSize = 20 } = query;
    const where: Prisma.PostWhereInput = { circleId, status: "PUBLISHED" };

    if (type) where.type = type as PostType;
    if (isEssence === "true") where.isEssence = true;
    if (isEssence === "top") where.isTop = true;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.post.count({ where }),
    ]);

    return { posts, total, page, pageSize };
  }

  async getPostDetail(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
      },
    });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    return post;
  }

  async toggleEssence(postId: string, circleId: string, userId: string) {
    await this.checkAdmin(circleId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isEssence: !post.isEssence },
    });
  }

  async toggleTop(postId: string, circleId: string, userId: string) {
    await this.checkAdmin(circleId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");

    return this.prisma.post.update({
      where: { id: postId },
      data: { isTop: !post.isTop },
    });
  }

  // ───────── 达人咨询配置 ─────────

  async setExpertConfig(circleId: string, userId: string, dto: {
    questionPriceCoin: number;
    questionTimeoutHours: number;
    callPricePerMinuteCoin: number;
    callAvailableHours?: Array<{ day: string; start: string; end: string }>;
  }) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (!["OWNER", "PARTNER", "GUEST"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有圈主、合伙人和嘉宾可以配置咨询价格");
    }

    const updated = await this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId } },
      data: {
        questionPriceCoin: dto.questionPriceCoin,
        questionTimeoutHours: dto.questionTimeoutHours,
        callPricePerMinuteCoin: dto.callPricePerMinuteCoin,
        callAvailableHours: dto.callAvailableHours || undefined,
      },
    });

    await this.redis.del(`circles:detail:${circleId}`);
    return updated;
  }

  async getExpertConfig(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: {
        userId: true,
        role: true,
        questionPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
    if (!member) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    return member;
  }

  /** 获取圈子内所有可咨询的达人列表 */
  async listCircleExperts(circleId: string) {
    return this.prisma.circleMember.findMany({
      where: {
        circleId,
        role: { in: ["OWNER", "PARTNER", "GUEST"] },
        OR: [
          { questionPriceCoin: { gt: 0 } },
          { callPricePerMinuteCoin: { gt: 0 } },
        ],
      },
      select: {
        userId: true,
        role: true,
        questionPriceCoin: true,
        questionTimeoutHours: true,
        callPricePerMinuteCoin: true,
        callAvailableHours: true,
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });
  }

  // ───────── 排行榜 ─────────

  async getCircleRanking(page = 1, pageSize = 20, sortBy?: string) {
    const validSortBy = ["memberCount", "postCount", "activityScore"] as const;
    const sortField = validSortBy.includes(sortBy as any) ? sortBy! : "memberCount";
    const where: Prisma.CircleWhereInput = { status: "ACTIVE" };

    let items: Array<Record<string, unknown>>;
    let total: number;

    if (sortField === "activityScore") {
      // activityScore 需要计算（memberCount + postCount），取全部后排序
      const [circles, count] = await Promise.all([
        this.prisma.circle.findMany({
          where,
          select: {
            id: true, name: true, cover: true, memberCount: true,
            postCount: true, intro: true,
          },
          orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
        }),
        this.prisma.circle.count({ where }),
      ]);
      total = count;
      items = circles.slice((page - 1) * pageSize, page * pageSize).map((c, i) => ({
        ...c,
        rank: (page - 1) * pageSize + i + 1,
      }));
    } else {
      const [circles, count] = await Promise.all([
        this.prisma.circle.findMany({
          where,
          select: {
            id: true, name: true, cover: true, memberCount: true,
            postCount: true, intro: true,
          },
          orderBy: { [sortField]: "desc" } as Prisma.CircleOrderByWithRelationInput,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.circle.count({ where }),
      ]);
      total = count;
      items = circles.map((c, i) => ({
        ...c,
        rank: (page - 1) * pageSize + i + 1,
      }));
    }

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getMemberLeaderboard(circleId: string, page = 1, pageSize = 20, period?: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id: circleId },
      select: { id: true },
    });
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");

    const now = new Date();
    let periodStart: Date | undefined;
    if (period === "week") {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const postWhere: Prisma.PostWhereInput = { circleId, status: "PUBLISHED" };
    if (periodStart) {
      postWhere.createdAt = { gte: periodStart };
    }

    // 按 userId 聚合帖子数量作为贡献度依据
    const postStats = await this.prisma.post.groupBy({
      by: ["userId"],
      where: postWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = postStats.length;
    const paged = postStats.slice((page - 1) * pageSize, page * pageSize);
    const userIds = paged.map((s) => s.userId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = paged.map((stat, index) => ({
      userId: stat.userId,
      nickname: userMap.get(stat.userId)?.nickname ?? "",
      avatar: userMap.get(stat.userId)?.avatar ?? null,
      contributionScore: stat._count.id * 10,
      postCount: stat._count.id,
      rank: (page - 1) * pageSize + index + 1,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getHotContentRanking(circleId: string, limit = 10) {
    // 获取最近帖子作为候选集
    const posts = await this.prisma.post.findMany({
      where: { circleId, status: "PUBLISHED" },
      select: {
        id: true, title: true,
        user: { select: { id: true, nickname: true, avatar: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);

    // 并行统计点赞数和评论数
    const [likeCounts, commentCounts] = await Promise.all([
      this.prisma.like.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: { id: true },
      }),
      this.prisma.comment.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: { id: true },
      }),
    ]);

    const likeMap = new Map(likeCounts.map((l) => [l.targetId, l._count.id]));
    const commentMap = new Map(commentCounts.map((c) => [c.targetId, c._count.id]));

    return posts
      .map((p) => {
        const likeCount = likeMap.get(p.id) ?? 0;
        const commentCount = commentMap.get(p.id) ?? 0;
        return {
          id: p.id,
          title: p.title,
          user: p.user,
          likeCount,
          commentCount,
          hotScore: likeCount + commentCount,
          createdAt: p.createdAt,
        };
      })
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, limit);
  }

  // ───────── 成员分组 ─────────

  async createMemberGroup(circleId: string, userId: string, name: string, color?: string) {
    await this.checkAdmin(circleId, userId);
    return this.prisma.circleMemberGroup.create({
      data: { circleId, name, color: color || "#3b82f6" },
    });
  }

  async listMemberGroups(circleId: string) {
    return this.prisma.circleMemberGroup.findMany({
      where: { circleId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateMemberGroup(circleId: string, groupId: string, userId: string, name?: string, color?: string) {
    await this.checkAdmin(circleId, userId);
    const data: Prisma.CircleMemberGroupUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    return this.prisma.circleMemberGroup.update({ where: { id: groupId }, data });
  }

  async deleteMemberGroup(circleId: string, groupId: string, userId: string) {
    await this.checkAdmin(circleId, userId);
    await this.prisma.circleMemberGroupRelation.deleteMany({ where: { groupId } });
    await this.prisma.circleMemberGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  async addMembersToGroup(circleId: string, groupId: string, userId: string, userIds: string[]) {
    await this.checkAdmin(circleId, userId);
    const data = userIds.map((uid) => ({ groupId, userId: uid }));
    await this.prisma.circleMemberGroupRelation.createMany({ data, skipDuplicates: true });
    return { success: true };
  }

  async removeMemberFromGroup(circleId: string, groupId: string, userId: string, targetUserId: string) {
    await this.checkAdmin(circleId, userId);
    await this.prisma.circleMemberGroupRelation.deleteMany({
      where: { groupId, userId: targetUserId },
    });
    return { success: true };
  }

  async getGroupMembers(circleId: string, groupId: string, page = 1, pageSize = 20) {
    const where = { groupId };
    const [relations, total] = await Promise.all([
      this.prisma.circleMemberGroupRelation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.circleMemberGroupRelation.count({ where }),
    ]);
    const userIds = relations.map((r) => r.userId);
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true, avatar: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const members = relations.map((r) => userMap.get(r.userId) || { id: r.userId, nickname: "", avatar: null });
    return { members, total, page, pageSize };
  }

  // ───────── 私有辅助 ─────────

  private async checkOwnership(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle || circle.ownerId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主可执行此操作");
    }
  }

  private async checkAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "权限不足");
    }
  }

  private async ensureMember(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "请先加入圈子");
  }
}
