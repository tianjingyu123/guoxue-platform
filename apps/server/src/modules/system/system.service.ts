import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getAllConfigs() {
    return this.prisma.configSystem.findMany({
      orderBy: { configKey: "asc" },
    });
  }

  async getConfig(key: string) {
    return this.prisma.configSystem.findUnique({ where: { configKey: key } });
  }

  async setConfig(key: string, value: string, description?: string, updatedBy?: string) {
    return this.prisma.configSystem.upsert({
      where: { configKey: key },
      create: { configKey: key, configValue: value, description, updatedBy },
      update: { configValue: value, description, updatedBy },
    });
  }

  async deleteConfig(key: string) {
    return this.prisma.configSystem.delete({ where: { configKey: key } });
  }

  /** 获取多个公开配置（供前端/移动端使用） */
  async getPublicConfigs(keys: string[]) {
    const configs = await this.prisma.configSystem.findMany({
      where: { configKey: { in: keys } },
    });
    const map: Record<string, string> = {};
    configs.forEach((c) => (map[c.configKey] = c.configValue));
    return map;
  }

  // ── 审计日志 ──

  async logAudit(data: {
    userId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: string;
    ip?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async getAuditLogs(params: {
    page: number;
    pageSize: number;
    action?: string;
    userId?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, pageSize, action, userId, targetType, startDate, endDate } = params;
    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (targetType) where.targetType = targetType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total };
  }

  async getAuditActions() {
    const actions = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
    });
    return actions.map((a) => a.action);
  }
}
