import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberLevel, Prisma, RoleType, UserStatus } from "@prisma/client";
import { maskPhone } from "../../common/crypto.util";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
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
  }) {
    const { page, pageSize, keyword, roleType } = params;
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

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, nickname: true, avatar: true, phone: true,
          memberLevel: true, status: true, createdAt: true,
          roles: { select: { roleType: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users: users.map(u => ({ ...u, phone: maskPhone(u.phone) })), total, page, pageSize };
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

  async updateProfile(userId: string, dto: { nickname?: string; avatar?: string; bio?: string; gender?: number }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
      },
      select: { id: true, nickname: true, avatar: true, bio: true, gender: true },
    });
  }

  // ───────── 用户状态管理 ─────────

  async updateUserStatus(userId: string, status: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
      select: { id: true, nickname: true, status: true },
    });
  }

  // ───────── 用户统计 ─────────

  async getUserStats(userId: string) {
    const [articles, courses, circles, followers, following, likes, collects] = await Promise.all([
      this.prisma.article.count({ where: { userId } }),
      this.prisma.course.count({ where: { userId } }),
      this.prisma.circle.count({ where: { ownerId: userId } }),
      this.prisma.follow.count({ where: { followedUserId: userId } }),
      this.prisma.follow.count({ where: { userId } }),
      this.prisma.like.count({ where: { userId } }),
      this.prisma.collect.count({ where: { userId } }),
    ]);

    return { articles, courses, circles, followers, following, totalLikes: likes, totalCollects: collects };
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
      return await this.prisma.follow.create({
        data: { userId: followerId, followedUserId },
      });
    } catch (e: unknown) {
      if ((e as Error)?.message?.includes("P2002") || (e as Record<string, unknown>)?.code === "P2002") throw new BusinessException(ErrorCode.BAD_REQUEST, "已关注该用户");
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
    const where = { followedUserId: userId };
    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { followers: follows.map(f => f.user), total, page, pageSize };
  }

  async getFollowing(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: { followedUser: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.follow.count({ where }),
    ]);
    return { following: follows.map(f => f.followedUser), total, page, pageSize };
  }

  async isFollowing(followerId: string, followedUserId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { userId_followedUserId: { userId: followerId, followedUserId } },
    });
    return { following: !!follow };
  }

  // ───────── 用户分群推送 ─────────

  async pushByTag(
    tag: string,
    memberLevel: string,
    activeDays: number,
    title: string,
    content: string,
  ): Promise<{ matchedCount: number; tag: string; memberLevel: string; activeDays: number }> {
    const where: Prisma.UserWhereInput = {};

    // 按会员等级筛选
    if (memberLevel && memberLevel !== "ALL") {
      where.memberLevel = memberLevel as MemberLevel;
    }

    // 按活跃天数筛选（通过 UserBehaviorLog）
    if (activeDays > 0) {
      const activeSince = new Date();
      activeSince.setDate(activeSince.getDate() - activeDays);

      const activeUserIds = await this.prisma.userBehaviorLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: activeSince } },
      });
      const activeIds = activeUserIds.map((u) => u.userId).filter((id): id is string => id !== null);
      const activeSet = new Set(activeIds);

      // Prisma 动态筛选器构建，需绕过严格类型检查
      const idFilter = (where as Record<string, unknown>).id as { in?: string[] } | undefined;
      if (idFilter?.in) {
        idFilter.in = idFilter.in.filter((id) => activeSet.has(id));
      } else {
        where.id = { in: [...activeSet] };
      }
    }

    // 查询匹配用户
    const matchedUsers = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    const userIds = matchedUsers.map((u) => u.id);

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
    return { matchedCount: userIds.length, tag, memberLevel, activeDays };
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
}
