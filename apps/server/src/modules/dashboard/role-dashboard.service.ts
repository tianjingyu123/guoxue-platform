import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PAID_ORDER_STATUSES } from "./order-status.constants";

@Injectable()
export class RoleDashboardService {
  private readonly logger = new Logger(RoleDashboardService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

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
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: today }, status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: thisMonth }, status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
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
        pendingArticles, pendingCourses, pendingReports,
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
        take: 50000,
      }),
    ]);

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
        articles: pendingArticles, courses: pendingCourses, reports: pendingReports,
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
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: lastMonth, lt: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: today } }, _sum: { amount: true } }),
      this.prisma.order.aggregate({ where: { status: { in: PAID_ORDER_STATUSES } }, _sum: { amount: true } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { status: "REFUNDED", updatedAt: { gte: thisMonth } } }),
      this.prisma.order.aggregate({ where: { status: "REFUNDED", updatedAt: { gte: thisMonth } }, _sum: { amount: true } }),
      this.prisma.order.groupBy({
        by: ["type"],
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thisMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thisMonth } },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: "asc" },
        take: 50000,
      }),
    ]);

    const monthRev = Number(monthRevenue._sum.amount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amount || 0);
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : "0";

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
        type: o.type, count: o._count, amount: Number(o._sum.amount || 0),
      })),
      revenueTrend,
    };
  }

  private async getCustomerServiceDashboard(today: Date, _thisMonth: Date) {
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
        take: 10000,
      }),
    ]);

    const resolvedTotal = resolvedReports + dismissedReports;
    const resolveRate = totalReports > 0 ? (resolvedTotal / totalReports * 100).toFixed(1) + "%" : "100%";

    const reportByType = await this.prisma.report.groupBy({
      by: ["targetType"],
      where: { status: "PENDING" },
      _count: true,
    });

    return {
      role: "CUSTOMER_SERVICE",
      overview: {
        pendingReports, todayNewReports, totalReports,
        resolvedTotal, resolveRate,
        hiddenComments: recentComments.length,
      },
      reportDistribution: reportByType.map(r => ({
        targetType: r.targetType, count: r._count,
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

    const topPendingArticles = await this.prisma.article.findMany({
      where: { auditStatus: "PENDING" },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: { id: true, title: true, viewCount: true, createdAt: true },
    });

    return {
      role: "CONTENT_AUDITOR",
      overview: {
        pendingArticles, pendingCourses, totalPending,
        todayReviewed: todayReviewedArticles + todayReviewedCourses,
        totalReviewed, approvalRate,
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
        pendingProducts, onSaleProducts, offShelfProducts,
        totalProducts: pendingProducts + onSaleProducts + offShelfProducts,
      },
      stockAlerts: { lowStock: lowStockProducts, outOfStock: outOfStockProducts },
      orderStats: {
        todayNewOrders, pendingShipOrders, todayShippedOrders,
        avgShipTimeHours: `${avgShipHours}h`,
      },
      violations: { pending: productViolations },
    };
  }
}
