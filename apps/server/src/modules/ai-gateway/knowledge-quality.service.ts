import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface QualityWeights {
  length: number;
  source: number;
  readability: number;
  citation: number;
}

const DEFAULT_WEIGHTS: QualityWeights = {
  length: 0.25,
  source: 0.30,
  readability: 0.25,
  citation: 0.20,
};

/** 来源权威度映射 */
const SOURCE_AUTHORITY: Record<string, number> = {
  classic: 1.0,
  course: 0.85,
  article: 0.75,
  post: 0.50,
  guest_post: 0.55,
  file: 0.60,
  free_text: 0.40,
};

/**
 * 知识质量自动评分服务（RAG Layer 2）
 *
 * 对知识库条目进行多维度质量评分：
 * - 长度分：内容过短或过长扣分，最佳区间 200-2000 字
 * - 来源分：经典 > 课程 > 文章 > 帖子 > 自由文本
 * - 可读性分：中文占比、段落结构、是否有标题
 * - 引用分：是否引经据典（包含书名号《》、引号等）
 */
@Injectable()
export class KnowledgeQualityService {
  private readonly logger = new Logger(KnowledgeQualityService.name);
  private readonly weights: QualityWeights;

  constructor(private readonly prisma: PrismaService) {
    this.weights = DEFAULT_WEIGHTS;
  }

  /** 对单条知识评分 */
  score(content: string, sourceType: string): number {
    const lengthScore = this.scoreLength(content);
    const sourceScore = this.scoreSource(sourceType);
    const readabilityScore = this.scoreReadability(content);
    const citationScore = this.scoreCitation(content);

    const total =
      lengthScore * this.weights.length +
      sourceScore * this.weights.source +
      readabilityScore * this.weights.readability +
      citationScore * this.weights.citation;

    return Math.round(total * 1000) / 1000;
  }

  /** 批量评分并写入数据库 */
  async scoreBatch(knowledgeIds: string[]): Promise<number> {
    if (knowledgeIds.length === 0) return 0;

    const records = await this.prisma.circleKnowledge.findMany({
      where: { id: { in: knowledgeIds } },
      select: { id: true, content: true, sourceType: true },
    });

    let updated = 0;
    for (const r of records) {
      const score = this.score(r.content, r.sourceType);
      try {
        await this.prisma.circleKnowledge.update({
          where: { id: r.id },
          data: { qualityScore: score },
        });
        updated++;
      } catch (err: any) {
        this.logger.warn(`评分写入失败 id=${r.id}: ${err.message}`);
      }
    }

    this.logger.log(`批量评分完成: ${updated}/${records.length} 条`);
    return updated;
  }

  /** 对新入库的未评分知识自动评分 */
  async scoreUnscored(batchSize = 50): Promise<number> {
    const unscored = await this.prisma.circleKnowledge.findMany({
      where: { qualityScore: null, status: "active" },
      select: { id: true },
      take: batchSize,
    });

    if (unscored.length === 0) return 0;

    return this.scoreBatch(unscored.map((r) => r.id));
  }

  /** 获取高质量知识（评分 >= threshold） */
  async getHighQuality(threshold = 0.6, limit = 20) {
    return this.prisma.circleKnowledge.findMany({
      where: {
        qualityScore: { gte: threshold },
        status: "active",
      },
      orderBy: { qualityScore: "desc" },
      take: limit,
    });
  }

  /** 质量统计 */
  async getStats() {
    const result = await this.prisma.circleKnowledge.aggregate({
      where: { status: "active", qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _count: true,
    });

    const bySource = await this.prisma.$queryRaw<
      Array<{ sourceType: string; avg: number; count: number }>
    >`
      SELECT "sourceType", ROUND(AVG("qualityScore")::numeric, 3) as avg, COUNT(*) as count
      FROM "CircleKnowledge"
      WHERE status = 'active' AND "qualityScore" IS NOT NULL
      GROUP BY "sourceType"
      ORDER BY avg DESC
    `;

    return {
      overallAvg: result._avg.qualityScore,
      totalScored: result._count,
      bySource: bySource.map((r) => ({
        sourceType: r.sourceType,
        avg: Number(r.avg),
        count: Number(r.count),
      })),
    };
  }

  // ─── 评分维度实现 ───

  /** 长度分：最佳 200-2000 字 */
  private scoreLength(content: string): number {
    const len = content.length;
    if (len < 50) return 0.3;
    if (len < 200) return 0.6;
    if (len <= 2000) return 1.0;
    if (len <= 5000) return 0.8;
    if (len <= 10000) return 0.5;
    return 0.3;
  }

  /** 来源权威分 */
  private scoreSource(sourceType: string): number {
    return SOURCE_AUTHORITY[sourceType] ?? 0.4;
  }

  /** 可读性分：中文占比 + 段落结构 */
  private scoreReadability(content: string): number {
    let score = 0;

    // 中文占比
    const chineseChars = (content.match(/[一-鿿㐀-䶿]/g) || []).length;
    const totalChars = content.replace(/\s/g, "").length;
    if (totalChars > 0) {
      const chineseRatio = chineseChars / totalChars;
      score += chineseRatio >= 0.8 ? 0.6 : chineseRatio >= 0.5 ? 0.4 : 0.2;
    }

    // 段落结构
    const paragraphs = content.split(/\n{2,}/).length;
    if (paragraphs >= 3) score += 0.2;
    if (paragraphs >= 5) score += 0.2;

    return Math.min(score, 1.0);
  }

  /** 引用分：是否包含书名号、引号等传统引用标记 */
  private scoreCitation(content: string): number {
    let score = 0;

    // 书名号《》
    const bookRefs = (content.match(/《[^》]+》/g) || []).length;
    if (bookRefs >= 3) score += 0.5;
    else if (bookRefs >= 1) score += 0.3;

    // 引经据典标记
    const classicalMarkers = (content.match(/[""]|[“”]|曰|云|谓/g) || []).length;
    if (classicalMarkers >= 5) score += 0.3;
    else if (classicalMarkers >= 2) score += 0.2;

    // 原文引用
    if (/原文|出处|引自|出自|参见/.test(content)) score += 0.2;

    return Math.min(score, 1.0);
  }
}
