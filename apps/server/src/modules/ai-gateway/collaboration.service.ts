import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
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
  executionReady: boolean;
  rollbackReady: boolean;
  handlerKey: string | null;
}

export interface CollaborationActionHandler {
  execute: (
    proposal: Record<string, unknown>,
    executor: string,
  ) => Promise<Record<string, unknown> | void>;
  rollback?: (
    proposal: Record<string, unknown>,
    operator: string,
  ) => Promise<Record<string, unknown> | void>;
}

/**
 * 人机协作协议 (Human-AI Collaboration Protocol)
 *
 * 标准化 AI 建议 → 人工审核 → 执行/驳回 → 反馈 闭环。
 *
 * 风险级别 → 处理策略：
 *   low    → 高置信度可自动批准；仅绑定受控动作处理器后才能执行
 *   medium → AI 建议 + 一键确认
 *   high   → AI 分析 + 必须人工审批
 *
 * 使用方式：
 * - AI Agent 调用 propose() 发起建议
 * - 管理员通过 review() 审核（批准/驳回/修改）
 * - 批准后调用 execute()；未绑定真实处理器时拒绝伪执行
 * - 执行后调用 feedback() 记录效果评分
 */
@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly actionHandlers = new Map<string, CollaborationActionHandler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AiEventBusService,
    private readonly ledger: DecisionLedgerService,
  ) {}

  /**
   * 业务模块显式注册受控动作。没有真实处理器的建议只能审核，不能被标记为已执行。
   * 返回注销函数，便于模块卸载时清理。
   */
  registerActionHandler(
    handlerKey: string,
    handler: CollaborationActionHandler,
  ): () => void {
    const key = handlerKey.trim();
    if (!key) throw new Error("协作动作处理器标识不能为空");
    if (this.actionHandlers.has(key)) {
      throw new Error(`协作动作处理器重复注册: ${key}`);
    }
    this.actionHandlers.set(key, handler);
    return () => this.actionHandlers.delete(key);
  }

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

    // 低风险高置信度只自动批准；执行必须进入已注册的受控动作处理器。
    if (proposal.riskLevel === "low" && proposal.confidence >= 0.9) {
      try {
        await this.autoApprove(created.id);
        this.logger.log(`低风险建议自动批准，等待受控执行: ${proposal.title}`);
      } catch (err: any) {
        this.logger.warn(`自动批准失败: ${proposal.title} - ${err.message}`);
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
    if (!proposal) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    if (proposal.status !== "pending_review")
      throw new BusinessException(ErrorCode.BAD_REQUEST, "建议状态不允许审核");
    if (
      action === "approved" &&
      proposal.riskLevel === "high" &&
      !note?.trim()
    ) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "高风险建议批准时必须填写审核依据");
    }
    if (
      action === "approved" &&
      proposal.riskLevel === "high" &&
      proposal.proposedBy === reviewer
    ) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "高风险建议禁止提议人与审批人为同一人");
    }

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

  }

  /** 执行建议 */
  async execute(proposalId: string, executor: string): Promise<void> {
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    if (proposal.status !== "approved")
      throw new BusinessException(ErrorCode.BAD_REQUEST, "建议未审核通过，不可执行");

    const handlerKey = this.getHandlerKey(proposal.executionPlan);
    const handler = handlerKey ? this.actionHandlers.get(handlerKey) : undefined;
    if (!handlerKey || !handler) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "该建议尚未绑定受控动作处理器，不能标记为已执行",
      );
    }

    const claimed = await this.prisma.aiCollaboration.updateMany({
      where: { id: proposalId, status: "approved" },
      data: { status: "executing" },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "建议已被其他操作处理，请刷新后重试");
    }

    try {
      const handlerResult = await handler.execute(
        proposal as unknown as Record<string, unknown>,
        executor,
      );

      await this.prisma.aiCollaboration.update({
        where: { id: proposalId },
        data: {
          status: "executed",
          executedAt: new Date(),
          executionResult: {
            executor,
            handlerKey,
            executedAt: new Date().toISOString(),
            result: handlerResult || {},
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
    if (!proposal) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    if (proposal.status !== "executed")
      throw new BusinessException(ErrorCode.BAD_REQUEST, "只能回滚已执行的建议");

    const handlerKey = this.getHandlerKey(proposal.executionPlan);
    const handler = handlerKey ? this.actionHandlers.get(handlerKey) : undefined;
    if (!handlerKey || !handler?.rollback) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "该建议没有可用的真实回滚处理器，不能伪造回滚完成状态",
      );
    }

    const rollbackResult = await handler.rollback(
      proposal as unknown as Record<string, unknown>,
      operator,
    );

    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: "rolled_back",
        rolledBackAt: new Date(),
        executionResult: {
          previous: proposal.executionResult,
          rollback: {
            operator,
            handlerKey,
            rolledBackAt: new Date().toISOString(),
            result: rollbackResult || {},
          },
        } as any,
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
    operator: string,
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
        operator,
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
          executionPlan: true,
        },
      }),
      this.prisma.aiCollaboration.count({ where: where as any }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        ...this.getExecutionCapability((item as any).executionPlan),
        executionPlan: undefined,
      })) as CollaborationResult[],
      total,
    };
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
        executionPlan: true,
      },
      take: 100,
    });
    return items.map((item) => ({
      ...item,
      ...this.getExecutionCapability((item as any).executionPlan),
      executionPlan: undefined,
    })) as CollaborationResult[];
  }

  /** 获取详情 */
  async getDetail(id: string): Promise<Record<string, unknown> | null> {
    const item = await this.prisma.aiCollaboration.findUnique({ where: { id } });
    if (!item) return null;
    return {
      ...item,
      executionCapability: this.getExecutionCapability(item.executionPlan),
    };
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

  /** 低风险自动批准：不越过真实动作处理器伪造执行结果。 */
  private async autoApprove(proposalId: string): Promise<void> {
    await this.prisma.aiCollaboration.update({
      where: { id: proposalId },
      data: {
        status: "approved",
        reviewedBy: "ai-system",
        reviewedAt: new Date(),
      },
    });

    await this.eventBus.publish({
      type: "collaboration.auto_approved",
      source: "ops",
      payload: {
        proposalId,
        nextStep: "等待已注册的受控动作处理器执行",
      },
    });
  }

  private getHandlerKey(executionPlan: unknown): string | null {
    if (!executionPlan || typeof executionPlan !== "object" || Array.isArray(executionPlan)) {
      return null;
    }
    const value = (executionPlan as Record<string, unknown>).handlerKey;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private getExecutionCapability(executionPlan: unknown): {
    executionReady: boolean;
    rollbackReady: boolean;
    handlerKey: string | null;
  } {
    const handlerKey = this.getHandlerKey(executionPlan);
    const handler = handlerKey ? this.actionHandlers.get(handlerKey) : undefined;
    return {
      executionReady: Boolean(handler),
      rollbackReady: Boolean(handler?.rollback),
      handlerKey,
    };
  }
}
