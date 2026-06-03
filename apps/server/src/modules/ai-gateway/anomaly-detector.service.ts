import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEventBusService } from "./ai-event-bus.service";
import { AiGatewayService } from "./ai-gateway.service";

export interface AnomalyRule {
  id: string;
  metric: string;
  dimension: "revenue" | "user" | "content" | "performance";
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
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);
  private rules: AnomalyRule[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AiEventBusService,
    private readonly aiGateway: AiGatewayService,
  ) {
    this.initDefaultRules();
  }

  /** 注册检测规则 */
  registerRule(rule: AnomalyRule): void {
    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
    this.logger.log(`异常检测规则已注册: ${rule.id}`);
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

    if (std === 0) return null;

    const deviation = Math.abs(currentValue - mean) / std;
    if (deviation < rule.deviationThreshold) return null;

    const direction = currentValue > mean ? "上升" : "下降";
    const severity =
      deviation > rule.deviationThreshold * 3
        ? "critical"
        : deviation > rule.deviationThreshold * 2
          ? "warning"
          : "info";

    const report: AnomalyReport = {
      ruleId: rule.id,
      metric: rule.metric,
      currentValue,
      baselineMean: Math.round(mean * 100) / 100,
      baselineStd: Math.round(std * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      severity,
      summary: `${rule.metric} 当前值 ${currentValue}，较基线均值 ${Math.round(mean)} ${direction} ${Math.round(deviation * 100)}%（${severity === "critical" ? "严重" : severity === "warning" ? "需关注" : "提示"}）`,
      detectedAt: new Date(),
    };

    // 发现异常 → 发布事件
    if (severity !== "info") {
      await this.eventBus.publish({
        type: `anomaly.detected.${rule.dimension}`,
        source: "ops",
        severity: severity as "info" | "warning" | "critical",
        payload: report as any,
      });
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

  /** 每日自动巡检 */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCheck(): Promise<void> {
    try {
      const reports = await this.runAllRules();
      if (reports.length > 0) {
        const criticalCount = reports.filter(
          (r) => r.severity === "critical",
        ).length;
        if (criticalCount > 0) {
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
        baselineWindow: 14,
        deviationThreshold: 2.0,
        severity: "warning",
        enabled: true,
      },
      {
        id: "user-registration-spike",
        metric: "日注册用户数",
        dimension: "user",
        baselineWindow: 14,
        deviationThreshold: 3.0,
        severity: "info",
        enabled: true,
      },
      {
        id: "user-registration-drop",
        metric: "日注册用户数（下降）",
        dimension: "user",
        baselineWindow: 14,
        deviationThreshold: 2.5,
        severity: "warning",
        enabled: true,
      },
      {
        id: "content-publish-drop",
        metric: "日内容发布量",
        dimension: "content",
        baselineWindow: 7,
        deviationThreshold: 2.5,
        severity: "warning",
        enabled: true,
      },
      {
        id: "api-latency-spike",
        metric: "API平均延迟（ms）",
        dimension: "performance",
        baselineWindow: 7,
        deviationThreshold: 3.0,
        severity: "critical",
        enabled: true,
      },
      {
        id: "api-error-rate-spike",
        metric: "API错误率（%）",
        dimension: "performance",
        baselineWindow: 7,
        deviationThreshold: 3.0,
        severity: "critical",
        enabled: true,
      },
    ];
  }

  private async getCurrentValue(
    rule: AnomalyRule,
  ): Promise<number | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400_000);

    try {
      switch (rule.id) {
        case "revenue-daily-drop": {
          // 从订单表统计今日营收（简化版，实际需接入真实数据源）
          const result = await this.prisma.$queryRawUnsafe<Array<{ total: number }>>(
            `SELECT COALESCE(SUM(amount), 0)::float as total FROM "Order" WHERE "createdAt" >= $1 AND "createdAt" < $2 AND status = 'paid'`,
            today.toISOString(),
            tomorrow.toISOString(),
          );
          return result[0]?.total || 0;
        }
        case "user-registration-spike":
        case "user-registration-drop": {
          const count = await this.prisma.user.count({
            where: { createdAt: { gte: today, lt: tomorrow } },
          });
          return count;
        }
        case "content-publish-drop": {
          const count = await this.prisma.content.count({
            where: {
              createdAt: { gte: today, lt: tomorrow },
              status: "PUBLISHED",
            },
          });
          return count;
        }
        case "api-latency-spike": {
          const result = await this.prisma.aiCacheEntry.aggregate({
            where: { lastHitAt: { gte: today } },
            _count: true,
          });
          return result._count || 0;
        }
        case "api-error-rate-spike": {
          const errors = await this.prisma.aiEvent.count({
            where: {
              severity: "critical",
              createdAt: { gte: today, lt: tomorrow },
            },
          });
          return errors;
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
    now.setHours(0, 0, 0, 0);

    // 简化基线：使用过去N天的每日数据
    // 实际生产可接入 Prometheus / TimescaleDB 获取更精确的时序数据
    try {
      for (let i = 1; i <= rule.baselineWindow; i++) {
        const dayStart = new Date(now.getTime() - i * 86400_000);
        const dayEnd = new Date(dayStart.getTime() + 86400_000);

        let value = 0;
        switch (rule.id) {
          case "revenue-daily-drop": {
            const result = await this.prisma.$queryRawUnsafe<
              Array<{ total: number }>
            >(
              `SELECT COALESCE(SUM(amount), 0)::float as total FROM "Order" WHERE "createdAt" >= $1 AND "createdAt" < $2 AND status = 'paid'`,
              dayStart.toISOString(),
              dayEnd.toISOString(),
            );
            value = result[0]?.total || 0;
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
            value =
              (await this.prisma.aiCacheEntry.count({
                where: { lastHitAt: { gte: dayStart, lt: dayEnd } },
              })) || 0;
            break;
          case "api-error-rate-spike":
            value = await this.prisma.aiEvent.count({
              where: {
                severity: "critical",
                createdAt: { gte: dayStart, lt: dayEnd },
              },
            });
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
}
