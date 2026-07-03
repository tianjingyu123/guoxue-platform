import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Cacheable } from "../../common/cache.decorator";
import { InsightService } from "../track/insight.service";

@Injectable()
export class CircleDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insight: InsightService,
  ) {}

  /**
   * 归属校验（防 IDOR 越权）：当前用户必须是该圈子的圈主或管理员（OWNER/PARTNER/ADMIN），
   * 否则禁止访问圈子经营数据。
   */
  private async assertCircleOwner(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("无权访问该圈子数据");
    }
  }

  @Cacheable({ key: (args) => `circle:dashboard:overview:${args[0]}`, ttl: 30 })
  async getOverview(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [circle, memberCount, newMembers, postCount] = await Promise.all([
      this.prisma.circle.findUnique({ where: { id: circleId }, select: { id: true, name: true, memberCount: true } }),
      this.prisma.circleMember.count({ where: { circleId } }),
      this.prisma.circleMember.count({ where: { circleId, joinedAt: { gte: monthStart } } }),
      this.prisma.post.count({ where: { circleId, createdAt: { gte: monthStart } } }),
    ]);

    if (!circle) throw new NotFoundException("圈子不存在");

    const postIds = (await this.prisma.post.findMany({
      where: { circleId, createdAt: { gte: monthStart } },
      select: { id: true },
      take: 10000,
    })).map(p => p.id);

    const [commentCount, likeCount] = postIds.length > 0
      ? await Promise.all([
          this.prisma.comment.count({ where: { targetType: "POST", targetId: { in: postIds }, createdAt: { gte: monthStart } } }),
          this.prisma.like.count({ where: { targetType: "POST", targetId: { in: postIds }, createdAt: { gte: monthStart } } }),
        ])
      : [0, 0];

    const revenue = await this.prisma.order.aggregate({
      where: { type: "CIRCLE_JOIN", targetId: circleId, createdAt: { gte: monthStart }, status: "PAID" },
      _sum: { amount: true },
    });

    const totalInteractions = postCount + commentCount + likeCount;
    const interactionRate = memberCount > 0 ? ((totalInteractions / memberCount) * 100).toFixed(1) : "0";

    return {
      name: circle?.name,
      memberCount: circle?.memberCount || 0,
      newMembers,
      monthRevenue: revenue._sum.amount || 0,
      interactionRate: `${interactionRate}%`,
      monthPosts: postCount,
      monthComments: commentCount,
      monthLikes: likeCount,
    };
  }

  @Cacheable({ key: (args) => `circle:dashboard:trends:${args[0]}`, ttl: 60 })
  async getTrends(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [members, orders] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId, joinedAt: { gte: thirtyDaysAgo } },
        select: { joinedAt: true },
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.order.findMany({
        where: { type: "CIRCLE_JOIN", targetId: circleId, createdAt: { gte: thirtyDaysAgo }, status: "PAID" },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const memberDaily = new Map<string, number>();
    for (const m of members) {
      const day = m.joinedAt.toISOString().slice(0, 10);
      memberDaily.set(day, (memberDaily.get(day) || 0) + 1);
    }

    const revenueDaily = new Map<string, number>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      revenueDaily.set(day, (revenueDaily.get(day) || 0) + Number(o.amount));
    }

    const allDays = new Set([...memberDaily.keys(), ...revenueDaily.keys()]);
    return {
      trends: Array.from(allDays).sort().map(date => ({
        date,
        newMembers: memberDaily.get(date) || 0,
        revenue: revenueDaily.get(date) || 0,
      })),
    };
  }

  async getRevenueBreakdown(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const joinRevenue = await this.prisma.order.aggregate({
      where: { type: "CIRCLE_JOIN", targetId: circleId, status: "PAID" },
      _sum: { amount: true },
    });

    const circleCoursesIds = (await this.prisma.course.findMany({
      where: { circleId },
      select: { id: true },
      take: 5000,
    })).map(c => c.id);

    const courseRevenue = circleCoursesIds.length > 0
      ? await this.prisma.order.aggregate({
          where: { type: "COURSE", targetId: { in: circleCoursesIds }, status: "PAID" },
          _sum: { amount: true },
        })
      : { _sum: { amount: null } };

    const circleProductIds = (await this.prisma.product.findMany({
      where: { circleId },
      select: { id: true },
      take: 5000,
    })).map(p => p.id);

    const productRevenue = circleProductIds.length > 0
      ? await this.prisma.order.aggregate({
          where: { type: "PRODUCT", targetId: { in: circleProductIds }, status: "PAID" },
          _sum: { amount: true },
        })
      : { _sum: { amount: null } };

    return {
      breakdown: [
        { type: "CIRCLE_JOIN", label: "入圈费", amount: joinRevenue._sum.amount || 0 },
        { type: "COURSE", label: "课程", amount: courseRevenue._sum.amount || 0 },
        { type: "PRODUCT", label: "商品", amount: productRevenue._sum.amount || 0 },
      ],
    };
  }

  async getTopContributors(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const members = await this.prisma.circleMember.findMany({
      where: { circleId },
      select: { userId: true, user: { select: { id: true, nickname: true, avatar: true } } },
      take: 20000,
    });
    const userIds = members.map(m => m.userId);

    const postCounts = userIds.length > 0
      ? await this.prisma.post.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, circleId, createdAt: { gte: monthStart } },
          _count: true,
        })
      : [];

    const postIds = (await this.prisma.post.findMany({
      where: { circleId, createdAt: { gte: monthStart } },
      select: { id: true },
      take: 10000,
    })).map(p => p.id);

    const commentCounts = postIds.length > 0
      ? await this.prisma.comment.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, targetType: "POST", targetId: { in: postIds }, createdAt: { gte: monthStart } },
          _count: true,
        })
      : [];

    const scoreMap = new Map<string, number>();
    for (const p of postCounts) scoreMap.set(p.userId, (scoreMap.get(p.userId) || 0) + p._count * 10);
    for (const c of commentCounts) scoreMap.set(c.userId, (scoreMap.get(c.userId) || 0) + c._count * 3);

    const userMap = new Map(members.map(m => [m.userId, m.user]));

    return {
      contributors: Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, score]) => ({
          userId,
          nickname: userMap.get(userId)?.nickname,
          avatar: userMap.get(userId)?.avatar,
          score,
        })),
    };
  }

  async getHotContent(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const posts = await this.prisma.post.findMany({
      where: { circleId, status: "PUBLISHED" },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const postIds = posts.map(p => p.id);
    const [likes, comments] = await Promise.all([
      this.prisma.like.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: true,
      }),
      this.prisma.comment.groupBy({
        by: ["targetId"],
        where: { targetType: "POST", targetId: { in: postIds } },
        _count: true,
      }),
    ]);

    const likeMap = new Map(likes.map(l => [l.targetId, l._count]));
    const commentMap = new Map(comments.map(c => [c.targetId, c._count]));

    const ranked = posts.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content?.slice(0, 100),
      likeCount: likeMap.get(p.id) || 0,
      commentCount: commentMap.get(p.id) || 0,
      score: (likeMap.get(p.id) || 0) * 2 + (commentMap.get(p.id) || 0) * 3,
      createdAt: p.createdAt,
    })).sort((a, b) => b.score - a.score).slice(0, 5);

    return { posts: ranked };
  }

  async getRecentMembers(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const members = await this.prisma.circleMember.findMany({
      where: { circleId },
      select: { user: { select: { id: true, nickname: true, avatar: true } }, joinedAt: true },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });
    return { members: members.map(m => ({ userId: m.user.id, nickname: m.user.nickname, avatar: m.user.avatar, joinedAt: m.joinedAt })) };
  }

  async getChurnWarning(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const members = await this.prisma.circleMember.findMany({
      where: { circleId },
      select: { userId: true, user: { select: { id: true, nickname: true, avatar: true } } },
      take: 20000,
    });
    const userIds = members.map(m => m.userId);

    const postIds = (await this.prisma.post.findMany({
      where: { circleId, createdAt: { gte: fourteenDaysAgo } },
      select: { id: true },
      take: 10000,
    })).map(p => p.id);

    const activeUsers = new Set<string>();

    const [activePosts, activeComments] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId: { in: userIds }, circleId, createdAt: { gte: fourteenDaysAgo } },
        select: { userId: true },
      }),
      postIds.length > 0
        ? this.prisma.comment.findMany({
            where: { userId: { in: userIds }, targetType: "POST", targetId: { in: postIds }, createdAt: { gte: fourteenDaysAgo } },
            select: { userId: true },
          })
        : [],
    ]);

    activePosts.forEach(r => activeUsers.add(r.userId));
    activeComments.forEach(r => activeUsers.add(r.userId));

    const atRisk = members.filter(m => !activeUsers.has(m.userId)).slice(0, 20);

    return {
      atRisk: atRisk.map(m => ({ userId: m.user.id, nickname: m.user.nickname, avatar: m.user.avatar })),
      count: members.filter(m => !activeUsers.has(m.userId)).length,
    };
  }

  async getPendingQuestions(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const questions = await this.prisma.paidQuestion.findMany({
      where: { circleId, status: "PENDING" },
      select: { id: true, questionTitle: true, question: true, priceCoin: true, createdAt: true, asker: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { questions };
  }

  // ───────── 成员洞察（智能名片·复制自站长客户洞察）─────────
  // 合规边界：仅圈主/管理员可查看本圈成员的社群经营分析数据；排除圈主本人（role=OWNER）；
  // 不返回手机号等敏感字段（InsightService 已保证）；时间线仅限本圈成员，防越权窥探。
  // 画像聚合/时间线摘要委托公共 InsightService（站长/驿站/圈主复用同一套），本层只做归属+分页。

  /** 成员画像列表：最近活跃/30天行为量/消费力/兴趣标签TOP3，boundAt=joinedAt，附加圈内角色 */
  async getMembersInsight(circleId: string, userId: string, page = 1, pageSize = 20) {
    await this.assertCircleOwner(circleId, userId);
    // 防御归一化：缺省/非法分页参数（如 NaN）一律回落默认值，防 Prisma skip:NaN
    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.min(50, Math.max(1, Number(pageSize) || 20));

    const where = { circleId, role: { not: "OWNER" as const } };
    const [members, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where,
        select: { userId: true, joinedAt: true, role: true },
        orderBy: { joinedAt: "desc" },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
      }),
      this.prisma.circleMember.count({ where }),
    ]);

    const profiles = await this.insight.buildCustomerProfiles(
      members.map((m) => ({ userId: m.userId, boundAt: m.joinedAt })),
    );
    // 画像基础字段之外，圈子语境补充成员角色标签（合伙人/管理员/嘉宾等）
    const roleMap = new Map(members.map((m) => [m.userId, m.role]));
    return {
      customers: profiles.map((p) => ({ ...p, role: roleMap.get(p.userId) || "MEMBER" })),
      total,
    };
  }

  /** 单个成员最近行为时间线（先校验圈主身份 + 目标必须是本圈在册成员且非圈主，防越权窥探） */
  async getMemberTimeline(circleId: string, userId: string, memberUserId: string, limit = 30) {
    await this.assertCircleOwner(circleId, userId);
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: memberUserId } },
      select: { role: true },
    });
    if (!member || member.role === "OWNER") {
      throw new ForbiddenException("该用户不是本圈成员");
    }
    return this.insight.getTimeline(memberUserId, limit);
  }

  async getKnowledgeCandidates(circleId: string, userId: string) {
    await this.assertCircleOwner(circleId, userId);
    const candidates = await this.prisma.circleKnowledgeCandidate.findMany({
      where: { circleId, status: "pending" },
      select: { id: true, content: true, similarityScore: true, sourceType: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { candidates };
  }
}
