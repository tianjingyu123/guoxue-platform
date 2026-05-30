import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { QualityScoreRecord } from "@prisma/client";
import { AiGatewayService } from "./ai-gateway.service";

/** 四维评分结果 */
export interface QualityScore {
  accuracy: number;       // 准确性：事实正确、引用可靠
  completeness: number;   // 完整性：覆盖面全、无明显遗漏
  readability: number;    // 可读性：语言流畅、结构清晰
  professionalism: number; // 专业性：术语准确、深度合适
  overall: number;        // 综合分：加权平均
  feedback: string;       // 改进建议
  scoredAt: string;
}

/** 评分请求 */
export interface ScoreRequest {
  content: string;
  context?: string;       // 上下文（如用户问题、领域等）
  scene?: string;         // 场景
  referenceAnswer?: string; // 参考答案（可选，用于对比评分）
}

/**
 * AI 质量评分体系 V1
 *
 * 使用 LLM 对 AI 生成内容进行四维自动评分：
 * - 准确性 (40%)：事实是否正确，引用是否可靠
 * - 完整性 (20%)：是否覆盖问题要点，有无明显遗漏
 * - 可读性 (20%)：语言是否流畅，结构是否清晰
 * - 专业性 (20%)：术语使用是否准确，深度是否合适
 */
@Injectable()
export class QualityScorerService {
  private readonly logger = new Logger(QualityScorerService.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  /** 对内容进行四维评分 */
  async score(req: ScoreRequest): Promise<QualityScore> {
    const prompt = this.buildScoringPrompt(req);
    const contextInfo = req.context ? `\n上下文：${req.context}` : "";
    const referenceInfo = req.referenceAnswer
      ? `\n参考答案（用于对比）：${req.referenceAnswer}`
      : "";

    try {
      const resp = await this.gateway.chat({
        scene: "quality_scorer",
        messages: [{
          role: "user",
          content: `${prompt}\n${contextInfo}${referenceInfo}\n\n待评分内容：\n${req.content}`,
        }],
        options: { temperature: 0.3, maxTokens: 500 },
      });

      const score = this.parseScore(resp.content);
      // 异步持久化
      this.persistScore(req, score, resp.model).catch((err) => this.logger.warn("评分持久化失败", err));
      return score;
    } catch (err: any) {
      this.logger.error(`质量评分失败: ${err.message}`);
      return {
        accuracy: 0, completeness: 0, readability: 0, professionalism: 0,
        overall: 0, feedback: "评分服务暂时不可用", scoredAt: new Date().toISOString(),
      };
    }
  }

  /** 批量评分 */
  async scoreBatch(items: ScoreRequest[]): Promise<QualityScore[]> {
    // 并发评分，最多同时3个
    const results: QualityScore[] = [];
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3);
      const batchResults = await Promise.allSettled(batch.map((item) => this.score(item)));
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            accuracy: 0, completeness: 0, readability: 0, professionalism: 0,
            overall: 0, feedback: `评分异常: ${result.reason}`, scoredAt: new Date().toISOString(),
          });
        }
      }
    }
    return results;
  }

  /** 查询评分历史 */
  async getScores(params: {
    scene?: string;
    minOverall?: number;
    skip?: number;
    take?: number;
  }): Promise<{ items: QualityScoreRecord[]; total: number }> {
    const where: any = {};
    if (params.scene) where.scene = params.scene;
    if (params.minOverall !== undefined) where.overall = { gte: params.minOverall };
    const [items, total] = await Promise.all([
      this.prisma.qualityScoreRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip || 0,
        take: params.take || 20,
      }),
      this.prisma.qualityScoreRecord.count({ where }),
    ]);
    return { items, total };
  }

  /** 评分统计 */
  async getStats(scene?: string): Promise<{
    avgOverall: number;
    avgAccuracy: number;
    avgCompleteness: number;
    avgReadability: number;
    avgProfessionalism: number;
    total: number;
  }> {
    const where = scene ? { scene } : {};
    const result = await this.prisma.qualityScoreRecord.aggregate({
      where,
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
      total: result._count.overall,
    };
  }

  /** 持久化评分结果 */
  private async persistScore(req: ScoreRequest, score: QualityScore, model?: string): Promise<void> {
    await this.prisma.qualityScoreRecord.create({
      data: {
        contentSnippet: req.content.slice(0, 2000),
        scene: req.scene || null,
        context: req.context || null,
        accuracy: score.accuracy,
        completeness: score.completeness,
        readability: score.readability,
        professionalism: score.professionalism,
        overall: score.overall,
        feedback: score.feedback,
        model: model || null,
      },
    });
  }

  private round(v: number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    return Math.round(v * 100) / 100;
  }

  /** 构建评分提示词 */
  private buildScoringPrompt(_req: ScoreRequest): string {
    return `你是一个内容质量评审专家，请对以下AI生成内容进行四维评分。

评分标准（每项0-100分）：
1. 准确性(accuracy)：事实是否正确，引用是否可靠
2. 完整性(completeness)：是否覆盖问题要点，有无明显遗漏
3. 可读性(readability)：语言是否流畅，结构是否清晰
4. 专业性(professionalism)：术语使用是否准确，深度是否合适

综合分 = 准确性*0.4 + 完整性*0.2 + 可读性*0.2 + 专业性*0.2

请以JSON格式返回评分结果：
{
  "accuracy": 85,
  "completeness": 80,
  "readability": 90,
  "professionalism": 75,
  "overall": 83,
  "feedback": "内容准确但专业性有提升空间，建议补充更多专业术语解释"
}

只返回JSON，不要有任何额外文字。`;
  }

  /** 解析 LLM 返回的评分 JSON */
  private parseScore(raw: string): QualityScore {
    try {
      // 尝试提取 JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new BusinessException(ErrorCode.BAD_REQUEST, "AI 评分返回格式异常，未找到 JSON");
      const parsed = JSON.parse(jsonMatch[0]);

      const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

      return {
        accuracy: clamp(parsed.accuracy),
        completeness: clamp(parsed.completeness),
        readability: clamp(parsed.readability),
        professionalism: clamp(parsed.professionalism),
        overall: clamp(parsed.overall),
        feedback: String(parsed.feedback || ""),
        scoredAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.warn(`评分结果解析失败: ${err.message}, raw="${raw.slice(0, 100)}"`);
      return {
        accuracy: 0, completeness: 0, readability: 0, professionalism: 0,
        overall: 0, feedback: `解析失败: ${raw.slice(0, 200)}`, scoredAt: new Date().toISOString(),
      };
    }
  }
}
