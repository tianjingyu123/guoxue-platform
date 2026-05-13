import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ModerationService } from "./moderation.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private moderation: ModerationService,
  ) {}

  log(params: {
    userId?: string;
    executor?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    rollbackData?: Record<string, any>;
    ip?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        executor: params.executor || params.userId || "SYSTEM",
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail,
        rollbackData: params.rollbackData as any,
        ip: params.ip,
      },
    });
  }

  /** 查询含回滚数据的审计日志 */
  async getLogWithRollback(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new BusinessException(ErrorCode.NOT_FOUND, "审计日志不存在");
    if (!log.rollbackData) throw new BusinessException(ErrorCode.NOT_FOUND, "该操作无可回滚数据");
    return log;
  }

  /** 获取可回滚的操作列表 */
  async listRollbackable(params: {
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: Prisma.AuditLogWhereInput = {
      rollbackData: { not: Prisma.DbNull },
    };
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  // ───────── 内容审核 ─────────

  /** 审核图片 */
  async moderateImage(imageUrl: string, bizType?: string) {
    const result = await this.moderation.imageModeration({ imageUrl, bizType });
    const passed = this.moderation.isImagePass(result);
    const labels = passed ? [] : this.moderation.getBlockedLabels(result);

    await this.prisma.auditLog.create({
      data: {
        action: passed ? "IMAGE_PASS" : "IMAGE_BLOCK",
        targetType: "IMAGE",
        targetId: imageUrl,
        detail: JSON.stringify({ passed, labels, result }),
      },
    });

    return { passed, labels, raw: result };
  }

  /** 审核文本 */
  async moderateText(content: string, bizType?: string, dataId?: string) {
    const result = await this.moderation.textModeration({ content, bizType, dataId });
    const passed = this.moderation.isTextPass(result);
    const labels = passed ? [] : this.moderation.getBlockedLabels(result);

    await this.prisma.auditLog.create({
      data: {
        action: passed ? "TEXT_PASS" : "TEXT_BLOCK",
        targetType: "TEXT",
        targetId: dataId || content.slice(0, 50),
        detail: JSON.stringify({ passed, labels }),
      },
    });

    return { passed, labels, raw: result };
  }

  async list(params: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: Prisma.AuditLogWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  async getActions() {
    return this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
    });
  }

  // ───────── 平台操作日志 ─────────

  async listOperationLogs(params: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: Prisma.OperationLogWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.operationLog.count({ where }),
    ]);
    return { logs, total, page, pageSize };
  }

  async getOperationLog(id: string) {
    return this.prisma.operationLog.findUnique({ where: { id } });
  }
}
