import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PricingBizType } from "./pricing-reference.dto";

/**
 * ════════════════════════════════════════════════════════════════════
 * T3 供给侧定价顾问 Service（R2 合规红线 — 禁大数据杀熟）
 * ════════════════════════════════════════════════════════════════════
 *
 * 服务对象 = 定价者（讲师 Course.userId / 商家 Product.userId），非购买者。
 *
 * 【R2 合规铁律（代码级不可违反）】
 *  1. 聚合只按【商品类目维度】（categoryLevel1 / categoryLevel2）。
 *  2. 聚合 where 条件仅含：类目字段 + 上架状态 + 未删除 + 价格>0。
 *     绝对禁止出现任何 buyer / user / userId / wealth / segment /
 *     income / 消费能力 / 用户画像 维度的过滤。
 *  3. 结果对所有定价者一致（同一类目同一份参考），不因请求者身份变化。
 *  4. 透明可溯源（标注样本量）+ 免责声明常驻。
 *
 * 若后续有人在本文件的聚合 where 中加入任何用户维度字段 = 违规，必须拒绝合入。
 */

/** 价格分布（样本 ≥ 阈值时才有值，否则 null） */
export interface PriceDistribution {
  avg: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
}

export interface PriceBand {
  min: number;
  max: number;
}

export interface PricingReferenceResult {
  bizType: PricingBizType;
  category: { level1: string; level2?: string };
  sampleSize: number;
  distribution: PriceDistribution | null;
  qualityBand: PriceBand | null;
  salesBand: PriceBand | null;
  suggestion: { range: [number, number] | null; text: string };
  currentPriceHint: "OFFERED_HIGH" | "OFFERED_LOW" | "IN_RANGE" | null;
  disclaimer: string;
}

/** 与请求者无关、可缓存的聚合部分（不含 currentPriceHint） */
type CacheableAggregate = Omit<PricingReferenceResult, "currentPriceHint">;

/** 单条同类样本（仅价格 + 质量/销量信号，无任何用户维度） */
interface CategorySample {
  price: number;
  salesMetric: number; // 课程=studentCount / 商品=salesCount
  avgRating: number | null; // 该商品已发布评价的平均分，无评价则 null
}

const MIN_SAMPLE = 5; // 样本 < 5 不给具体分布/区间
const QUALITY_RATING_THRESHOLD = 4; // 高评分门槛
const SALES_TOP_QUANTILE = 0.7; // 高销量 = 销量 top30%（≥ 70 分位）
const CACHE_TTL = 3600; // 类目分布缓存 1h

const DISCLAIMER =
  "以上为同类市场参考，最终定价由你自主决定；平台不干预、不按用户差别定价";

@Injectable()
export class PricingReferenceService {
  private readonly logger = new Logger(PricingReferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 定价参考主入口。
   * 聚合部分按类目缓存 1h；currentPriceHint 依赖请求方拟定价格，每次实时计算（不缓存）。
   */
  async getReference(params: {
    bizType: PricingBizType;
    categoryLevel1: string;
    categoryLevel2?: string;
    currentPrice?: number;
  }): Promise<PricingReferenceResult> {
    const { bizType, categoryLevel1, categoryLevel2, currentPrice } = params;

    const cacheKey = `pricing:ref:${bizType}:${categoryLevel1}:${categoryLevel2 ?? ""}`;
    const aggregate = await this.redis.getOrSet<CacheableAggregate>(
      cacheKey,
      CACHE_TTL,
      () => this.computeAggregate(bizType, categoryLevel1, categoryLevel2),
    );

    return {
      ...aggregate,
      currentPriceHint: this.computeHint(currentPrice, aggregate.distribution),
    };
  }

  /**
   * 计算某类目的价格分布聚合（可缓存部分）。
   * 【R2】fetchSamples 的 where 只含类目 + 上架 + 未删 + 价格>0，无任何用户维度。
   */
  private async computeAggregate(
    bizType: PricingBizType,
    categoryLevel1: string,
    categoryLevel2?: string,
  ): Promise<CacheableAggregate> {
    const samples = await this.fetchSamples(bizType, categoryLevel1, categoryLevel2);
    const sampleSize = samples.length;
    const category = { level1: categoryLevel1, ...(categoryLevel2 ? { level2: categoryLevel2 } : {}) };

    // 样本不足：诚实降级，不给具体区间
    if (sampleSize < MIN_SAMPLE) {
      return {
        bizType,
        category,
        sampleSize,
        distribution: null,
        qualityBand: null,
        salesBand: null,
        suggestion: { range: null, text: "该类目样本较少，定价请谨慎参考" },
        disclaimer: DISCLAIMER,
      };
    }

    const prices = samples.map((s) => s.price).sort((a, b) => a - b);
    const distribution: PriceDistribution = {
      avg: round2(prices.reduce((sum, p) => sum + p, 0) / prices.length),
      median: round2(percentileCont(prices, 0.5)),
      min: round2(prices[0]),
      max: round2(prices[prices.length - 1]),
      p25: round2(percentileCont(prices, 0.25)),
      p75: round2(percentileCont(prices, 0.75)),
    };

    const qualityBand = this.computeQualityBand(samples);
    const salesBand = this.computeSalesBand(samples);

    return {
      bizType,
      category,
      sampleSize,
      distribution,
      qualityBand,
      salesBand,
      suggestion: {
        range: [distribution.p25, distribution.p75],
        text:
          `同类共 ${sampleSize} 件，均价 ¥${distribution.avg}，` +
          `多数定在 ¥${distribution.p25}–¥${distribution.p75}，建议参考此区间`,
      },
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * 拉取同类样本。
   *
   * 【R2 合规审查点】以下 where 条件是本功能唯一的过滤入口，
   * 逐字段列举：categoryLevel1 / categoryLevel2（类目维度）、
   * auditStatus|status（上架态）、deletedAt（软删）、price（>0）。
   * —— 不含也永不得含 userId/buyerId/income/segment 等任何用户维度。
   */
  private async fetchSamples(
    bizType: PricingBizType,
    categoryLevel1: string,
    categoryLevel2?: string,
  ): Promise<CategorySample[]> {
    if (bizType === PricingBizType.COURSE) {
      const courses = await this.prisma.course.findMany({
        where: {
          categoryLevel1,
          ...(categoryLevel2 ? { categoryLevel2 } : {}),
          auditStatus: "APPROVED", // 课程上架态
          deletedAt: null,
          price: { gt: 0 }, // 排除免费课，参考仅针对付费定价
        },
        select: {
          price: true,
          studentCount: true,
          reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
        },
      });
      return courses.map((c) => ({
        price: Number(c.price),
        salesMetric: c.studentCount,
        avgRating: avgOrNull(c.reviews.map((r) => r.rating)),
      }));
    }

    // PRODUCT：商品建品写的是 categoryId（非 categoryLevel1），故按 categoryId 聚合才有真实样本。
    // 前端商品编辑页传入的 categoryLevel1 参数值即 form.categoryId。仍是【类目维度】，R2 合规不变（无用户维度）。
    const products = await this.prisma.product.findMany({
      where: {
        categoryId: categoryLevel1,
        status: "ON_SALE", // 商品上架态
        deletedAt: null,
        price: { gt: 0 },
      },
      select: {
        price: true,
        salesCount: true,
        reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
      },
    });
    return products.map((p) => ({
      price: Number(p.price),
      salesMetric: p.salesCount,
      avgRating: avgOrNull(p.reviews.map((r) => r.rating)),
    }));
  }

  /** 高评分（平均分 ≥ 4）商品的价格带 */
  private computeQualityBand(samples: CategorySample[]): PriceBand | null {
    const prices = samples
      .filter((s) => s.avgRating !== null && s.avgRating >= QUALITY_RATING_THRESHOLD)
      .map((s) => s.price);
    if (prices.length === 0) return null;
    return { min: round2(Math.min(...prices)), max: round2(Math.max(...prices)) };
  }

  /** 高销量（销量 top30%）商品的价格带 */
  private computeSalesBand(samples: CategorySample[]): PriceBand | null {
    const metrics = samples.map((s) => s.salesMetric);
    // 全部销量为 0 时无区分度，不给销量带
    if (metrics.every((m) => m <= 0)) return null;
    const sortedMetrics = [...metrics].sort((a, b) => a - b);
    const threshold = percentileCont(sortedMetrics, SALES_TOP_QUANTILE);
    const prices = samples.filter((s) => s.salesMetric >= threshold).map((s) => s.price);
    if (prices.length === 0) return null;
    return { min: round2(Math.min(...prices)), max: round2(Math.max(...prices)) };
  }

  /** 当前拟定价相对 [p25,p75] 区间的位置提示 */
  private computeHint(
    currentPrice: number | undefined,
    distribution: PriceDistribution | null,
  ): PricingReferenceResult["currentPriceHint"] {
    if (currentPrice === undefined || currentPrice === null || Number.isNaN(currentPrice)) return null;
    if (!distribution) return null;
    if (currentPrice < distribution.p25) return "OFFERED_LOW";
    if (currentPrice > distribution.p75) return "OFFERED_HIGH";
    return "IN_RANGE";
  }
}

/** 保留两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 平均值，空数组返回 null */
function avgOrNull(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * 连续型分位数（等价 Postgres percentile_cont，线性插值）。
 * @param sorted 已升序排列的数组
 * @param q 分位 0~1
 */
function percentileCont(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  const frac = pos - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * frac;
}
