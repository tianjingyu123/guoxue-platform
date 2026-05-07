import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

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
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    // ── 近7天用户增长 ──
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const userGrowth: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = recentUsers.filter(
        (u) => u.createdAt.toISOString().slice(0, 10) === dateStr,
      ).length;
      userGrowth.push({ date: dateStr, count });
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
}
