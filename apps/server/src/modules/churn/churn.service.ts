import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ChurnService {
  private readonly logger = new Logger(ChurnService.name);

  constructor(private prisma: PrismaService) {}

  // ───────── 每日流失评分 ─────────

  @Cron("0 6 * * *")
  async dailyChurnCalculation() {
    this.logger.log("开始每日流失评分计算");
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);

    const users = await this.prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
    });

    let processed = 0;
    for (const user of users) {
      try {
        const score = await this.calculateUserScore(user.id, thirtyDaysAgo);
        const daysSinceActive = user.updatedAt
          ? Math.floor((now.getTime() - new Date(user.updatedAt).getTime()) / 86400000)
          : 999;

        const riskLevel = score >= 60 ? "LOW" : score >= 30 ? "MEDIUM" : score >= 10 ? "HIGH" : "CRITICAL";
        const factors: string[] = [];
        if (daysSinceActive > 7) factors.push("LONG_INACTIVE");
        if (daysSinceActive > 14) factors.push("VERY_LONG_INACTIVE");
        if (daysSinceActive > 30) factors.push("SILENT_USER");
        if (score < 30) factors.push("LOW_ENGAGEMENT");
        if (score < 10) factors.push("ALMOST_GONE");

        await this.prisma.churnPrediction.upsert({
          where: { userId: user.id },
          create: { userId: user.id, activityScore: score, riskLevel, daysSinceActive, churnFactors: factors },
          update: { activityScore: score, riskLevel, daysSinceActive, churnFactors: factors, predictedAt: now },
        });

        if (["HIGH", "CRITICAL"].includes(riskLevel)) {
          await this.triggerActions(user.id, riskLevel);
        }
        processed++;
      } catch (_err) {
        this.logger.warn(`用户 ${user.id} 评分计算失败`);
      }
    }
    this.logger.log(`流失评分完成，处理 ${processed} 用户`);
  }

  private async calculateUserScore(userId: string, since: Date): Promise<number> {
    const [views, likes, collects, purchases, comments, logs] = await Promise.all([
      this.prisma.userBehavior.count({ where: { userId, behavior: "VIEW", createdAt: { gte: since } } }),
      this.prisma.userBehavior.count({ where: { userId, behavior: "LIKE", createdAt: { gte: since } } }),
      this.prisma.userBehavior.count({ where: { userId, behavior: "COLLECT", createdAt: { gte: since } } }),
      this.prisma.order.count({ where: { userId, createdAt: { gte: since }, status: "PAID" } }),
      this.prisma.comment.count({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.userBehaviorLog.count({ where: { userId, createdAt: { gte: since } } }),
    ]);
    return Math.min(100, views * 1 + likes * 3 + collects * 5 + purchases * 20 + comments * 10 + logs * 2);
  }

  private async triggerActions(userId: string, riskLevel: string) {
    const rules = await this.prisma.churnRule.findMany({ where: { riskLevel, isActive: true } });
    for (const rule of rules) {
      await this.prisma.churnAction.create({
        data: {
          userId,
          actionType: rule.actionType,
          actionData: rule.actionConfig as any,
          status: "PENDING",
          triggeredBy: "SYSTEM",
        },
      });
    }
  }

  // ───────── 管理接口 ─────────

  async getPredictions(page = 1, pageSize = 20, riskLevel?: string) {
    const where: any = {};
    if (riskLevel) where.riskLevel = riskLevel;
    const [predictions, total] = await Promise.all([
      this.prisma.churnPrediction.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { activityScore: "asc" } }),
      this.prisma.churnPrediction.count({ where }),
    ]);
    return { predictions, total, page, pageSize };
  }

  async getStats() {
    const [low, medium, high, critical] = await Promise.all([
      this.prisma.churnPrediction.count({ where: { riskLevel: "LOW" } }),
      this.prisma.churnPrediction.count({ where: { riskLevel: "MEDIUM" } }),
      this.prisma.churnPrediction.count({ where: { riskLevel: "HIGH" } }),
      this.prisma.churnPrediction.count({ where: { riskLevel: "CRITICAL" } }),
    ]);
    return { low, medium, high, critical };
  }

  async listRules() {
    return this.prisma.churnRule.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createRule(dto: any) {
    return this.prisma.churnRule.create({ data: dto });
  }

  async updateRule(id: string, dto: any) {
    return this.prisma.churnRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string) {
    return this.prisma.churnRule.delete({ where: { id } });
  }

  async listActions(page = 1, pageSize = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const [actions, total] = await Promise.all([
      this.prisma.churnAction.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.churnAction.count({ where }),
    ]);
    return { actions, total, page, pageSize };
  }

  async manualCalculate() {
    await this.dailyChurnCalculation();
    return { success: true };
  }
}
