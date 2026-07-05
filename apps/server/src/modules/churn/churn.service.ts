import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { SmsService } from "../sms/sms.service";
import { NotificationService } from "../notification/notification.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

/** 每批处理的用户数 */
const SCORE_BATCH_SIZE = 500;

@Injectable()
export class ChurnService {
  private readonly logger = new Logger(ChurnService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private smsService?: SmsService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  // ───────── 每日流失评分 ─────────

  @Cron("0 6 * * *")
  async dailyChurnCalculation() {
    await this.redis.runExclusive("churn_daily_churn_calculation", 1800, () =>
      this._dailyChurnCalculation(),
    );
  }

  private async _dailyChurnCalculation() {
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

    const addScores = (records: Array<{ userId: string | null; _count: number }>, weight: number) => {
      for (const r of records) {
        if (r.userId) scoreMap[r.userId] = (scoreMap[r.userId] || 0) + r._count * weight;
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

    addScores(viewCounts, 1);
    addScores(likeCounts, 3);
    addScores(collectCounts, 5);
    addScores(purchaseCounts, 20);
    addScores(commentCounts, 10);
    addScores(logCounts, 2);

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

  /** 每小时执行：处理 PENDING 流失干预动作（分布式锁防多实例重复执行） */
  @Cron("0 * * * *")
  async processChurnActions() {
    await this.redis.runExclusive("churn_process_churn_actions", 600, () =>
      this._processChurnActions(),
    );
  }

  private async _processChurnActions() {
    const actions = await this.prisma.churnAction.findMany({
      where: { status: "PENDING" },
      take: 100,
      orderBy: { createdAt: "asc" },
    });

    if (actions.length === 0) return;

    let succeeded = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        const data = action.actionData as Record<string, unknown> | null;
        switch (action.actionType) {
          case "SMS": {
            if (this.smsService && data?.phone) {
              await this.smsService.sendVerifyCode(data.phone as string, "CHURN_RETENTION");
            } else {
              this.logger.warn(`SMS 流失动作缺少 phone 或 SMS 服务不可用: ${action.id}`);
            }
            break;
          }
          case "COUPON": {
            // 优惠券发放需要营销模块支持，记录日志待人工处理
            this.logger.log(`COUPON 流失动作待人工发放: userId=${action.userId}, data=${JSON.stringify(data)}`);
            break;
          }
          default: {
            this.logger.warn(`未知流失动作类型: ${action.actionType}`);
          }
        }

        await this.prisma.churnAction.update({
          where: { id: action.id },
          data: { status: "COMPLETED", executedAt: new Date() },
        });
        succeeded++;
      } catch (err: unknown) {
        const msg = (err as Error).message?.substring(0, 200);
        await this.prisma.churnAction.update({
          where: { id: action.id },
          data: { status: "FAILED", errorLog: msg },
        }).catch((err) => this.logger.warn("流失处理状态更新失败", err));
        failed++;
      }
    }

    if (succeeded > 0 || failed > 0) {
      this.logger.log(`流失动作处理完成: 成功${succeeded}, 失败${failed}`);
    }
  }

  // ───────── 管理接口 ─────────

  async getPredictions(rawPage = 1, rawPageSize = 20, riskLevel?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Prisma.ChurnPredictionWhereInput = {};
    if (riskLevel) where.riskLevel = riskLevel;
    const [predictions, total] = await Promise.all([
      this.prisma.churnPrediction.findMany({ where, skip, take: pageSize, orderBy: { activityScore: "asc" } }),
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

  async listActions(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: any = {};
    if (status) where.status = status;
    const [actions, total] = await Promise.all([
      this.prisma.churnAction.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.churnAction.count({ where }),
    ]);
    return { actions, total, page, pageSize };
  }

  async manualCalculate() {
    await this.dailyChurnCalculation();
    return { success: true };
  }
}
