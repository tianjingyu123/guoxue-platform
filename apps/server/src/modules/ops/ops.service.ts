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
    const task = await this.prisma.opsTask.create({
      data: {
        type: dto.type,
        title: dto.title,
        priority: dto.priority ?? "MEDIUM",
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        needsApproval: dto.needsApproval ?? false,
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
    const claimed = await this.prisma.opsTask.updateMany({
      where: { id, status: { in: ["pending", "needs_review"] } },
      data: { status: "in_progress", executor },
    });
    if (claimed.count === 0) {
      const task = await this.mustGet(id);
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${task.status} 不可认领（仅 pending / needs_review 可认领）`);
    }
    const task = await this.mustGet(id);
    this.audit(operator, "ops_task.claim", id, `认领任务「${task.title}」→ 执行者 ${executor}`, {
      previousStatus: task.status === "in_progress" ? "pending/needs_review" : task.status,
      executor,
    });
    return task;
  }

  /**
   * 完成任务（in_progress → completed，落执行结果）
   * 控制器端点挂 @RequireAutomation()：管理员一键接管后此写操作 403。
   */
  async complete(id: string, result: Record<string, any> | undefined, operator: string) {
    const before = await this.mustGet(id);
    if (before.status !== "in_progress") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${before.status} 不可完成（须先认领进入 in_progress）`);
    }
    const task = await this.prisma.opsTask.update({
      where: { id },
      data: { status: "completed", result: (result ?? {}) as Prisma.InputJsonValue },
    });
    this.audit(operator, "ops_task.complete", id, `完成任务「${task.title}」`, {
      previousStatus: before.status,
      previousResult: before.result,
    });
    return task;
  }

  /** 转人工复核（→ needs_review 附原因；数字员工遇不确定即走此通道） */
  async review(id: string, reason: string, operator: string) {
    const before = await this.mustGet(id);
    if (before.status === "completed") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已完成的任务不可转人工复核");
    }
    const task = await this.prisma.opsTask.update({
      where: { id },
      data: { status: "needs_review", reviewReason: reason },
    });
    this.audit(operator, "ops_task.review", id, `转人工复核「${task.title}」：${reason}`, {
      previousStatus: before.status,
      previousReviewReason: before.reviewReason,
    });
    return task;
  }

  private async mustGet(id: string) {
    const task = await this.prisma.opsTask.findUnique({ where: { id } });
    if (!task) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
    return task;
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
