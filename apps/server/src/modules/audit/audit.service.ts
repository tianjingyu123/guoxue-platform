import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(params: {
    userId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    ip?: string;
  }) {
    return this.prisma.auditLog.create({ data: params });
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
    const where: any = {};
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
}
