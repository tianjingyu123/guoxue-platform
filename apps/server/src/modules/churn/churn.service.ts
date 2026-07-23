import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { SmsService } from "../sms/sms.service";
import { NotificationService } from "../notification/notification.service";
import { MarketingService } from "../marketing/marketing.service";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";
import { COMPETITION_DEMO_PREFIX } from "../competition/competition-public.policy";

/** 每批处理的用户数 */
const SCORE_BATCH_SIZE = 500;

const DEFAULT_ACTION_COOLDOWN_DAYS = 7;
const MIN_CHURN_OBSERVATION_DAYS = 7;
const MAX_ACTION_COOLDOWN_DAYS = 90;
const EXCLUDED_CHURN_USER_PREFIXES = [COMPETITION_DEMO_PREFIX, "BOT_"] as const;

interface ChurnCandidate {
  userId: string;
  riskLevel: string;
  activityScore: number;
  daysSinceActive: number;
  lastActiveAt: Date;
}
@Injectable()
export class ChurnService {
  private readonly logger = new Logger(ChurnService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private smsService?: SmsService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private marketingService?: MarketingService,
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
        where: {
          status: "ACTIVE",
          NOT: EXCLUDED_CHURN_USER_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, createdAt: true },
        take: SCORE_BATCH_SIZE,
        orderBy: { id: "asc" },
      });

      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      // 批量聚合评分与真实埋点活跃时间，替代逐用户查询。
      const { scores, lastActiveAt } = await this.batchCalculateScores(
        users.map((u) => u.id),
        thirtyDaysAgo,
      );

      // 最近活跃统一使用全局 TrackEvent 埋点；无埋点时仅回退注册时间，资料修改不再伪装成活跃。
      const candidates: ChurnCandidate[] = users.map((user) => {
        const score = scores[user.id] ?? 0;
        const activeAt = lastActiveAt[user.id] ?? user.createdAt;
        const daysSinceActive = Math.max(0, Math.floor((now.getTime() - activeAt.getTime()) / 86400000));
        return { userId: user.id, riskLevel: this.classifyRisk(score, daysSinceActive), activityScore: score, daysSinceActive, lastActiveAt: activeAt };
      });

      // 批量 upsert churnPrediction
      const upserts = candidates.map((candidate) => {
        const factors: string[] = [];
        if (candidate.daysSinceActive > 7) factors.push("LONG_INACTIVE");
        if (candidate.daysSinceActive > 14) factors.push("VERY_LONG_INACTIVE");
        if (candidate.daysSinceActive > 30) factors.push("SILENT_USER");
        if (candidate.activityScore < 30) factors.push("LOW_ENGAGEMENT");
        if (candidate.activityScore < 10) factors.push("ALMOST_GONE");

        return this.prisma.churnPrediction.upsert({
          where: { userId: candidate.userId },
          create: { userId: candidate.userId, activityScore: candidate.activityScore, riskLevel: candidate.riskLevel, lastActiveAt: candidate.lastActiveAt, daysSinceActive: candidate.daysSinceActive, churnFactors: factors },
          update: { activityScore: candidate.activityScore, riskLevel: candidate.riskLevel, lastActiveAt: candidate.lastActiveAt, daysSinceActive: candidate.daysSinceActive, churnFactors: factors, predictedAt: now },
        });
      });

      await this.prisma.$transaction(upserts);
      totalProcessed += users.length;

      if (candidates.length > 0) {
        await this.batchTriggerActions(candidates);
      }
    } while (cursor);

    this.logger.log(`流失评分完成，处理 ${totalProcessed} 用户`);
  }

  /** 批量计算用户活跃评分，并从真实全局埋点聚合最后活跃时间。 */
  private async batchCalculateScores(
    userIds: string[],
    since: Date,
  ): Promise<{ scores: Record<string, number>; lastActiveAt: Record<string, Date> }> {
    const scoreMap: Record<string, number> = {};
    for (const id of userIds) scoreMap[id] = 0;

    const addScores = (records: Array<{ userId: string | null; _count: number }>, weight: number) => {
      for (const r of records) {
        if (r.userId) scoreMap[r.userId] = (scoreMap[r.userId] || 0) + r._count * weight;
      }
    };

    const [viewCounts, likeCounts, collectCounts, purchaseCounts, commentCounts, trackCounts, latestActivities] =
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
        this.prisma.trackEvent.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, occurredAt: { gte: since } },
          _count: true,
        }),
        this.prisma.trackEvent.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _max: { occurredAt: true },
        }),
      ]);

    addScores(viewCounts, 1);
    addScores(likeCounts, 3);
    addScores(collectCounts, 5);
    addScores(purchaseCounts, 20);
    addScores(commentCounts, 10);
    addScores(trackCounts, 2);

    for (const id of userIds) {
      scoreMap[id] = Math.min(100, scoreMap[id]);
    }
    const lastActiveAt: Record<string, Date> = {};
    for (const activity of latestActivities) {
      if (activity.userId && activity._max.occurredAt) {
        lastActiveAt[activity.userId] = activity._max.occurredAt;
      }
    }
    return { scores: scoreMap, lastActiveAt };
  }

  private classifyRisk(score: number, daysSinceActive: number): string {
    // 新注册或近 7 天仍有行为的用户不属于流失人群，避免冷启动用户被标成 CRITICAL。
    if (daysSinceActive < MIN_CHURN_OBSERVATION_DAYS) return "LOW";
    return score >= 60 ? "LOW" : score >= 30 ? "MEDIUM" : score >= 10 ? "HIGH" : "CRITICAL";
  }

  /** 批量创建流失干预动作：阈值真实生效，并按规则冷却期去重。 */
  private async batchTriggerActions(pairs: ChurnCandidate[]) {
    // 竞赛演示账号与 AI 系统账号均不属于真人用户，绝不能进入自动召回或发券/短信链路。
    const eligiblePairs = pairs.filter((pair) =>
      !EXCLUDED_CHURN_USER_PREFIXES.some((prefix) => pair.userId.startsWith(prefix)),
    );
    if (eligiblePairs.length === 0) return;
    const allRules = await this.prisma.churnRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (allRules.length === 0) return;
    const rulesByRisk: Record<string, typeof allRules> = {};
    let maxCooldownDays = DEFAULT_ACTION_COOLDOWN_DAYS;
    for (const rule of allRules) {
      (rulesByRisk[rule.riskLevel] ??= []).push(rule);
      const config = this.recordOf(rule.actionConfig);
      const cooldownDays = this.normalizeCooldownDays(config.cooldownDays);
      maxCooldownDays = Math.max(maxCooldownDays, cooldownDays);
    }

    const recentActions = await this.prisma.churnAction.findMany({
      where: {
        userId: { in: [...new Set(eligiblePairs.map((pair) => pair.userId))] },
        createdAt: { gte: new Date(Date.now() - maxCooldownDays * 86400000) },
      },
      select: { userId: true, actionType: true, actionData: true, createdAt: true },
    });
    const recentRuleActions = new Map<string, Date>();
    const recentLegacyActions = new Map<string, Date>();
    for (const action of recentActions) {
      const data = this.recordOf(action.actionData);
      const ruleId = typeof data._ruleId === "string" ? data._ruleId : "";
      const key = ruleId
        ? `${action.userId}:${ruleId}`
        : `${action.userId}:${action.actionType}`;
      const target = ruleId ? recentRuleActions : recentLegacyActions;
      const previous = target.get(key);
      if (!previous || action.createdAt > previous) target.set(key, action.createdAt);
    }

    const actions: Prisma.ChurnActionCreateManyInput[] = [];
    const scheduledActionTypes = new Set<string>();
    for (const { userId, riskLevel, activityScore, daysSinceActive } of eligiblePairs) {
      // 不对新用户或近 7 天仍活跃用户做自动召回，即使误配了低风险规则也不会打扰。
      if (daysSinceActive < MIN_CHURN_OBSERVATION_DAYS) continue;
      for (const rule of rulesByRisk[riskLevel] || []) {
        if (rule.scoreThreshold !== null && activityScore > rule.scoreThreshold) continue;
        if (rule.daysThreshold !== null && daysSinceActive < rule.daysThreshold) continue;
        const config = this.recordOf(rule.actionConfig);
        const cooldownDays = this.normalizeCooldownDays(config.cooldownDays);
        const cutoff = Date.now() - cooldownDays * 86400000;
        const recent = recentRuleActions.get(`${userId}:${rule.id}`)
          ?? recentLegacyActions.get(`${userId}:${rule.actionType}`);
        if (recent && recent.getTime() >= cutoff) continue;
        const scheduledKey = `${userId}:${rule.actionType}`;
        // 同一轮同一用户每种通道只安排一次，避免多个同级规则造成短信/优惠券轰炸。
        if (scheduledActionTypes.has(scheduledKey)) continue;
        actions.push({
          userId,
          actionType: rule.actionType,
          actionData: {
            ...config,
            _ruleId: rule.id,
            _cooldownDays: cooldownDays,
          } as Prisma.InputJsonValue,
          status: "PENDING",
          triggeredBy: "SYSTEM",
        });
        scheduledActionTypes.add(scheduledKey);
      }
    }

    if (actions.length > 0) {
      await this.prisma.churnAction.createMany({ data: actions });
    }
  }

  private recordOf(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private normalizeCooldownDays(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_ACTION_COOLDOWN_DAYS;
    return Math.min(MAX_ACTION_COOLDOWN_DAYS, Math.max(1, Math.trunc(parsed)));
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
      where: {
        status: "PENDING",
        NOT: EXCLUDED_CHURN_USER_PREFIXES.map((prefix) => ({ userId: { startsWith: prefix } })),
      },
      take: 100,
      orderBy: { createdAt: "asc" },
    });

    if (actions.length === 0) return;

    let succeeded = 0;
    let failed = 0;

    // 2026-07-17 审计修复：此前无论动作是否真执行（未知类型/缺 phone/COUPON 待人工）一律标 COMPLETED，
    // 运营看到"已完成"实际什么都没发。现在只有真执行成功才 COMPLETED：
    // - 未知类型 / 前置条件缺失 → FAILED + 原因
    // - COUPON 无法自动发放 → PENDING_MANUAL（诚实值·不进 PENDING 重试队列，运营在动作列表按状态筛出人工处理）
    for (const action of actions) {
      try {
        const data = action.actionData as Record<string, unknown> | null;
        let outcome: {
          status: "COMPLETED" | "FAILED" | "PENDING_MANUAL" | "SKIPPED";
          note?: string;
        } = { status: "COMPLETED" };

        switch (action.actionType) {
          case "SMS": {
            if (!this.smsService) {
              outcome = { status: "PENDING_MANUAL", note: "SMS 服务不可用，待人工处理" };
              break;
            }
            // 目标号码只信任用户主数据，绝不接受规则 JSON 自报 phone，防误发给第三方号码。
            const user = await this.prisma.user.findUnique({
              where: { id: action.userId },
              select: { phone: true, notifySettings: true },
            });
            if (!user?.phone) {
              outcome = { status: "FAILED", note: "目标用户无手机号，无法发送召回短信" };
              break;
            }
            const notifySettings = this.recordOf(user.notifySettings);
            if (notifySettings.marketingSms !== true) {
              outcome = { status: "PENDING_MANUAL", note: "用户未主动同意活动与福利短信，禁止自动发送" };
              break;
            }
            const rawParams = data?.templateParams;
            if (rawParams !== undefined && (!Array.isArray(rawParams) || rawParams.some((value) => typeof value !== "string"))) {
              outcome = { status: "FAILED", note: "短信 templateParams 必须是字符串数组" };
              break;
            }
            const sendResult = await this.smsService.sendRetentionMessage(
              user.phone,
              (rawParams as string[] | undefined) ?? [],
              this.normalizeCooldownDays(data?._cooldownDays ?? data?.cooldownDays),
            );
            const statusByDisposition = {
              SENT: "COMPLETED",
              MANUAL: "PENDING_MANUAL",
              SKIPPED: "SKIPPED",
              FAILED: "FAILED",
            } as const;
            outcome = { status: statusByDisposition[sendResult.disposition], note: sendResult.message };
            break;
          }
          case "COUPON": {
            const couponId = ((data?.couponId ?? data?.templateId) as string | undefined)?.trim();
            if (this.marketingService && couponId) {
              // 真发放且可核销：券体系已统一，grantCoupon 现建「商城优惠券」UserCoupon（结算 applyCouponPricing 真抵扣），
              // 不再进旧 CouponRecord 废券表。故 couponId 需为「商城优惠券」(Coupon) id；
              // 券不存在/失效/过期 → grantCoupon 抛错，被下方 catch 标 FAILED（诚实失败，不再静默发废券）。
              await this.marketingService.grantCoupon(couponId, { userId: action.userId });
            } else {
              outcome = {
                status: "PENDING_MANUAL",
                note: couponId ? "营销服务不可用，待人工发放" : "动作配置缺少 couponId（优惠券模板ID），待人工发放",
              };
              this.logger.log(`COUPON 流失动作待人工发放: userId=${action.userId}, data=${JSON.stringify(data)}`);
            }
            break;
          }
          default: {
            outcome = { status: "FAILED", note: `未实现的动作类型: ${action.actionType}` };
            this.logger.warn(`未知流失动作类型: ${action.actionType}`);
          }
        }

        await this.prisma.churnAction.update({
          where: { id: action.id },
          data: {
            status: outcome.status,
            executedAt: new Date(),
            result: outcome.status === "COMPLETED" ? outcome.note ?? "执行成功" : null,
            errorLog: outcome.status === "COMPLETED" ? null : outcome.note ?? null,
          },
        });
        if (outcome.status === "COMPLETED") succeeded++;
        else failed++;
      } catch (err: unknown) {
        const msg = (err as Error).message?.substring(0, 200);
        await this.prisma.churnAction.update({
          where: { id: action.id },
          data: { status: "FAILED", errorLog: msg, executedAt: new Date() },
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
    const where: Prisma.ChurnPredictionWhereInput = {
      NOT: EXCLUDED_CHURN_USER_PREFIXES.map((prefix) => ({ userId: { startsWith: prefix } })),
    };
    if (riskLevel) where.riskLevel = riskLevel;
    const [predictions, total] = await Promise.all([
      this.prisma.churnPrediction.findMany({ where, skip, take: pageSize, orderBy: { activityScore: "asc" } }),
      this.prisma.churnPrediction.count({ where }),
    ]);
    return { predictions, total, page, pageSize };
  }

  async getStats() {
    const withoutExcludedUsers: Prisma.ChurnPredictionWhereInput = {
      NOT: EXCLUDED_CHURN_USER_PREFIXES.map((prefix) => ({ userId: { startsWith: prefix } })),
    };
    const [low, medium, high, critical] = await Promise.all([
      this.prisma.churnPrediction.count({ where: { ...withoutExcludedUsers, riskLevel: "LOW" } }),
      this.prisma.churnPrediction.count({ where: { ...withoutExcludedUsers, riskLevel: "MEDIUM" } }),
      this.prisma.churnPrediction.count({ where: { ...withoutExcludedUsers, riskLevel: "HIGH" } }),
      this.prisma.churnPrediction.count({ where: { ...withoutExcludedUsers, riskLevel: "CRITICAL" } }),
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
    const where: Prisma.ChurnActionWhereInput = {
      NOT: EXCLUDED_CHURN_USER_PREFIXES.map((prefix) => ({ userId: { startsWith: prefix } })),
    };
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
