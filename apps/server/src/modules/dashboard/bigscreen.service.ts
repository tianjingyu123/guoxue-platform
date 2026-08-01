import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PAID_ORDER_STATUSES } from "./order-status.constants";

@Injectable()
export class BigScreenService {
  private readonly logger = new Logger(BigScreenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPlatformScreen() {
    const cached = await this.redis.getJson<Record<string, unknown>>("bigscreen:platform");
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers, todayNewUsers, onlineUsers,
      totalCourses, totalCircles, totalProducts,
      totalClassicBooks, totalArticles,
      totalGmv,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.error("获取在线用户数失败", err.stack); return 0; }),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.product.count({ where: { status: "ON_SALE" } }),
      this.prisma.classicBook.count(),
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
    ]);

    const data = {
      totalUsers,
      todayNewUsers,
      dailyActiveUsers: onlineUsers,
      totalCourses,
      totalCircles,
      totalProducts,
      totalClassicBooks,
      totalArticles,
      totalGmv: Number(totalGmv._sum.amount || 0),
      updatedAt: new Date().toISOString(),
    };

    await this.redis.setJson("bigscreen:platform", data, 60);
    return data;
  }

  async getTransactionsScreen() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneHourAgo = new Date(Date.now() - 3600000);

    const [todayOrders, todayRevenue, hourOrders, typeBreakdown, recentOrders] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: oneHourAgo }, status: { in: PAID_ORDER_STATUSES } } }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { status: { in: PAID_ORDER_STATUSES } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, amount: true, createdAt: true },
      }),
    ]);

    return {
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.amount || 0),
      hourOrders,
      typeBreakdown: typeBreakdown.map(t => ({ type: t.type, amount: Number(t._sum.amount || 0), count: t._count })),
      recentOrders: recentOrders.map(o => ({ id: o.id, type: o.type, amount: Number(o.amount), at: o.createdAt })),
      updatedAt: new Date().toISOString(),
    };
  }

  async getContentEcoScreen() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalArticles, totalPosts, totalCourses, totalVideos, monthArticles, monthPosts] = await Promise.all([
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.post.count({ where: { status: "PUBLISHED" } }),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.video.count(),
      this.prisma.article.count({ where: { createdAt: { gte: thirtyDaysAgo }, auditStatus: "APPROVED" } }),
      this.prisma.post.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: "PUBLISHED" } }),
    ]);

    const topCreators = await this.prisma.article.groupBy({
      by: ["userId"],
      where: { auditStatus: "APPROVED" },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    const creatorIds = topCreators.map(c => c.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      totalContent: totalArticles + totalPosts + totalCourses + totalVideos,
      totalArticles,
      totalPosts,
      totalCourses,
      totalVideos,
      monthGrowth: { articles: monthArticles, posts: monthPosts },
      topCreators: topCreators.map(c => ({
        userId: c.userId,
        nickname: userMap.get(c.userId)?.nickname,
        avatar: userMap.get(c.userId)?.avatar,
        articleCount: c._count,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async getAiCapabilityScreen() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalCalls, todayCalls, monthCalls, botConversations, knowledgeCount] = await Promise.all([
      this.prisma.aiAnalysisRecord.count(),
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: today } } }),
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.botChatLog.count(),
      this.prisma.circleKnowledge.count(),
    ]);

    const sceneDistribution = await this.prisma.aiAnalysisRecord.groupBy({
      by: ["scene"],
      _count: true,
      orderBy: { _count: { scene: "desc" } },
    });

    const modelDistribution = await this.prisma.aiAnalysisRecord.groupBy({
      by: ["modelUsed"],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    });

    return {
      totalApiCalls: totalCalls,
      todayApiCalls: todayCalls,
      monthApiCalls: monthCalls,
      botConversations,
      knowledgeBaseSize: knowledgeCount,
      sceneDistribution: sceneDistribution.map(s => ({ scene: s.scene, count: s._count })),
      modelDistribution: modelDistribution.map(m => ({ model: m.modelUsed, count: m._count })),
      updatedAt: new Date().toISOString(),
    };
  }

  async getOfflineMapScreen() {
    const stations = await this.prisma.stationOffline.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, city: true, address: true },
    });

    const stationIds = stations.map(s => s.id);

    const [courseCount, registrationCount, orderAgg] = await Promise.all([
      this.prisma.offlineCourse.count({ where: { stationId: { in: stationIds }, auditStatus: "APPROVED" } }),
      this.prisma.offlineCourseRegistration.count({ where: { course: { stationId: { in: stationIds } } } }),
      this.prisma.stationOrder.aggregate({
        where: { stationId: { in: stationIds }, status: "PAID" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const cityMap = new Map<string, number>();
    for (const s of stations) {
      cityMap.set(s.city, (cityMap.get(s.city) || 0) + 1);
    }

    return {
      totalStations: stations.length,
      totalCourses: courseCount,
      totalStudents: registrationCount,
      totalRevenue: Number(orderAgg._sum.amount || 0),
      totalOrders: orderAgg._count,
      cityDistribution: Array.from(cityMap.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
      stations: stations.map(s => ({ id: s.id, name: s.name, city: s.city, address: s.address })),
      updatedAt: new Date().toISOString(),
    };
  }
}
