import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/**
 * 预警阈值（默认值）——导出供后台配置留口：
 * 后续可由 SystemService 配置项（如 merchant_alert_thresholds）覆盖，本批先用常量。
 */
export const MERCHANT_ALERT_THRESHOLDS = {
  /** 发货超时提醒（小时）：付款后超此时长未发货 → 站内信提醒商家 */
  shipRemindHours: 48,
  /** 发货超时升级（小时）：付款后超此时长未发货 → admin 风控台工单 */
  shipEscalateHours: 72,
  /** 7 日退款率上限：超过 → 工单 */
  refundRate7d: 0.15,
  /** 退款率环比倍数：本 7 日退款率 ≥ 前 7 日 × 该倍数 → 工单 */
  refundSurgeFactor: 2,
  /** 退款率预警最小订单样本量（近 7 日订单低于此数不判定，防小样本噪声） */
  refundMinOrders: 3,
  /** 差评聚集：24h 内 ≤badReviewMaxStar 星评价 ≥badReviewCount 条 → 工单 */
  badReviewCount: 3,
  badReviewMaxStar: 2,
  /** 同商家同类预警去重窗口（秒） */
  dedupTtlSeconds: 86_400,
} as const;

/** 预警类型（RiskAlert.type，admin 风控台按 type 筛选） */
export const MERCHANT_ALERT_TYPES = {
  SHIP_TIMEOUT: "MERCHANT_SHIP_TIMEOUT",
  SHIP_TIMEOUT_ESCALATE: "MERCHANT_SHIP_TIMEOUT_ESCALATE",
  REFUND_ANOMALY: "MERCHANT_REFUND_ANOMALY",
  BAD_REVIEW_CLUSTER: "MERCHANT_BAD_REVIEW_CLUSTER",
  COMPLAINT: "MERCHANT_COMPLAINT",
} as const;

interface AfterSaleGroupRow {
  merchantId: string;
  type: string;
  count: number;
}

interface RefundWindowRow {
  merchantId: string;
  cur: number;
  prev: number;
}

/**
 * 商家履约监控（履-P1）：日指标聚合 + 实时预警
 *
 * 日聚合（每日 01:00·redis.runExclusive 多实例互斥）：
 * - 对每个 ACTIVE 商家聚合昨日 → MerchantMetric 一行；@@unique(merchantId,date)+upsert ⇒ 幂等；
 * - 数据源：Order（订单数/发货时效=paidAt→shippedAt）、AfterSale（refund/return·经 orderId 关联 Order.merchantId）、
 *   ProductReview（经 Product.userId=Merchant.userId 关联）、Report（targetType=PRODUCT/USER 视为投诉）；
 * - qcPassRate 暂无数据源（抽检 QcRecord 表二期），诚实 null。
 *
 * 实时预警（每小时·四类阈值检测·同商家同类 24h redis 去重）：
 * - 工单落 RiskAlert 表（risk-control 模块无通用工单创建 service 方法，现有范式即直接写 RiskAlert 行，
 *   admin 风控台 /risk-control/alerts 列表即工单队列）；商家侧提醒走 Notification(type=SYSTEM targetType=MERCHANT_ALERT)。
 */
@Injectable()
export class MerchantMetricService {
  private readonly logger = new Logger(MerchantMetricService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notification: NotificationService,
  ) {}

  // ───────── 日期工具（Asia/Shanghai·与 DashboardDaily 同范式） ─────────

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

  private round(v: number, digits: number): number {
    const f = 10 ** digits;
    return Math.round(v * f) / f;
  }

  // ───────── 日聚合 cron ─────────

  /** 每日 01:00 聚合昨日（多实例互斥） */
  @Cron("0 1 * * *")
  async aggregateYesterdayCron(): Promise<void> {
    await this.redis.runExclusive("merchant-metric", 600, async () => {
      const date = this.dateStrShanghai(-1);
      try {
        const r = await this.aggregateDate(date);
        this.logger.log(`商家履约日聚合完成：${date}，商家 ${r.merchants} 家，落库 ${r.upserts} 行`);
      } catch (e) {
        this.logger.error(`商家履约日聚合失败：${date}`, e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 聚合指定日期（幂等·date upsert·可重复执行/手动回补） */
  async aggregateDate(date: string): Promise<{ date: string; merchants: number; upserts: number }> {
    const merchants = await this.prisma.merchant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true },
    });
    if (merchants.length === 0) return { date, merchants: 0, upserts: 0 };

    const merchantIds = merchants.map((m) => m.id);
    const userIds = merchants.map((m) => m.userId);
    const range = this.dayRange(date);

    const [orderGroups, shippedOrders, afterSaleRows, reviews, productReports, userReports] = await Promise.all([
      // 当日支付订单数（paidAt 当日·非 PENDING/CANCELLED）
      this.prisma.order.groupBy({
        by: ["merchantId"],
        where: { merchantId: { in: merchantIds }, paidAt: range, status: { notIn: ["PENDING", "CANCELLED"] } },
        _count: { _all: true },
      }),
      // 当日发货订单（发货时效 = paidAt→shippedAt 差）
      this.prisma.order.findMany({
        where: { merchantId: { in: merchantIds }, shippedAt: range, paidAt: { not: null } },
        select: { merchantId: true, paidAt: true, shippedAt: true },
      }),
      // 当日退款/退货申请（AfterSale 无 merchantId/关系字段，经 orderId 关联 Order 取商家）
      this.prisma.$queryRaw<AfterSaleGroupRow[]>`
        SELECT o."merchantId" AS "merchantId", a."type" AS "type", COUNT(*)::int AS "count"
        FROM "AfterSale" a
        JOIN "Order" o ON o."id" = a."orderId"
        WHERE a."createdAt" >= ${range.gte} AND a."createdAt" < ${range.lt}
          AND o."merchantId" IS NOT NULL
        GROUP BY o."merchantId", a."type"
      `,
      // 当日新增商品评价（Product.userId = Merchant.userId 即商家供货关联）
      this.prisma.productReview.findMany({
        where: { createdAt: range, status: "PUBLISHED", product: { userId: { in: userIds } } },
        select: { rating: true, product: { select: { userId: true } } },
      }),
      // 当日商品维度举报（视为投诉）
      this.prisma.report.findMany({
        where: { createdAt: range, targetType: "PRODUCT" },
        select: { targetId: true },
      }),
      // 当日商家本人（用户维度）举报
      this.prisma.report.findMany({
        where: { createdAt: range, targetType: "USER", targetId: { in: userIds } },
        select: { targetId: true },
      }),
    ]);

    // 商品举报 → 商家：查被举报商品的供应商 userId
    const reportedProductIds = [...new Set(productReports.map((r) => r.targetId))];
    const reportedProducts = reportedProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: reportedProductIds }, userId: { in: userIds } },
          select: { id: true, userId: true },
        })
      : [];
    const productOwner = new Map(reportedProducts.map((p) => [p.id, p.userId as string]));

    // 按商家归并
    const ordersCountBy = new Map<string, number>();
    for (const g of orderGroups) {
      if (g.merchantId) ordersCountBy.set(g.merchantId, g._count._all);
    }
    const shipHoursBy = new Map<string, number[]>();
    for (const o of shippedOrders) {
      if (!o.merchantId || !o.paidAt || !o.shippedAt) continue;
      const hours = (o.shippedAt.getTime() - o.paidAt.getTime()) / HOUR_MS;
      if (hours < 0) continue; // 脏数据防御：发货早于付款不计
      const arr = shipHoursBy.get(o.merchantId) ?? [];
      arr.push(hours);
      shipHoursBy.set(o.merchantId, arr);
    }
    const refundBy = new Map<string, number>();
    const returnBy = new Map<string, number>();
    for (const row of afterSaleRows) {
      if (row.type === "refund") refundBy.set(row.merchantId, Number(row.count));
      if (row.type === "return") returnBy.set(row.merchantId, Number(row.count));
    }
    const ratingsByUser = new Map<string, number[]>();
    for (const r of reviews) {
      const uid = r.product?.userId;
      if (!uid) continue;
      const arr = ratingsByUser.get(uid) ?? [];
      arr.push(r.rating);
      ratingsByUser.set(uid, arr);
    }
    const complaintByUser = new Map<string, number>();
    for (const r of productReports) {
      const uid = productOwner.get(r.targetId);
      if (uid) complaintByUser.set(uid, (complaintByUser.get(uid) ?? 0) + 1);
    }
    for (const r of userReports) {
      complaintByUser.set(r.targetId, (complaintByUser.get(r.targetId) ?? 0) + 1);
    }

    // 逐商家落指标（upsert 幂等）
    let upserts = 0;
    for (const m of merchants) {
      const ordersCount = ordersCountBy.get(m.id) ?? 0;
      const shipHours = shipHoursBy.get(m.id) ?? [];
      const refunds = refundBy.get(m.id) ?? 0;
      const returns = returnBy.get(m.id) ?? 0;
      const ratings = ratingsByUser.get(m.userId) ?? [];

      const onTimeLimit = MERCHANT_ALERT_THRESHOLDS.shipRemindHours;
      const metrics = {
        ordersCount,
        // 当日无发货则 null（诚实降级，不伪造 100%）
        shipOnTimeRate: shipHours.length
          ? this.round(shipHours.filter((h) => h <= onTimeLimit).length / shipHours.length, 4)
          : null,
        avgShipHours: shipHours.length
          ? this.round(shipHours.reduce((s, h) => s + h, 0) / shipHours.length, 2)
          : null,
        // 当日无订单则 null（率的分母不存在）
        refundRate: ordersCount > 0 ? this.round(refunds / ordersCount, 4) : null,
        returnRate: ordersCount > 0 ? this.round(returns / ordersCount, 4) : null,
        avgRating: ratings.length
          ? this.round(ratings.reduce((s, r) => s + r, 0) / ratings.length, 2)
          : null,
        complaintCount: complaintByUser.get(m.userId) ?? 0,
        qcPassRate: null, // 抽检 QcRecord 表尚未建（设计§2.3 二期），诚实 null
      };

      await this.prisma.merchantMetric.upsert({
        where: { merchantId_date: { merchantId: m.id, date } },
        create: { merchantId: m.id, date, ...metrics },
        update: metrics,
      });
      upserts += 1;
    }

    return { date, merchants: merchants.length, upserts };
  }

  // ───────── 实时预警 cron（每小时·四类阈值） ─────────

  /** 每小时整点扫描（多实例互斥·单项失败不影响其余检查） */
  @Cron("0 * * * *")
  async hourlyAlertCron(): Promise<void> {
    await this.redis.runExclusive("merchant-alert", 300, async () => {
      const now = new Date();
      const checks: Array<[string, (n: Date) => Promise<number>]> = [
        ["发货超时", (n) => this.checkShipTimeout(n)],
        ["退款率异常", (n) => this.checkRefundAnomaly(n)],
        ["差评聚集", (n) => this.checkBadReviewCluster(n)],
        ["投诉工单", (n) => this.checkComplaints(n)],
      ];
      for (const [name, fn] of checks) {
        try {
          const count = await fn(now);
          if (count > 0) this.logger.log(`商家预警[${name}]：新增 ${count} 条`);
        } catch (e) {
          this.logger.error(`商家预警[${name}]检查失败`, e instanceof Error ? e.stack : String(e));
        }
      }
    });
  }

  /** 同商家同类预警 24h 去重：抢到 redis NX 键才发（true=本窗口首次，可发） */
  private async dedup(type: string, merchantId: string): Promise<boolean> {
    return this.redis.setNX(`merchant-alert:${type}:${merchantId}`, "1", MERCHANT_ALERT_THRESHOLDS.dedupTtlSeconds);
  }

  /** 仅保留 ACTIVE 商家（预警只发给营业中商家） */
  private async activeMerchants(ids: string[]): Promise<Array<{ id: string; userId: string }>> {
    if (ids.length === 0) return [];
    return this.prisma.merchant.findMany({
      where: { id: { in: [...new Set(ids)] }, status: "ACTIVE" },
      select: { id: true, userId: true },
    });
  }

  private createAlert(type: string, level: string, title: string, merchantId: string, detail: Record<string, unknown>) {
    return this.prisma.riskAlert.create({
      data: {
        type,
        level,
        title,
        targetType: "MERCHANT",
        targetId: merchantId,
        detail: detail as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * 预警一：发货超时。
   * 付款后 >48h 未发货 → 站内信提醒商家；>72h → 升级 admin 风控台工单（DANGER）。
   * （96h 自动向买家致歉券属设计后置动作，不在本批范围。）
   */
  async checkShipTimeout(now: Date): Promise<number> {
    const t = MERCHANT_ALERT_THRESHOLDS;
    const remindBefore = new Date(now.getTime() - t.shipRemindHours * HOUR_MS);
    const overdue = await this.prisma.order.findMany({
      where: { merchantId: { not: null }, status: "PAID", shippedAt: null, paidAt: { lt: remindBefore } },
      select: { id: true, merchantId: true, paidAt: true },
    });
    if (overdue.length === 0) return 0;

    const byMerchant = new Map<string, Array<{ id: string; paidAt: Date }>>();
    for (const o of overdue) {
      if (!o.merchantId || !o.paidAt) continue;
      const arr = byMerchant.get(o.merchantId) ?? [];
      arr.push({ id: o.id, paidAt: o.paidAt });
      byMerchant.set(o.merchantId, arr);
    }

    const merchants = await this.activeMerchants([...byMerchant.keys()]);
    let created = 0;
    for (const m of merchants) {
      const orders = byMerchant.get(m.id) ?? [];
      if (orders.length === 0) continue;
      const hoursOf = (o: { paidAt: Date }) => (now.getTime() - o.paidAt.getTime()) / HOUR_MS;
      const escalated = orders.filter((o) => hoursOf(o) >= t.shipEscalateHours);

      // 72h 升级：admin 风控台工单
      if (escalated.length > 0 && (await this.dedup(MERCHANT_ALERT_TYPES.SHIP_TIMEOUT_ESCALATE, m.id))) {
        await this.createAlert(
          MERCHANT_ALERT_TYPES.SHIP_TIMEOUT_ESCALATE,
          "DANGER",
          `商家发货超时升级：${escalated.length} 单付款超 ${t.shipEscalateHours}h 未发货`,
          m.id,
          {
            merchantId: m.id,
            orderIds: escalated.map((o) => o.id).slice(0, 50),
            thresholdHours: t.shipEscalateHours,
            maxHours: this.round(Math.max(...orders.map(hoursOf)), 1),
          },
        );
        created += 1;
      }

      // 48h 提醒：站内信通知商家本人
      if (await this.dedup(MERCHANT_ALERT_TYPES.SHIP_TIMEOUT, m.id)) {
        await this.notification.send(m.userId, {
          type: "SYSTEM",
          title: "发货超时提醒",
          content: `您有 ${orders.length} 笔订单付款已超 ${t.shipRemindHours} 小时未发货，请尽快处理，超 ${t.shipEscalateHours} 小时将升级平台预警。`,
          targetType: "MERCHANT_ALERT",
          targetId: m.id,
        });
      }
    }
    return created;
  }

  /**
   * 预警二：退款率异常。
   * 近 7 日退款率 >15%，或环比（前 7 日）翻倍 → admin 风控台工单。
   */
  async checkRefundAnomaly(now: Date): Promise<number> {
    const t = MERCHANT_ALERT_THRESHOLDS;
    const curStart = new Date(now.getTime() - 7 * DAY_MS);
    const prevStart = new Date(now.getTime() - 14 * DAY_MS);

    const [ordersCur, ordersPrev, refundRows] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["merchantId"],
        where: { merchantId: { not: null }, paidAt: { gte: curStart, lt: now }, status: { notIn: ["PENDING", "CANCELLED"] } },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ["merchantId"],
        where: { merchantId: { not: null }, paidAt: { gte: prevStart, lt: curStart }, status: { notIn: ["PENDING", "CANCELLED"] } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<RefundWindowRow[]>`
        SELECT o."merchantId" AS "merchantId",
               COUNT(*) FILTER (WHERE a."createdAt" >= ${curStart})::int AS "cur",
               COUNT(*) FILTER (WHERE a."createdAt" < ${curStart})::int AS "prev"
        FROM "AfterSale" a
        JOIN "Order" o ON o."id" = a."orderId"
        WHERE a."type" = 'refund'
          AND a."createdAt" >= ${prevStart} AND a."createdAt" < ${now}
          AND o."merchantId" IS NOT NULL
        GROUP BY o."merchantId"
      `,
    ]);

    const curOrdersBy = new Map<string, number>();
    for (const g of ordersCur) if (g.merchantId) curOrdersBy.set(g.merchantId, g._count._all);
    const prevOrdersBy = new Map<string, number>();
    for (const g of ordersPrev) if (g.merchantId) prevOrdersBy.set(g.merchantId, g._count._all);

    const candidates: Array<{ merchantId: string; rate: number; prevRate: number | null; refunds: number; orders: number; reason: string }> = [];
    for (const row of refundRows) {
      const cur = Number(row.cur);
      if (cur <= 0) continue;
      const orders = curOrdersBy.get(row.merchantId) ?? 0;
      if (orders < t.refundMinOrders) continue; // 样本量不足不判定
      const rate = cur / orders;
      const prevOrders = prevOrdersBy.get(row.merchantId) ?? 0;
      const prevRate = prevOrders > 0 ? Number(row.prev) / prevOrders : null;
      const overThreshold = rate > t.refundRate7d;
      const surge = prevRate !== null && prevRate > 0 && rate >= prevRate * t.refundSurgeFactor;
      if (!overThreshold && !surge) continue;
      candidates.push({
        merchantId: row.merchantId,
        rate: this.round(rate, 4),
        prevRate: prevRate === null ? null : this.round(prevRate, 4),
        refunds: cur,
        orders,
        reason: overThreshold ? "OVER_THRESHOLD" : "SURGE",
      });
    }
    if (candidates.length === 0) return 0;

    const merchants = await this.activeMerchants(candidates.map((c) => c.merchantId));
    const activeIds = new Set(merchants.map((m) => m.id));
    let created = 0;
    for (const c of candidates) {
      if (!activeIds.has(c.merchantId)) continue;
      if (!(await this.dedup(MERCHANT_ALERT_TYPES.REFUND_ANOMALY, c.merchantId))) continue;
      await this.createAlert(
        MERCHANT_ALERT_TYPES.REFUND_ANOMALY,
        c.reason === "OVER_THRESHOLD" ? "DANGER" : "WARN",
        c.reason === "OVER_THRESHOLD"
          ? `商家 7 日退款率 ${(c.rate * 100).toFixed(1)}% 超阈值 ${(t.refundRate7d * 100).toFixed(0)}%`
          : `商家 7 日退款率环比翻倍（${c.prevRate === null ? "-" : (c.prevRate * 100).toFixed(1)}% → ${(c.rate * 100).toFixed(1)}%）`,
        c.merchantId,
        {
          merchantId: c.merchantId,
          refundRate7d: c.rate,
          prevRefundRate7d: c.prevRate,
          refunds7d: c.refunds,
          orders7d: c.orders,
          threshold: t.refundRate7d,
          reason: c.reason,
        },
      );
      created += 1;
    }
    return created;
  }

  /**
   * 预警三：差评聚集。24h 内 ≥3 条 ≤2 星商品评价 → admin 风控台工单。
   * （「商品临时降权」属处罚体系（设计§四·P3 批次），本批只落工单不动商品。）
   */
  async checkBadReviewCluster(now: Date): Promise<number> {
    const t = MERCHANT_ALERT_THRESHOLDS;
    const since = new Date(now.getTime() - 24 * HOUR_MS);
    const rows = await this.prisma.productReview.findMany({
      where: { createdAt: { gte: since }, rating: { lte: t.badReviewMaxStar }, status: "PUBLISHED" },
      select: { id: true, rating: true, product: { select: { userId: true } } },
    });
    if (rows.length === 0) return 0;

    const byUser = new Map<string, string[]>();
    for (const r of rows) {
      const uid = r.product?.userId;
      if (!uid) continue;
      const arr = byUser.get(uid) ?? [];
      arr.push(r.id);
      byUser.set(uid, arr);
    }
    const hitUserIds = [...byUser.entries()].filter(([, ids]) => ids.length >= t.badReviewCount).map(([uid]) => uid);
    if (hitUserIds.length === 0) return 0;

    const merchants = await this.prisma.merchant.findMany({
      where: { userId: { in: hitUserIds }, status: "ACTIVE" },
      select: { id: true, userId: true },
    });
    let created = 0;
    for (const m of merchants) {
      const reviewIds = byUser.get(m.userId) ?? [];
      if (!(await this.dedup(MERCHANT_ALERT_TYPES.BAD_REVIEW_CLUSTER, m.id))) continue;
      await this.createAlert(
        MERCHANT_ALERT_TYPES.BAD_REVIEW_CLUSTER,
        "WARN",
        `商家 24h 内差评聚集：${reviewIds.length} 条 ≤${t.badReviewMaxStar} 星评价`,
        m.id,
        { merchantId: m.id, reviewIds: reviewIds.slice(0, 50), count: reviewIds.length, windowHours: 24 },
      );
      created += 1;
    }
    return created;
  }

  /**
   * 预警四：投诉即工单（SLA：24h 首响）。
   * 扫描近 1h 针对商家商品/商家本人的举报 → admin 风控台工单；
   * 按契约同商家同类 24h 去重（同窗口多条投诉合并进一张工单的 detail.reportIds）。
   */
  async checkComplaints(now: Date): Promise<number> {
    const since = new Date(now.getTime() - HOUR_MS);
    const merchants = await this.prisma.merchant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true },
    });
    if (merchants.length === 0) return 0;
    const userIds = merchants.map((m) => m.userId);

    const [productReports, userReports] = await Promise.all([
      this.prisma.report.findMany({
        where: { createdAt: { gte: since }, targetType: "PRODUCT" },
        select: { id: true, targetId: true },
      }),
      this.prisma.report.findMany({
        where: { createdAt: { gte: since }, targetType: "USER", targetId: { in: userIds } },
        select: { id: true, targetId: true },
      }),
    ]);
    if (productReports.length === 0 && userReports.length === 0) return 0;

    const reportedProductIds = [...new Set(productReports.map((r) => r.targetId))];
    const products = reportedProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: reportedProductIds }, userId: { in: userIds } },
          select: { id: true, userId: true },
        })
      : [];
    const productOwner = new Map(products.map((p) => [p.id, p.userId as string]));

    const reportsByUser = new Map<string, string[]>();
    for (const r of productReports) {
      const uid = productOwner.get(r.targetId);
      if (!uid) continue;
      const arr = reportsByUser.get(uid) ?? [];
      arr.push(r.id);
      reportsByUser.set(uid, arr);
    }
    for (const r of userReports) {
      const arr = reportsByUser.get(r.targetId) ?? [];
      arr.push(r.id);
      reportsByUser.set(r.targetId, arr);
    }

    let created = 0;
    for (const m of merchants) {
      const reportIds = reportsByUser.get(m.userId);
      if (!reportIds || reportIds.length === 0) continue;
      if (!(await this.dedup(MERCHANT_ALERT_TYPES.COMPLAINT, m.id))) continue;
      await this.createAlert(
        MERCHANT_ALERT_TYPES.COMPLAINT,
        "WARN",
        `商家投诉工单：新增 ${reportIds.length} 条投诉（SLA：24h 首响）`,
        m.id,
        { merchantId: m.id, reportIds: reportIds.slice(0, 50), count: reportIds.length, slaHours: 24 },
      );
      created += 1;
    }
    return created;
  }

  // ───────── 商家侧查询 ─────────

  /** 商家本人近 N 日履约指标（GET /merchant/my/metrics?days=7） */
  async getMyMetrics(merchantId: string, days?: string | number) {
    const n = Math.min(Math.max(Math.trunc(Number(days) || 7), 1), 30);
    const since = this.dateStrShanghai(-n);
    const items = await this.prisma.merchantMetric.findMany({
      where: { merchantId, date: { gte: since } }, // YYYY-MM-DD 字典序即时间序
      orderBy: { date: "asc" },
      select: {
        date: true,
        ordersCount: true,
        shipOnTimeRate: true,
        avgShipHours: true,
        refundRate: true,
        returnRate: true,
        avgRating: true,
        complaintCount: true,
        qcPassRate: true,
      },
    });

    // 汇总口径：计数求和；退款/退货率按订单数加权（等价于 N 日总退款÷总订单）；
    // 发货时效/评分只存了日均值未存分母，按有值天数简单平均（概览用·精确看逐日），无值诚实 null。
    const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
    const ordersTotal = items.reduce((s, it) => s + it.ordersCount, 0);
    const weighted = (pick: (it: (typeof items)[number]) => number | null): number | null => {
      let sum = 0;
      let base = 0;
      for (const it of items) {
        const v = pick(it);
        if (v === null || it.ordersCount === 0) continue;
        sum += v * it.ordersCount;
        base += it.ordersCount;
      }
      return base > 0 ? this.round(sum / base, 4) : null;
    };
    const meanOf = (pick: (it: (typeof items)[number]) => number | null, digits: number): number | null => {
      const vals = items.map(pick).filter((v): v is number => v !== null);
      return vals.length ? this.round(vals.reduce((s, v) => s + v, 0) / vals.length, digits) : null;
    };

    return {
      days: n,
      items,
      summary: {
        ordersCount: ordersTotal,
        shipOnTimeRate: meanOf((it) => num(it.shipOnTimeRate), 4),
        avgShipHours: meanOf((it) => num(it.avgShipHours), 2),
        refundRate: weighted((it) => num(it.refundRate)),
        returnRate: weighted((it) => num(it.returnRate)),
        avgRating: meanOf((it) => num(it.avgRating), 2),
        complaintCount: items.reduce((s, it) => s + it.complaintCount, 0),
        qcPassRate: null, // 抽检数据源二期
      },
    };
  }
}
