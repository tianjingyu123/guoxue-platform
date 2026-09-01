import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiEventBusService } from "./ai-event-bus.service";
import { AiGatewayService } from "./ai-gateway.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

const ANOMALY_EVENT_COOLDOWN_SECONDS = 6 * 3600;

export interface AnomalyRule {
  id: string;
  metric: string;
  dimension: "revenue" | "user" | "content" | "performance";
  direction: "up" | "down" | "both";
  baselineWindow: number; // 基线窗口天数
  deviationThreshold: number; // 偏离阈值（标准差倍数）
  severity: "info" | "warning" | "critical";
  enabled: boolean;
}

export interface AnomalyReport {
  ruleId: string;
  metric: string;
  currentValue: number;
  baselineMean: number;
  baselineStd: number;
  deviation: number;
  severity: string;
  summary: string;
  detectedAt: Date;
}

/**
 * AI异常检测服务
 *
 * 多维度自动巡检，主动发现异常并生成报告。
 * 比固定阈值告警更智能——基于历史基线动态判断。
 *
 * 检测维度：
 * - 营收异常：收入突降/突增
 * - 用户异常：注册量/活跃度异常
 * - 内容异常：低质内容涌入/发布量骤降
 * - 性能异常：API延迟飙升/错误率上升
 */
@Injectable()
export class AnomalyDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnomalyDetectorService.name);
  private rules: AnomalyRule[] = [];
  private unsubscribeRuleReload?: () => Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventBus: AiEventBusService,
    private readonly aiGateway: AiGatewayService,
  ) {
    this.initDefaultRules();
  }

  async onModuleInit(): Promise<void> {
    await this.loadPersistedRules();
    this.unsubscribeRuleReload = await this.redis.subscribe("ai:anomaly-rules:reload", async () => {
      await this.loadPersistedRules();
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribeRuleReload?.();
  }

  /** 只允许调整已绑定真实查询适配器的规则；禁止注册一个永远不取数的“展示规则”。 */
  async registerRule(rule: Omit<AnomalyRule, "direction"> & { direction?: AnomalyRule["direction"] }): Promise<void> {
    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx < 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "规则未绑定真实指标数据源，不能启用");
    this.rules[idx] = { ...rule, direction: rule.direction ?? this.rules[idx].direction };
    await this.persistRules();
    this.logger.log(`异常检测规则已注册: ${rule.id}`);
  }

  /** 启用/停用规则：持久化并广播所有节点，重启后不会悄悄恢复默认值。 */
  async toggleRule(ruleId: string, enabled?: boolean): Promise<{ id: string; enabled: boolean }> {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) throw new BusinessException(ErrorCode.NOT_FOUND, "规则不存在");
    rule.enabled = enabled === undefined ? !rule.enabled : enabled;
    await this.persistRules();
    this.logger.log(`异常检测规则 ${ruleId} → ${rule.enabled ? "启用" : "停用"}`);
    return { id: rule.id, enabled: rule.enabled };
  }

  /** 运行单条规则检测 */
  async runRule(ruleId: string): Promise<AnomalyReport | null> {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule || !rule.enabled) return null;

    const currentValue = await this.getCurrentValue(rule);
    if (currentValue === null) return null;

    const baseline = await this.buildBaseline(rule);
    if (!baseline || baseline.values.length < 3) return null;

    const mean =
      baseline.values.reduce((a, b) => a + b, 0) / baseline.values.length;
    const variance =
      baseline.values.reduce((s, v) => s + (v - mean) ** 2, 0) /
      baseline.values.length;
    const std = Math.sqrt(variance);
    // 历史值完全相同时仍能识别突变，同时用 10% 均值或 1 作为噪声下限，避免零方差失明。
    const effectiveStd = Math.max(std, Math.abs(mean) * 0.1, 1);
    const signedDeviation = (currentValue - mean) / effectiveStd;
    if (rule.direction === "up" && signedDeviation <= 0) return null;
    if (rule.direction === "down" && signedDeviation >= 0) return null;
    const deviation = Math.abs(signedDeviation);
    if (deviation < rule.deviationThreshold) return null;

    const direction = currentValue > mean ? "上升" : "下降";
    const detectedSeverity =
      deviation > rule.deviationThreshold * 3
        ? "critical"
        : deviation > rule.deviationThreshold * 2
          ? "warning"
          : "info";
    const severityRank = { info: 0, warning: 1, critical: 2 } as const;
    const severity = severityRank[rule.severity] > severityRank[detectedSeverity]
      ? rule.severity
      : detectedSeverity;

    const report: AnomalyReport = {
      ruleId: rule.id,
      metric: rule.metric,
      currentValue,
      baselineMean: Math.round(mean * 100) / 100,
      baselineStd: Math.round(std * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      severity,
      summary: `${rule.metric} 当前值 ${Math.round(currentValue * 100) / 100}，较基线均值 ${Math.round(mean * 100) / 100} ${direction}，偏离 ${Math.round(deviation * 100) / 100} 个基准波动单位（${severity === "critical" ? "严重" : severity === "warning" ? "需关注" : "提示"}）`,
      detectedAt: new Date(),
    };

    // 同一规则持续异常时按 6 小时冷却，避免每小时重复创建同类运营任务；严重度升级使用独立键可立即上报。
    if (severity !== "info") {
      const shouldPublish = await this.redis.setNX(
        `ai:anomaly:cooldown:${rule.id}:${severity}`,
        report.detectedAt.toISOString(),
        ANOMALY_EVENT_COOLDOWN_SECONDS,
      );
      if (shouldPublish) {
        await this.eventBus.publish({
          type: `anomaly.detected.${rule.dimension}`,
          source: "ops",
          severity: severity as "info" | "warning" | "critical",
          payload: report as any,
        });
      } else {
        this.logger.debug(`异常 ${rule.id} 仍在冷却窗口，保留检测结果但不重复建单`);
      }
    }

    return report;
  }

  /** 运行所有规则 */
  async runAllRules(): Promise<AnomalyReport[]> {
    const reports: AnomalyReport[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      try {
        const report = await this.runRule(rule.id);
        if (report) reports.push(report);
      } catch (err: any) {
        this.logger.warn(`规则 ${rule.id} 执行失败: ${err.message}`);
      }
    }

    if (reports.length > 0) {
      this.logger.log(`异常检测完成: 发现 ${reports.length} 个异常`);
    }

    return reports;
  }

  /** 生成AI分析报告 */
  async generateReport(anomalies: AnomalyReport[]): Promise<string> {
    if (anomalies.length === 0) return "当前无异常，所有指标正常。";

    const summary = anomalies
      .map(
        (a, i) =>
          `${i + 1}. [${a.severity.toUpperCase()}] ${a.metric}: ${a.summary}`,
      )
      .join("\n");

    try {
      const result = await this.aiGateway.chat({
        scene: "anomaly-report",
        messages: [
          {
            role: "system",
            content:
              "你是平台运维分析专家。基于以下异常检测结果，用简洁的中文给出：1) 总体评估 2) 最需要关注的1-2项 3) 建议的排查方向。控制在200字以内。",
          },
          { role: "user", content: `异常检测结果：\n${summary}` },
        ],
        options: { maxTokens: 400 },
      });
      return result.content;
    } catch (err: any) {
      this.logger.warn(`AI报告生成失败: ${err.message}`);
      return `异常汇总（${anomalies.length}项）：\n${summary}`;
    }
  }

  /** 获取所有已注册规则 */
  getRules(): AnomalyRule[] {
    return [...this.rules];
  }

  /** 每小时自动巡检（分布式锁防多实例重复执行） */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCheck(): Promise<void> {
    await this.redis.runExclusive("anomaly_detector_scheduled_check", 1800, () =>
      this._scheduledCheck(),
    );
  }

  private async _scheduledCheck(): Promise<void> {
    try {
      const reports = await this.runAllRules();
      if (reports.length > 0) {
        const criticalCount = reports.filter(
          (r) => r.severity === "critical",
        ).length;
        if (criticalCount > 0) {
          const shouldPublishReport = await this.redis.setNX(
            "ai:anomaly:report:cooldown",
            new Date().toISOString(),
            ANOMALY_EVENT_COOLDOWN_SECONDS,
          );
          if (!shouldPublishReport) {
            this.logger.debug("严重异常综合报告仍在冷却窗口，跳过重复 AI 调用与建单");
            return;
          }
          const aiReport = await this.generateReport(reports);
          this.logger.warn(
            `异常巡检: ${reports.length} 项异常，${criticalCount} 项严重`,
          );
          // 严重异常可通过事件总线触发后续通知
          await this.eventBus.publish({
            type: "anomaly.report.generated",
            source: "ops",
            severity: "warning",
            payload: {
              anomalyCount: reports.length,
              criticalCount,
              aiReport,
              reports,
            } as any,
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`定时巡检失败: ${err.message}`);
    }
  }

  private initDefaultRules(): void {
    this.rules = [
      {
        id: "revenue-daily-drop",
        metric: "日营收（元）",
        dimension: "revenue",
        direction: "down",
        baselineWindow: 14,
        deviationThreshold: 2.0,
        severity: "warning",
        enabled: true,
      },
      {
        id: "user-registration-spike",
        metric: "日注册用户数",
        dimension: "user",
        direction: "up",
        baselineWindow: 14,
        deviationThreshold: 3.0,
        severity: "info",
        enabled: true,
      },
      {
        id: "user-registration-drop",
        metric: "日注册用户数（下降）",
        dimension: "user",
        direction: "down",
        baselineWindow: 14,
        deviationThreshold: 2.5,
        severity: "warning",
        enabled: true,
      },
      {
        id: "content-publish-drop",
        metric: "日内容发布量",
        dimension: "content",
        direction: "down",
        baselineWindow: 7,
        deviationThreshold: 2.5,
        severity: "warning",
        enabled: true,
      },
      {
        id: "api-latency-spike",
        metric: "AI 调用平均延迟（ms）",
        dimension: "performance",
        direction: "up",
        baselineWindow: 7,
        deviationThreshold: 3.0,
        severity: "critical",
        enabled: true,
      },
      {
        id: "api-error-rate-spike",
        metric: "前端错误率（每百次页面浏览）",
        dimension: "performance",
        direction: "up",
        baselineWindow: 7,
        deviationThreshold: 3.0,
        severity: "critical",
        enabled: true,
      },
    ];
  }

  private async getRevenueBetween(start: Date, end: Date): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: ["PAID", "COMPLETED"] },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private async getCurrentValue(
    rule: AnomalyRule,
  ): Promise<number | null> {
    // 统一使用完整的滚动 24 小时，避免凌晨把“今天尚未结束”误报为营收/注册骤降。
    const end = new Date();
    const start = new Date(end.getTime() - 86400_000);

    try {
      switch (rule.id) {
        case "revenue-daily-drop": {
          // 从订单表统计今日营收（简化版，实际需接入真实数据源）
          return this.getRevenueBetween(start, end);
        }
        case "user-registration-spike":
        case "user-registration-drop": {
          const count = await this.prisma.user.count({
            where: { createdAt: { gte: start, lt: end } },
          });
          return count;
        }
        case "content-publish-drop": {
          const count = await this.prisma.content.count({
            where: {
              createdAt: { gte: start, lt: end },
              status: "PUBLISHED",
            },
          });
          return count;
        }
        case "api-latency-spike": {
          const result = await this.prisma.aiAnalysisRecord.aggregate({
            where: { createdAt: { gte: start, lt: end }, latency: { not: null } },
            _avg: { latency: true },
          });
          return Number(result._avg.latency ?? 0);
        }
        case "api-error-rate-spike": {
          return this.getFrontendErrorRate(start, end);
        }
        default:
          return null;
      }
    } catch (err: any) {
      this.logger.debug(`获取 ${rule.id} 当前值失败: ${err.message}`);
      return null;
    }
  }

  private async buildBaseline(
    rule: AnomalyRule,
  ): Promise<{ values: number[] } | null> {
    const values: number[] = [];
    const now = new Date();

    // 简化基线：使用过去N天的每日数据
    // 实际生产可接入 Prometheus / TimescaleDB 获取更精确的时序数据
    try {
      for (let i = 1; i <= rule.baselineWindow; i++) {
        const dayEnd = new Date(now.getTime() - i * 86400_000);
        const dayStart = new Date(dayEnd.getTime() - 86400_000);

        let value = 0;
        switch (rule.id) {
          case "revenue-daily-drop": {
            value = await this.getRevenueBetween(dayStart, dayEnd);
            break;
          }
          case "user-registration-spike":
          case "user-registration-drop":
            value = await this.prisma.user.count({
              where: { createdAt: { gte: dayStart, lt: dayEnd } },
            });
            break;
          case "content-publish-drop":
            value = await this.prisma.content.count({
              where: {
                createdAt: { gte: dayStart, lt: dayEnd },
                status: "PUBLISHED",
              },
            });
            break;
          case "api-latency-spike":
            value = Number((await this.prisma.aiAnalysisRecord.aggregate({
              where: { createdAt: { gte: dayStart, lt: dayEnd }, latency: { not: null } },
              _avg: { latency: true },
            }))._avg.latency ?? 0);
            break;
          case "api-error-rate-spike":
            value = await this.getFrontendErrorRate(dayStart, dayEnd);
            break;
        }
        values.push(value);
      }
    } catch (err: any) {
      this.logger.debug(`基线计算失败: ${rule.id} - ${err.message}`);
      return null;
    }

    return { values };
  }

  private async getFrontendErrorRate(start: Date, end: Date): Promise<number> {
    const occurredAt = { gte: start, lt: end };
    const [errors, pageViews] = await Promise.all([
      this.prisma.trackEvent.count({ where: { action: "error", occurredAt } }),
      this.prisma.trackEvent.count({ where: { action: "page_view", occurredAt } }),
    ]);
    return pageViews > 0 ? (errors / pageViews) * 100 : 0;
  }

  private async loadPersistedRules(): Promise<void> {
    try {
      const row = await this.prisma.configSystem.findUnique({ where: { configKey: "ai.anomaly.rules.v1" } });
      if (!row?.configValue) return;
      const saved = JSON.parse(row.configValue) as Partial<AnomalyRule>[];
      if (!Array.isArray(saved)) return;
      for (const override of saved) {
        const idx = this.rules.findIndex((rule) => rule.id === override.id);
        if (idx >= 0) this.rules[idx] = { ...this.rules[idx], ...override } as AnomalyRule;
      }
    } catch (err: any) {
      this.logger.warn(`异常规则持久化配置加载失败，保留当前安全配置: ${err.message}`);
    }
  }

  private async persistRules(): Promise<void> {
    await this.prisma.configSystem.upsert({
      where: { configKey: "ai.anomaly.rules.v1" },
      create: {
        configKey: "ai.anomaly.rules.v1",
        configValue: JSON.stringify(this.rules),
        description: "AI 异常检测规则（仅限已绑定真实数据源的规则）",
        updatedBy: "AI_OPS_GOVERNANCE",
      },
      update: { configValue: JSON.stringify(this.rules), updatedBy: "AI_OPS_GOVERNANCE" },
    });
    await this.redis.publish("ai:anomaly-rules:reload", JSON.stringify({ changedAt: new Date().toISOString() }));
  }
}
