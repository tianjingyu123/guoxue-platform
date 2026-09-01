import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { safePagination, paginated } from "../../common/pagination";
import { CreateOpsTaskDto, QueryOpsTaskDto } from "./ops.dto";

/**
 * 数字员工运营 OS — 任务池（OS-P1·设计§2.1）
 *
 * 状态机：pending → (claim) → in_progress → (complete) → completed
 *                                        ↘ (review) → needs_review → (claim 真人接管) → in_progress
 * 全部写操作落审计（executor 区分 CLAUDE/真人，rollbackData 存变更前快照）。
 */
@Injectable()
export class OpsService {
  private readonly logger = new Logger(OpsService.name);

  constructor(
    private prisma: PrismaService,
    private systemService: SystemService,
  ) {}

  /** 任务列表（分页 + status/type/priority 筛选，高优先级在前） */
  async list(query: QueryOpsTaskDto) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const where: Prisma.OpsTaskWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;

    const [rows, total] = await Promise.all([
      this.prisma.opsTask.findMany({
        where,
        skip,
        take: pageSize,
        // priority 值 HIGH < LOW < MEDIUM 按字典序无意义，用 createdAt 倒序为主序，前端按需展示优先级标签
        orderBy: [{ createdAt: "desc" }],
      }),
      this.prisma.opsTask.count({ where }),
    ]);
    return paginated(rows, total, page, pageSize);
  }

  /** 建任务（巡检/修复/审核/运营动作） */
  async create(dto: CreateOpsTaskDto, operator: string) {
    const priority = dto.priority ?? "MEDIUM";
    // FIX 默认视为数据修复；HIGH 级 OPS 默认视为高影响运营动作。服务端强制审批，不能依赖前端勾选。
    const needsApproval = dto.needsApproval === true
      || dto.type === "FIX"
      || (dto.type === "OPS" && priority === "HIGH");
    const task = await this.prisma.opsTask.create({
      data: {
        type: dto.type,
        title: dto.title,
        priority,
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        needsApproval,
        approvalStatus: needsApproval ? "pending" : "not_required",
      },
    });
    this.audit(operator, "ops_task.create", task.id, `创建任务「${task.title}」type=${task.type} priority=${task.priority}`);
    return task;
  }

  /**
   * 认领任务（一键接管的双向通道）
   * pending → in_progress；needs_review 允许真人认领接管 → in_progress
   * 原子 CAS（updateMany 带状态条件）防并发重复认领。
   */
  async claim(id: string, executor: string, operator: string) {
    const before = await this.mustGet(id);
    if (!["pending", "needs_review"].includes(before.status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${before.status} 不可认领（仅 pending / needs_review 可认领）`);
    }
    if (before.needsApproval && before.approvalStatus === "approved" && before.approvedBy === executor) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "审批人不能再认领并执行自己审批的高风险任务");
    }
    const resetRejectedApproval = before.needsApproval && before.approvalStatus === "rejected";
    const claimed = await this.prisma.opsTask.updateMany({
      where: { id, status: before.status },
      data: {
        status: "in_progress",
        executor,
        ...(resetRejectedApproval
          ? { approvalStatus: "pending", approvedBy: null, approvedAt: null, approvalNote: null, reviewReason: null }
          : {}),
      },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "任务已被其他执行者认领，请刷新列表");
    }
    const task = await this.mustGet(id);
    this.audit(operator, "ops_task.claim", id, `认领任务「${task.title}」→ 执行者 ${executor}`, {
      previousStatus: before.status,
      previousExecutor: before.executor,
      previousApprovalStatus: before.approvalStatus,
      executor,
    });
    return task;
  }

  /**
   * 完成任务（in_progress → completed，落执行结果）
   * 真人接管不受 automation_enabled 影响；数字员工在总开关关闭时必须停止写入。
   */
  async complete(id: string, result: Record<string, any> | undefined, operator: string) {
    const before = await this.mustGet(id);
    if (before.status !== "in_progress") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${before.status} 不可完成（须先认领进入 in_progress）`);
    }
    if (before.executor && before.executor !== operator) {
      throw new BusinessException(ErrorCode.FORBIDDEN, `任务已由 ${before.executor} 认领，请先转人工并重新认领`);
    }
    if (before.needsApproval && before.approvalStatus !== "approved") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "高风险任务尚未由超级管理员审批，禁止完成");
    }
    if (this.isAiExecutor(operator) && !(await this.systemService.isAutomationEnabled())) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "自动化已暂停，数字员工禁止执行写操作，真人仍可接管");
    }
    const completed = await this.prisma.opsTask.updateMany({
      where: {
        id,
        status: "in_progress",
        executor: operator,
        ...(before.needsApproval ? { approvalStatus: "approved" } : {}),
      },
      data: { status: "completed", result: (result ?? {}) as Prisma.InputJsonValue, completedAt: new Date() },
    });
    if (completed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "任务状态已变化，请刷新后重试");
    }
    const task = await this.mustGet(id);
    this.audit(operator, "ops_task.complete", id, `完成任务「${task.title}」`, {
      previousStatus: before.status,
      previousResult: before.result,
    });
    return task;
  }

  /** 高风险任务审批。审批人与执行者必须分离；驳回后进入待人工复核。 */
  async approve(id: string, approved: boolean, approver: string, note: string) {
    const before = await this.mustGet(id);
    if (!before.needsApproval) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该任务无需审批");
    }
    if (before.status !== "in_progress" || !before.executor) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "高风险任务必须先由执行者认领，再由另一名超级管理员审批");
    }
    if (before.approvalStatus !== "pending") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前审批状态 ${before.approvalStatus} 不可重复审批`);
    }
    if (before.executor === approver) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "执行者不能审批自己的高风险任务");
    }
    if (!note?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "高风险审批必须填写核验依据或驳回原因");
    }
    const changed = await this.prisma.opsTask.updateMany({
      where: { id, status: "in_progress", approvalStatus: "pending", executor: before.executor },
      data: approved
        ? { approvalStatus: "approved", approvedBy: approver, approvedAt: new Date(), approvalNote: note.trim() }
        : {
            approvalStatus: "rejected",
            approvedBy: approver,
            approvedAt: new Date(),
            approvalNote: note.trim(),
            status: "needs_review",
            executor: null,
            reviewReason: note.trim(),
          },
    });
    if (changed.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批状态已变化，请刷新后重试");
    const task = await this.mustGet(id);
    this.audit(approver, approved ? "ops_task.approve" : "ops_task.reject", id, `${approved ? "通过" : "驳回"}高风险任务「${task.title}」：${note.trim()}`, {
      previousApprovalStatus: before.approvalStatus,
      previousStatus: before.status,
    });
    return task;
  }

  /** 转人工复核（→ needs_review 附原因；数字员工遇不确定即走此通道） */
  async review(id: string, reason: string, operator: string) {
    const before = await this.mustGet(id);
    if (before.status === "completed") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已完成的任务不可转人工复核");
    }
    const moved = await this.prisma.opsTask.updateMany({
      where: { id, status: { not: "completed" } },
      data: {
        status: "needs_review",
        executor: null,
        reviewReason: reason,
        ...(before.needsApproval
          ? { approvalStatus: "pending", approvedBy: null, approvedAt: null, approvalNote: null }
          : {}),
      },
    });
    if (moved.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "任务状态已变化，请刷新后重试");
    const task = await this.mustGet(id);
    this.audit(operator, "ops_task.review", id, `转人工复核「${task.title}」：${reason}`, {
      previousStatus: before.status,
      previousReviewReason: before.reviewReason,
    });
    return task;
  }

  /** 运营自动化总览：只返回聚合口径，不暴露任务 payload 中可能包含的业务数据。 */
  async overview() {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const [groups, pendingApprovals, aiCompleted24h, aiGenerated24h] = await Promise.all([
      this.prisma.opsTask.groupBy({ by: ["status"], _count: true }),
      this.prisma.opsTask.count({ where: { needsApproval: true, approvalStatus: "pending" } }),
      this.prisma.opsTask.count({
        where: {
          status: "completed",
          completedAt: { gte: since },
          OR: [
            { executor: { in: ["CLAUDE", "SYSTEM"] } },
            { executor: { startsWith: "AI:" } },
            { executor: { startsWith: "BOT:" } },
          ],
        },
      }),
      this.prisma.opsTask.count({ where: { sourceEventId: { not: null }, createdAt: { gte: since } } }),
    ]);
    const byStatus = Object.fromEntries(groups.map((row) => [row.status, row._count]));
    return {
      byStatus,
      activeTasks: (byStatus.pending ?? 0) + (byStatus.in_progress ?? 0) + (byStatus.needs_review ?? 0),
      pendingApprovals,
      aiCompleted24h,
      aiGenerated24h,
      windowHours: 24,
    };
  }

  private async mustGet(id: string) {
    const task = await this.prisma.opsTask.findUnique({ where: { id } });
    if (!task) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
    return task;
  }

  private isAiExecutor(executor: string): boolean {
    const normalized = executor.toUpperCase();
    return normalized === "CLAUDE" || normalized === "SYSTEM" || normalized.startsWith("AI:") || normalized.startsWith("BOT:");
  }

  /** 审计（fire-and-forget，失败不阻塞业务）— executor/rollbackData 走 logAudit 新透传参数 */
  private audit(operator: string, action: string, taskId: string, detail: string, rollbackData?: Record<string, any>) {
    void Promise.resolve(
      this.systemService.logAudit({
        userId: operator,
        executor: operator,
        action,
        targetType: "OPS_TASK",
        targetId: taskId,
        detail,
        rollbackData,
      }),
    ).catch((err) => this.logger.warn("任务池审计写入失败", err));
  }
}
