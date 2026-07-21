import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberLevel, OrderStatus, Prisma, RoleType, UserStatus } from "@prisma/client";
import { maskPhone } from "../../common/crypto.util";
import { safePagination } from "../../common/pagination";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { PushAudienceService } from "./push-audience.service";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: AuditService,
    private auth: AuthService,
    private audience: PushAudienceService,
  ) {}

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nickname: true, avatar: true, bio: true, gender: true,
        phone: true, memberLevel: true, memberExpire: true, status: true,
        createdAt: true,
        roles: { select: { roleType: true, bindId: true } },
        station: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, level: true } },
      },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
    return { ...user, phone: maskPhone(user.phone) };
  }

  async listUsers(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    roleType?: RoleType;
    memberLevel?: MemberLevel;
    status?: UserStatus;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { skip, page, pageSize } = safePagination(params.page, params.pageSize);
    const { keyword, roleType, memberLevel, status, dateFrom, dateTo } = params;
    const where: Prisma.UserWhereInput = {};

    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (roleType) {
      where.roles = { some: { roleType } };
    }
    if (memberLevel) {
      where.memberLevel = memberLevel;
    }
    if (status) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, nickname: true, avatar: true, phone: true,
          memberLevel: true, status: true, createdAt: true,
          roles: { select: { roleType: true } },
          _count: { select: { orders: true, collects: true, comments: true } },
          coinAccount: { select: { balance: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    // 批量获取最后活跃时间
    const userIds = users.map(u => u.id);
    const latestBehaviors = userIds.length > 0
      ? await this.prisma.userBehaviorLog.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _max: { createdAt: true },
        })
      : [];

    const activeMap = new Map(
      latestBehaviors
        .filter(b => b.userId)
        .map(b => [b.userId!, b._max.createdAt!])
    );

    return {
      users: users.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        phone: maskPhone(u.phone),
        memberLevel: u.memberLevel,
        status: u.status,
        createdAt: u.createdAt,
        roles: u.roles,
        orderCount: u._count.orders,
        collectCount: u._count.collects,
        commentCount: u._count.comments,
        coinBalance: u.coinAccount?.balance ?? 0,
        lastActiveAt: activeMap.get(u.id) ?? u.createdAt,
      })),
      total, page, pageSize,
    };
  }

  async assignRole(userId: string, roleType: RoleType, bindId?: string) {
    return this.prisma.userRole.upsert({
      where: { userId_roleType_bindId: { userId, roleType, bindId: bindId ?? "" } },
      create: { userId, roleType, bindId },
      update: {},
    });
  }

  async removeRole(userId: string, roleType: RoleType, bindId?: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleType, bindId: bindId ?? "" },
    });
    return { success: true };
  }

  async getMemberPurchases(userId: string) {
    return this.prisma.memberPurchase.findMany({
      where: { userId },
      orderBy: { paidAt: "desc" },
    });
  }

  // ───────── 个人资料 ─────────

  async updateProfile(userId: string, dto: { nickname?: string; avatar?: string; bio?: string; gender?: number; interestCategories?: string[] }) {
    // 统一内容审核：昵称 + 个性签名，防不当昵称/签名（空串自动跳过）
    await this.audit.moderateTextOrThrow(
      [dto.nickname, dto.bio].filter(Boolean).join(" "),
      { scene: "USER_PROFILE", userId },
    );
    // 头像图片审核（高曝光 UGC；未改头像时 dto.avatar 为 undefined 自动跳过）
    await this.audit.moderateImageOrThrow(dto.avatar, { scene: "USER_AVATAR", userId });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.interestCategories !== undefined && { interestCategories: dto.interestCategories }),
      },
      select: { id: true, nickname: true, avatar: true, bio: true, gender: true, interestCategories: true },
    });
  }

  // ───────── 用户状态管理 ─────────

  /** 状态变更的用户侧通知文案（封禁给理由·解封告知恢复） */
  private buildStatusNotice(status: string, reason?: string): { title: string; content: string } {
    if (status === "DISABLED") {
      return {
        title: "账号已被封禁",
        content: reason
          ? `你的账号因「${reason}」被平台封禁。如有异议请联系客服申诉。`
          : "你的账号因违反平台规范被封禁。如有异议请联系客服申诉。",
      };
    }
    return {
      title: "账号状态变更",
      content: status === "ACTIVE"
        ? `你的账号已恢复正常使用。${reason ? `说明：${reason}` : ""}`.trim()
        : `你的账号状态已变更为 ${status}。${reason ? `原因：${reason}` : ""}`.trim(),
    };
  }

  /**
   * 更新用户状态（封禁/解封）。
   * 2026-07-17 审计修复：reason 此前无处落地——封禁完全查不到理由。现落两处：
   * ① AuditLog（全局 AuditInterceptor 只记 method+url，理由必须在 service 层补）；② 站内通知告知用户。
   * 两处留痕失败都不阻断状态变更本身（状态已改，宁可少一条痕也不能回滚成"没封"假象）。
   */
  async updateUserStatus(userId: string, status: string, reason?: string, operatorId?: string, ip?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
      select: { id: true, nickname: true, status: true },
    });
    // 封禁即踢下线：撤销全部 refreshToken + 已签发 accessToken（M1）
    if (status === "DISABLED") await this.auth.revokeAllRefreshTokens(userId);

    // 理由落 AuditLog
    await this.audit.log({
      userId: operatorId,
      action: "USER_STATUS_CHANGE",
      targetType: "USER",
      targetId: userId,
      detail: `用户状态 ${existing.status} → ${status}${reason ? `；理由：${reason}` : "（未填写理由）"}`,
      ip,
    }).catch((err) => this.logger.warn("用户状态变更审计写入失败", err));

    // 站内通知用户（封禁用户解封后可见；通知失败不回滚状态）
    const notice = this.buildStatusNotice(status, reason);
    await this.prisma.notification.create({
      data: { userId, type: "SYSTEM", title: notice.title, content: notice.content },
    }).catch((err) => this.logger.warn("用户状态变更通知写入失败", err));

    return updated;
  }

  /** 批量更新用户状态（理由落 AuditLog + 逐用户站内通知·同 updateUserStatus 口径） */
  async batchUpdateStatus(ids: string[], status: string, reason?: string, operatorId?: string, ip?: string) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status: status as UserStatus },
    });
    if (status === "DISABLED") {
      for (const id of ids) await this.auth.revokeAllRefreshTokens(id);
    }

    await this.audit.log({
      userId: operatorId,
      action: "USER_STATUS_BATCH_CHANGE",
      targetType: "USER",
      targetId: ids.length === 1 ? ids[0] : undefined,
      detail: `批量用户状态 → ${status}（${result.count}人：${ids.slice(0, 20).join(",")}${ids.length > 20 ? `…等${ids.length}人` : ""}）${reason ? `；理由：${reason}` : "（未填写理由）"}`,
      ip,
    }).catch((err) => this.logger.warn("批量状态变更审计写入失败", err));

    const notice = this.buildStatusNotice(status, reason);
    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type: "SYSTEM", title: notice.title, content: notice.content })),
    }).catch((err) => this.logger.warn("批量状态变更通知写入失败", err));

    return { updated: result.count };
  }

  // ───────── 用户统计 ─────────

  /** 用户收到的赞：按内容作者反查 Like，不能把“我点过的赞”冒充“我获赞”。 */
  private async countReceivedLikes(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Like" l
      WHERE
        (l."targetType" IN ('POST', 'CIRCLE_POST') AND EXISTS (
          SELECT 1 FROM "Post" p WHERE p."id" = l."targetId" AND p."userId" = ${userId}
        ))
        OR (l."targetType" = 'ARTICLE' AND EXISTS (
          SELECT 1 FROM "Article" a WHERE a."id" = l."targetId" AND a."userId" = ${userId}
        ))
        OR (l."targetType" = 'VIDEO' AND EXISTS (
          SELECT 1 FROM "Video" v WHERE v."id" = l."targetId" AND v."userId" = ${userId}
        ))
    `);
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * 个人中心首屏摘要：一次请求返回真实社交、资产和订单角标。
   * 纯只读聚合，不修改余额、积分、优惠券或订单状态。
   */
  async getMySummary(userId: string) {
    const now = new Date();
    const [following, followers, receivedLikes, coinAccount, points, coupons, orderGroups] = await Promise.all([
      this.prisma.follow.count({ where: { userId } }),
      this.prisma.follow.count({ where: { followedUserId: userId } }),
      this.countReceivedLikes(userId),
      this.prisma.virtualCoinAccount.findUnique({ where: { userId }, select: { balance: true } }),
      this.prisma.userPoints.findUnique({ where: { userId }, select: { balance: true } }),
      this.prisma.userCoupon.count({
        where: {
          userId,
          used: false,
          coupon: {
            status: "ACTIVE",
            validStart: { lte: now },
            validEnd: { gte: now },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        where: {
          userId,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.REFUNDED],
          },
        },
        _count: { _all: true },
      }),
    ]);

    const orderCount = new Map(orderGroups.map((row) => [row.status, row._count._all]));
    return {
      stats: { following, followers, likes: receivedLikes },
      assets: {
        coins: Number(coinAccount?.balance ?? 0),
        coupons,
        points: Number(points?.balance ?? 0),
      },
      orders: {
        pending: orderCount.get(OrderStatus.PENDING) ?? 0,
        shipped: orderCount.get(OrderStatus.PAID) ?? 0,
        received: orderCount.get(OrderStatus.SHIPPED) ?? 0,
        refund: orderCount.get(OrderStatus.REFUNDED) ?? 0,
      },
    };
  }

  async getUserStats(userId: string) {
    const [articles, courses, circles, followers, following, likes, collects] = await Promise.all([
      this.prisma.article.count({ where: { userId } }),
      this.prisma.course.count({ where: { userId } }),
      this.prisma.circle.count({ where: { ownerId: userId } }),
      this.prisma.follow.count({ where: { followedUserId: userId } }),
      this.prisma.follow.count({ where: { userId } }),
      this.countReceivedLikes(userId),
      this.prisma.collect.count({ where: { userId } }),
    ]);

    return { articles, courses, circles, followers, following, totalLikes: likes, totalCollects: collects };
  }

  // ───────── 公开主页（C端「看别人主页」·脱敏投影） ─────────

  /**
   * 公开用户主页：仅返回可对陌生人展示的安全字段。
   * 严禁返回手机号/生辰/身份证/会员等级/角色/状态/绑定关系等敏感信息（R3 合规红线）。
   * 认证徽章复用 TeacherCertification（status=APPROVED 且有 verifiedTitle）。
   * @param userId  目标用户
   * @param viewerId 当前登录用户（用于 isSelf / isFollowing / isMutualFollow）
   */
  async getPublicProfile(userId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // 只 select 公开安全字段
      select: { id: true, nickname: true, avatar: true, bio: true },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const isSelf = !!viewerId && viewerId === userId;
    const canRelate = !!viewerId && !isSelf;

    const [cert, stats, following, followedBack] = await Promise.all([
      this.prisma.teacherCertification.findUnique({
        where: { userId },
        select: { status: true, verifiedTitle: true },
      }),
      this.getUserStats(userId),
      canRelate
        ? this.prisma.follow.findUnique({
            where: { userId_followedUserId: { userId: viewerId!, followedUserId: userId } },
            select: { id: true },
          })
        : Promise.resolve(null),
      canRelate
        ? this.prisma.follow.findUnique({
            where: { userId_followedUserId: { userId, followedUserId: viewerId! } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const verified = !!(cert && cert.status === "APPROVED" && cert.verifiedTitle);
    const isFollowing = !!following;
    const isMutualFollow = isFollowing && !!followedBack;

    return {
      profile: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        verified,
        verifiedTitle: verified ? cert!.verifiedTitle : undefined,
      },
      stats: {
        followingCount: stats.following,
        followerCount: stats.followers,
        likeCount: stats.totalLikes,
      },
      isFollowing,
      isMutualFollow,
      isSelf,
    };
  }

  // ───────── 关注系统 ─────────

  async follow(followerId: string, followedUserId: string) {
    if (followerId === followedUserId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能关注自己");

    const target = await this.prisma.user.findUnique({ where: { id: followedUserId } });
    if (!target) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "目标用户不存在");

    const existing = await this.prisma.follow.findUnique({
      where: { userId_followedUserId: { userId: followerId, followedUserId } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已关注该用户");

    try {
      const created = await this.prisma.follow.create({
        data: { userId: followerId, followedUserId },
      });
      // 反向关注检测：对方是否也关注了我 → 前端「互相关注」徽章即时点亮
      const reverse = await this.prisma.follow.findUnique({
        where: { userId_followedUserId: { userId: followedUserId, followedUserId: followerId } },
        select: { id: true },
      });
      return { ...created, isMutualFollow: !!reverse };
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "已关注该用户");
      throw e;
    }
  }

  async unfollow(followerId: string, followedUserId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: { userId_followedUserId: { userId: followerId, followedUserId } },
    });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "未关注该用户");

    await this.prisma.follow.delete({
      where: { userId_followedUserId: { userId: followerId, followedUserId } },
    });
    return { success: true };
  }

  async getFollowers(userId: string, page = 1, pageSize = 20) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    const where = { followedUserId: userId };
    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip, take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followers: follows.map(f => f.user), total, page: p, pageSize: ps };
  }

  async getFollowing(userId: string, page = 1, pageSize = 20) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    const where = { userId };
    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { followedUser: { select: { id: true, nickname: true, avatar: true } } },
        skip, take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { following: follows.map(f => f.followedUser), total, page: p, pageSize: ps };
  }

  async isFollowing(followerId: string, followedUserId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { userId_followedUserId: { userId: followerId, followedUserId } },
    });
    return { following: !!follow };
  }

  // ───────── 黑名单 ─────────

  async getBlacklist(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [blocks, total] = await Promise.all([
      this.prisma.blacklist.findMany({
        where,
        include: { blockedUser: { select: { id: true, nickname: true, avatar: true } } },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.blacklist.count({ where }),
    ]);
    return { items: blocks, total, page, pageSize };
  }

  async blockUser(userId: string, blockedUserId: string) {
    if (userId === blockedUserId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能拉黑自己");
    await this.prisma.blacklist.upsert({
      where: { userId_blockedUserId: { userId, blockedUserId } },
      create: { userId, blockedUserId },
      update: {},
    });
    await this.prisma.follow.deleteMany({ where: { userId, followedUserId: blockedUserId } });
    await this.prisma.follow.deleteMany({ where: { userId: blockedUserId, followedUserId: userId } });
    return { success: true };
  }

  async unblockUser(userId: string, blockedUserId: string) {
    await this.prisma.blacklist.deleteMany({ where: { userId, blockedUserId } });
    return { success: true };
  }

  // ───────── 用户分群推送 ─────────
  // 圈人口径唯一真源 = PushAudienceService（2026-07-17 审计修复：tag 此前是假参数从不生效，
  // 现按 UserTag 表真实标签匹配；estimate 与 push 共用同一条件构建，保证预估=实发）。

  /** 分群推送预估人数（dry-run，不发送） */
  async estimateByTag(
    tag: string | undefined,
    memberLevel: string,
    activeDays: number,
  ): Promise<{ count: number; tag: string; memberLevel: string; activeDays: number }> {
    const count = await this.audience.estimate(tag, memberLevel, activeDays);
    return { count, tag: tag ?? "", memberLevel, activeDays };
  }

  async pushByTag(
    tag: string | undefined,
    memberLevel: string,
    activeDays: number,
    title: string,
    content: string,
  ): Promise<{ matchedCount: number; tag: string; memberLevel: string; activeDays: number }> {
    const userIds = await this.audience.resolveUserIds(tag, memberLevel, activeDays);

    // 写入通知
    if (userIds.length > 0) {
      await this.prisma.notification.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          type: "SYSTEM",
          title,
          content,
        })),
      });
    }

    this.logger.log(`按标签推送: tag=${tag}, memberLevel=${memberLevel}, activeDays=${activeDays}, 匹配=${userIds.length}人`);
    return { matchedCount: userIds.length, tag: tag ?? "", memberLevel, activeDays };
  }

  // ───────── 用户圈子关系（admin 用户详情页） ─────────

  /** 用户加入的全部圈子（含角色/加入时间·管理员用户详情页真数据） */
  async getUserCircles(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
    const members = await this.prisma.circleMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      select: {
        role: true,
        joinedAt: true,
        expireAt: true,
        circle: { select: { id: true, name: true, cover: true, type: true, status: true } },
      },
    });
    return {
      items: members.map((m) => ({
        circle: m.circle,
        role: m.role,
        joinedAt: m.joinedAt,
        expireAt: m.expireAt,
      })),
      total: members.length,
    };
  }

  // ───────── 白名单管理（基于 Redis Set） ─────────

  private getWhitelistKey(): string {
    return "admin:whitelist";
  }

  async getWhitelist(page: number, pageSize: number): Promise<{ users: { id: string; nickname: string | null; avatar: string | null; phone: string | null; createdAt: Date }[]; total: number; page: number; pageSize: number }> {
    const key = this.getWhitelistKey();
    const list: string[] = (await this.redis.getJson<string[]>(key)) || [];
    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    // 获取白名单用户基本信息
    const users = items.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: items } },
          select: { id: true, nickname: true, avatar: true, phone: true, createdAt: true },
        })
      : [];

    return { users: users.map(u => ({ ...u, phone: maskPhone(u.phone) })), total, page, pageSize };
  }

  async addWhitelist(userId: string): Promise<{ success: boolean; userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const key = this.getWhitelistKey();
    const list: string[] = (await this.redis.getJson<string[]>(key)) || [];

    if (!list.includes(userId)) {
      list.push(userId);
      await this.redis.setJson(key, list);
    }

    this.logger.log(`添加白名单: userId=${userId}`);
    return { success: true, userId };
  }

  async removeWhitelist(userId: string): Promise<{ success: boolean; userId: string }> {
    const key = this.getWhitelistKey();
    const list: string[] = (await this.redis.getJson<string[]>(key)) || [];
    const filtered = list.filter((id) => id !== userId);

    if (filtered.length !== list.length) {
      await this.redis.setJson(key, filtered);
    }

    this.logger.log(`移除白名单: userId=${userId}`);
    return { success: true, userId };
  }

  // ───────── 用户画像 ─────────

  async getUserProfile(userId: string) {
    const userInfo = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nickname: true, avatar: true, bio: true, gender: true,
        birthday: true, phone: true, email: true, status: true, createdAt: true,
      },
    });
    if (!userInfo) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const [memberInfo, orderStats, coinAccount, circleCount, learningProgress, recentBehavior, deviceList] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { memberLevel: true, memberExpire: true },
        }),
        this.prisma.order.aggregate({
          where: { userId, status: { in: ["PAID", "COMPLETED"] } },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.virtualCoinAccount.findUnique({
          where: { userId },
          select: { balance: true },
        }),
        this.prisma.circleMember.count({ where: { userId } }),
        this.prisma.courseProgress.findMany({
          where: { userId },
          select: { courseId: true, progress: true, completed: true, updatedAt: true },
          take: 10,
          orderBy: { updatedAt: "desc" },
        }),
        this.prisma.userBehaviorLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        this.prisma.deviceFingerprint.findMany({
          where: { userId },
          orderBy: { lastSeenAt: "desc" },
        }),
      ]);

    return {
      userInfo: {
        ...userInfo,
        phone: maskPhone(userInfo.phone),
        birthday: userInfo.birthday ? userInfo.birthday.toISOString().slice(0, 7) : null, // 仅展示年月
      },
      memberInfo,
      orderStats: {
        totalOrders: orderStats._count,
        totalAmount: Number(orderStats._sum.amount || 0),
      },
      coinBalance: coinAccount?.balance ?? 0,
      circleCount,
      learningProgress: learningProgress.map((p) => ({
        courseId: p.courseId,
        progress: p.progress,
        completed: p.completed,
        updatedAt: p.updatedAt,
      })),
      recentBehavior,
      deviceList: deviceList.map((d) => ({
        deviceId: d.deviceId,
        platform: d.platform,
        isTrusted: d.isTrusted,
        firstSeenAt: d.firstSeenAt,
        lastSeenAt: d.lastSeenAt,
      })),
    };
  }

  /** 用户兴趣品类统计分析 */
  async getInterestStats() {
    const totalUsers = await this.prisma.user.count({ where: { status: "ACTIVE" } });

    const users = await this.prisma.user.findMany({
      where: { status: "ACTIVE", interestCategories: { isEmpty: false } },
      select: { interestCategories: true },
      take: 100000,
    });

    const categoryCount: Record<string, number> = {};
    for (const u of users) {
      for (const cat of u.interestCategories) {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    }

    const topInterests = await this.prisma.userInterest.groupBy({
      by: ["tag"],
      _count: { tag: true },
      _avg: { score: true },
      orderBy: { _count: { tag: "desc" } },
      take: 30,
    });

    const distribution = Object.entries(categoryCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalUsers,
      usersWithInterests: users.length,
      coverageRate: totalUsers > 0 ? Math.round((users.length / totalUsers) * 100) : 0,
      distribution,
      behaviorTags: topInterests.map((t) => ({
        tag: t.tag,
        userCount: t._count.tag,
        avgScore: Math.round((t._avg.score || 0) * 100) / 100,
      })),
    };
  }

  // ───────── 账号注销（GDPR合规） ─────────

  /** 获取注销账号相关信息（原因/影响数据/资产快照） */
  async getDeleteAccountInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");

    const [coinAccount, points, coupons, memberInfo] = await Promise.all([
      this.prisma.virtualCoinAccount.findUnique({ where: { userId }, select: { balance: true } }),
      this.prisma.userPoints.findUnique({ where: { userId }, select: { balance: true } }),
      this.prisma.userCoupon.count({ where: { userId, used: false } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { memberLevel: true, memberExpire: true } }),
    ]);

    const memberDays = memberInfo?.memberExpire ? Math.max(0, Math.ceil((memberInfo.memberExpire.getTime() - Date.now()) / 86400000)) : 0;

    return {
      phone: maskPhone(user.phone),
      reasons: [
        { id: "not_useful", label: "不再使用该服务" },
        { id: "privacy", label: "隐私安全考虑" },
        { id: "found_better", label: "找到了更好的替代品" },
        { id: "too_many_notifications", label: "通知太多" },
        { id: "poor_experience", label: "使用体验不好" },
        { id: "other", label: "其他原因" },
      ],
      dataItems: [
        { icon: "message-circle", label: "帖子、评论、消息等内容", color: "#3b82f6" },
        { icon: "users", label: "圈子、关注、粉丝关系", color: "#22c55e" },
        { icon: "shopping-bag", label: "订单记录和购买历史", color: "#f97316" },
        { icon: "gift", label: "积分、优惠券和会员权益", color: "#a855f7" },
        { icon: "credit-card", label: "钱包余额（需先提现）", color: "#ef4444" },
      ],
      assets: {
        balance: coinAccount?.balance ?? 0,
        points: points?.balance ?? 0,
        coupons: coupons ?? 0,
        memberDays,
      },
    };
  }

  /** 用户申请注销账号，进入7天冷静期 */
  async requestAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true, deleteRequestedAt: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
    if (user.status === "DISABLED") throw new BusinessException(ErrorCode.FORBIDDEN, "账号已被封禁，无法申请注销");

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天冷静期

    await this.prisma.user.update({
      where: { id: userId },
      data: { deleteRequestedAt: now, deleteScheduledAt: scheduledAt },
    });

    this.logger.log(`用户 ${userId} 申请账号注销，冷静期至 ${scheduledAt.toISOString()}`);
    return { message: "注销申请已提交，7天冷静期后可执行注销", scheduledAt };
  }

  /** 用户在冷静期内取消注销申请 */
  async cancelAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { deleteRequestedAt: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
    if (!user.deleteRequestedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "没有待处理的注销申请");

    await this.prisma.user.update({
      where: { id: userId },
      data: { deleteRequestedAt: null, deleteScheduledAt: null },
    });

    this.logger.log(`用户 ${userId} 已取消注销申请`);
    return { message: "注销申请已取消" };
  }

  /** 执行账号注销：匿名化个人数据、禁用账号、保留交易记录用于审计 */
  /**
   * 每日凌晨扫描冷静期已过的注销申请并自动执行（分布式锁防多实例·批量上限防跑飞）。
   * 修复(后端审计#7)：deleteScheduledAt 原只被 admin 手动端点消费,无 Cron→「7天后自动注销」永不发生。
   * 安全:executeAccountDeletion 是软匿名化(置 DISABLED+清 PII+审计)非硬删除;扫描条件带 status!=DISABLED
   * 天然幂等(已注销的下轮不再命中);单轮上限 200 防异常批量;逐个 try/catch 单条失败不连累其余。
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoExecuteScheduledDeletions() {
    await this.redis.runExclusive("account_auto_deletion", 600, async () => {
      const due = await this.prisma.user.findMany({
        where: {
          deleteScheduledAt: { lte: new Date() },
          deleteRequestedAt: { not: null },
          status: { not: "DISABLED" }, // 已匿名化(DISABLED)的不重复处理
        },
        select: { id: true },
        take: 200,
      });
      let done = 0;
      for (const u of due) {
        try {
          await this.executeAccountDeletion(u.id);
          done++;
        } catch (err) {
          this.logger.warn(`自动注销失败 [${u.id}]`, err instanceof Error ? err.message : err);
        }
      }
      if (done > 0) this.logger.log(`冷静期到期自动注销: ${done}/${due.length} 个账号`);
    });
  }

  async executeAccountDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { deleteRequestedAt: true, status: true } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
    if (!user.deleteRequestedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "用户未申请注销");

    const anonymizedPhone = `deleted_${userId.slice(0, 8)}`;

    await this.prisma.$transaction(async (tx) => {
      // 1. 匿名化个人信息
      await tx.user.update({
        where: { id: userId },
        data: {
          nickname: "已注销用户",
          avatar: null,
          bio: null,
          phone: anonymizedPhone,
          email: null,
          gender: null,
          birthday: null,
          status: "DISABLED",
          paymentPasswordHash: null,
          identityVerified: false,
        },
      });

      // 2. 清理敏感关联：Auth、通知、搜索历史
      await tx.auth.deleteMany({ where: { userId } });
      await tx.notification.updateMany({ where: { userId }, data: { userId: "deleted" } });
      await tx.searchHistory.deleteMany({ where: { userId } });
      await tx.readingProgress.deleteMany({ where: { userId } });
      await tx.bookmark.deleteMany({ where: { userId } });

      // 3. 退出所有圈子
      await tx.circleMember.deleteMany({ where: { userId } });

      // 4. 记录审计日志
      await tx.auditLog.create({
        data: {
          userId,
          action: "ACCOUNT_DELETED",
          targetType: "USER",
          targetId: userId,
          detail: `用户账号已注销，数据已匿名化`,
        },
      });
    });

    this.logger.log(`用户 ${userId} 账号已注销并匿名化`);
    return { message: "账号已注销，数据已匿名化处理" };
  }

  // ───────── 浏览历史 ─────────

  async getBrowseHistory(userId: string, page = 1, pageSize = 20) {
    const { skip, page: p, pageSize: ps } = safePagination(page, pageSize);
    const [items, total] = await Promise.all([
      this.prisma.browseHistory.findMany({
        where: { userId },
        skip,
        take: ps,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.browseHistory.count({ where: { userId } }),
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  // ───────── 通知设置 ─────────

  async getNotifySettings(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notifySettings: true } });
    const saved = (user?.notifySettings as Record<string, boolean>) ?? {};
    return [
      { key: "message", label: "新消息通知", icon: "bell", value: saved.message ?? true },
      { key: "course", label: "课程提醒", icon: "book-open", value: saved.course ?? true },
      { key: "live", label: "直播提醒", icon: "radio", value: saved.live ?? false },
      { key: "interact", label: "互动提醒", icon: "message-square", value: saved.interact ?? true },
      { key: "system", label: "系统通知", icon: "settings", value: saved.system ?? true },
      { key: "marketingSms", label: "活动与福利短信", icon: "gift", value: saved.marketingSms ?? false },
    ];
  }

  async updateNotifySettings(userId: string, dto: { key: string; value: boolean }) {
    if (!dto.key) throw new BusinessException(ErrorCode.BAD_REQUEST, "key 不能为空");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notifySettings: true } });
    const current = (user?.notifySettings as Record<string, boolean>) ?? {};
    const updated = { ...current, [dto.key]: dto.value };
    await this.prisma.user.update({ where: { id: userId }, data: { notifySettings: updated as any } });
    return { success: true };
  }

  // ───────── 第三方账号绑定 ─────────

  async getBoundAccounts(userId: string) {
    const auths = await this.prisma.auth.findMany({
      where: { userId },
      select: { provider: true, openId: true, createdAt: true },
    });
    const providers = ["wechat", "qq", "apple"];
    return providers.map(provider => {
      const binding = auths.find(a => a.provider.toUpperCase() === provider.toUpperCase() || a.provider === provider);
      const nameMap: Record<string, string> = { wechat: "微信", qq: "QQ", apple: "Apple ID" };
      const colorMap: Record<string, string> = { wechat: "#07C160", qq: "#12B7F5", apple: "#000000" };
      return {
        provider,
        name: nameMap[provider] || provider,
        color: colorMap[provider] || "#666",
        isBound: !!binding,
        accountInfo: binding?.openId ? `${provider}_user***${binding.openId.slice(-3)}` : undefined,
        boundAt: binding?.createdAt?.toISOString() || undefined,
      };
    });
  }

  /** 解绑第三方账号，至少保留一种登录方式 */
  async unbindAccount(userId: string, provider: string) {
    const validProviders = ["wechat", "qq", "apple"];
    const normalized = provider.toLowerCase();
    if (!validProviders.includes(normalized)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的 provider: ${provider}`);
    }

    // 检查是否已绑定
    const auths = await this.prisma.auth.findMany({
      where: { userId },
      select: { provider: true, id: true },
    });
    const targetAuth = auths.find(a => a.provider.toLowerCase() === normalized);
    if (!targetAuth) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "该账号未绑定");
    }

    // 至少保留一种登录方式
    if (auths.length <= 1) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "至少保留一种登录方式，无法解绑最后一个账号");
    }

    await this.prisma.auth.delete({ where: { id: targetAuth.id } });
    this.logger.log(`用户 ${userId} 解绑了 ${provider} 账号`);
    return { success: true, provider: normalized };
  }
}
