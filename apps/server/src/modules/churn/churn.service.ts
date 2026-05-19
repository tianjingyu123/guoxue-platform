import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

/** 每批处理的用户数 */
const SCORE_BATCH_SIZE = 500;

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
    let cursor: string | undefined;
    let totalProcessed = 0;

    do {
      const users = await this.prisma.user.findMany({
        where: { status: "ACTIVE", ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, updatedAt: true },
        take: SCORE_BATCH_SIZE,
        orderBy: { id: "asc" },
      });

      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      // 批量计算评分 — 6 次 groupBy 替代 N*6 次 count
      const scores = await this.batchCalculateScores(
        users.map((u) => u.id),
        thirtyDaysAgo,
      );

      // 批量 upsert churnPrediction
      const upserts = users.map((user) => {
        const score = scores[user.id] ?? 0;
        const daysSinceActive = user.updatedAt
          ? Math.floor((now.getTime() - new Date(user.updatedAt).getTime()) / 86400000)
          : 999;

        const riskLevel =
          score >= 60 ? "LOW" : score >= 30 ? "MEDIUM" : score >= 10 ? "HIGH" : "CRITICAL";

        const factors: string[] = [];
        if (daysSinceActive > 7) factors.push("LONG_INACTIVE");
        if (daysSinceActive > 14) factors.push("VERY_LONG_INACTIVE");
        if (daysSinceActive > 30) factors.push("SILENT_USER");
        if (score < 30) factors.push("LOW_ENGAGEMENT");
        if (score < 10) factors.push("ALMOST_GONE");

        return this.prisma.churnPrediction.upsert({
          where: { userId: user.id },
          create: { userId: user.id, activityScore: score, riskLevel, daysSinceActive, churnFactors: factors },
          update: { activityScore: score, riskLevel, daysSinceActive, churnFactors: factors, predictedAt: now },
        });
      });

      await this.prisma.$transaction(upserts);
      totalProcessed += users.length;

      // 高风险用户批量触发动作
      const highRiskPairs: Array<{ userId: string; riskLevel: string }> = [];
      for (const user of users) {
        const score = scores[user.id] ?? 0;
        const riskLevel =
          score >= 60 ? "LOW" : score >= 30 ? "MEDIUM" : score >= 10 ? "HIGH" : "CRITICAL";
        if (["HIGH", "CRITICAL"].includes(riskLevel)) {
          highRiskPairs.push({ userId: user.id, riskLevel });
        }
      }
      if (highRiskPairs.length > 0) {
        await this.batchTriggerActions(highRiskPairs);
      }
    } while (cursor);

    this.logger.log(`流失评分完成，处理 ${totalProcessed} 用户`);
  }

  /** 批量计算用户活跃评分 — 6 次 groupBy 聚合替代 N×6 次 count */
  private async batchCalculateScores(userIds: string[], since: Date): Promise<Record<string, number>> {
    const scoreMap: Record<string, number> = {};
    for (const id of userIds) scoreMap[id] = 0;

    const addScores = (records: Array<{ userId: string; _count: number }>, weight: number) => {
      for (const r of records) {
        scoreMap[r.userId] = (scoreMap[r.userId] || 0) + r._count * weight;
      }
    };

    const [viewCounts, likeCounts, collectCounts, purchaseCounts, commentCounts, logCounts] =
      await Promise.all([
        this.prisma.userBehavior.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, behavior: "VIEW", createdAt: { gte: since } },
          _count: true,
        }),
        this.prisma.userBehavior.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, behavior: "LIKE", createdAt: { gte: since } },
          _count: true,
        }),
        this.prisma.userBehavior.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, behavior: "COLLECT", createdAt: { gte: since } },
          _count: true,
        }),
        this.prisma.order.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: since }, status: "PAID" },
          _count: true,
        }),
        this.prisma.comment.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: since } },
          _count: true,
        }),
        this.prisma.userBehaviorLog.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, createdAt: { gte: since } },
          _count: true,
        }),
      ]);

    addScores(viewCounts as any, 1);
    addScores(likeCounts as any, 3);
    addScores(collectCounts as any, 5);
    addScores(purchaseCounts as any, 20);
    addScores(commentCounts as any, 10);
    addScores(logCounts as any, 2);

    for (const id of userIds) {
      scoreMap[id] = Math.min(100, scoreMap[id]);
    }
    return scoreMap;
  }

  /** 批量创建流失干预动作 — 预取规则 + createMany */
  private async batchTriggerActions(pairs: Array<{ userId: string; riskLevel: string }>) {
    const allRules = await this.prisma.churnRule.findMany({ where: { isActive: true } });
    const rulesByRisk: Record<string, typeof allRules> = {};
    for (const r of allRules) {
      (rulesByRisk[r.riskLevel] ??= []).push(r);
    }

    const actions: any[] = [];
    for (const { userId, riskLevel } of pairs) {
      for (const rule of rulesByRisk[riskLevel] || []) {
        actions.push({
          userId,
          actionType: rule.actionType,
          actionData: rule.actionConfig,
          status: "PENDING",
          triggeredBy: "SYSTEM",
        });
      }
    }

    if (actions.length > 0) {
      await this.prisma.churnAction.createMany({ data: actions });
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
    return this.prisma.churnRule.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
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
