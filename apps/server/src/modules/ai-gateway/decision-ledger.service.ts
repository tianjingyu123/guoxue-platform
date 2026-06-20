import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

export interface AiDecisionRecord {
  agentId: string;
  capabilityId?: string;
  modelId: string;
  modelVersion: string;
  inputSummary: string;
  contextKeys: string[];
  reasoning?: {
    chainOfThought?: string;
    confidence: number;
    alternatives: Array<{ option: string; score: number }>;
  };
  output: Record<string, unknown>;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
}

export interface DecisionQuery {
  agentId?: string;
  capabilityId?: string;
  riskLevel?: string;
  humanAction?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface DecisionTrace {
  decision: Record<string, unknown>;
  relatedDecisions: Record<string, unknown>[];
  eventContext: Record<string, unknown> | null;
}

export interface ModelComparison {
  modelA: string;
  modelB: string;
  metric: string;
  aValue: number;
  bValue: number;
  winner: string;
}

/**
 * AI 决策记录与回溯
 *
 * 每个 AI 决策都可被追溯、质疑、复盘。
 * 支撑合规审计、模型升级回归测试、质量改进。
 *
 * 使用方式：
 * - AI Agent 做出决策时调用 record() 记录
 * - 人工审核后调用 reviewDecision() 记录审核结果
 * - 定期调用 retrospective() 复盘决策效果
 */
@Injectable()
export class DecisionLedgerService {
  private readonly logger = new Logger(DecisionLedgerService.name);
  private readonly RETENTION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  /** 记录 AI 决策 */
  async record(decision: AiDecisionRecord): Promise<string> {
    const created = await this.prisma.aiDecision.create({
      data: {
        agentId: decision.agentId,
        capabilityId: decision.capabilityId || null,
        modelId: decision.modelId,
        modelVersion: decision.modelVersion,
        inputSummary: decision.inputSummary,
        contextKeys: decision.contextKeys,
        reasoning: (decision.reasoning as any) || undefined,
        output: decision.output as any,
        confidence: decision.confidence,
        riskLevel: decision.riskLevel,
      },
    });

    this.logger.debug(
      `决策已记录: ${decision.agentId} (置信度: ${decision.confidence})`,
    );
    return created.id;
  }

  /** 人工审核决策 */
  async reviewDecision(
    decisionId: string,
    action: "approved" | "rejected" | "modified",
    reviewer: string,
    note?: string,
  ): Promise<void> {
    await this.prisma.aiDecision.update({
      where: { id: decisionId },
      data: {
        humanAction: action,
        humanReviewer: reviewer,
        humanNote: note || null,
        humanReviewedAt: new Date(),
      },
    });

    this.logger.log(`决策审核: ${decisionId} → ${action} (${reviewer})`);
  }

  /** 记录决策效果 */
  async recordOutcome(
    decisionId: string,
    metric: string,
    expectedValue: number,
    actualValue: number,
  ): Promise<void> {
    await this.prisma.aiDecision.update({
      where: { id: decisionId },
      data: {
        outcomeMetric: metric,
        outcomeExpected: expectedValue,
        outcomeActual: actualValue,
        outcomeMeasuredAt: new Date(),
      },
    });
  }

  /** 查询决策历史 */
  async query(filters: DecisionQuery = {}): Promise<{
    decisions: Record<string, unknown>[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.capabilityId) where.capabilityId = filters.capabilityId;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.humanAction) where.humanAction = filters.humanAction;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }

    const [decisions, total] = await Promise.all([
      this.prisma.aiDecision.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.aiDecision.count({ where: where as any }),
    ]);

    return { decisions, total };
  }

  /** 获取决策完整追溯链 */
  async getTrace(decisionId: string): Promise<DecisionTrace | null> {
    const decision = await this.prisma.aiDecision.findUnique({
      where: { id: decisionId },
    });
    if (!decision) return null;

    // 查找相关决策（同一 agent、时间相近）
    const relatedDecisions = await this.prisma.aiDecision.findMany({
      where: {
        agentId: decision.agentId,
        id: { not: decisionId },
        createdAt: {
          gte: new Date(decision.createdAt.getTime() - 3600_000),
          lte: new Date(decision.createdAt.getTime() + 3600_000),
        },
      },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    // 查找关联事件
    let eventContext: Record<string, unknown> | null = null;
    if (decision.capabilityId) {
      const event = await this.prisma.aiEvent.findFirst({
        where: {
          type: { contains: decision.capabilityId },
          createdAt: {
            gte: new Date(decision.createdAt.getTime() - 600_000),
            lte: new Date(decision.createdAt.getTime() + 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      });
      eventContext = event as Record<string, unknown> | null;
    }

    return {
      decision,
      relatedDecisions,
      eventContext: eventContext as Record<string, unknown> | null,
    };
  }

  /** 决策复盘 */
  async retrospective(decisionId: string): Promise<{
    decision: Record<string, unknown>;
    expectedVsActual: {
      metric: string;
      expected: number;
      actual: number;
      variance: number;
    } | null;
    summary: string;
  }> {
    const decision = await this.prisma.aiDecision.findUnique({
      where: { id: decisionId },
    });
    if (!decision) throw new BusinessException(ErrorCode.NOT_FOUND, "决策不存在");

    const expectedVsActual =
      decision.outcomeMetric
        ? {
            metric: decision.outcomeMetric,
            expected: decision.outcomeExpected || 0,
            actual: decision.outcomeActual || 0,
            variance: (decision.outcomeActual || 0) - (decision.outcomeExpected || 0),
          }
        : null;

    const summary =
      decision.humanAction === "approved"
        ? `决策已批准，置信度 ${decision.confidence}。${
            expectedVsActual
              ? `实际效果${expectedVsActual.variance >= 0 ? "达标" : "未达标"}。`
              : ""
          }`
        : decision.humanAction === "rejected"
          ? `决策被驳回。审核人: ${decision.humanReviewer || "未知"}`
          : "决策待审核";

    return {
      decision,
      expectedVsActual,
      summary,
    };
  }

  /** 模型版本对比 */
  async compareModels(
    modelA: string,
    modelB: string,
    agentId: string,
  ): Promise<ModelComparison> {
    const [aData, bData] = await Promise.all([
      this.prisma.aiDecision.aggregate({
        where: { modelId: modelA, agentId },
        _avg: { confidence: true },
        _count: true,
      }),
      this.prisma.aiDecision.aggregate({
        where: { modelId: modelB, agentId },
        _avg: { confidence: true },
        _count: true,
      }),
    ]);

    const aConf = aData._avg.confidence || 0;
    const bConf = bData._avg.confidence || 0;

    return {
      modelA,
      modelB,
      metric: "avg_confidence",
      aValue: aConf,
      bValue: bConf,
      winner: aConf > bConf ? modelA : bConf > aConf ? modelB : "tie",
    };
  }

  /** 获取决策统计概览 */
  async getOverview(): Promise<{
    total: number;
    approvedRate: number;
    avgConfidence: number;
    byRiskLevel: Record<string, number>;
    byAgent: Record<string, number>;
  }> {
    const [total, approved, rejected, confAvg, byRisk, byAgent] =
      await Promise.all([
        this.prisma.aiDecision.count(),
        this.prisma.aiDecision.count({ where: { humanAction: "approved" } }),
        this.prisma.aiDecision.count({ where: { humanAction: "rejected" } }),
        this.prisma.aiDecision.aggregate({ _avg: { confidence: true } }),
        this.prisma.aiDecision.groupBy({
          by: ["riskLevel"],
          _count: true,
        }),
        this.prisma.aiDecision.groupBy({
          by: ["agentId"],
          _count: true,
          orderBy: { _count: { agentId: "desc" } },
          take: 10,
        }),
      ]);

    const byRiskLevel: Record<string, number> = {};
    for (const r of byRisk) byRiskLevel[r.riskLevel] = r._count;

    const byAgentMap: Record<string, number> = {};
    for (const a of byAgent) byAgentMap[a.agentId] = a._count;

    return {
      total,
      approvedRate:
        total > 0
          ? Math.round((approved / (approved + rejected || 1)) * 100)
          : 0,
      avgConfidence: Math.round((confAvg._avg.confidence || 0) * 100) / 100,
      byRiskLevel,
      byAgent: byAgentMap,
    };
  }

  /** 定期清理过期决策（保留90天） */
  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async cleanupOldDecisions(): Promise<void> {
    try {
      const cutoff = new Date(
        Date.now() - this.RETENTION_DAYS * 24 * 3600_000,
      );
      const result = await this.prisma.aiDecision.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`清理过期决策: ${result.count} 条`);
      }
    } catch (err: any) {
      this.logger.warn(`过期决策清理失败: ${err.message}`);
    }
  }
}
