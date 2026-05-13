import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CreateTaskDto, UpdateTaskDto } from "./task.dto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";

const TASK_CACHE_PREFIX = "task:";

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 创建任务 */
  async create(dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        type: dto.type as any,
        priority: (dto.priority || "MEDIUM") as any,
        title: dto.title,
        description: dto.description,
        executorType: dto.executorType || "CLAUDE",
        executorId: dto.executorId,
        snapshot: dto.snapshot as Prisma.InputJsonValue,
        needsApproval: dto.needsApproval ?? false,
      },
    });
    this.logger.log(`创建任务: ${task.id} [${task.type}] ${task.title}`);
    return task;
  }

  /** 任务列表（分页 + 筛选） */
  async list(params: {
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    priority?: string;
    executorType?: string;
    needsApproval?: boolean;
  }) {
    const where: Prisma.TaskWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.type) where.type = params.type as any;
    if (params.priority) where.priority = params.priority as any;
    if (params.executorType) where.executorType = params.executorType;
    if (params.needsApproval !== undefined) where.needsApproval = params.needsApproval;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { transferLogs: { take: 5, orderBy: { createdAt: "desc" } } },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  /** 任务详情 */
  async detail(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        transferLogs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!task) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
    return task;
  }

  /** 更新任务 */
  async update(id: string, dto: UpdateTaskDto, updater?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");

    const data: Prisma.TaskUpdateInput = {};
    if (dto.status !== undefined) {
      data.status = dto.status as any;
      if (dto.status === "COMPLETED") data.completedAt = new Date();
    }
    if (dto.priority !== undefined) data.priority = dto.priority as any;
    if (dto.result !== undefined) data.result = dto.result as Prisma.InputJsonValue;
    if (dto.errorLog !== undefined) data.errorLog = dto.errorLog;
    if (dto.executorId !== undefined) data.executorId = dto.executorId;

    const task = await this.prisma.task.update({ where: { id }, data });
    this.logger.log(`${updater || "SYSTEM"} 更新任务: ${id} → status=${task.status}`);
    await this.clearCache(id);
    return task;
  }

  /** 认领任务（原子操作 — 防止多实例竞态） */
  async claim(id: string, executorType: string, executorId?: string) {
    const result = await this.prisma.task.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "IN_PROGRESS", executorType, executorId },
    });
    if (result.count === 0) {
      const existing = await this.prisma.task.findUnique({ where: { id } });
      if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
      throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "任务非待处理状态，无法认领");
    }
    const task = await this.prisma.task.findUnique({ where: { id } });
    this.logger.log(`${executorType}:${executorId} 认领任务: ${id}`);
    return task!;
  }

  /** 转交任务 */
  async transfer(
    id: string,
    toType: string,
    toId: string | undefined,
    reason: string,
    fromType?: string,
    fromId?: string,
  ) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");

    // 保存当前状态快照
    const snapshot = {
      executorType: existing.executorType,
      executorId: existing.executorId,
      status: existing.status,
      result: existing.result,
    };

    // 创建流转日志
    await this.prisma.taskTransferLog.create({
      data: {
        taskId: id,
        fromType: fromType || existing.executorType,
        fromId: fromId || existing.executorId,
        toType,
        toId,
        reason,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });

    // 更新任务执行者
    const task = await this.prisma.task.update({
      where: { id },
      data: { executorType: toType, executorId: toId, status: "PENDING" },
    });
    this.logger.log(`任务转交: ${id} ${fromType} → ${toType}, 原因: ${reason}`);
    return task;
  }

  /** 强制收回（管理员） */
  async forceReclaim(id: string, adminId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");

    await this.prisma.taskTransferLog.create({
      data: {
        taskId: id,
        fromType: existing.executorType,
        fromId: existing.executorId,
        toType: "HUMAN",
        toId: adminId,
        reason: "管理员强制收回",
        snapshot: { status: existing.status, executorType: existing.executorType, executorId: existing.executorId } as Prisma.InputJsonValue,
      },
    });

    const task = await this.prisma.task.update({
      where: { id },
      data: { status: "PENDING", executorType: "HUMAN", executorId: adminId },
    });
    this.logger.log(`管理员 ${adminId} 强制收回任务: ${id}`);
    return task;
  }

  /** 审批任务 */
  async approve(id: string, approved: boolean, approverId: string, remark?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
    if (!existing.needsApproval) {
      throw new BusinessException(ErrorCode.TASK_NOT_NEED_APPROVAL, "该任务无需审批");
    }

    if (approved) {
      return this.prisma.task.update({
        where: { id },
        data: { approvedBy: approverId, status: "COMPLETED", completedAt: new Date() },
      });
    }
    return this.prisma.task.update({
      where: { id },
      data: { approvedBy: approverId, status: "NEEDS_REVIEW", errorLog: remark || "审批驳回" },
    });
  }

  /** 回滚任务操作 */
  async rollback(id: string, operatorId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
    if (!existing.rollbackData) {
      throw new BusinessException(ErrorCode.ROLLBACK_NOT_AVAILABLE, "该任务无可回滚数据");
    }

    // 使用 rollbackData 中的快照恢复
    const snapshot = existing.rollbackData as any;
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: snapshot.status || "PENDING",
        executorType: snapshot.executorType,
        executorId: snapshot.executorId,
        result: Prisma.DbNull,
        errorLog: `由 ${operatorId} 回滚`,
      },
    });
    this.logger.log(`任务回滚: ${id}, 操作人: ${operatorId}`);
    return task;
  }

  /** 获取待处理任务数 */
  async pendingCount(executorType?: string) {
    const where: Prisma.TaskWhereInput = { status: "PENDING" };
    if (executorType) where.executorType = executorType;
    return this.prisma.task.count({ where });
  }

  private async clearCache(id: string) {
    await this.redis.del(TASK_CACHE_PREFIX + id);
  }
}
