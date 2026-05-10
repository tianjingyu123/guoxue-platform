import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface CreateReportDto {
  targetType: "POST" | "COMMENT" | "CIRCLE" | "USER" | "COURSE" | "PRODUCT" | "ARTICLE" | "LIVE" | "VIDEO";
  targetId: string;
  reason: string;
}

export interface HandleReportDto {
  action: "DISMISS" | "DELETE_CONTENT" | "BAN_USER" | "WARN_USER";
  note?: string;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private prisma: PrismaService) {}

  /** 用户提交举报 */
  async submit(reporterId: string, dto: CreateReportDto) {
    const existing = await this.prisma.report.findFirst({
      where: { reporterId, targetType: dto.targetType, targetId: dto.targetId, status: "PENDING" },
    });
    if (existing) {
      return { message: "您已举报过此内容，请等待处理", report: existing };
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        status: "PENDING",
      },
    });

    this.logger.log(`新举报: reporterId=${reporterId} ${dto.targetType}:${dto.targetId} reason=${dto.reason}`);
    return report;
  }

  /** 管理员处理举报 */
  async handle(reportId: string, dto: HandleReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("举报不存在");
    if (report.status !== "PENDING") throw new Error("该举报已处理");

    // 执行处置动作
    switch (dto.action) {
      case "DELETE_CONTENT":
        await this.deleteTarget(report.targetType, report.targetId);
        break;
      case "BAN_USER":
        await this.banReportedUser(report.targetType, report.targetId);
        break;
      case "WARN_USER":
        await this.warnReportedUser(report.targetType, report.targetId);
        break;
      case "DISMISS":
        break;
    }

    const result = dto.action + (dto.note ? `: ${dto.note}` : "");

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: "PROCESSED",
        result,
        processedAt: new Date(),
      },
    });

    this.logger.log(`举报已处理: ${reportId} result=${result}`);
    return updated;
  }

  /** 获取举报列表（管理员视图） */
  async list(params: { status?: string; targetType?: string; page: number; pageSize: number }) {
    const where: Prisma.ReportWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.targetType) where.targetType = params.targetType;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, nickname: true, avatar: true } } },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  /** 获取某内容的举报统计 */
  async getTargetStats(targetType: string, targetId: string) {
    const total = await this.prisma.report.count({ where: { targetType, targetId } });
    const pending = await this.prisma.report.count({ where: { targetType, targetId, status: "PENDING" } });
    return { targetType, targetId, totalReports: total, pendingReports: pending };
  }

  // ─── 内部处置方法 ───

  private async deleteTarget(type: string, id: string) {
    try {
      switch (type) {
        case "POST":
          await this.prisma.post.update({ where: { id }, data: { status: "HIDDEN" } });
          break;
        case "COMMENT":
          await this.prisma.comment.update({ where: { id }, data: { status: "HIDDEN" } });
          break;
        case "CIRCLE":
          await this.prisma.circle.update({ where: { id }, data: { status: "DISABLED" } });
          break;
        case "COURSE":
          await this.prisma.course.update({ where: { id }, data: { auditStatus: "REJECTED" } });
          break;
        case "PRODUCT":
          await this.prisma.product.update({ where: { id }, data: { status: "OFF_SHELF" } });
          break;
        case "ARTICLE":
          await this.prisma.article.update({ where: { id }, data: { auditStatus: "REJECTED" } });
          break;
      }
    } catch (err: unknown) {
      this.logger.error(`删除目标失败 ${type}:${id}: ${(err as Error).message}`);
    }
  }

  private async banReportedUser(type: string, targetId: string) {
    let userId: string | null = null;
    try {
      switch (type) {
        case "POST": {
          const p = await this.prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
          userId = p?.userId ?? null;
          break;
        }
        case "COMMENT": {
          const c = await this.prisma.comment.findUnique({ where: { id: targetId }, select: { userId: true } });
          userId = c?.userId ?? null;
          break;
        }
        case "USER":
          userId = targetId;
          break;
      }
      if (userId) {
        await this.prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
        this.logger.warn(`用户已封禁: ${userId}`);
      }
    } catch (err: unknown) {
      this.logger.error(`封禁用户失败: ${(err as Error).message}`);
    }
  }

  private async warnReportedUser(type: string, targetId: string) {
    let userId: string | null = null;
    try {
      if (type === "USER") {
        userId = targetId;
      } else if (type === "POST") {
        const p = await this.prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
        userId = p?.userId ?? null;
      }
      if (userId) {
        await this.prisma.user.update({ where: { id: userId }, data: { status: "DISABLED" } });
        this.logger.warn(`用户已警告: ${userId}`);
      }
    } catch (err: unknown) {
      this.logger.error(`警告用户失败: ${(err as Error).message}`);
    }
  }
}
