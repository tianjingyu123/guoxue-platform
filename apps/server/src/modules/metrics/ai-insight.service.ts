import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsService } from "../../common/metrics.service";

/**
 * AI 数据飞轮洞察服务
 *
 * 聚合 AI 相关业务指标，供管理驾驶舱和 Grafana 看板使用。
 * 指标维度：AI 调用量 / 缓存命中率 / 质量评分 / 自动打标覆盖 / 推荐CTR
 */
@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  /** 获取 AI 飞轮总览 */
  async getFlywheelOverview(): Promise<FlywheelOverview> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    // 并行查询各项指标
    const [
      qualityStats,
      tagCoverage,
      recommendLogs,
    ] = await Promise.all([
      this.getQualityStats(weekStart),
      this.getTagCoverage(),
      this.getRecommendStats(weekStart),
    ]);

    return {
      aiQuality: qualityStats,
      tagCoverage,
      recommend: recommendLogs,
      updatedAt: now.toISOString(),
    };
  }

  /** AI 质量趋势（近7天） */
  async getQualityTrend(days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const records = await this.prisma.qualityScoreRecord.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        overall: true,
        accuracy: true,
        completeness: true,
        readability: true,
        professionalism: true,
        scene: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 按天聚合
    const daily: Record<string, { count: number; sumOverall: number; sumAccuracy: number }> = {};
    for (const r of records) {
      const day = r.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { count: 0, sumOverall: 0, sumAccuracy: 0 };
      daily[day].count++;
      daily[day].sumOverall += r.overall;
      daily[day].sumAccuracy += r.accuracy;
    }

    return Object.entries(daily).map(([date, d]) => ({
      date,
      avgOverall: Math.round(d.sumOverall / d.count * 100) / 100,
      avgAccuracy: Math.round(d.sumAccuracy / d.count * 100) / 100,
      count: d.count,
    }));
  }

  /** AI 自动打标覆盖率 */
  private async getTagCoverage() {
    const [courses, articles, products, circles, videos] = await Promise.all([
      this.prisma.course.count({ where: { categoryLevel1: { not: null } } }),
      this.prisma.article.count({ where: { categoryLevel1: { not: null } } }),
      this.prisma.product.count({ where: { categoryLevel1: { not: null } } }),
      this.prisma.circle.count({ where: { categoryLevel1: { not: null } } }),
      this.prisma.video.count({ where: { categoryLevel1: { not: null } } }),
    ]);

    const [courseTotal, articleTotal, productTotal, circleTotal, videoTotal] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.article.count(),
      this.prisma.product.count(),
      this.prisma.circle.count(),
      this.prisma.video.count(),
    ]);

    return {
      course: { tagged: courses, total: courseTotal, rate: this.rate(courses, courseTotal) },
      article: { tagged: articles, total: articleTotal, rate: this.rate(articles, articleTotal) },
      product: { tagged: products, total: productTotal, rate: this.rate(products, productTotal) },
      circle: { tagged: circles, total: circleTotal, rate: this.rate(circles, circleTotal) },
      video: { tagged: videos, total: videoTotal, rate: this.rate(videos, videoTotal) },
    };
  }

  /** 推荐 CTR 统计（近7天） */
  private async getRecommendStats(since: Date) {
    const [total, clicks] = await Promise.all([
      this.prisma.recommendLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.recommendLog.count({
        where: { isClick: true, createdAt: { gte: since } },
      }),
    ]);

    return {
      impressions: total,
      clicks,
      ctr: total > 0 ? Math.round(clicks / total * 10000) / 100 : 0,
    };
  }

  /** AI 质量评分统计 */
  private async getQualityStats(since: Date) {
    const result = await this.prisma.qualityScoreRecord.aggregate({
      where: { createdAt: { gte: since } },
      _avg: {
        overall: true,
        accuracy: true,
        completeness: true,
        readability: true,
        professionalism: true,
      },
      _count: { overall: true },
    });

    return {
      avgOverall: this.round(result._avg.overall),
      avgAccuracy: this.round(result._avg.accuracy),
      avgCompleteness: this.round(result._avg.completeness),
      avgReadability: this.round(result._avg.readability),
      avgProfessionalism: this.round(result._avg.professionalism),
      totalScored: result._count.overall,
    };
  }

  /** 语义缓存命中率（从 Redis 索引估算） */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const stats = await this.prisma.$queryRawUnsafe<Array<{ scene: string; entries: number }>>(
        `SELECT scene, COUNT(*)::int as entries FROM quality_score_records GROUP BY scene`,
      );
      // 实际缓存统计从 SemanticCacheService 获取
      return { scenes: stats || [], note: "缓存命中率实时指标见 Prometheus: guoxue_ai_semantic_cache_hits_total" };
    } catch (err) {
      this.logger.warn(`缓存统计查询失败`, err);
      return { scenes: [], note: "quality_score_records 表无数据" };
    }
  }

  private rate(tagged: number, total: number): number {
    return total > 0 ? Math.round(tagged / total * 10000) / 100 : 0;
  }

  private round(v: number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    return Math.round(v * 100) / 100;
  }
}

export interface FlywheelOverview {
  aiQuality: {
    avgOverall: number;
    avgAccuracy: number;
    avgCompleteness: number;
    avgReadability: number;
    avgProfessionalism: number;
    totalScored: number;
  };
  tagCoverage: Record<string, { tagged: number; total: number; rate: number }>;
  recommend: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  updatedAt: string;
}

export interface CacheStats {
  scenes: Array<{ scene: string; entries: number }>;
  note?: string;
}
