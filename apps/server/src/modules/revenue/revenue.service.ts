import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { COIN_TO_RMB } from "../../common/constants";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

// 分佣比例回退默认值（优先读 SettlementRule 场景规则表，未配置时回退此处）
const DEFAULT_RATES = {
  QUESTION: 0.8,   // 回答者 80%
  PEEK:       0.3, // 围观·达人 30%（董事长拍板 2026-07-10：平台 40% / 提问者 30% / 达人 30%）
  PEEK_ASKER: 0.3, // 围观·提问者 30%（同上拍板）
  AUDIO_CALL: 0.5, // 连麦/通话·达人 50%（董事长拍板 2026-07-10：平台 50% / 达人 50%）
  LIVE_GIFT: 0.5,  // 主播 50%（平台 50%·2026-07-01 业务规则）
};

const RATE_CACHE_TTL_MS = 60_000;

@Injectable()
export class RevenueService {
  private rateCache = new Map<string, { rate: number | null; expires: number }>();

  constructor(private prisma: PrismaService) {}

  /** T1-P1 配置收编：优先读 SettlementRule 中 PROVIDER 分成比例；规则缺失/异常回退硬编码默认值，不阻塞收益入账 */
  private async lookupProviderRate(scene: string): Promise<number | null> {
    const cached = this.rateCache.get(scene);
    if (cached && cached.expires > Date.now()) return cached.rate;
    let rate: number | null = null;
    try {
      const rule = await this.prisma.settlementRule.findUnique({ where: { scene } });
      if (rule?.enabled) {
        const splits = rule.splits as Array<{ role: string; rate: number }> | null;
        const provider = splits?.find((s) => s.role === "PROVIDER");
        if (provider && provider.rate > 0 && provider.rate <= 1) rate = provider.rate;
      }
    } catch {
      // 规则表不可用时静默回退默认值
    }
    this.rateCache.set(scene, { rate, expires: Date.now() + RATE_CACHE_TTL_MS });
    return rate;
  }

  /**
   * 记录收益并返回记录
   */
  async record(params: {
    userId: string;
    scene: "QUESTION" | "PEEK" | "PEEK_ASKER" | "AUDIO_CALL" | "LIVE_GIFT";
    refId: string;
    amountCoin: number;
    rate?: number;
  }, tx?: Prisma.TransactionClient) {
    const rate = params.rate ?? (await this.lookupProviderRate(params.scene)) ?? DEFAULT_RATES[params.scene];
    const amountRmb = (params.amountCoin / COIN_TO_RMB) * rate;

    // 支持传入事务客户端，使收益入账与扣费在同一事务（如送礼：扣赠礼者币 + 主播入账原子化）
    const db = tx ?? this.prisma;
    return db.userEarning.create({
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

  async getUserEarnings(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const [earnings, total] = await Promise.all([
      this.prisma.userEarning.findMany({
        where: { userId },
        skip,
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

  async getRevenueStats(
    userId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
    days?: number,
  ) {
    let dateFilter: Record<string, any> = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate + "T00:00:00+08:00"),
          lte: new Date(endDate + "T23:59:59+08:00"),
        },
      };
    } else if (period) {
      const [year, month] = period.split("-").map(Number);
      dateFilter = {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      };
    } else if (days) {
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { gte: start } };
    }

    const where: Record<string, any> = { ...dateFilter };
    if (userId) where.userId = userId;

    const [totalAgg] = await Promise.all([
      this.prisma.userEarning.aggregate({
        where,
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
    ]);

    const totalRmb = Number(totalAgg._sum.amountRmb || 0);
    const totalCoin = Number(totalAgg._sum.amountCoin || 0);
    const totalCount = totalAgg._count;

    let settled = 0;
    if (userId) {
      const settledOrders = await this.prisma.settlementOrder.findMany({
        where: {
          userId,
          status: { in: ["APPROVED", "PAID"] },
          ...(period ? { period } : {}),
        },
        select: { amount: true },
      });
      settled = settledOrders.reduce((sum, s) => sum + Number(s.amount), 0);
    }

    return {
      totalRmb,
      totalCoin,
      totalCount,
      settled,
      pending: userId ? Math.max(0, totalRmb - settled) : 0,
    };
  }

  async getRevenueBreakdown(
    userId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    let dateFilter: Record<string, any> = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate + "T00:00:00+08:00"),
          lte: new Date(endDate + "T23:59:59+08:00"),
        },
      };
    } else if (period) {
      const [year, month] = period.split("-").map(Number);
      dateFilter = {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      };
    }

    const where: Record<string, any> = { ...dateFilter };
    if (userId) where.userId = userId;

    const byScene = await this.prisma.userEarning.groupBy({
      by: ["scene"],
      where,
      _sum: { amountRmb: true, amountCoin: true },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const s of byScene) {
      result[s.scene] = Number(s._sum.amountRmb || 0);
    }
    return result;
  }
}
