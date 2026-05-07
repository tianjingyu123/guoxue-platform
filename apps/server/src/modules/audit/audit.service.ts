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

  list(params: {
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
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([logs, total]) => ({ logs, total, page, pageSize }));
  }
}
