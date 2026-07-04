import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const DAY_MS = 86_400_000;

/**
 * 信用分因子权重（设计§三·总分 100）——导出供后台配置留口：
 * 后续可由 SystemService 配置项（如 merchant_credit_weights）覆盖，本批先用常量。
 */
export const MERCHANT_CREDIT_WEIGHTS = {
  /** 发货时效（按时发货率 ≤48h） */
  ship: 25,
  /** 退款退货（退款率+退货率合并·按订单数加权） */
  refundReturn: 20,
  /** 评价均分（1 星→0 分线性映射至 5 星→满分） */
  rating: 20,
  /** 投诉率（投诉数 ÷ 订单数·≥10% 归零） */
  complaint: 15,
  /** 抽检合格率（QcRecord 数据源二期·当前恒缺数据） */
  qc: 10,
  /** 经营时长/稳定（开店满 12 个月满分·线性） */
  tenure: 10,
} as const;

/**
 * 缺数据中性系数：某因子在 30 日窗口内无数据源（如无订单/无评价）时按「权重×0.6」记中性分，
 * 不奖励（满分会让无经营数据的商家凭空拿 A 级严选标）也不惩罚（0 分会把新商家打成 D 级高危）。
 * 全因子缺数据的全新商家 = 15+12+12+9+10(抽检满分中性·见下)+2(经营时长下限) = 60，
 * 恰对齐设计「新商家 60 分起评」。
 * 例外（按契约拍板）：抽检 qc 因子当前全平台无数据源（QcRecord 表二期），按【满分中性】处理——
 * 若也记 0.6 会无差别压低全体商家上限（最高只能 96 分），属系统缺数据而非商家缺经营。
 */
export const CREDIT_NEUTRAL_RATIO = 0.6;

/** 算分窗口：近 30 日 MerchantMetric */
export const CREDIT_WINDOW_DAYS = 30;

/** 新商家观察期（天）：观察期内正常算分，但不参与流量加权（设计§三） */
export const CREDIT_OBSERVATION_DAYS = 30;

export type CreditGrade = "A" | "B" | "C" | "D";

/**
 * 等级权益映射（设计§三表格）——导出供结算/抽检/商品域取用；后台可配留口（后续可由
 * SystemService 配置项 merchant_grade_benefits 覆盖，本批先用常量）。
 * - settlementCycleDays：结算周期 T+N（结算单周期结束日须早于 now-N 天，A 级 T+3 提速）
 * - qcFrequency：抽检频率（QcRecord 二期接线·当前仅作展示口径）
 * - trafficBoost：推荐/排序流量加权（A 级·观察期新商家不参与）
 * - selectedBadge：严选标（A 级·商品卡/详情返回 isSelected）
 */
export const MERCHANT_GRADE_BENEFITS: Record<CreditGrade, {
  label: string;
  settlementCycleDays: number;
  qcFrequency: string;
  trafficBoost: boolean;
  selectedBadge: boolean;
}> = {
  A: { label: "严选", settlementCycleDays: 3, qcFrequency: "季度 1 次", trafficBoost: true, selectedBadge: true },
  B: { label: "良好", settlementCycleDays: 7, qcFrequency: "双月 1 次", trafficBoost: false, selectedBadge: false },
  C: { label: "观察", settlementCycleDays: 7, qcFrequency: "每月 1 次", trafficBoost: false, selectedBadge: false },
  D: { label: "高危", settlementCycleDays: 14, qcFrequency: "每月 1 次", trafficBoost: false, selectedBadge: false },
};

/** 分数 → 等级（设计§三：A≥85 / B70-84 / C55-69 / D<55） */
export function creditGradeOf(score: number): CreditGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

/** 单因子明细（factors JSON 内条目·透明可复算） */
interface FactorDetail {
  weight: number;
  /** 因子原始值（率/均分/月数），缺数据为 null */
  value: number | null;
  score: number;
  /** 是否走了缺数据中性处理 */
  neutral: boolean;
  note?: string;
}

export interface CreditFactors {
  windowDays: number;
  /** 本次评估所属周的周一（Asia/Shanghai·YYYY-MM-DD），周更幂等键 */
  weekKey: string;
  /** 是否观察期新商家（<30 天·正常算分但不参与流量加权） */
  observation: boolean;
  factors: {
    ship: FactorDetail;
    refundReturn: FactorDetail;
    rating: FactorDetail;
    complaint: FactorDetail;
    qc: FactorDetail;
    tenure: FactorDetail;
  };
}

interface MetricRow {
  ordersCount: number;
  shipOnTimeRate: Prisma.Decimal | number | null;
  refundRate: Prisma.Decimal | number | null;
  returnRate: Prisma.Decimal | number | null;
  avgRating: Prisma.Decimal | number | null;
  complaintCount: number;
}

/**
 * 商家信用评级（履-P2）：信用分周更 cron + 等级权益 + 商家侧信用明细
 *
 * 周更（每周一 02:00·redis.runExclusive 多实例互斥）：
 * - 对每个 ACTIVE 商家取近 30 日 MerchantMetric 聚合 → 六因子加权算分（0-100）→
 *   写 Merchant.creditScore/creditGrade + MerchantCreditLog(factors 因子明细·商家后台可见·透明是公平的前提)；
 * - 幂等：log 以「周一日期」为周键，同周重跑只重算/覆写分数（结果一致），不重复写 log；
 * - 新商家（开店 <30 天）观察期：正常算分正常定级，仅不参与流量加权（observation 标记随 factors 落库）。
 *
 * 权益挂钩：
 * - 严选标：shop.service 商品卡/详情按商家 creditGrade==="A" 附 isSelected（直查 Merchant 列，无服务依赖）；
 * - 结算周期：merchant-settlement.generateSettlement 读 MERCHANT_GRADE_BENEFITS[grade].settlementCycleDays；
 * - 流量加权：TODO（诚实注释见 shop.service.listProducts·推荐排序接线属独立课题）。
 */
@Injectable()
export class MerchantCreditService {
  private readonly logger = new Logger(MerchantCreditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 日期工具（Asia/Shanghai·与 MerchantMetricService 同范式） ─────────

  private shanghaiDateParts(at: Date): { y: number; m: number; d: number; weekday: number } {
    const sh = new Date(at.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    return { y: sh.getFullYear(), m: sh.getMonth() + 1, d: sh.getDate(), weekday: sh.getDay() };
  }

  /** at 所在日期（Asia/Shanghai）往前 offsetDays 天的 YYYY-MM-DD */
  dateStrShanghai(offsetDays = 0, at: Date = new Date()): string {
    const { y, m, d } = this.shanghaiDateParts(new Date(at.getTime() + offsetDays * DAY_MS));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  /** at 所在周的周一（Asia/Shanghai）YYYY-MM-DD —— 周更幂等键 */
  weekKeyOf(at: Date = new Date()): string {
    const { weekday } = this.shanghaiDateParts(at);
    const offset = (weekday + 6) % 7; // 周一=0 … 周日=6
    return this.dateStrShanghai(-offset, at);
  }

  /** 本周一 00:00（Asia/Shanghai）的 UTC 时刻 —— 查「本周是否已写过 log」 */
  weekStartOf(at: Date = new Date()): Date {
    return new Date(`${this.weekKeyOf(at)}T00:00:00+08:00`);
  }

  private round(v: number, digits: number): number {
    const f = 10 ** digits;
    return Math.round(v * f) / f;
  }

  private clamp01(v: number): number {
    return Math.min(Math.max(v, 0), 1);
  }

  // ───────── 算分（纯计算·spec 可复算） ─────────

  /**
   * 六因子加权算分（0-100）。输入近 30 日 MerchantMetric 行 + 商家开店时间。
   * 口径与 getMyMetrics 汇总一致：率类按订单数加权，均分类按有值天数简单平均。
   */
  computeScore(
    rows: MetricRow[],
    merchant: { openedAt: Date | null; createdAt: Date },
    now: Date = new Date(),
  ): { score: number; grade: CreditGrade; factors: CreditFactors } {
    const W = MERCHANT_CREDIT_WEIGHTS;
    const num = (v: Prisma.Decimal | number | null): number | null => (v === null || v === undefined ? null : Number(v));

    const totalOrders = rows.reduce((s, r) => s + r.ordersCount, 0);
    const totalComplaints = rows.reduce((s, r) => s + r.complaintCount, 0);

    // 因子一：发货时效 25 —— 有发货天的按时发货率简单平均；30 日无发货 → 中性
    const shipVals = rows.map((r) => num(r.shipOnTimeRate)).filter((v): v is number => v !== null);
    const shipRate = shipVals.length ? shipVals.reduce((s, v) => s + v, 0) / shipVals.length : null;
    const ship: FactorDetail = shipRate === null
      ? { weight: W.ship, value: null, score: this.round(W.ship * CREDIT_NEUTRAL_RATIO, 2), neutral: true, note: "30 日无发货数据·中性" }
      : { weight: W.ship, value: this.round(shipRate, 4), score: this.round(W.ship * this.clamp01(shipRate), 2), neutral: false };

    // 因子二：退款退货 20 —— (退款率+退货率) 按订单数加权，30% 及以上归零；30 日无订单 → 中性
    let rrSum = 0;
    let rrBase = 0;
    for (const r of rows) {
      const refund = num(r.refundRate);
      const ret = num(r.returnRate);
      if (r.ordersCount === 0 || (refund === null && ret === null)) continue;
      rrSum += ((refund ?? 0) + (ret ?? 0)) * r.ordersCount;
      rrBase += r.ordersCount;
    }
    const rrRate = rrBase > 0 ? rrSum / rrBase : null;
    const refundReturn: FactorDetail = rrRate === null
      ? { weight: W.refundReturn, value: null, score: this.round(W.refundReturn * CREDIT_NEUTRAL_RATIO, 2), neutral: true, note: "30 日无订单数据·中性" }
      : { weight: W.refundReturn, value: this.round(rrRate, 4), score: this.round(W.refundReturn * this.clamp01(1 - rrRate / 0.3), 2), neutral: false };

    // 因子三：评价均分 20 —— 有评价天简单平均，1 星→0 / 5 星→满分线性；30 日无评价 → 中性
    const ratingVals = rows.map((r) => num(r.avgRating)).filter((v): v is number => v !== null);
    const avgRating = ratingVals.length ? ratingVals.reduce((s, v) => s + v, 0) / ratingVals.length : null;
    const rating: FactorDetail = avgRating === null
      ? { weight: W.rating, value: null, score: this.round(W.rating * CREDIT_NEUTRAL_RATIO, 2), neutral: true, note: "30 日无评价数据·中性" }
      : { weight: W.rating, value: this.round(avgRating, 2), score: this.round(W.rating * this.clamp01((avgRating - 1) / 4), 2), neutral: false };

    // 因子四：投诉率 15 —— 投诉数÷订单数，10% 及以上归零；30 日无订单（率无分母）→ 中性
    const complaintRate = totalOrders > 0 ? totalComplaints / totalOrders : null;
    const complaint: FactorDetail = complaintRate === null
      ? { weight: W.complaint, value: null, score: this.round(W.complaint * CREDIT_NEUTRAL_RATIO, 2), neutral: true, note: "30 日无订单样本·中性" }
      : { weight: W.complaint, value: this.round(complaintRate, 4), score: this.round(W.complaint * this.clamp01(1 - complaintRate / 0.1), 2), neutral: false };

    // 因子五：抽检 10 —— QcRecord 数据源二期·全平台恒缺数据，按契约【满分中性】处理（诚实注释：
    // 这是系统缺数据源而非商家缺经营，若按 0.6 中性会无差别封死全体商家的分数上限）
    const qc: FactorDetail = { weight: W.qc, value: null, score: W.qc, neutral: true, note: "抽检 QcRecord 数据源二期·满分中性" };

    // 因子六：经营时长 10 —— 开店（无 openedAt 回退 createdAt）满 12 个月满分，下限 0.2（对齐 60 分起评）
    const openedAt = merchant.openedAt ?? merchant.createdAt;
    const months = Math.max(0, (now.getTime() - openedAt.getTime()) / (30 * DAY_MS));
    const tenure: FactorDetail = {
      weight: W.tenure,
      value: this.round(months, 1),
      score: this.round(W.tenure * Math.min(Math.max(months / 12, 0.2), 1), 2),
      neutral: false,
    };

    const score = Math.round(ship.score + refundReturn.score + rating.score + complaint.score + qc.score + tenure.score);
    const bounded = Math.min(Math.max(score, 0), 100);
    const observation = now.getTime() - openedAt.getTime() < CREDIT_OBSERVATION_DAYS * DAY_MS;

    return {
      score: bounded,
      grade: creditGradeOf(bounded),
      factors: {
        windowDays: CREDIT_WINDOW_DAYS,
        weekKey: this.weekKeyOf(now),
        observation,
        factors: { ship, refundReturn, rating, complaint, qc, tenure },
      },
    };
  }

  // ───────── 周更 cron ─────────

  /** 每周一 02:00 全量重算（多实例互斥） */
  @Cron("0 2 * * 1")
  async weeklyCreditCron(): Promise<void> {
    await this.redis.runExclusive("merchant-credit", 600, async () => {
      try {
        const r = await this.recalcAll();
        this.logger.log(`商家信用周更完成：周键 ${r.weekKey}，商家 ${r.merchants} 家，更新 ${r.updated}，写 log ${r.logs}（同周已写过的跳过）`);
      } catch (e) {
        this.logger.error("商家信用周更失败", e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /**
   * 全量重算（幂等·可手动补跑）：
   * - Merchant.creditScore/creditGrade 直接覆写（同输入同输出，重跑无副作用）；
   * - MerchantCreditLog 以周为幂等窗口：本周（周一 00:00 起）已有 log 的商家不再重复写。
   */
  async recalcAll(now: Date = new Date()): Promise<{ weekKey: string; merchants: number; updated: number; logs: number }> {
    const weekKey = this.weekKeyOf(now);
    const merchants = await this.prisma.merchant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, creditScore: true, openedAt: true, createdAt: true },
    });
    if (merchants.length === 0) return { weekKey, merchants: 0, updated: 0, logs: 0 };

    const ids = merchants.map((m) => m.id);
    const since = this.dateStrShanghai(-CREDIT_WINDOW_DAYS, now);

    const [metricRows, weekLogs] = await Promise.all([
      this.prisma.merchantMetric.findMany({
        where: { merchantId: { in: ids }, date: { gte: since } }, // YYYY-MM-DD 字典序即时间序
        select: {
          merchantId: true, ordersCount: true, shipOnTimeRate: true,
          refundRate: true, returnRate: true, avgRating: true, complaintCount: true,
        },
      }),
      // 本周已写过 log 的商家集合（周更幂等：同周重跑不重复 log）
      this.prisma.merchantCreditLog.findMany({
        where: { merchantId: { in: ids }, createdAt: { gte: this.weekStartOf(now) } },
        select: { merchantId: true },
      }),
    ]);

    const rowsBy = new Map<string, MetricRow[]>();
    for (const row of metricRows) {
      const arr = rowsBy.get(row.merchantId) ?? [];
      arr.push(row);
      rowsBy.set(row.merchantId, arr);
    }
    const loggedThisWeek = new Set(weekLogs.map((l) => l.merchantId));

    let updated = 0;
    let logs = 0;
    for (const m of merchants) {
      const { score, grade, factors } = this.computeScore(rowsBy.get(m.id) ?? [], m, now);
      await this.prisma.merchant.update({
        where: { id: m.id },
        data: { creditScore: score, creditGrade: grade },
      });
      updated += 1;
      if (!loggedThisWeek.has(m.id)) {
        await this.prisma.merchantCreditLog.create({
          data: {
            merchantId: m.id,
            oldScore: m.creditScore,
            newScore: score,
            factors: factors as unknown as Prisma.InputJsonValue,
          },
        });
        logs += 1;
      }
    }
    return { weekKey, merchants: merchants.length, updated, logs };
  }

  // ───────── 商家侧查询 ─────────

  /** 商家本人信用明细（GET /merchant/my/credit）：分数/等级/权益/观察期 + 近 12 条变动 log（factors 明细） */
  async getMyCredit(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, creditScore: true, creditGrade: true, openedAt: true, createdAt: true },
    });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const grade = (merchant.creditGrade as CreditGrade) in MERCHANT_GRADE_BENEFITS
      ? (merchant.creditGrade as CreditGrade)
      : "B";
    const openedAt = merchant.openedAt ?? merchant.createdAt;
    const observation = Date.now() - openedAt.getTime() < CREDIT_OBSERVATION_DAYS * DAY_MS;

    const logs = await this.prisma.merchantCreditLog.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, oldScore: true, newScore: true, factors: true, createdAt: true },
    });

    return {
      creditScore: merchant.creditScore,
      creditGrade: grade,
      observation,
      benefits: MERCHANT_GRADE_BENEFITS[grade],
      logs,
    };
  }
}
