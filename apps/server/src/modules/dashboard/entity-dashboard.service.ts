import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class EntityDashboardService {
  private readonly logger = new Logger(EntityDashboardService.name);
  constructor(private prisma: PrismaService) {}

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

      const members = await this.prisma.circleMember.findMany({
        where: { circleId, joinedAt: { gte: thirtyDaysAgo } },
        select: { joinedAt: true },
        orderBy: { joinedAt: "asc" },
        take: 2000,
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

      const circlePosts = await this.prisma.post.findMany({
        where: { circleId },
        select: { id: true },
        take: 1000,
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

      const [circleCourses, circleProducts, circleLiveRooms] = await Promise.all([
        this.prisma.course.findMany({ where: { circleId }, select: { id: true }, take: 200 }),
        this.prisma.product.findMany({ where: { circleId }, select: { id: true }, take: 200 }),
        this.prisma.liveRoom.findMany({ where: { circleId }, select: { id: true }, take: 200 }),
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

      const topArticles = await this.prisma.article.findMany({
        where: { circleId, auditStatus: "APPROVED" },
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
        engagement: { recentPosts, recentComments, recentLikes },
        revenueDistribution: {
          courseRevenue: Number(courseRevenue._sum.amount || 0),
          productRevenue: Number(productRevenue._sum.amount || 0),
          tippingCoin: Number(tippingRevenue._sum.totalCoin || 0),
        },
        topContent: topArticles.map(a => ({
          id: a.id, title: a.title, viewCount: a.viewCount,
          commentCount: a.commentCount, likeCount: a.likeCount,
          createdAt: a.createdAt, author: a.user.nickname,
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

      const allProgress = await this.prisma.courseProgress.findMany({
        where: { courseId },
        select: { userId: true, progress: true, completed: true },
        take: 5000,
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

      const ratingDist = await this.prisma.courseReview.groupBy({
        by: ["rating"],
        where: { courseId },
        _count: true,
      });
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of ratingDist) {
        ratingDistribution[r.rating] = r._count;
      }

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
          take: 5000,
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
        sales: { totalSales, dailySales },
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
          take: 500,
        }),
        this.prisma.order.findMany({
          where: { type: "LIVESTREAM", targetId: liveId, status: { in: ["PAID", "COMPLETED"] } },
          select: { amount: true },
          take: 500,
        }),
      ]);

      const totalCoin = giftRecords.reduce((s, g) => s + Number(g.totalCoin), 0);
      const tipperCount = new Set(giftRecords.map(g => g.userId)).size;
      const orderCount = liveOrders.length;
      const totalRevenue = liveOrders.reduce((s, o) => s + Number(o.amount), 0);

      return {
        basicInfo: {
          title: live.title, host: host?.nickname || "未知",
          startTime: live.startTime, endTime: live.endTime,
          durationSeconds: duration, status: live.status,
          chargeType: live.chargeType,
          chargePrice: live.chargePrice ? Number(live.chargePrice) : 0,
        },
        viewData: { totalViews: live.viewCount, peakOnline: null, avgWatchDuration: null },
        interaction: { comments: commentCount, likes: likeCount, shares: 0 },
        tipping: { totalCoin, tipperCount },
        transaction: { orderCount, revenue: totalRevenue },
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
        team: { subordinateCount: teamCount, totalCommission },
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

      const offlineCourses = await this.prisma.offlineCourse.findMany({
        where: { stationId: offlineId },
        select: { id: true, title: true, price: true, status: true, maxStudents: true, startTime: true },
        take: 100,
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

      const products = await this.prisma.stationProduct.findMany({
        where: { stationId: offlineId },
        select: { id: true, name: true, price: true, stock: true, status: true },
        take: 200,
      });
      const productOrderAgg = await this.prisma.stationOrder.aggregate({
        where: { stationId: offlineId, orderType: "PRODUCT", status: "PAID" },
        _sum: { amount: true, stationIncome: true },
      });

      const regUsers = courseIds.length > 0
        ? await this.prisma.offlineCourseRegistration.findMany({
            where: { courseId: { in: courseIds } },
            select: { userId: true },
            take: 500,
          })
        : [];
      const userCounts = new Map<string, number>();
      for (const r of regUsers) {
        userCounts.set(r.userId, (userCounts.get(r.userId) ?? 0) + 1);
      }
      const uniqueStudents = userCounts.size;
      const repeatStudents = Array.from(userCounts.values()).filter(c => c > 1).length;

      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const monthlyOrders = await this.prisma.stationOrder.findMany({
        where: { stationId: offlineId, createdAt: { gte: twelveMonthsAgo } },
        select: { amount: true, createdAt: true, status: true },
        take: 2000,
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
          name: station.name, address: `${station.city} ${station.address}`,
          operator: owner?.nickname || "未知", status: station.status, createdAt: station.createdAt,
        },
        courseStats: {
          courseCount: offlineCourses.length, totalStudents: uniqueStudents,
          registrations: registrationCount, courseRevenue: Number(courseOrderAgg._sum.amount || 0),
        },
        productStats: {
          productCount: products.length, salesRevenue: Number(productOrderAgg._sum.amount || 0),
          stockOverview: {
            totalStock: products.reduce((s, p) => s + p.stock, 0),
            activeProducts: products.filter(p => p.status === "ACTIVE").length,
          },
        },
        studentAnalysis: {
          totalStudents: uniqueStudents, repeatStudents,
          repeatRate: uniqueStudents > 0 ? (repeatStudents / uniqueStudents * 100).toFixed(1) + "%" : "0%",
        },
        revenueTrend,
      };
    } catch (err) {
      this.logger.error(`获取驿站看板失败: ${(err as Error).message}`, (err as Error).stack);
      return { error: "获取驿站看板失败" };
    }
  }
}
