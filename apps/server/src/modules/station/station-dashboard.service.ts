import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StationDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 站长概览 — 本月核心指标 */
  async getOverview(stationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [earningsAgg] = await Promise.all([
      this.prisma.stationEarning.aggregate({
        where: { stationId, createdAt: { gte: monthStart } },
        _sum: { earned: true, amount: true },
        _count: true,
      }),
    ]);

    return {
      monthEarned: earningsAgg._sum.earned || 0,
      monthAmount: earningsAgg._sum.amount || 0,
      monthOrders: earningsAgg._count,
      conversionRate: "0",
    };
  }

  /** 佣金趋势 — 近30天按日聚合 */
  async getTrends(stationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const earnings = await this.prisma.stationEarning.findMany({
      where: { stationId, createdAt: { gte: thirtyDaysAgo } },
      select: { earned: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, number>();
    for (const e of earnings) {
      const day = e.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(e.earned));
    }

    return { trends: Array.from(dailyMap.entries()).map(([date, value]) => ({ date, earned: value })) };
  }

  /** 推广渠道收益分布 */
  async getLinkRanking(stationId: string) {
    const earnings = await this.prisma.stationEarning.groupBy({
      by: ["type"],
      where: { stationId },
      _sum: { earned: true },
      _count: true,
      orderBy: { _sum: { earned: "desc" } },
    });
    return { ranking: earnings.map(e => ({ type: e.type, earned: e._sum.earned, count: e._count })) };
  }

  /** 沉默用户提醒 — 已支付但近7天无新增收益的用户 */
  async getSilentUsers(stationId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 通过 StationEarning 获取该站点关联的订单 ID
    const stationOrderIds = (await this.prisma.stationEarning.findMany({
      where: { stationId },
      select: { orderId: true },
    })).map(e => e.orderId);

    if (stationOrderIds.length === 0) return { silentUsers: [], count: 0 };

    // 该站点的用户中，近 7 天有新订单的视为活跃
    const activeUsers = new Set(
      (await this.prisma.order.findMany({
        where: { id: { in: stationOrderIds }, createdAt: { gte: sevenDaysAgo } },
        select: { userId: true },
      })).map(o => o.userId),
    );

    // 从该站点历史订单中找到已有订单但非活跃的用户
    const silentOrders = await this.prisma.order.findMany({
      where: { id: { in: stationOrderIds }, userId: { notIn: Array.from(activeUsers) } },
      select: { user: { select: { id: true, nickname: true, avatar: true, createdAt: true } } },
      take: 20,
    });

    const userMap = new Map<string, { nickname: string | null; avatar: string | null; createdAt: Date }>();
    for (const o of silentOrders) {
      if (!userMap.has(o.user.id)) {
        userMap.set(o.user.id, { nickname: o.user.nickname, avatar: o.user.avatar, createdAt: o.user.createdAt });
      }
    }

    return {
      silentUsers: Array.from(userMap.entries()).map(([id, info]) => ({ id, ...info })),
      count: userMap.size,
    };
  }

  /** 结算倒计时 */
  async getSettlementTimer(stationId: string) {
    const settleDay = 15; // 默认每月15号结算

    const now = new Date();
    const nextSettle = new Date(now.getFullYear(), now.getMonth(), settleDay);
    if (nextSettle <= now) {
      nextSettle.setMonth(nextSettle.getMonth() + 1);
    }
    const remainingDays = Math.ceil((nextSettle.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const balance = await this.prisma.stationEarning.aggregate({
      where: { stationId },
      _sum: { earned: true },
    });

    return {
      nextSettleDate: nextSettle.toISOString().slice(0, 10),
      remainingDays,
      pendingSettlement: balance._sum.earned || 0,
    };
  }
}
