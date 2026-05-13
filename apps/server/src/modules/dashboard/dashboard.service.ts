import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private readonly logger = new Logger(DashboardService.name);

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

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
      this.prisma.article.count({
        where: { createdAt: { gte: thisMonth }, auditStatus: "APPROVED" },
      }),
    ]);

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
    };
  }

  async getTrends() {
    const days = 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 批量查询最近30天的用户和文章数据
    const [users, articles] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.article.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 构建30天时间序列
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

    // ── 近7天用户增长 ──
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // 一次遍历预分组，避免 O(N×7) 重复过滤
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

    // ── 内容类型分布（Content 表 type 字段：ARTICLE / POEM / CLASSIC） ──
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

    // ── TOP10 热门文章（按浏览量降序） ──
    const topArticles = await this.prisma.article.findMany({
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
        createdAt: a.createdAt,
        author: a.user.nickname,
      })),
    };

    await this.redis.setJson(cacheKey, data, 600);
    return data;
  }

  async getRevenueOverview() {
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
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thisMonth } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: lastMonth, lt: thisMonth } },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.station.count({ where: { status: "ACTIVE" } }),
      this.prisma.stationOffline.count({ where: { status: "ACTIVE" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : "0";

    return {
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
    };
  }

  async getRealtimeStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todayUsers, todayRevenue, onlineUsers] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { in: ["PAID", "COMPLETED"] } },
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

  /** 实时大屏数据：面向运营大屏幕展示 */
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
        where: { createdAt: { gte: today }, status: { in: ["PAID", "COMPLETED"] } },
        _sum: { amount: true },
      }),
      this.prisma.article.count({ where: { createdAt: { gte: today }, auditStatus: "APPROVED" } }),
      this.prisma.course.count({ where: { createdAt: { gte: today }, auditStatus: "APPROVED" } }),
      this.prisma.paipanRecord.count({ where: { createdAt: { gte: today } } }),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.warn("获取在线人数失败", err); return 0; }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }, status: { in: ["PAID", "COMPLETED"] } },
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

  /** 内容健康度分析：低质内容自动降权建议 */
  async getContentHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    // 近7天发文量 > 5 但平均互动率 < 0.01 视为低质
    const articles = await this.prisma.article.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, auditStatus: "APPROVED" },
      select: {
        id: true, title: true, viewCount: true, likeCount: true,
        commentCount: true, collectCount: true, createdAt: true,
        user: { select: { nickname: true } },
      },
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

    return {
      summary: {
        total: scored.length,
        healthyCount: healthy.length,
        normalCount: normal.length,
        lowQualityCount: lowQuality.length,
        lowQualityRatio: scored.length > 0 ? (lowQuality.length / scored.length * 100).toFixed(1) + "%" : "0%",
      },
      lowQualityArticles: lowQuality.sort((a, b) => a.qualityScore - b.qualityScore).slice(0, 20),
      topHealthy: healthy.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 10),
    };
  }

  /** 转化漏斗：注册→排盘→AI分析→会员 */
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
      this.prisma.order.count({ where: { createdAt: { gte: startDate }, status: { in: ["PAID", "COMPLETED"] } } }),
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
        where: { createdAt: { gte: today }, status: { in: ["PAID", "COMPLETED"] } },
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

    // 近7天趋势：一次批量拉取减少查询次数
    const [trendUsers, trendOrders] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo, lte: sevenDaysEnd } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo, lte: sevenDaysEnd },
          status: { in: ["PAID", "COMPLETED"] },
        },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: "asc" },
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
        refundingOrders: 0, // OrderStatus 枚举暂未包含 REFUNDING，待 schema 扩展
        pendingWithdrawals,
      },
    };
  }

  // ───────── 预警列表 ─────────

  async getAlertList(page: number, pageSize: number) {
    const where = { status: "OPEN" as string };

    const [alerts, total, levelStats] = await Promise.all([
      this.prisma.riskAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.riskAlert.count({ where }),
      this.prisma.riskAlert.groupBy({
        by: ["level"],
        where,
        _count: true,
      }),
    ]);

    // 自定义排序: CRITICAL > DANGER > WARN
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

    // Redis
    services.redis = process.env.REDIS_URL
      ? { status: "ok" }
      : { status: "degraded", detail: "REDIS_URL 未配置，将使用内存缓存" };

    // 腾讯云
    const hasTencent = !!(process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY);
    services.tencentCloud = hasTencent
      ? { status: "ok" }
      : { status: "degraded", detail: "TENCENT_SECRET_ID/TENCENT_SECRET_KEY 未配置" };

    // 微信支付
    services.wechatPay = process.env.WECHAT_PAY_MCH_ID
      ? { status: "ok" }
      : { status: "degraded", detail: "WECHAT_PAY_MCH_ID 未配置" };

    // Coze
    services.coze = process.env.COZE_API_KEY
      ? { status: "ok" }
      : { status: "degraded", detail: "COZE_API_KEY 未配置" };

    // DeepSeek
    services.deepSeek = process.env.DEEPSEEK_API_KEY
      ? { status: "ok" }
      : { status: "degraded", detail: "DEEPSEEK_API_KEY 未配置" };

    // 短信
    const hasSms = !!(process.env.SMS_ACCESS_KEY_ID && process.env.SMS_ACCESS_KEY_SECRET);
    services.sms = hasSms
      ? { status: "ok" }
      : { status: "degraded", detail: "短信配置不完整（SMS_ACCESS_KEY_ID/SMS_ACCESS_KEY_SECRET）" };

    return services;
  }

  // ───────── 圈子专项看板 ─────────

  async getCircleDashboard(circleId: string) {
    try {
      const circle = await this.prisma.circle.findUnique({
        where: { id: circleId },
        select: { id: true, name: true, createdAt: true, memberCount: true, postCount: true },
      });
      if (!circle) return { error: "圈子不存在" };

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // 成员增长：近30天每日新增
      const members = await this.prisma.circleMember.findMany({
        where: { circleId, joinedAt: { gte: thirtyDaysAgo } },
        select: { joinedAt: true },
        orderBy: { joinedAt: "asc" },
      });
      const memberMap = new Map<string, number>();
      for (const m of members) {
        const key = m.joinedAt.toISOString().slice(0, 10);
        memberMap.set(key, (memberMap.get(key) ?? 0) + 1);
      }
      const memberGrowth: { date: string; count: number }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo);
        d.setDate(d.getDate() + i);
        memberGrowth.push({ date: d.toISOString().slice(0, 10), count: memberMap.get(d.toISOString().slice(0, 10)) ?? 0 });
      }

      // 互动率：近30天帖子数、评论数、点赞数（按圆帖子关联）
      const circlePosts = await this.prisma.post.findMany({
        where: { circleId },
        select: { id: true },
      });
      const postIds = circlePosts.map(p => p.id);

      const [recentPosts, recentComments, recentLikes] = await Promise.all([
        this.prisma.post.count({ where: { circleId, createdAt: { gte: thirtyDaysAgo } } }),
        postIds.length > 0
          ? this.prisma.comment.count({ where: { targetType: "POST", targetId: { in: postIds }, createdAt: { gte: thirtyDaysAgo } } })
          : 0,
        postIds.length > 0
          ? this.prisma.like.count({ where: { targetType: "POST", targetId: { in: postIds }, createdAt: { gte: thirtyDaysAgo } } })
          : 0,
      ]);

      // 收入来源分布：课程收入、商品收入、打赏收入
      const [circleCourses, circleProducts, circleLiveRooms] = await Promise.all([
        this.prisma.course.findMany({ where: { circleId }, select: { id: true } }),
        this.prisma.product.findMany({ where: { circleId }, select: { id: true } }),
        this.prisma.liveRoom.findMany({ where: { circleId }, select: { id: true } }),
      ]);
      const courseIds = circleCourses.map(c => c.id);
      const productIds = circleProducts.map(p => p.id);
      const liveRoomIds = circleLiveRooms.map(l => l.id);

      const [courseRevenue, productRevenue, tippingRevenue] = await Promise.all([
        courseIds.length > 0
          ? this.prisma.order.aggregate({ where: { type: "COURSE", targetId: { in: courseIds }, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } })
          : { _sum: { amount: null } },
        productIds.length > 0
          ? this.prisma.order.aggregate({ where: { type: "PRODUCT", targetId: { in: productIds }, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } })
          : { _sum: { amount: null } },
        liveRoomIds.length > 0
          ? this.prisma.giftRecord.aggregate({ where: { liveRoomId: { in: liveRoomIds } }, _sum: { totalCoin: true } })
          : { _sum: { totalCoin: null } },
      ]);

      // 热门内容 Top 10
      const topArticles = await this.prisma.article.findMany({
        where: { circleId },
        orderBy: { viewCount: "desc" },
        take: 10,
        select: {
          id: true, title: true, viewCount: true, commentCount: true,
          likeCount: true, createdAt: true,
          user: { select: { nickname: true } },
        },
      });

      return {
        basicInfo: {
          name: circle.name,
          createdAt: circle.createdAt,
          memberCount: circle.memberCount,
          postCount: circle.postCount,
        },
        memberGrowth,
        engagement: {
          recentPosts,
          recentComments,
          recentLikes,
        },
        revenueDistribution: {
          courseRevenue: Number(courseRevenue._sum.amount || 0),
          productRevenue: Number(productRevenue._sum.amount || 0),
          tippingCoin: Number(tippingRevenue._sum.totalCoin || 0),
        },
        topContent: topArticles.map(a => ({
          id: a.id,
          title: a.title,
          viewCount: a.viewCount,
          commentCount: a.commentCount,
          likeCount: a.likeCount,
          createdAt: a.createdAt,
          author: a.user.nickname,
        })),
      };
    } catch (err) {
      this.logger.error(`获取圈子看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取圈子看板失败" };
    }
  }

  // ───────── 课程专项看板 ─────────

  async getCourseDashboard(courseId: string) {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true, title: true, price: true, originalPrice: true,
          studentCount: true, createdAt: true, userId: true, type: true,
        },
      });
      if (!course) return { error: "课程不存在" };

      const lecturer = await this.prisma.user.findUnique({
        where: { id: course.userId },
        select: { nickname: true },
      });

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // 销量统计
      const [totalSales, dailyOrders] = await Promise.all([
        this.prisma.order.count({
          where: { type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] } },
        }),
        this.prisma.order.findMany({
          where: { type: "COURSE", targetId: courseId, status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, amount: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const dailySales: { date: string; count: number; revenue: number }[] = [];
      const salesMap = new Map<string, { count: number; revenue: number }>();
      for (const o of dailyOrders) {
        const key = o.createdAt.toISOString().slice(0, 10);
        const existing = salesMap.get(key) ?? { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(o.amount);
        salesMap.set(key, existing);
      }
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const data = salesMap.get(key) ?? { count: 0, revenue: 0 };
        dailySales.push({ date: key, count: data.count, revenue: data.revenue });
      }

      // 完课率漏斗：总学员数 → 已开始 → 完成50% → 完成100%
      const allProgress = await this.prisma.courseProgress.findMany({
        where: { courseId },
        select: { userId: true, progress: true, completed: true },
      });
      const userBestProgress = new Map<string, { progress: number; completed: boolean }>();
      for (const p of allProgress) {
        const existing = userBestProgress.get(p.userId);
        if (!existing || p.progress > existing.progress) {
          userBestProgress.set(p.userId, { progress: p.progress, completed: p.completed });
        }
      }
      const totalStudents = userBestProgress.size;
      const started = Array.from(userBestProgress.values()).filter(p => p.progress > 0).length;
      const completed50 = Array.from(userBestProgress.values()).filter(p => p.progress >= 50).length;
      const completed100 = Array.from(userBestProgress.values()).filter(p => p.completed || p.progress >= 100).length;

      // 评分分布：1-5星各占比
      const ratingDist = await this.prisma.courseReview.groupBy({
        by: ["rating"],
        where: { courseId },
        _count: true,
      });
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of ratingDist) {
        ratingDistribution[r.rating] = r._count;
      }

      // 学员流失节点（每个章节后的流失率）
      const chapters = await this.prisma.courseChapter.findMany({
        where: { courseId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, sortOrder: true },
      });

      let churnNodes: Array<{ chapterTitle: string; completedCount: number; churnRate: string }> = [];
      if (chapters.length > 0) {
        const chapterProgress = await this.prisma.courseProgress.findMany({
          where: { courseId, completed: true },
          select: { chapterId: true, userId: true },
        });
        const chapterCompleted = new Map<string, Set<string>>();
        for (const cp of chapterProgress) {
          if (!chapterCompleted.has(cp.chapterId)) chapterCompleted.set(cp.chapterId, new Set());
          chapterCompleted.get(cp.chapterId)!.add(cp.userId);
        }

        let prevCount = 0;
        churnNodes = chapters.map(ch => {
          const compSet = chapterCompleted.get(ch.id);
          const compCount = compSet ? compSet.size : 0;
          const node = {
            chapterTitle: ch.title,
            completedCount: compCount,
            churnRate: prevCount > 0 ? ((prevCount - compCount) / prevCount * 100).toFixed(1) + "%" : "0%",
          };
          prevCount = compCount;
          return node;
        });
      } else {
        this.logger.log(`课程看板: courseId=${courseId}, 无章节数据，跳过流失节点分析`);
      }

      return {
        basicInfo: {
          title: course.title,
          lecturer: lecturer?.nickname || "未知",
          price: Number(course.price),
          originalPrice: course.originalPrice ? Number(course.originalPrice) : null,
          type: course.type,
          createdAt: course.createdAt,
          studentCount: course.studentCount,
        },
        sales: {
          totalSales,
          dailySales,
        },
        funnel: {
          totalEnrolled: totalStudents,
          started,
          completed50,
          completed100,
          completionRate: totalStudents > 0 ? (completed100 / totalStudents * 100).toFixed(1) + "%" : "0%",
        },
        ratingDistribution,
        churnNodes,
      };
    } catch (err) {
      this.logger.error(`获取课程看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取课程看板失败" };
    }
  }

  // ───────── 直播专项看板 ─────────

  async getLiveDashboard(liveId: string) {
    try {
      const live = await this.prisma.liveRoom.findUnique({
        where: { id: liveId },
        select: {
          id: true, title: true, hostUserId: true, startTime: true, endTime: true,
          viewCount: true, status: true, chargeType: true, chargePrice: true,
        },
      });
      if (!live) return { error: "直播不存在" };

      const host = await this.prisma.user.findUnique({
        where: { id: live.hostUserId },
        select: { nickname: true },
      });

      const duration = live.startTime && live.endTime
        ? Math.round((live.endTime.getTime() - live.startTime.getTime()) / 1000)
        : null;

      const [commentCount, likeCount, giftRecords, liveOrders] = await Promise.all([
        this.prisma.comment.count({ where: { targetType: "LIVESTREAM", targetId: liveId, status: "PUBLISHED" } }),
        this.prisma.like.count({ where: { targetType: "LIVESTREAM", targetId: liveId } }),
        this.prisma.giftRecord.findMany({
          where: { liveRoomId: liveId },
          select: { totalCoin: true, userId: true },
        }),
        this.prisma.order.findMany({
          where: { type: "LIVESTREAM", targetId: liveId, status: { in: ["PAID", "COMPLETED"] } },
          select: { amount: true },
        }),
      ]);

      const totalCoin = giftRecords.reduce((s, g) => s + Number(g.totalCoin), 0);
      const tipperCount = new Set(giftRecords.map(g => g.userId)).size;
      const orderCount = liveOrders.length;
      const totalRevenue = liveOrders.reduce((s, o) => s + Number(o.amount), 0);

      // 峰值在线/平均观看时长/流量来源/观众画像 暂无可追踪数据
      this.logger.log(`直播看板: liveId=${liveId}, 峰值在线/平均观看/流量来源/观众画像暂不可用`);

      return {
        basicInfo: {
          title: live.title,
          host: host?.nickname || "未知",
          startTime: live.startTime,
          endTime: live.endTime,
          durationSeconds: duration,
          status: live.status,
          chargeType: live.chargeType,
          chargePrice: live.chargePrice ? Number(live.chargePrice) : 0,
        },
        viewData: {
          totalViews: live.viewCount,
          peakOnline: null,
          avgWatchDuration: null,
        },
        interaction: {
          comments: commentCount,
          likes: likeCount,
          shares: 0,
        },
        tipping: {
          totalCoin,
          tipperCount,
        },
        transaction: {
          orderCount,
          revenue: totalRevenue,
        },
        trafficSources: null,
        audienceProfile: null,
      };
    } catch (err) {
      this.logger.error(`获取直播看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取直播看板失败" };
    }
  }

  // ───────── 站长专项看板 ─────────

  async getStationDashboard(stationId: string) {
    try {
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true, name: true, code: true, status: true, totalEarning: true, userId: true, createdAt: true },
      });
      if (!station) return { error: "分站不存在" };

      const stationMaster = await this.prisma.user.findUnique({
        where: { id: station.userId },
        select: { nickname: true, createdAt: true },
      });

      // 推广数据 + 佣金统计 + 团队业绩
      const [linkAgg, earningAgg, withdrawnAgg, teamCount, channelData] = await Promise.all([
        this.prisma.referralLink.aggregate({
          where: { userId: station.userId },
          _sum: { clickCount: true, orderCount: true },
        }),
        this.prisma.stationEarning.aggregate({
          where: { stationId },
          _sum: { earned: true },
        }),
        this.prisma.withdrawal.aggregate({
          where: { stationId, status: "PAID" },
          _sum: { amount: true },
        }),
        this.prisma.referralRelation.count({
          where: { referrerId: station.userId, relationStatus: "ACTIVE" },
        }),
        this.prisma.referralLink.groupBy({
          by: ["channel"],
          where: { userId: station.userId },
          _sum: { clickCount: true, orderCount: true },
        }),
      ]);

      const totalCommission = Number(earningAgg._sum.earned || 0);
      const withdrawnAmount = Number(withdrawnAgg._sum.amount || 0);
      const totalClicks = Number(linkAgg._sum.clickCount || 0);
      const totalConversions = Number(linkAgg._sum.orderCount || 0);

      return {
        basicInfo: {
          name: station.name,
          masterName: stationMaster?.nickname || "未知",
          code: station.code,
          status: station.status,
          joinedAt: stationMaster?.createdAt || station.createdAt,
        },
        promotion: {
          totalClicks,
          totalConversions,
          conversionRate: totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) + "%" : "0%",
        },
        commission: {
          totalCommission,
          settled: withdrawnAmount,
          pending: totalCommission - withdrawnAmount,
        },
        channelAnalysis: channelData.map(c => ({
          channel: c.channel,
          clicks: Number(c._sum.clickCount || 0),
          conversions: Number(c._sum.orderCount || 0),
        })),
        team: {
          subordinateCount: teamCount,
          totalCommission,
        },
      };
    } catch (err) {
      this.logger.error(`获取站长看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取站长看板失败" };
    }
  }

  // ───────── 驿站专项看板 ─────────

  async getOfflineDashboard(offlineId: string) {
    try {
      const station = await this.prisma.stationOffline.findUnique({
        where: { id: offlineId },
        select: { id: true, name: true, city: true, address: true, ownerUserId: true, status: true, createdAt: true },
      });
      if (!station) return { error: "驿站不存在" };

      const owner = await this.prisma.user.findUnique({
        where: { id: station.ownerUserId },
        select: { nickname: true },
      });

      // 课程统计
      const offlineCourses = await this.prisma.offlineCourse.findMany({
        where: { stationId: offlineId },
        select: { id: true, title: true, price: true, status: true, maxStudents: true, startTime: true },
      });
      const courseIds = offlineCourses.map(c => c.id);

      const [registrationCount, courseOrderAgg] = await Promise.all([
        courseIds.length > 0
          ? this.prisma.offlineCourseRegistration.count({ where: { courseId: { in: courseIds } } })
          : 0,
        this.prisma.stationOrder.aggregate({
          where: { stationId: offlineId, orderType: "OFFLINE_COURSE", status: "PAID" },
          _sum: { amount: true, stationIncome: true },
        }),
      ]);

      // 商品统计
      const products = await this.prisma.stationProduct.findMany({
        where: { stationId: offlineId },
        select: { id: true, name: true, price: true, stock: true, status: true },
      });
      const productOrderAgg = await this.prisma.stationOrder.aggregate({
        where: { stationId: offlineId, orderType: "PRODUCT", status: "PAID" },
        _sum: { amount: true, stationIncome: true },
      });

      // 学员回头率
      const regUsers = courseIds.length > 0
        ? await this.prisma.offlineCourseRegistration.findMany({
            where: { courseId: { in: courseIds } },
            select: { userId: true },
          })
        : [];
      const userCounts = new Map<string, number>();
      for (const r of regUsers) {
        userCounts.set(r.userId, (userCounts.get(r.userId) ?? 0) + 1);
      }
      const uniqueStudents = userCounts.size;
      const repeatStudents = Array.from(userCounts.values()).filter(c => c > 1).length;

      // 收入趋势：近12个月
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const monthlyOrders = await this.prisma.stationOrder.findMany({
        where: { stationId: offlineId, createdAt: { gte: twelveMonthsAgo } },
        select: { amount: true, createdAt: true, status: true },
      });
      const monthRevenueMap = new Map<string, number>();
      for (const o of monthlyOrders) {
        if (o.status === "PAID") {
          const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
          monthRevenueMap.set(key, (monthRevenueMap.get(key) ?? 0) + Number(o.amount));
        }
      }
      const revenueTrend: { month: string; revenue: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revenueTrend.push({ month: key, revenue: monthRevenueMap.get(key) ?? 0 });
      }

      return {
        basicInfo: {
          name: station.name,
          address: `${station.city} ${station.address}`,
          operator: owner?.nickname || "未知",
          status: station.status,
          createdAt: station.createdAt,
        },
        courseStats: {
          courseCount: offlineCourses.length,
          totalStudents: uniqueStudents,
          registrations: registrationCount,
          courseRevenue: Number(courseOrderAgg._sum.amount || 0),
        },
        productStats: {
          productCount: products.length,
          salesRevenue: Number(productOrderAgg._sum.amount || 0),
          stockOverview: {
            totalStock: products.reduce((s, p) => s + p.stock, 0),
            activeProducts: products.filter(p => p.status === "ACTIVE").length,
          },
        },
        studentAnalysis: {
          totalStudents: uniqueStudents,
          repeatStudents,
          repeatRate: uniqueStudents > 0 ? (repeatStudents / uniqueStudents * 100).toFixed(1) + "%" : "0%",
        },
        revenueTrend,
      };
    } catch (err) {
      this.logger.error(`获取驿站看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取驿站看板失败" };
    }
  }

  // ───────── 角色专属仪表盘 ─────────

  async getRoleDashboard(roleType: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (roleType) {
      case "SUPER_ADMIN":
        return this.getSuperAdminDashboard(today, thisMonth);
      case "OPERATION_ADMIN":
        return this.getOperationAdminDashboard(today, thisMonth);
      case "FINANCE_ADMIN":
        return this.getFinanceAdminDashboard(today, thisMonth);
      case "CUSTOMER_SERVICE":
        return this.getCustomerServiceDashboard(today, thisMonth);
      case "CONTENT_AUDITOR":
        return this.getContentAuditorDashboard(today, thisMonth);
      case "GOODS_AUDITOR":
        return this.getGoodsAuditorDashboard(today, thisMonth);
      default:
        return { error: `未知角色: ${roleType}` };
    }
  }

  private async getSuperAdminDashboard(today: Date, thisMonth: Date) {
    const [
      totalUsers, todayNewUsers, monthNewUsers,
      totalRevenue, todayRevenue, monthRevenue,
      pendingArticles, pendingCourses, pendingReports,
      alertCount, onlineUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: today }, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: thisMonth }, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.riskAlert.count({ where: { status: "OPEN" } }),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch(() => 0),
    ]);

    return {
      role: "SUPER_ADMIN",
      overview: {
        totalUsers, todayNewUsers, monthNewUsers,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        todayRevenue: Number(todayRevenue._sum.amount || 0),
        monthRevenue: Number(monthRevenue._sum.amount || 0),
        onlineUsers,
      },
      alerts: {
        pendingArticles,
        pendingCourses,
        pendingReports,
        activeRiskAlerts: alertCount,
      },
    };
  }

  private async getOperationAdminDashboard(today: Date, thisMonth: Date) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      todayNewUsers, monthNewUsers,
      todayNewArticles, todayNewPosts,
      pendingArticles, pendingCourses, pendingReports,
      interactionTotal,
      newUsersTrend,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.article.count({ where: { createdAt: { gte: today } } }),
      this.prisma.post.count({ where: { createdAt: { gte: today } } }),
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      Promise.all([
        this.prisma.like.count(), this.prisma.comment.count(), this.prisma.collect.count(),
      ]).then(([l, c, cl]) => l + c + cl),
      this.prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 7天用户增长趋势
    const trendMap = new Map<string, number>();
    for (const u of newUsersTrend) {
      const k = u.createdAt.toISOString().slice(0, 10);
      trendMap.set(k, (trendMap.get(k) ?? 0) + 1);
    }
    const userGrowthTrend: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      userGrowthTrend.push({ date: ds, count: trendMap.get(ds) ?? 0 });
    }

    const interactionRate = monthNewUsers > 0
      ? (interactionTotal / monthNewUsers).toFixed(1)
      : "0";

    return {
      role: "OPERATION_ADMIN",
      overview: {
        todayNewUsers, monthNewUsers,
        todayNewArticles, todayNewPosts,
        interactionTotal,
        interactionRate: `${interactionRate}次/人`,
      },
      pending: {
        articles: pendingArticles,
        courses: pendingCourses,
        reports: pendingReports,
        total: pendingArticles + pendingCourses + pendingReports,
      },
      userGrowthTrend,
    };
  }

  private async getFinanceAdminDashboard(today: Date, thisMonth: Date) {
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);

    const [
      monthRevenue, lastMonthRevenue, todayRevenue,
      totalRevenue,
      pendingWithdrawals, pendingWithdrawAmount,
      refundOrders, refundAmount,
      orderTypeBreakdown,
      revenueByDay,
    ] = await Promise.all([
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: lastMonth, lt: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: today } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { status: "REFUNDED", updatedAt: { gte: thisMonth } } }),
      this.prisma.order.aggregate({ where: { status: "REFUNDED", updatedAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thisMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thisMonth } },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : "0";

    // 按日收入趋势
    const dayRevenueMap = new Map<string, number>();
    for (const o of revenueByDay) {
      const k = o.createdAt.toISOString().slice(0, 10);
      dayRevenueMap.set(k, (dayRevenueMap.get(k) ?? 0) + Number(o.amount));
    }
    const revenueTrend: { date: string; revenue: number }[] = [];
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= Math.min(daysInMonth, today.getDate()); i++) {
      const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      revenueTrend.push({ date: d, revenue: dayRevenueMap.get(d) ?? 0 });
    }

    const totalPaidOrders = orderTypeBreakdown.reduce((s, o) => s + o._count, 0);
    const refundRate = totalPaidOrders > 0 ? (refundOrders / totalPaidOrders * 100).toFixed(1) + "%" : "0%";

    return {
      role: "FINANCE_ADMIN",
      overview: {
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        monthRevenue: monthRev,
        lastMonthRevenue: lastMonthRev,
        monthOverMonthGrowth: `${growth}%`,
        todayRevenue: Number(todayRevenue._sum.amount || 0),
      },
      withdrawal: {
        pending: pendingWithdrawals,
        pendingAmount: Number(pendingWithdrawAmount._sum.amount || 0),
      },
      refund: {
        count: refundOrders,
        amount: Number(refundAmount._sum.amount || 0),
        rate: refundRate,
      },
      revenueBreakdown: orderTypeBreakdown.map(o => ({
        type: o.type,
        count: o._count,
        amount: Number(o._sum.amount || 0),
      })),
      revenueTrend,
    };
  }

  private async getCustomerServiceDashboard(today: Date, _thisMonth: Date) {
    // 客服关注：举报量、纠纷量、处理时效
    const [
      pendingReports, totalReports,
      resolvedReports, dismissedReports,
      todayNewReports,
      recentComments,
    ] = await Promise.all([
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: "RESOLVED" } }),
      this.prisma.report.count({ where: { status: "DISMISSED" } }),
      this.prisma.report.count({ where: { createdAt: { gte: today } } }),
      this.prisma.comment.findMany({
        where: { status: "HIDDEN" },
        select: { id: true },
      }),
    ]);

    const resolvedTotal = resolvedReports + dismissedReports;
    const resolveRate = totalReports > 0 ? (resolvedTotal / totalReports * 100).toFixed(1) + "%" : "100%";

    // 按类型统计举报分布
    const reportByType = await this.prisma.report.groupBy({
      by: ["targetType"],
      where: { status: "PENDING" },
      _count: true,
    });

    return {
      role: "CUSTOMER_SERVICE",
      overview: {
        pendingReports,
        todayNewReports,
        totalReports,
        resolvedTotal,
        resolveRate,
        hiddenComments: recentComments.length,
      },
      reportDistribution: reportByType.map(r => ({
        targetType: r.targetType,
        count: r._count,
      })),
      actionItems: {
        urgentReports: pendingReports > 0 ? `${pendingReports} 条举报待处理` : "无待处理举报",
      },
    };
  }

  private async getContentAuditorDashboard(today: Date, _thisMonth: Date) {
    const [
      pendingArticles, pendingCourses,
      approvedArticles, approvedCourses,
      rejectedArticles, rejectedCourses,
      todayReviewedArticles, todayReviewedCourses,
      totalArticles, totalCourses,
    ] = await Promise.all([
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.article.count({ where: { auditStatus: "REJECTED" } }),
      this.prisma.course.count({ where: { auditStatus: "REJECTED" } }),
      this.prisma.article.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: today } } }),
      this.prisma.course.count({ where: { auditStatus: { not: "PENDING" }, updatedAt: { gte: today } } }),
      this.prisma.article.count(),
      this.prisma.course.count(),
    ]);

    const totalPending = pendingArticles + pendingCourses;
    const totalReviewed = approvedArticles + approvedCourses + rejectedArticles + rejectedCourses;
    const approvalRate = totalReviewed > 0
      ? ((approvedArticles + approvedCourses) / totalReviewed * 100).toFixed(1) + "%"
      : "0%";

    // TOP10 高浏览待审核
    const topPendingArticles = await this.prisma.article.findMany({
      where: { auditStatus: "PENDING" },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: { id: true, title: true, viewCount: true, createdAt: true },
    });

    return {
      role: "CONTENT_AUDITOR",
      overview: {
        pendingArticles, pendingCourses,
        totalPending,
        todayReviewed: todayReviewedArticles + todayReviewedCourses,
        totalReviewed,
        approvalRate,
      },
      breakdown: {
        articles: { pending: pendingArticles, approved: approvedArticles, rejected: rejectedArticles, total: totalArticles },
        courses: { pending: pendingCourses, approved: approvedCourses, rejected: rejectedCourses, total: totalCourses },
      },
      topPendingArticles,
    };
  }

  private async getGoodsAuditorDashboard(today: Date, _thisMonth: Date) {
    const [
      pendingProducts, onSaleProducts, offShelfProducts,
      lowStockProducts, outOfStockProducts,
      todayNewOrders, pendingShipOrders,
      todayShippedOrders,
      productViolations,
    ] = await Promise.all([
      this.prisma.product.count({ where: { status: "PENDING" } }),
      this.prisma.product.count({ where: { status: "ON_SALE" } }),
      this.prisma.product.count({ where: { status: "OFF_SHELF" } }),
      this.prisma.product.count({ where: { stock: { gt: 0, lte: 10 }, status: "ON_SALE" } }),
      this.prisma.product.count({ where: { stock: 0, status: "ON_SALE" } }),
      this.prisma.order.count({ where: { type: "PRODUCT", createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { type: "PRODUCT", status: { in: ["PAID"] } } }),
      this.prisma.order.count({ where: { type: "PRODUCT", status: "SHIPPED", updatedAt: { gte: today } } }),
      this.prisma.merchantViolation.count({ where: { status: "PENDING" } }),
    ]);

    // 近30天发货时效
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const shippedOrders = await this.prisma.order.findMany({
      where: { type: "PRODUCT", status: "SHIPPED", updatedAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, updatedAt: true },
    });
    const avgShipHours = shippedOrders.length > 0
      ? (shippedOrders.reduce((s, o) => s + (o.updatedAt.getTime() - o.createdAt.getTime()), 0) / shippedOrders.length / 3600000).toFixed(1)
      : "0";

    return {
      role: "GOODS_AUDITOR",
      overview: {
        pendingProducts,
        onSaleProducts,
        offShelfProducts,
        totalProducts: pendingProducts + onSaleProducts + offShelfProducts,
      },
      stockAlerts: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      orderStats: {
        todayNewOrders,
        pendingShipOrders,
        todayShippedOrders,
        avgShipTimeHours: `${avgShipHours}h`,
      },
      violations: {
        pending: productViolations,
      },
    };
  }

  // ───────── 平台总览 ─────────

  async getPlatformOverview() {
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
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: lastMonth, lt: thisMonth } }, _sum: { amount: true } }),
      Promise.all([
        this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
        this.prisma.course.count({ where: { auditStatus: "PENDING" } }),
        this.prisma.report.count({ where: { status: "PENDING" } }),
      ]),
      this.prisma.riskAlert.count({ where: { status: "OPEN" } }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);

    return {
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
          where: { createdAt: { gte: targetDate, lt: nextDay }, status: { in: ["PAID", "COMPLETED"] } },
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
