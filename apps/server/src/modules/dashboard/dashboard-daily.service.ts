import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const DAY_MS = 86_400_000;
/** 模块热度 Top N */
const MODULE_HEAT_TOP = 10;

/** 天级聚合指标（按能便宜聚合到的先做，取不到的字段省略——诚实降级） */
export interface DailyMetrics {
  /** 日活：当日 page_view 的 distinct userId 数（匿名不计） */
  dau: number;
  /** 当日 page_view 总数 */
  pv: number;
  /** 当日新注册用户数 */
  newUsers: number;
  /** 次日留存：前一日新用户中当日有 page_view 的占比（0~1）；前一日无新用户则省略 */
  d1Retention?: number;
  /** 7日留存：7 天前新用户中当日有 page_view 的占比（0~1）；无 cohort 则省略（D-T3） */
  d7Retention?: number;
  /** B 端活跃：当日活跃用户中拥有 B 端身份（站长/商家/圈主/驿站主/认证讲师）的去重数（D-T3·生态健康核心数） */
  bActiveCount?: number;
  /** 当日 GMV：paidAt 当日且已支付（非 PENDING/CANCELLED）订单实付和 */
  gmv: number;
  /** 当日支付成功订单数 */
  ordersPaid: number;
  /** 当日会员新购数 */
  memberNew: number;
  /** 当日佣金正向和（LedgerEntry category=COMMISSION 且未冲正） */
  commissionSum: number;
  /** 模块热度 Top10：page_view 按路径首段前缀聚合 */
  moduleHeat: Array<{ path: string; pv: number }>;
  /** 当日前端错误埋点数（action=error，G4） */
  errors24h: number;
}

/**
 * 运营看板天级聚合（看-P1）
 *
 * - 每日 00:30 cron（redis.runExclusive 多实例互斥）聚合昨日指标 → DashboardDaily 一行；
 * - date 唯一 + upsert ⇒ 幂等，同日重跑/手动 rebuild 不产生重复行；
 * - 数据源：TrackEvent（dau/pv/moduleHeat/errors）、User（newUsers）、Order（gmv/ordersPaid）、
 *   MemberPurchase（memberNew）、LedgerEntry（commissionSum）；
 * - 看板序列查询只打本表，永不打原始大表。
 */
@Injectable()
export class DashboardDailyService {
  private readonly logger = new Logger(DashboardDailyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 日期工具（Asia/Shanghai） ─────────

  /** 当前 Asia/Shanghai 日期串 YYYY-MM-DD（可传偏移天数，-1=昨天） */
  dateStrShanghai(offsetDays = 0): string {
    const sh = new Date(new Date(Date.now() + offsetDays * DAY_MS).toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }

  /** YYYY-MM-DD → Asia/Shanghai 当日 [00:00, 次日00:00) 的 UTC 时间范围 */
  private dayRange(date: string): { gte: Date; lt: Date } {
    const gte = new Date(`${date}T00:00:00+08:00`);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  }

  private isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00+08:00`).getTime());
  }

  /** 路径 → 模块前缀（取首段，如 /pkg-shop/detail → /pkg-shop；空/异常归 /unknown） */
  private modulePrefix(path: string | null): string {
    const seg = (path ?? "").replace(/^\/+/, "").split(/[/?#]/)[0]?.trim();
    return seg ? `/${seg}` : "/unknown";
  }

  // ───────── 聚合 cron ─────────

  /** 每日 00:30 聚合昨日（多实例互斥） */
  @Cron("30 0 * * *")
  async aggregateYesterday(): Promise<void> {
    await this.redis.runExclusive("dashboard-daily", 600, async () => {
      const date = this.dateStrShanghai(-1);
      try {
        await this.rebuildDate(date);
        this.logger.log(`运营看板日聚合完成：${date}`);
      } catch (e) {
        this.logger.error(`运营看板日聚合失败：${date}`, e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 聚合指定日期并 upsert 一行（幂等·可重复执行） */
  async rebuildDate(date: string): Promise<{ date: string; metrics: DailyMetrics }> {
    if (!this.isValidDate(date)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日期格式须为 YYYY-MM-DD");
    }
    const range = this.dayRange(date);
    const prevRange = this.dayRange(this.addDays(date, -1));

    const [dauRows, pv, newUsers, paidOrders, memberNew, commissionAgg, heatRows, errors24h] = await Promise.all([
      // dau：当日 page_view distinct userId（匿名 null 不计）
      this.prisma.trackEvent.findMany({
        where: { action: "page_view", userId: { not: null }, createdAt: range },
        select: { userId: true },
        distinct: ["userId"],
      }),
      this.prisma.trackEvent.count({ where: { action: "page_view", createdAt: range } }),
      this.prisma.user.count({ where: { createdAt: range } }),
      // gmv/ordersPaid：paidAt 当日且已支付（含后续 SHIPPED/COMPLETED/REFUNDED，GMV=支付口径）
      this.prisma.order.findMany({
        where: { paidAt: range, status: { notIn: ["PENDING", "CANCELLED"] } },
        select: { payAmount: true, amount: true },
      }),
      this.prisma.memberPurchase.count({ where: { paidAt: range } }),
      this.prisma.ledgerEntry.aggregate({
        where: { category: "COMMISSION", amount: { gt: 0 }, status: { not: "REVERSED" }, createdAt: range },
        _sum: { amount: true },
      }),
      this.prisma.trackEvent.groupBy({
        by: ["path"],
        where: { action: "page_view", createdAt: range },
        _count: { _all: true },
      }),
      this.prisma.trackEvent.count({ where: { action: "error", createdAt: range } }),
    ]);

    const gmv = paidOrders.reduce((sum, o) => sum + Number(o.payAmount ?? o.amount ?? 0), 0);

    // moduleHeat：按首段前缀归并后取 Top10
    const heatMap = new Map<string, number>();
    for (const row of heatRows) {
      const key = this.modulePrefix(row.path);
      heatMap.set(key, (heatMap.get(key) ?? 0) + row._count._all);
    }
    const moduleHeat = [...heatMap.entries()]
      .map(([path, count]) => ({ path, pv: count }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, MODULE_HEAT_TOP);

    const metrics: DailyMetrics = {
      dau: dauRows.length,
      pv,
      newUsers,
      gmv: Math.round(gmv * 100) / 100,
      ordersPaid: paidOrders.length,
      memberNew,
      commissionSum: Math.round(Number(commissionAgg._sum.amount ?? 0) * 100) / 100,
      moduleHeat,
      errors24h,
    };

    // d1Retention：前一日新用户中当日回访（page_view）的占比；前一日无新用户则诚实省略
    const cohort = await this.prisma.user.findMany({ where: { createdAt: prevRange }, select: { id: true } });
    if (cohort.length > 0) {
      const cohortIds = cohort.map((u) => u.id);
      const returned = await this.prisma.trackEvent.findMany({
        where: { action: "page_view", userId: { in: cohortIds }, createdAt: range },
        select: { userId: true },
        distinct: ["userId"],
      });
      metrics.d1Retention = Math.round((returned.length / cohortIds.length) * 10000) / 10000;
    }

    // d7Retention（D-T3）：7 天前注册 cohort 当日回访占比
    const d7Range = this.dayRange(this.addDays(date, -7));
    const cohort7 = await this.prisma.user.findMany({ where: { createdAt: d7Range }, select: { id: true } });
    if (cohort7.length > 0) {
      const ids = cohort7.map((u) => u.id);
      const returned7 = await this.prisma.trackEvent.findMany({
        where: { action: "page_view", userId: { in: ids }, createdAt: range },
        select: { userId: true },
        distinct: ["userId"],
      });
      metrics.d7Retention = Math.round((returned7.length / ids.length) * 10000) / 10000;
    }

    // bActiveCount（D-T3）：当日活跃用户 ∩ B 端身份（量级大后可改 join/exists 下推）
    const activeIds = dauRows.map((r) => r.userId).filter((v): v is string => v !== null);
    if (activeIds.length > 0) {
      const [st, mc, co, os, tc] = await Promise.all([
        this.prisma.station.findMany({ where: { userId: { in: activeIds }, status: "ACTIVE" }, select: { userId: true } }),
        this.prisma.merchant.findMany({ where: { userId: { in: activeIds }, status: "ACTIVE" }, select: { userId: true } }),
        this.prisma.circle.findMany({ where: { ownerId: { in: activeIds }, status: "ACTIVE", deletedAt: null }, select: { ownerId: true } }),
        this.prisma.stationOffline.findMany({ where: { ownerUserId: { in: activeIds }, status: "ACTIVE" }, select: { ownerUserId: true } }),
        this.prisma.teacherCertification.findMany({ where: { userId: { in: activeIds }, status: "APPROVED" }, select: { userId: true } }),
      ]);
      const bSet = new Set<string>([
        ...st.map((r) => r.userId),
        ...mc.map((r) => r.userId),
        ...co.map((r) => r.ownerId),
        ...os.map((r) => r.ownerUserId),
        ...tc.map((r) => r.userId),
      ]);
      metrics.bActiveCount = bSet.size;
    } else {
      metrics.bActiveCount = 0;
    }

    await this.prisma.dashboardDaily.upsert({
      where: { date },
      create: { date, metrics: metrics as unknown as Prisma.InputJsonValue },
      update: { metrics: metrics as unknown as Prisma.InputJsonValue },
    });
    return { date, metrics };
  }

  private addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00+08:00`);
    return this.dateStrShanghaiOf(new Date(d.getTime() + days * DAY_MS));
  }

  private dateStrShanghaiOf(d: Date): string {
    const sh = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }

  // ───────── 查询 ─────────

  /** 近 N 日聚合序列（升序·只打聚合表） */
  async getDaily(days = 30): Promise<Array<{ date: string; metrics: DailyMetrics }>> {
    const n = Math.min(Math.max(Number(days) || 30, 1), 90);
    const since = this.dateStrShanghai(-n);
    const rows = await this.prisma.dashboardDaily.findMany({
      where: { date: { gte: since } }, // YYYY-MM-DD 字典序即时间序
      orderBy: { date: "asc" },
      select: { date: true, metrics: true },
    });
    return rows.map((r) => ({ date: r.date, metrics: r.metrics as unknown as DailyMetrics }));
  }

  /** 今日实时轻查（直查不落表）：dau/pv/支付订单数 */
  async getToday(): Promise<{ date: string; dau: number; pv: number; ordersPaid: number }> {
    const date = this.dateStrShanghai(0);
    const range = this.dayRange(date);
    const [dauRows, pv, ordersPaid] = await Promise.all([
      this.prisma.trackEvent.findMany({
        where: { action: "page_view", userId: { not: null }, createdAt: range },
        select: { userId: true },
        distinct: ["userId"],
      }),
      this.prisma.trackEvent.count({ where: { action: "page_view", createdAt: range } }),
      this.prisma.order.count({ where: { paidAt: range, status: { notIn: ["PENDING", "CANCELLED"] } } }),
    ]);
    return { date, dau: dauRows.length, pv, ordersPaid };
  }
}
