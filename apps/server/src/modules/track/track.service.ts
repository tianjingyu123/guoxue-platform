import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { TrackEventDto } from "./track.dto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const MAX_BATCH = 50;
const ACTION_MAX = 64;
const PATH_MAX = 256;

@Injectable()
export class TrackService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private prisma: PrismaService) {}

  /** 批量落库行为埋点（匿名 userId=null；超量截断；落库失败静默吞掉——埋点永不影响主流程） */
  async recordBatch(userId: string | undefined, events: TrackEventDto[]) {
    if (!Array.isArray(events) || events.length === 0) return { ok: true, count: 0 };

    const rows = events.slice(0, MAX_BATCH).map((e) => ({
      userId: userId ?? null,
      action: String(e.action ?? "unknown").slice(0, ACTION_MAX),
      path: e.path ? String(e.path).slice(0, PATH_MAX) : null,
      payload: (e.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      occurredAt: e.ts ? new Date(Number(e.ts)) : new Date(),
    }));

    try {
      await this.prisma.trackEvent.createMany({ data: rows });
      return { ok: true, count: rows.length };
    } catch (err) {
      this.logger.warn(`埋点落库失败（已忽略）: ${(err as Error).message}`);
      return { ok: true, count: 0 };
    }
  }

  /**
   * 站长推广转化漏斗（T2-P2）：分享点击(ref_click) → 注册绑定(ReferralRelation) → 下单用户。
   * 点击自归因链路上线（2026-07-02）起累积；ref 参数兼容站长用户ID与分站推广码两种取值。
   */
  async getStationFunnel(userId: string, days = 30) {
    const station = await this.prisma.station.findUnique({
      where: { userId },
      select: { id: true, code: true },
    });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "你还没有开通分站");

    const since = new Date(Date.now() - days * 86_400_000);
    const [clicksByUid, clicksByCode, registrations, buyerGroups] = await Promise.all([
      this.prisma.trackEvent.count({
        where: { action: "ref_click", createdAt: { gte: since }, payload: { path: ["ref"], equals: userId } },
      }),
      this.prisma.trackEvent.count({
        where: { action: "ref_click", createdAt: { gte: since }, payload: { path: ["ref"], equals: station.code } },
      }),
      this.prisma.referralRelation.count({
        where: { referrerId: userId, referrerType: "STATION_MASTER", createdAt: { gte: since } },
      }),
      this.prisma.order.groupBy({
        by: ["userId"],
        where: {
          OR: [{ referrerId: userId }, { tempReferrerId: userId }],
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
          createdAt: { gte: since },
        },
      }),
    ]);

    return {
      days,
      clicks: clicksByUid + clicksByCode,
      registrations,
      buyers: buyerGroups.length,
    };
  }

  /**
   * 前端错误监控（G4）：App.onError 全局埋点 action=error 的聚合视图。
   * 错误量级预期低（异常才有），findMany 全窗口取回后 JS 聚合即可；payload.msg 截断归并防高基数。
   */
  async getErrorMonitor(days = 7, page = 1, pageSize = 20) {
    const since = new Date(Date.now() - days * 86_400_000);
    const dayAgo = new Date(Date.now() - 86_400_000);
    const [windowRows, total, last24h] = await Promise.all([
      this.prisma.trackEvent.findMany({
        where: { action: "error", createdAt: { gte: since } },
        select: { path: true, payload: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5000, // 聚合上限保险（错误洪峰时只聚合最近5000条）
      }),
      this.prisma.trackEvent.count({ where: { action: "error", createdAt: { gte: since } } }),
      this.prisma.trackEvent.count({ where: { action: "error", createdAt: { gte: dayAgo } } }),
    ]);

    // 按日趋势（自然日·补零）
    const byDayMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      byDayMap.set(d.toISOString().slice(0, 10), 0);
    }
    // 按消息 TOP（msg 截断 120 字归并）
    const byMsg = new Map<string, { count: number; lastAt: Date; samplePath: string | null }>();
    for (const r of windowRows) {
      const day = r.createdAt.toISOString().slice(0, 10);
      if (byDayMap.has(day)) byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
      const msg = String((r.payload as Record<string, unknown> | null)?.msg ?? "未知错误").slice(0, 120);
      const cur = byMsg.get(msg);
      if (cur) {
        cur.count++;
        if (r.createdAt > cur.lastAt) cur.lastAt = r.createdAt;
      } else {
        byMsg.set(msg, { count: 1, lastAt: r.createdAt, samplePath: r.path });
      }
    }
    const topMessages = [...byMsg.entries()]
      .map(([msg, v]) => ({ msg, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 明细分页
    const items = await this.prisma.trackEvent.findMany({
      where: { action: "error", createdAt: { gte: since } },
      select: { id: true, userId: true, path: true, payload: true, occurredAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      days,
      total,
      last24h,
      byDay: [...byDayMap.entries()].map(([date, count]) => ({ date, count })),
      topMessages,
      items,
      page,
      pageSize,
    };
  }
}
