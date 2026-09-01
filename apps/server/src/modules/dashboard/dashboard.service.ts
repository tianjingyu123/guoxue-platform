import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import { PAID_ORDER_STATUSES } from "./order-status.constants";

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private readonly logger = new Logger(DashboardService.name);

  async getStats() {
    const cacheKey = "dashboard:stats";
    const cached = await this.redis.getJson<ReturnType<typeof this.buildStats>>(cacheKey);
    if (cached) return cached;

    const data = await this.buildStats();
    await this.redis.setJson(cacheKey, data, 30);
    return data;
  }

  private async buildStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    // 昨日区间（用于日环比，仅对有 createdAt/updatedAt 时间序列的流量型指标计算）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      articleCount,
      userCount,
      courseCount,
      circleCount,
      classicBookCount,
      productCount,
      todayNewUsers,
      pendingReports,
      totalViews,
      totalLikes,
      totalComments,
      totalCollects,
      orderCount,
      paidOrderCount,
      liveRoomCount,
      videoCount,
      monthNewUsers,
      monthNewArticles,
      outOfStockCount,
      pendingProductReviews,
      activeProductCount,
      totalSkuCount,
      pendingShipOrders,
    ] = await Promise.all([
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.user.count(),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.classicBook.count(),
      this.prisma.product.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.article.aggregate({ _sum: { viewCount: true } }),
      this.prisma.like.count(),
      this.prisma.comment.count(),
      this.prisma.collect.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "PAID" } }),
      this.prisma.liveRoom.count(),
      this.prisma.video.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.article.count({ where: { createdAt: { gte: thisMonth }, auditStatus: "APPROVED" } }),
      // 商品审核仪表盘
      this.prisma.product.count({ where: { stock: 0, status: "ON_SALE" } }),
      this.prisma.product.count({ where: { status: "PENDING" } }),
      this.prisma.product.count({ where: { status: "ON_SALE" } }),
      this.prisma.productSku.count({ where: { isActive: true } }),
      this.prisma.order.count({ where: { status: "PAID" } }),
    ]);

    const [todayRevenue, activeUsersToday, poemCount, todayNewCourses, todayAuditedCourses, refundedOrders, orderStatusDist, totalPaidAmount, , payingUsersResult] = await Promise.all([
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.post.groupBy({ by: ["userId"], where: { createdAt: { gte: today } } }).then((r) => r.length),
      this.prisma.content.count({ where: { type: "POEM" } }),
      this.prisma.course.count({ where: { createdAt: { gte: today } } }),
      this.prisma.course.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: "REFUNDED" } }),
      this.prisma.order.groupBy({ by: ["status"], _count: true }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: "REFUNDED" }, _sum: { amount: true } }),
      this.prisma.order.groupBy({ by: ["userId"], where: { status: { in: PAID_ORDER_STATUSES } } }).then((r) => r.length),
    ]);

    const todayNewArticles = await this.prisma.article.count({ where: { createdAt: { gte: today } } });
    const todayNewContentTotal = todayNewArticles + todayNewCourses;

    const articleTotal = articleCount + poemCount;
    const todayAuditedTotal = (await this.prisma.article.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: today } } })) + todayAuditedCourses;
    const returnRate = paidOrderCount > 0 ? ((refundedOrders / paidOrderCount) * 100).toFixed(1) : "0";
    const avgOrderValue = paidOrderCount > 0 ? Math.round(Number(totalPaidAmount._sum.amount || 0) / paidOrderCount) : 0;

    // ── 昨日同口径聚合（日环比基准）──────────────────────
    // 仅流量型指标可比：今日新增用户/今日营收/今日审核量/今日新增内容。
    // 快照型指标（待审/待巡检/在售/各类总数）无历史快照，不计算环比，由前端诚实留白。
    const [
      yesterdayNewUsers,
      yesterdayRevenueAgg,
      yesterdayNewArticles,
      yesterdayNewCourses,
      yesterdayAuditedArticles,
      yesterdayAuditedCourses,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: yesterday, lt: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.article.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.course.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
      this.prisma.article.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: yesterday, lt: today } } }),
      this.prisma.course.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: yesterday, lt: today } } }),
    ]);
    const todayNewContentYesterday = yesterdayNewArticles + yesterdayNewCourses;
    const todayAuditedYesterday = yesterdayAuditedArticles + yesterdayAuditedCourses;

    const orderStatusMap: Record<string, number> = {};
    for (const g of orderStatusDist) { orderStatusMap[g.status] = g._count; }
    const statusNames: Record<string, string> = { PENDING: "待付款", PAID: "已付款", SHIPPED: "已发货", COMPLETED: "已完成", REFUNDED: "已退款", CANCELLED: "已取消" };
    const orderStatusDistribution = Object.entries(statusNames).map(([k, name]) => ({ name, count: orderStatusMap[k] ?? 0 }));

    return {
      articleCount,
      userCount,
      courseCount,
      circleCount,
      classicBookCount,
      productCount,
      todayNewUsers,
      pendingReports,
      totalViews: totalViews._sum.viewCount || 0,
      totalLikes,
      totalComments,
      totalCollects,
      orderCount,
      paidOrderCount,
      liveRoomCount,
      videoCount,
      monthNewUsers,
      monthNewArticles,
      // 前端仪表盘兼容字段名
      totalUsers: userCount,
      totalOrders: orderCount,
      totalCourses: courseCount,
      totalCircles: circleCount,
      todayRevenue: Number(todayRevenue._sum.amount || 0),
      activeUsers: activeUsersToday,
      totalContent: articleTotal,
      systemOk: 1,
      // 商品审核仪表盘
      outOfStockCount,
      pendingProductReviews,
      activeProductCount,
      totalSkuCount,
      pendingShipOrders,
      returnRate: Number(returnRate),
      orderStatusDistribution,
      // 内容审核仪表盘
      todayAudited: todayAuditedTotal,
      todayNewContent: todayNewContentTotal,
      // 日环比基准（昨日同口径，仅流量型指标真实可比）
      todayNewUsersYesterday: yesterdayNewUsers,
      todayRevenueYesterday: Number(yesterdayRevenueAgg._sum.amount || 0),
      todayAuditedYesterday,
      todayNewContentYesterday,
      // 客服仪表盘
      processedOrders: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      // 财务仪表盘
      payingUsers: payingUsersResult,
      avgOrderValue,
      // 平台数据看板
      totalRevenue: Number(totalPaidAmount._sum.amount || 0),
      activeCircles: (await this.prisma.post.groupBy({ by: ["circleId"], where: { createdAt: { gte: today } } }).then(r => r.length)),
      totalPageViews: totalViews._sum.viewCount || 0,
    };
  }

  async getTrends() {
    const days = 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [users, articles] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
      this.prisma.article.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
    ]);

    const dates: string[] = [];
    const userTrend: number[] = [];
    const articleTrend: number[] = [];
    let userCumulative = 0;
    let articleCumulative = 0;
    let userIdx = 0;
    let articleIdx = 0;

    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      dates.push(dateStr);

      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      while (userIdx < users.length && new Date(users[userIdx].createdAt) <= dayEnd) {
        userCumulative++;
        userIdx++;
      }
      while (articleIdx < articles.length && new Date(articles[articleIdx].createdAt) <= dayEnd) {
        articleCumulative++;
        articleIdx++;
      }

      userTrend.push(userCumulative);
      articleTrend.push(articleCumulative);
    }

    return { dates, userTrend, articleTrend };
  }

  async getCharts() {
    const cacheKey = "dashboard:charts";
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      take: 50000,
    });

    const userByDate = new Map<string, number>();
    for (const u of recentUsers) {
      const dateKey = u.createdAt.toISOString().slice(0, 10);
      userByDate.set(dateKey, (userByDate.get(dateKey) ?? 0) + 1);
    }

    const userGrowth: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      userGrowth.push({ date: dateStr, count: userByDate.get(dateStr) ?? 0 });
    }

    const [articleContentCount, poemCount, classicContentCount] =
      await Promise.all([
        this.prisma.content.count({ where: { type: "ARTICLE" } }),
        this.prisma.content.count({ where: { type: "POEM" } }),
        this.prisma.content.count({ where: { type: "CLASSIC" } }),
      ]);

    const contentDistribution = [
      { name: "文章", count: articleContentCount },
      { name: "诗词", count: poemCount },
      { name: "古籍", count: classicContentCount },
    ];

    const topArticles = await this.prisma.article.findMany({
      where: { auditStatus: "APPROVED" },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        user: { select: { nickname: true } },
      },
    });

    const data = {
      userGrowth,
      contentDistribution,
      topArticles: topArticles.map((a) => ({
        id: a.id,
        title: a.title,
        viewCount: a.viewCount,
        likeCount: a.likeCount,
        commentCount: a.commentCount,
        pageViews: a.viewCount,
        likes: a.likeCount,
        comments: a.commentCount,
        createdAt: a.createdAt,
        author: a.user.nickname,
      })),
    };

    await this.redis.setJson(cacheKey, data, 600);
    return data;
  }

  async getRevenueOverview() {
    const cacheKey = "dashboard:revenue";
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      orderStats,
      stationCount,
      offlineStationCount,
      withdrawalPending,
      refundedCount,
      paidUserCount,
      paidOrderTotal,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thisMonth } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: lastMonth, lt: thisMonth } },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.station.count({ where: { status: "ACTIVE" } }),
      this.prisma.stationOffline.count({ where: { status: "ACTIVE" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.order.count({ where: { status: "REFUNDED" } }),
      this.prisma.order.groupBy({ by: ["userId"], where: { status: { in: PAID_ORDER_STATUSES } } }).then(r => r.length),
      this.prisma.order.count({ where: { status: { in: PAID_ORDER_STATUSES } } }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : "0";
    const refundRate = paidOrderTotal > 0 ? (refundedCount / paidOrderTotal * 100).toFixed(1) : "0";
    const avgOrderValue = paidOrderTotal > 0 ? Math.round(Number(totalRevenue._sum.amount || 0) / paidOrderTotal) : 0;

    // 近7日营收趋势
    const trendDays = 7;
    const trendDates: string[] = [];
    const revenueTrend: number[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      const dayRev = await this.prisma.order.aggregate({
        where: { createdAt: { gte: d, lte: dEnd }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      });
      trendDates.push(`${d.getMonth() + 1}/${d.getDate()}`);
      revenueTrend.push(Number(dayRev._sum.amount || 0));
    }

    // 近6月营收（月度柱状图）
    const monthLabels: string[] = [];
    const monthlyRevenueArr: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
      const mRev = await this.prisma.order.aggregate({
        where: { createdAt: { gte: m, lte: mEnd }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      });
      monthLabels.push(`${m.getMonth() + 1}月`);
      monthlyRevenueArr.push(Number(mRev._sum.amount || 0));
    }

    const data = {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      monthRevenue: monthRev,
      lastMonthRevenue: lastMonthRev,
      monthOverMonthGrowth: `${growth}%`,
      orderBreakdown: orderStats.map(o => ({
        type: o.type,
        count: o._count,
        revenue: Number(o._sum.amount || 0),
      })),
      activeStations: stationCount,
      activeOfflineStations: offlineStationCount,
      pendingWithdrawals: withdrawalPending,
      dates: trendDates,
      revenue: revenueTrend,
      // 财务仪表盘额外字段
      pendingSettlements: 0,
      refundRate: Number(refundRate),
      payingUsers: paidUserCount,
      avgOrderValue,
      monthLabels,
      monthlyRevenue: monthlyRevenueArr,
    };
    await this.redis.setJson(cacheKey, data, 60);
    return data;
  }

  async getRealtimeStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todayUsers, todayRevenue, onlineUsers] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.warn("获取在线人数失败", err); return 0; }),
    ]);

    return {
      todayOrders,
      todayUsers,
      todayRevenue: Number(todayRevenue._sum.amount || 0),
      onlineUsers,
    };
  }

  async getBigScreen() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisHour = new Date();
    thisHour.setMinutes(0, 0, 0);

    const [
      totalUsers, todayNewUsers, todayOrders, todayPaidAmount,
      todayNewArticles, todayNewCourses, todayPaipanCount,
      onlineUsers, monthRevenue, pendingAuditCount,
      totalCourses, totalArticles, totalCircles,
      hourOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.article.count({ where: { createdAt: { gte: today }, auditStatus: "APPROVED" } }),
      this.prisma.course.count({ where: { createdAt: { gte: today }, auditStatus: "APPROVED" } }),
      this.prisma.paipanRecord.count({ where: { createdAt: { gte: today } } }),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.warn("获取在线人数失败", err); return 0; }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.order.count({ where: { createdAt: { gte: thisHour } } }),
    ]);

    return {
      overview: {
        totalUsers,
        todayNewUsers,
        onlineUsers,
        totalCourses,
        totalArticles,
        totalCircles,
      },
      today: {
        orders: todayOrders,
        revenue: Number(todayPaidAmount._sum.amount || 0),
        newArticles: todayNewArticles,
        newCourses: todayNewCourses,
        paipanCount: todayPaipanCount,
        pendingAudit: pendingAuditCount,
      },
      month: {
        revenue: Number(monthRevenue._sum.amount || 0),
      },
      realtime: {
        hourOrders,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async getContentHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const articles = await this.prisma.article.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, auditStatus: "APPROVED" },
      select: {
        id: true, title: true, viewCount: true, likeCount: true,
        commentCount: true, collectCount: true, createdAt: true,
        user: { select: { nickname: true } },
      },
      take: 500,
    });

    const scored = articles.map((a) => {
      const interactionRate = a.viewCount > 0
        ? (a.likeCount + a.commentCount + a.collectCount) / a.viewCount
        : 0;
      const qualityScore = a.viewCount * 0.2 + a.likeCount * 3 + a.commentCount * 2 + a.collectCount * 1;
      let health: "healthy" | "normal" | "low";
      if (qualityScore >= 50) health = "healthy";
      else if (qualityScore >= 10) health = "normal";
      else health = "low";
      return { id: a.id, title: a.title, author: a.user.nickname, viewCount: a.viewCount, likeCount: a.likeCount, commentCount: a.commentCount, collectCount: a.collectCount, qualityScore, interactionRate: Math.round(interactionRate * 10000) / 10000, health, createdAt: a.createdAt };
    });

    const healthy = scored.filter((a) => a.health === "healthy");
    const normal = scored.filter((a) => a.health === "normal");
    const lowQuality = scored.filter((a) => a.health === "low");

    const totalReviewed = healthy.length + normal.length + lowQuality.length;
    const passRate = totalReviewed > 0 ? Number(((healthy.length + normal.length) / totalReviewed * 100).toFixed(1)) : 0;
    const rejectRate = totalReviewed > 0 ? Number((lowQuality.length / totalReviewed * 100).toFixed(1)) : 0;

    return {
      summary: {
        total: scored.length,
        healthyCount: healthy.length,
        normalCount: normal.length,
        lowQualityCount: lowQuality.length,
        lowQualityRatio: scored.length > 0 ? (lowQuality.length / scored.length * 100).toFixed(1) + "%" : "0%",
      },
      // 前端仪表盘扁平字段（ContentAuditDashboard 直接从顶层读取）
      passRate,
      rejectRate,
      lowQualityCount: lowQuality.length,
      lowQualityArticles: lowQuality.sort((a, b) => a.qualityScore - b.qualityScore).slice(0, 20),
      topHealthy: healthy.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 10),
    };
  }

  async getFunnel(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 3600 * 1000);

    const [
      totalRegisters,
      paipanUsers,
      aiAnalysisUsers,
      memberUsers,
      purchaseUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.paipanRecord.groupBy({ by: ["userId"], where: { createdAt: { gte: startDate } } }).then((r) => r.length),
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: startDate } } }).catch((err) => { this.logger.warn("获取AI分析记录数失败", err); return 0; }),
      this.prisma.user.count({ where: { createdAt: { gte: startDate }, memberLevel: { not: "NONE" } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startDate }, status: { in: PAID_ORDER_STATUSES } } }),
    ]);

    const steps = [
      { name: "注册", count: totalRegisters, rate: "100%" },
      { name: "排盘", count: paipanUsers, rate: totalRegisters > 0 ? (paipanUsers / totalRegisters * 100).toFixed(1) + "%" : "0%" },
      { name: "AI分析", count: aiAnalysisUsers, rate: paipanUsers > 0 ? (aiAnalysisUsers / paipanUsers * 100).toFixed(1) + "%" : "0%" },
      { name: "会员转化", count: memberUsers, rate: totalRegisters > 0 ? (memberUsers / totalRegisters * 100).toFixed(1) + "%" : "0%" },
      { name: "付费购买", count: purchaseUsers, rate: totalRegisters > 0 ? (purchaseUsers / totalRegisters * 100).toFixed(1) + "%" : "0%" },
    ];

    return { period: `${days}天`, startDate: startDate.toISOString(), steps };
  }

  // ───────── 工作台今日概览 ─────────

  async getTodayOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysEnd = new Date(today);
    sevenDaysEnd.setHours(23, 59, 59, 999);

    const [
      todayNewUsers,
      todayOrders,
      todayRevenue,
      todayActivePostCircles,
      pendingArticles,
      pendingCourses,
      paidOrders,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } },
        _sum: { amount: true },
      }),
      this.prisma.post
        .groupBy({ by: ["circleId"], where: { createdAt: { gte: today } } })
        .then((r) => r.length),
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.order.count({ where: { status: "PAID" } }),
      this.prisma.withdrawalApplication.count({ where: { status: "PENDING" } }),
    ]);

    const [trendUsers, trendOrders] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo, lte: sevenDaysEnd } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo, lte: sevenDaysEnd },
          status: { in: PAID_ORDER_STATUSES },
        },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
    ]);

    const trendData: Array<{ date: string; users: number; orders: number; revenue: number }> = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(sevenDaysAgo);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dateStr = dayStart.toISOString().slice(0, 10);

      const users = trendUsers.filter((u) => u.createdAt >= dayStart && u.createdAt <= dayEnd).length;
      const dayOrders = trendOrders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd);
      trendData.push({
        date: dateStr,
        users,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.amount), 0),
      });
    }

    return {
      todayNewUsers,
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.amount || 0),
      todayNewContent: (pendingArticles + pendingCourses),
      pendingAudits: pendingArticles + pendingCourses,
      pendingReports: 0,
      pendingAppeals: 0,
      todayNewOrders: todayOrders,
      todayStats: {
        todayNewUsers,
        todayOrders,
        todayRevenue: Number(todayRevenue._sum.amount || 0),
        todayActiveCircles: todayActivePostCircles,
      },
      trendData,
      todoList: {
        pendingReviewContent: pendingArticles + pendingCourses,
        pendingOrders: paidOrders,
        refundingOrders: 0,
        pendingWithdrawals,
      },
    };
  }

  // ───────── 预警列表 ─────────

  async getAlertList(rawPage: number, rawPageSize: number) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where = { status: "OPEN" as string };

    const [alerts, total, levelStats] = await Promise.all([
      this.prisma.riskAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.riskAlert.count({ where }),
      this.prisma.riskAlert.groupBy({
        by: ["level"],
        where,
        _count: true,
      }),
    ]);

    const levelOrder: Record<string, number> = { CRITICAL: 0, DANGER: 1, WARN: 2 };
    alerts.sort((a, b) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99));

    const levelCounts: Record<string, number> = {};
    for (const s of levelStats) {
      levelCounts[s.level] = s._count;
    }

    return { alerts, total, page, pageSize, levelCounts };
  }

  // ───────── 系统健康检查 ─────────

  async getSystemHealth() {
    const services: Record<string, { status: string; detail?: string }> = {};

    services.redis = process.env.REDIS_URL
      ? { status: "ok" }
      : { status: "degraded", detail: "REDIS_URL 未配置，将使用内存缓存" };

    const hasTencent = !!(process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY);
    services.tencentCloud = hasTencent
      ? { status: "ok" }
      : { status: "degraded", detail: "TENCENT_SECRET_ID/TENCENT_SECRET_KEY 未配置" };

    services.wechatPay = process.env.WECHAT_PAY_MCH_ID
      ? { status: "ok" }
      : { status: "degraded", detail: "WECHAT_PAY_MCH_ID 未配置" };

    // Coze：个人令牌(PAT) 或 OAuth（client_id+公钥指纹+私钥）任一齐备即视为已配置
    services.coze = (process.env.COZE_API_KEY ||
      (process.env.COZE_OAUTH_CLIENT_ID && process.env.COZE_OAUTH_PUBLIC_KEY_ID && process.env.COZE_OAUTH_PRIVATE_KEY))
      ? { status: "ok" }
      : { status: "degraded", detail: "Coze 未配置（个人令牌或 OAuth 均可）" };

    services.deepSeek = process.env.DEEPSEEK_API_KEY
      ? { status: "ok" }
      : { status: "degraded", detail: "DEEPSEEK_API_KEY 未配置" };

    const hasSms = !!(process.env.SMS_ACCESS_KEY_ID && process.env.SMS_ACCESS_KEY_SECRET);
    services.sms = hasSms
      ? { status: "ok" }
      : { status: "degraded", detail: "短信配置不完整（SMS_ACCESS_KEY_ID/SMS_ACCESS_KEY_SECRET）" };

    return services;
  }

  // ───────── 平台总览 ─────────

  async getPlatformOverview() {
    const cacheKey = "dashboard:platform";
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      totalUsers, monthNewUsers, todayActiveUsers,
      totalArticles, totalCourses, totalCircles, totalProducts,
      totalOrders, paidOrders, totalRevenue, monthRevenue, lastMonthRevenue,
      pendingAudit, openAlerts,
      orderByType,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.post.groupBy({ by: ["userId"], where: { createdAt: { gte: today } } }).then(r => r.length),
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.product.count({ where: { status: "ON_SALE" } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "PAID" } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: lastMonth, lt: thisMonth } }, _sum: { amount: true } }),
      Promise.all([
        this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
        this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
        this.prisma.report.count({ where: { status: "PENDING" } }),
      ]),
      this.prisma.riskAlert.count({ where: { status: "OPEN" } }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: PAID_ORDER_STATUSES } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);

    const data = {
      users: { total: totalUsers, monthNew: monthNewUsers, todayActive: todayActiveUsers },
      content: { articles: totalArticles, courses: totalCourses, circles: totalCircles, products: totalProducts },
      orders: {
        total: totalOrders, paid: paidOrders,
        rate: totalOrders > 0 ? (paidOrders / totalOrders * 100).toFixed(1) + "%" : "0%",
      },
      revenue: {
        total: Number(totalRevenue._sum.amount || 0),
        month: monthRev,
        lastMonth: lastMonthRev,
        growth: lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) + "%" : "0%",
      },
      breakdown: orderByType.map(o => ({
        type: o.type,
        orders: o._count,
        amount: Number(o._sum.amount || 0),
      })),
      pending: {
        articles: pendingAudit[0], courses: pendingAudit[1], reports: pendingAudit[2],
      },
      alerts: openAlerts,
    };
    await this.redis.setJson(cacheKey, data, 60);
    return data;
  }

  // ───────── 运营日报生成 ─────────

  async generateDailyReport(date?: string) {
    try {
      const targetDate = date ? new Date(date) : new Date(Date.now() - 86400000);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const period = targetDate.toISOString().slice(0, 10);

      const [
        newUsers, newOrders, revenue, activeCircles,
        newPosts, newArticles, newCourses, newProducts,
        paidOrders, refundOrders, violationCount,
      ] = await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.order.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: targetDate, lt: nextDay }, status: { in: PAID_ORDER_STATUSES } },
          _sum: { amount: true },
        }),
        this.prisma.post.groupBy({
          by: ["circleId"],
          where: { createdAt: { gte: targetDate, lt: nextDay } },
        }).then(r => r.length),
        this.prisma.post.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.article.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.course.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.product.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
        this.prisma.order.count({ where: { createdAt: { gte: targetDate, lt: nextDay }, status: "PAID" } }),
        this.prisma.order.count({ where: { createdAt: { gte: targetDate, lt: nextDay }, status: "REFUNDED" } }),
        this.prisma.report.count({ where: { createdAt: { gte: targetDate, lt: nextDay } } }),
      ]);

      const paymentSuccessRate = newOrders > 0 ? (paidOrders / newOrders * 100).toFixed(1) + "%" : "0%";
      const refundRate = newOrders > 0 ? (refundOrders / newOrders * 100).toFixed(1) + "%" : "0%";

      const reportData = {
        date: period,
        overview: { newUsers, newOrders, revenue: Number(revenue._sum.amount || 0), activeCircles },
        content: { newPosts, newArticles, newCourses, newProducts },
        transaction: { orderCount: newOrders, paidOrders, paymentSuccessRate, refundOrders, refundRate },
        anomaly: {
          violations: violationCount,
          refundRateAlert: refundOrders > 0 && (refundOrders / newOrders) > 0.1 ? "退款率超过10%" : "正常",
        },
        generatedAt: new Date().toISOString(),
      };

      await this.prisma.financialReport.upsert({
        where: { type_period: { type: "DAILY_REPORT", period } },
        update: { data: reportData as Prisma.InputJsonValue, generatedBy: "AUTO" },
        create: { type: "DAILY_REPORT", period, data: reportData as Prisma.InputJsonValue, generatedBy: "AUTO" },
      });

      return reportData;
    } catch (err) {
      this.logger.error(`生成运营日报失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "生成运营日报失败" };
    }
  }
}
