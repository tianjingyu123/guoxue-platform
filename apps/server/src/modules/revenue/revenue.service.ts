import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { COIN_TO_RMB } from "../../common/constants";

// 分佣比例（可通过 CommissionConfig 动态读取，此处为默认值）
const DEFAULT_RATES = {
  QUESTION: 0.8,   // 回答者 80%
  PEEK:    0.7,   // 围观回答者 70%
  AUDIO_CALL: 0.7, // 连麦嘉宾 70%
  LIVE_GIFT: 0.6,  // 主播 60%
};

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  /**
   * 记录收益并返回记录
   */
  async record(params: {
    userId: string;
    scene: "QUESTION" | "PEEK" | "AUDIO_CALL" | "LIVE_GIFT";
    refId: string;
    amountCoin: number;
    rate?: number;
  }) {
    const rate = params.rate ?? DEFAULT_RATES[params.scene];
    const amountRmb = (params.amountCoin / COIN_TO_RMB) * rate;

    return this.prisma.userEarning.create({
      data: {
        userId: params.userId,
        scene: params.scene,
        refId: params.refId,
        amountCoin: params.amountCoin,
        amountRmb: Math.round(amountRmb * 100) / 100,
        rate,
      },
    });
  }

  /** 查询用户收益汇总 */
  async getUserSummary(userId: string) {
    const [total, byScene] = await Promise.all([
      this.prisma.userEarning.aggregate({
        where: { userId },
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
      this.prisma.userEarning.groupBy({
        by: ["scene"],
        where: { userId },
        _sum: { amountRmb: true },
      }),
    ]);

    return {
      totalRmb: total._sum.amountRmb || 0,
      totalCoin: total._sum.amountCoin || 0,
      totalCount: total._count,
      byScene: byScene.map((s) => ({
        scene: s.scene,
        rmb: s._sum.amountRmb || 0,
      })),
    };
  }

  async getUserEarnings(userId: string, page = 1, pageSize = 20) {
    const [earnings, total] = await Promise.all([
      this.prisma.userEarning.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userEarning.count({ where: { userId } }),
    ]);
    return { earnings, total, page, pageSize };
  }

  // ───────── 平台营收总览 ─────────

  async getPlatformOverview() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAgg, monthAgg, byScene, todayAgg] = await Promise.all([
      this.prisma.userEarning.aggregate({
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
      this.prisma.userEarning.aggregate({
        where: { createdAt: { gte: thisMonth } },
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
      this.prisma.userEarning.groupBy({
        by: ["scene"],
        _sum: { amountRmb: true },
        _count: true,
        orderBy: { _sum: { amountRmb: "desc" } },
      }),
      this.prisma.userEarning.aggregate({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
        _sum: { amountRmb: true },
        _count: true,
      }),
    ]);

    return {
      totalRmb: totalAgg._sum.amountRmb || 0,
      totalCoin: totalAgg._sum.amountCoin || 0,
      totalCount: totalAgg._count,
      monthRmb: monthAgg._sum.amountRmb || 0,
      monthCount: monthAgg._count,
      todayRmb: todayAgg._sum.amountRmb || 0,
      todayCount: todayAgg._count,
      byScene: byScene.map(s => ({
        scene: s.scene,
        count: s._count,
        rmb: s._sum.amountRmb || 0,
      })),
    };
  }

  async getRevenueTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const earnings = await this.prisma.userEarning.findMany({
      where: { createdAt: { gte: startDate } },
      select: { amountRmb: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // 按日聚合
    const dailyMap = new Map<string, { rmb: number; count: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), { rmb: 0, count: 0 });
    }

    for (const e of earnings) {
      const key = e.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        entry.rmb += Number(e.amountRmb);
        entry.count++;
      }
    }

    const trends = [...dailyMap.entries()].map(([date, data]) => ({ date, ...data }));
    return { trends, days };
  }

  // ───────── 新增：收入统计（管理员）─────────

  async getRevenueStats(userId: string, period?: string) {
    let dateFilter: Record<string, any> = {};
    if (period) {
      const [year, month] = period.split("-").map(Number);
      dateFilter = {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      };
    }

    const where = { userId, ...dateFilter };
    const [totalAgg, settledOrders] = await Promise.all([
      this.prisma.userEarning.aggregate({
        where,
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
      this.prisma.settlementOrder.findMany({
        where: {
          userId,
          status: { in: ["APPROVED", "PAID"] },
          ...(period ? { period } : {}),
        },
        select: { amount: true },
      }),
    ]);

    const totalRmb = Number(totalAgg._sum.amountRmb || 0);
    const totalCoin = Number(totalAgg._sum.amountCoin || 0);
    const totalCount = totalAgg._count;
    const settled = settledOrders.reduce((sum, s) => sum + Number(s.amount), 0);

    return {
      totalRmb,
      totalCoin,
      totalCount,
      settled,
      pending: Math.max(0, totalRmb - settled),
    };
  }

  async getRevenueBreakdown(userId: string, period?: string) {
    let dateFilter: Record<string, any> = {};
    if (period) {
      const [year, month] = period.split("-").map(Number);
      dateFilter = {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      };
    }

    const byScene = await this.prisma.userEarning.groupBy({
      by: ["scene"],
      where: { userId, ...dateFilter },
      _sum: { amountRmb: true, amountCoin: true },
      _count: true,
    });

    return byScene.map((s) => ({
      scene: s.scene,
      rmb: s._sum.amountRmb || 0,
      coin: s._sum.amountCoin || 0,
      count: s._count,
    }));
  }
}
