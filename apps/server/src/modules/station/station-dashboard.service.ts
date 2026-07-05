import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * 佣-V2 管理奖默认比率（与 commission.service 同口径·2026-07-04 拍板）：
 * operator.mgmtRate 为空时按渠道类型取默认（ONLINE 10% / OFFLINE 20%）。
 */
const MGMT_RATE_DEFAULTS: Record<string, number> = {
  ONLINE: 0.10,
  OFFLINE: 0.20,
};

/** 运营商团队健康度结构（课题二五角色工作台 P3） */
export interface TeamHealth {
  /** 综合健康度 0-100 */
  score: number;
  /** 等级中文名 */
  level: string;
  /** 等级枚举键（配色/图标用） */
  levelKey: "dormant" | "warning" | "activating" | "running" | "healthy";
  /** 四维分解：活跃占比/人均业绩/团队规模/订单活跃 */
  breakdown: { activity: number; performance: number; scale: number; orders: number };
}

/**
 * 运营商团队健康度（0-100·课题二工作台 P3）。
 * 纯函数·无随机·基于团队真实经营数据加权（符合 CLAUDE.md 禁纯随机/假算法）：
 * - activity 活跃站长占比 45（团队是否在动的核心信号）
 * - performance 人均本月佣金 35（log10 缩放·业绩厚度）
 * - scale 团队规模 12（log10）
 * - orders 本月团队订单活跃 8（log10）
 * 无团队(total=0) → 0 分·预警起步（诚实不虚高）。
 */
export function computeTeamHealth(input: {
  totalStations: number;
  activeStations: number;
  monthTeamEarned: number;
  monthTeamOrders: number;
}): TeamHealth {
  const total = Math.max(0, input.totalStations || 0);
  if (total === 0) {
    return { score: 0, level: "尚无团队", levelKey: "dormant", breakdown: { activity: 0, performance: 0, scale: 0, orders: 0 } };
  }
  const active = Math.max(0, Math.min(total, input.activeStations || 0));
  const earned = Math.max(0, Number(input.monthTeamEarned) || 0);
  const orders = Math.max(0, input.monthTeamOrders || 0);

  const activity = Math.round((active / total) * 45);
  const avgEarn = earned / total;
  const performance = Math.min(35, Math.round(Math.log10(avgEarn + 1) * 17.5));
  const scale = Math.min(12, Math.round(Math.log10(total + 1) * 8));
  const ordersScore = Math.min(8, Math.round(Math.log10(orders + 1) * 4));

  const score = Math.min(100, activity + performance + scale + ordersScore);
  const { level, levelKey } = teamHealthLevel(score);
  return { score, level, levelKey, breakdown: { activity, performance, scale, orders: ordersScore } };
}

function teamHealthLevel(score: number): { level: string; levelKey: TeamHealth["levelKey"] } {
  if (score >= 80) return { level: "团队健康", levelKey: "healthy" };
  if (score >= 60) return { level: "运转良好", levelKey: "running" };
  if (score >= 40) return { level: "有待激活", levelKey: "activating" };
  if (score >= 20) return { level: "亟需关注", levelKey: "warning" };
  return { level: "预警·亟待启动", levelKey: "dormant" };
}

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

  /**
   * 佣-V2-P4 运营商管理奖新口径月报（2026-07-04 拍板·管理奖 = 站长实得佣金 × (mgmtRate ?? 渠道默认)）。
   * 数据源 OperatorEarning（P1 改制后：amount=站长佣金额基数、rate=实际比率、earned=运营商所得），
   * 本月直接聚合（含退款冲正负记录，自然净额）；明细按站长（sourceStationId）分组。
   * channelType=OFFLINE 即"高级线下运营商"（20% 档）标识。
   */
  async getOperatorMgmtReport(userId: string) {
    const operator = await this.prisma.operator.findFirst({
      where: { userId },
      select: { id: true, channelType: true, mgmtRate: true },
    });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");

    // 我的比率：逐运营商 mgmtRate 覆盖 → channelType 默认（ONLINE 0.10 / OFFLINE 0.20）
    const mgmtRate =
      operator.mgmtRate != null
        ? Number(operator.mgmtRate)
        : MGMT_RATE_DEFAULTS[operator.channelType] ?? MGMT_RATE_DEFAULTS.ONLINE;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const grouped = await this.prisma.operatorEarning.groupBy({
      by: ["sourceStationId"],
      where: { operatorId: operator.id, source: "MGMT_BONUS", createdAt: { gte: monthStart } },
      _sum: { amount: true, earned: true },
      _count: true,
    });

    const stationIds = grouped.map((g) => g.sourceStationId).filter((v): v is string => !!v);
    const stations = stationIds.length
      ? await this.prisma.station.findMany({ where: { id: { in: stationIds } }, select: { id: true, name: true } })
      : [];
    const nameMap = new Map(stations.map((s) => [s.id, s.name]));

    const byStation = grouped
      .map((g) => ({
        stationId: g.sourceStationId,
        stationName: g.sourceStationId ? (nameMap.get(g.sourceStationId) ?? null) : null,
        stationCommission: Math.round(Number(g._sum.amount || 0) * 100) / 100, // 该站长本月实得佣金合计（管理奖基数）
        mgmtEarned: Math.round(Number(g._sum.earned || 0) * 100) / 100, // 我从该站长获得的管理奖合计
        orders: g._count,
      }))
      .sort((a, b) => b.mgmtEarned - a.mgmtEarned);

    const monthStationCommission = Math.round(byStation.reduce((s, x) => s + x.stationCommission, 0) * 100) / 100;
    const monthMgmtEarned = Math.round(byStation.reduce((s, x) => s + x.mgmtEarned, 0) * 100) / 100;

    return {
      channelType: operator.channelType, // ONLINE / OFFLINE
      isOfflinePremium: operator.channelType === "OFFLINE", // 高级线下运营商标识（20% 档）
      mgmtRate, // 我的管理奖比率（mgmtRate ?? 渠道默认 0.10/0.20）
      monthStationCommission, // 本月名下站长佣金合计（计酬基数口径）
      monthMgmtEarned, // 本月管理奖合计（实得口径·含冲正净额）
      byStation, // 明细按站长分组
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
