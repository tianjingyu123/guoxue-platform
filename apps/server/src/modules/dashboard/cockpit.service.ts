import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PAID_ORDER_STATUSES } from "./order-status.constants";

@Injectable()
export class CockpitService {
  private readonly logger = new Logger(CockpitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getOverview() {
    const cached = await this.redis.getJson<Record<string, unknown>>("cockpit:overview");
    if (cached) return cached;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayGmv, monthGmv,
      paidUsers, monthPaidUsers,
      totalUsers, onlineUsers,
      commissionTotal, monthCommission,
      monthRefund,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.order.groupBy({ by: ["userId"], where: { status: { in: PAID_ORDER_STATUSES } } }).then(r => r.length),
      this.prisma.order.groupBy({ by: ["userId"], where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: monthStart } } }).then(r => r.length),
      this.prisma.user.count(),
      this.redis.get("ws:online_count").then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.error("获取在线用户数失败", err.stack); return 0; }),
      this.prisma.stationEarning.aggregate({ _sum: { earned: true } }),
      this.prisma.stationEarning.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { earned: true } }),
      this.prisma.order.aggregate({ where: { status: "REFUNDED", updatedAt: { gte: monthStart } }, _sum: { amount: true } }),
    ]);

    const monthRevenue = Number(monthGmv._sum.amount || 0);
    const monthComm = Number(monthCommission._sum.earned || 0);
    const monthRefunded = Number(monthRefund._sum.amount || 0);

    const data = {
      todayGmv: Number(todayGmv._sum.amount || 0),
      monthGmv: monthRevenue,
      totalPaidUsers: paidUsers,
      monthPaidUsers,
      totalUsers,
      onlineUsers,
      totalCommissionPaid: Number(commissionTotal._sum.earned || 0),
      monthCommissionPaid: monthComm,
      monthRefunded,
      // 诚实估算净利润 = 本月 GMV - 分佣支出 - 已退款；佣金/成本数据不全故标记为估算值。
      // 佣金为 0 时不再等同于 GMV（避免"净利润≡营收"的误导），至少扣减退款。
      estimatedNetProfit: Math.round((monthRevenue - monthComm - monthRefunded) * 100) / 100,
      netProfitIsEstimate: true,
    };

    await this.redis.setJson("cockpit:overview", data, 300);
    return data;
  }

  async getRevenueComposition() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const orderByType = await this.prisma.order.groupBy({
      by: ["type"],
      where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    });

    const giftTotal = await this.prisma.giftRecord.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { totalCoin: true },
    });

    const typeLabels: Record<string, string> = {
      COURSE: "课程",
      PRODUCT: "商品",
      MEMBER: "会员",
      CIRCLE_JOIN: "入圈",
      BOT_SERVICE: "智能体",
      PAIPAN: "排盘",
      LIVESTREAM: "直播",
      STATION_MASTER: "站长购买",
      OPERATOR: "运营商",
    };

    return {
      composition: orderByType.map(o => ({
        type: o.type,
        label: typeLabels[o.type] || o.type,
        amount: Number(o._sum.amount || 0),
        count: o._count,
      })),
      giftRevenue: {
        label: "打赏",
        totalCoin: Number(giftTotal._sum.totalCoin || 0),
      },
    };
  }

  async getUserGrowth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, number>();
    for (const u of users) {
      const day = u.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    const commissions = await this.prisma.stationEarning.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { earned: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const costMap = new Map<string, number>();
    for (const c of commissions) {
      const day = c.createdAt.toISOString().slice(0, 10);
      costMap.set(day, (costMap.get(day) || 0) + Number(c.earned));
    }

    const trends: Array<{ date: string; newUsers: number; acquisitionCost: number }> = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const day = d.toISOString().slice(0, 10);
      const newUsers = dailyMap.get(day) || 0;
      const cost = costMap.get(day) || 0;
      trends.push({
        date: day,
        newUsers,
        acquisitionCost: newUsers > 0 ? Math.round(cost / newUsers * 100) / 100 : 0,
      });
    }

    return { trends };
  }

  async getBusinessTrends() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { status: { in: PAID_ORDER_STATUSES }, createdAt: { gte: thirtyDaysAgo } },
      select: { type: true, amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyByType = new Map<string, Record<string, number>>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailyByType.has(day)) dailyByType.set(day, {});
      const entry = dailyByType.get(day)!;
      entry[o.type] = (entry[o.type] || 0) + Number(o.amount);
    }

    const trends: Array<{ date: string; [key: string]: string | number }> = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const day = d.toISOString().slice(0, 10);
      trends.push({ date: day, ...(dailyByType.get(day) || {}) });
    }

    return { trends };
  }

  async getAlerts() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [refundCount, todayOrders, recentFailedOrders, openAlerts] = await Promise.all([
      this.prisma.order.count({ where: { status: "REFUNDED", updatedAt: { gte: today } } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: oneHourAgo } } }),
      this.prisma.riskAlert.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, level: true, title: true, createdAt: true },
      }),
    ]);

    const refundRate = todayOrders > 0 ? (refundCount / todayOrders * 100) : 0;

    const alerts: Array<{ type: string; level: string; message: string }> = [];

    if (refundRate > 10) {
      alerts.push({ type: "REFUND_ANOMALY", level: "DANGER", message: `今日退款率 ${refundRate.toFixed(1)}% 超过阈值` });
    }
    if (recentFailedOrders > 10) {
      alerts.push({ type: "PAYMENT_FAILURE", level: "WARN", message: `近1小时 ${recentFailedOrders} 笔订单取消` });
    }

    return {
      systemAlerts: alerts,
      riskAlerts: openAlerts,
      refundStats: { todayRefunds: refundCount, refundRate: `${refundRate.toFixed(1)}%` },
    };
  }

  async getRankings() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [topCourses, topCircles, topStations] = await Promise.all([
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        orderBy: { studentCount: "desc" },
        take: 5,
        select: { id: true, title: true, studentCount: true, price: true },
      }),
      this.prisma.circle.findMany({
        orderBy: { memberCount: "desc" },
        take: 5,
        select: { id: true, name: true, memberCount: true, postCount: true },
      }),
      this.prisma.stationEarning.groupBy({
        by: ["stationId"],
        where: { createdAt: { gte: monthStart } },
        _sum: { earned: true },
        orderBy: { _sum: { earned: "desc" } },
        take: 5,
      }),
    ]);

    const stationIds = topStations.map(s => s.stationId);
    const stations = await this.prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true, name: true },
    });
    const stationMap = new Map(stations.map(s => [s.id, s.name]));

    const topStationNewUsers = await this.prisma.station.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    });

    return {
      topCourses,
      topCircles,
      topPromoters: topStations.map(s => ({
        stationId: s.stationId,
        name: stationMap.get(s.stationId) || "未知",
        monthEarned: Number(s._sum.earned || 0),
      })),
      topNewStations: topStationNewUsers,
    };
  }
}
