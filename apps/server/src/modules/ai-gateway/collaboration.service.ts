import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
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
  type: string;
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
  registerActionHandler(handlerKey: string, handler: CollaborationActionHandler): () => void {
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
    // 提案与决策证据一同提交，任一步失败都不能留下无账本的半成品。
    const created = await this.prisma.$transaction(async (tx) => {
      const item = await tx.aiCollaboration.create({
        data: {
          type: proposal.type,
          title: proposal.title,
          description: proposal.description,
          proposedBy: proposal.proposedBy,
          confidence: proposal.confidence,
          impactScope: proposal.impactScope as Prisma.InputJsonValue,
          alternatives: proposal.alternatives || [],
          riskLevel: proposal.riskLevel,
          executionPlan: proposal.executionPlan as Prisma.InputJsonValue,
          rollbackPlan: proposal.rollbackPlan as Prisma.InputJsonValue | undefined,
        },
      });

      // 记录到决策账本
      const decisionId = await this.ledger.record(
        {
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
          output: { proposalId: item.id, riskLevel: proposal.riskLevel },
          confidence: proposal.confidence,
          riskLevel: proposal.riskLevel,
        },
        tx,
      );

      // 关联决策ID
      await tx.aiCollaboration.update({
        where: { id: item.id },
        data: { decisionId },
      });
      return item;
    });

    // 发布事件
    await this.publishEvent({
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
      } catch (err: unknown) {
        this.logger.warn(
          `自动批准失败: ${proposal.title} - ${err instanceof Error ? err.message : String(err)}`,
        );
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
    if (action !== "approved" && !note?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "驳回或修改建议必须填写原因");
    }
    if (modifications && action !== "modified") {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "修改执行计划必须使用修改审核，不能夹带在批准操作中",
      );
    }
    if (action === "approved" && proposal.riskLevel === "high" && !note?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "高风险建议批准时必须填写审核依据");
    }
    if (
      action === "approved" &&
      proposal.riskLevel === "high" &&
      proposal.proposedBy === reviewer
    ) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "高风险建议禁止提议人与审批人为同一人");
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.aiCollaboration.updateMany({
        where: { id: proposalId, status: "pending_review" },
        data: {
          status: action === "approved" ? "approved" : action,
          reviewedBy: reviewer,
          reviewedAt: new Date(),
          description: modifications?.description || proposal.description,
          executionPlan: modifications?.executionPlan
            ? (modifications.executionPlan as Prisma.InputJsonValue)
            : undefined,
          rollbackPlan: modifications?.rollbackPlan
            ? (modifications.rollbackPlan as Prisma.InputJsonValue)
            : undefined,
        },
      });
      if (claimed.count === 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "建议已被其他管理员审核，请刷新列表");
      }

      // 同步到决策记录
      if (proposal.decisionId) {
        await this.ledger.reviewDecision(proposal.decisionId, action, reviewer, note, tx);
      }
    });

    // 发布审核事件
    await this.publishEvent({
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
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`协作执行完成: ${proposalId}`);
    } catch (err: unknown) {
      await this.prisma.aiCollaboration.update({
        where: { id: proposalId },
        data: {
          status: "failed",
          executionResult: {
            executor,
            handlerKey,
            error: err instanceof Error ? err.message : "执行失败",
          },
        },
      });
      throw err;
    }
    // 通知失败不等于业务失败，不能把真实已执行动作改成 failed 引导重复操作。
    await this.publishEvent({
      type: "collaboration.executed",
      source: "admin",
      payload: { proposalId, executor },
    });
  }

  /** 回滚已执行的建议 */
  async rollback(proposalId: string, operator: string, reason?: string): Promise<void> {
    const proposal = await this.prisma.aiCollaboration.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    if (proposal.status !== "executed")
      throw new BusinessException(ErrorCode.BAD_REQUEST, "只能回滚已执行的建议");
    if (!reason?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "回滚必须填写原因");
    }

    const handlerKey = this.getHandlerKey(proposal.executionPlan);
    const handler = handlerKey ? this.actionHandlers.get(handlerKey) : undefined;
    if (!handlerKey || !handler?.rollback) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "该建议没有可用的真实回滚处理器，不能伪造回滚完成状态",
      );
    }

    const claimed = await this.prisma.aiCollaboration.updateMany({
      where: { id: proposalId, status: "executed" },
      data: { status: "rolling_back" },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "建议已被其他操作处理，请刷新后重试");
    }

    try {
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
              reason: reason.trim(),
              handlerKey,
              rolledBackAt: new Date().toISOString(),
              result: rollbackResult || {},
            },
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      // 回滚可能已产生部分副作用，保留原执行证据并转人工核查，禁止自动重试。
      await this.prisma.aiCollaboration.update({
        where: { id: proposalId },
        data: {
          status: "rollback_failed",
          executionResult: {
            previous: proposal.executionResult,
            rollback: {
              operator,
              reason: reason.trim(),
              error: err instanceof Error ? err.message : "回滚失败",
            },
          } as Prisma.InputJsonValue,
        },
      });
      throw err;
    }

    await this.publishEvent({
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
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "反馈评分必须为 1 到 5 的整数");
    }
    await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.aiCollaboration.findUnique({
        where: { id: proposalId },
      });
      if (!proposal) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
      if (!["executed", "rolled_back"].includes(proposal.status)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "执行或回滚完成后才能验收反馈");
      }
      const changed = await tx.aiCollaboration.updateMany({
        where: { id: proposalId, status: proposal.status, feedbackRating: null },
        data: { feedbackRating: rating, feedbackComment: comment?.trim() || null },
      });
      if (changed.count === 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "该建议已反馈或状态已变化，请刷新列表");
      }
      if (proposal.decisionId) {
        await this.ledger.recordOutcome(
          proposal.decisionId,
          "feedback_rating",
          5,
          rating,
          operator,
          tx,
        );
      }
    });
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
    const where: Prisma.AiCollaborationWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.type) where.type = filters.type;
    if (filters.proposedBy) where.proposedBy = filters.proposedBy;

    const [items, total] = await Promise.all([
      this.prisma.aiCollaboration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        select: {
          id: true,
          type: true,
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
      this.prisma.aiCollaboration.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        ...this.getExecutionCapability(item.executionPlan),
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
        type: true,
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
      ...this.getExecutionCapability(item.executionPlan),
      executionPlan: undefined,
    })) as CollaborationResult[];
  }

  /** 获取详情 */
  async getDetail(id: string): Promise<Record<string, unknown> | null> {
    const item = await this.prisma.aiCollaboration.findUnique({ where: { id } });
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    const decision = item.decisionId
      ? await this.prisma.aiDecision.findUnique({
          where: { id: item.decisionId },
          select: { humanNote: true, outcomeMeasuredBy: true },
        })
      : null;
    return {
      ...item,
      reviewNote: decision?.humanNote ?? null,
      feedbackBy: decision?.outcomeMeasuredBy ?? null,
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
    const [total, pending, approved, executed, rejected, rolledBack, avgRating] = await Promise.all(
      [
        this.prisma.aiCollaboration.count(),
        this.prisma.aiCollaboration.count({ where: { status: "pending_review" } }),
        this.prisma.aiCollaboration.count({ where: { status: "approved" } }),
        this.prisma.aiCollaboration.count({ where: { status: "executed" } }),
        this.prisma.aiCollaboration.count({ where: { status: "rejected" } }),
        this.prisma.aiCollaboration.count({ where: { status: "rolled_back" } }),
        this.prisma.aiCollaboration.aggregate({ _avg: { feedbackRating: true } }),
      ],
    );

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
    const changed = await this.prisma.aiCollaboration.updateMany({
      where: { id: proposalId, status: "pending_review" },
      data: {
        status: "approved",
        reviewedBy: "ai-system",
        reviewedAt: new Date(),
      },
    });
    if (changed.count === 0) return;

    await this.publishEvent({
      type: "collaboration.auto_approved",
      source: "ops",
      payload: {
        proposalId,
        nextStep: "等待已注册的受控动作处理器执行",
      },
    });
  }

  private async publishEvent(event: Parameters<AiEventBusService["publish"]>[0]): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (err: unknown) {
      this.logger.error(
        `协作状态已落库，事件通知失败 (${event.type})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
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
