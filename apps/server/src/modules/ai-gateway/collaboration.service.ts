import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEventBusService } from "./ai-event-bus.service";
import { DecisionLedgerService } from "./decision-ledger.service";

export interface CollaborationProposal {
  type: string;
  title: string;
  description: string;
  proposedBy: string;
  confidence: number;
  impactScope: Record<string, unknown>;
  alternatives?: Array<{ option: string; description: string; score: number }>;
  riskLevel: "low" | "medium" | "high";
  executionPlan: Record<string, unknown>;
  rollbackPlan?: Record<string, unknown>;
}

export interface CollaborationResult {
  id: string;
  status: string;
  title: string;
  proposedBy: string;
  riskLevel: string;
  confidence: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  executedAt: Date | null;
  feedbackRating: number | null;
  createdAt: Date;
}

/**
 * 人机协作协议 (Human-AI Collaboration Protocol)
 *
 * 标准化 AI 建议 → 人工审核 → 执行/驳回 → 反馈 闭环。
 *
 * 风险级别 → 处理策略：
 *   low    → AI 自动执行，事后通知
 *   medium → AI 建议 + 一键确认
 *   high   → AI 分析 + 必须人工审批
 *
 * 使用方式：
 * - AI Agent 调用 propose() 发起建议
 * - 管理员通过 review() 审核（批准/驳回/修改）
 * - 批准后调用 execute() 执行
 * - 执行后调用 feedback() 记录效果评分
 */
@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AiEventBusService,
    private readonly ledger: DecisionLedgerService,
  ) {}

  /** AI 发起协作建议 */
  async propose(proposal: CollaborationProposal): Promise<string> {
    const created = await this.prisma.aiCollaboration.create({
      data: {
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        proposedBy: proposal.proposedBy,
        confidence: proposal.confidence,
        impactScope: proposal.impactScope as any,
        alternatives: (proposal.alternatives as any) || [],
        riskLevel: proposal.riskLevel,
        executionPlan: proposal.executionPlan as any,
        rollbackPlan: (proposal.rollbackPlan as any) || undefined,
      },
    });

    // 记录到决策账本
    const decisionId = await this.ledger.record({
      agentId: proposal.proposedBy,
      modelId: "collaboration",
      modelVersion: "v1",
      inputSummary: proposal.title,
      contextKeys: ["collaboration"],
      reasoning: {
        confidence: proposal.confidence,
        alternatives: (proposal.alternatives || []).map((a) => ({
          option: a.option,
          score: a.score,
        })),
      },
      output: { proposalId: created.id, riskLevel: proposal.riskLevel },
      confidence: proposal.confidence,
      riskLevel: proposal.riskLevel,
    });

    // 关联决策ID
    await this.prisma.aiCollaboration.update({
      where: { id: created.id },
      data: { decisionId },
    });

    // 发布事件
    await this.eventBus.publish({
      type: `collaboration.proposed.${proposal.riskLevel}`,
      source: "admin",
      severity: proposal.riskLevel === "high" ? "warning" : "info",
      payload: {
        proposalId: created.id,
        type: proposal.type,
        title: proposal.title,
        riskLevel: proposal.riskLevel,
      },
    });

    // 低风险自动批准并执行
    if (proposal.riskLevel === "low" && proposal.confidence >= 0.9) {
      try {
        await this.autoApprove(created.id);
        this.logger.log(`低风险建议自动执行: ${proposal.title}`);
      } catch (err: any) {
        this.logger.warn(`自动执行失败: ${proposal.title} - ${err.message}`);
      }
    }

    return created.id;
  }

  /** 人工审核建议 */
  async review(
    proposalId: string,
    action: "approved" | "rejected" | "modified",
    reviewer: string,
    modifications?: Partial<CollaborationProposal>,
    note?: string,
  ): Promise<void> {
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new Error("建议不存在");
    if (proposal.status !== "pending_review")
      throw new Error("建议状态不允许审核");

    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: action === "approved" ? "approved" : action,
        reviewedBy: reviewer,
        reviewedAt: new Date(),
        description: modifications?.description || proposal.description,
        executionPlan: modifications?.executionPlan
          ? (modifications.executionPlan as any)
          : undefined,
        rollbackPlan: modifications?.rollbackPlan
          ? (modifications.rollbackPlan as any)
          : undefined,
      },
    });

    // 同步到决策记录
    if (proposal.decisionId) {
      await this.ledger.reviewDecision(
        proposal.decisionId,
        action,
        reviewer,
        note,
      );
    }

    // 发布审核事件
    await this.eventBus.publish({
      type: `collaboration.${action}`,
      source: "admin",
      payload: { proposalId, reviewer, action },
    });

    this.logger.log(`协作审核: ${proposalId} → ${action} (${reviewer})`);

    // 批准后自动执行
    if (action === "approved") {
      await this.execute(proposalId, reviewer);
    }
  }

  /** 执行建议 */
  async execute(proposalId: string, executor: string): Promise<void> {
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new Error("建议不存在");
    if (!["approved", "executing"].includes(proposal.status))
      throw new Error("建议未审核通过，不可执行");

    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: { status: "executing" },
    });

    try {
      // 实际执行逻辑由调用方通过 executionPlan 实现
      // 这里只是状态机和记录

      await this.prisma.aiCollaboration.update({
        where: { id: proposalId },
        data: {
          status: "executed",
          executedAt: new Date(),
          executionResult: {
            executor,
            executedAt: new Date().toISOString(),
          } as any,
        },
      });

      await this.eventBus.publish({
        type: "collaboration.executed",
        source: "admin",
        payload: { proposalId, executor },
      });

      this.logger.log(`协作执行完成: ${proposalId}`);
    } catch (err: any) {
      await this.prisma.aiCollaboration.update({
        where: { id: proposalId },
        data: { status: "failed", executionResult: { error: err.message } as any },
      });
      throw err;
    }
  }

  /** 回滚已执行的建议 */
  async rollback(proposalId: string, operator: string): Promise<void> {
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new Error("建议不存在");
    if (proposal.status !== "executed")
      throw new Error("只能回滚已执行的建议");

    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: "rolled_back",
        rolledBackAt: new Date(),
      },
    });

    await this.eventBus.publish({
      type: "collaboration.rolled_back",
      source: "admin",
      severity: "warning",
      payload: { proposalId, operator },
    });

    this.logger.warn(`协作回滚: ${proposalId} (${operator})`);
  }

  /** 记录反馈 */
  async feedback(
    proposalId: string,
    rating: number,
    comment?: string,
  ): Promise<void> {
    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: { feedbackRating: rating, feedbackComment: comment },
    });

    // 更新决策记录的效果指标
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
      select: { decisionId: true },
    });
    if (proposal?.decisionId) {
      await this.ledger.recordOutcome(
        proposal.decisionId,
        "feedback_rating",
        5,
        rating,
      );
    }
  }

  /** 查询协作列表 */
  async query(filters: {
    status?: string;
    riskLevel?: string;
    type?: string;
    proposedBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CollaborationResult[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.type) where.type = filters.type;
    if (filters.proposedBy) where.proposedBy = filters.proposedBy;

    const [items, total] = await Promise.all([
      this.prisma.aiCollaboration.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        select: {
          id: true,
          status: true,
          title: true,
          proposedBy: true,
          riskLevel: true,
          confidence: true,
          reviewedBy: true,
          reviewedAt: true,
          executedAt: true,
          feedbackRating: true,
          createdAt: true,
        },
      }),
      this.prisma.aiCollaboration.count({ where: where as any }),
    ]);

    return { items, total };
  }

  /** 获取待审核列表 */
  async getPendingReviews(): Promise<CollaborationResult[]> {
    const items = await this.prisma.aiCollaboration.findMany({
      where: { status: "pending_review" },
      orderBy: [{ riskLevel: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        title: true,
        proposedBy: true,
        riskLevel: true,
        confidence: true,
        reviewedBy: true,
        reviewedAt: true,
        executedAt: true,
        feedbackRating: true,
        createdAt: true,
      },
      take: 100,
    });
    return items;
  }

  /** 获取详情 */
  async getDetail(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.aiCollaboration.findUnique({ where: { id } });
  }

  /** 获取统计概览 */
  async getOverview(): Promise<{
    total: number;
    pendingCount: number;
    approvedCount: number;
    executedCount: number;
    rejectedCount: number;
    rolledBackCount: number;
    avgFeedbackRating: number;
  }> {
    const [total, pending, approved, executed, rejected, rolledBack, avgRating] =
      await Promise.all([
        this.prisma.aiCollaboration.count(),
        this.prisma.aiCollaboration.count({ where: { status: "pending_review" } }),
        this.prisma.aiCollaboration.count({ where: { status: "approved" } }),
        this.prisma.aiCollaboration.count({ where: { status: "executed" } }),
        this.prisma.aiCollaboration.count({ where: { status: "rejected" } }),
        this.prisma.aiCollaboration.count({ where: { status: "rolled_back" } }),
        this.prisma.aiCollaboration.aggregate({ _avg: { feedbackRating: true } }),
      ]);

    return {
      total,
      pendingCount: pending,
      approvedCount: approved,
      executedCount: executed,
      rejectedCount: rejected,
      rolledBackCount: rolledBack,
      avgFeedbackRating: Math.round((avgRating._avg.feedbackRating || 0) * 10) / 10,
    };
  }

  /** 低风险自动批准 */
  private async autoApprove(proposalId: string): Promise<void> {
    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: "approved",
        reviewedBy: "ai-system",
        reviewedAt: new Date(),
      },
    });

    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: "executed",
        executedAt: new Date(),
        executionResult: {
          executor: "ai-system",
          autoApproved: true,
          executedAt: new Date().toISOString(),
        } as any,
      },
    });
  }
}
