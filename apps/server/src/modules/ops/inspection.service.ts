import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ModuleRef } from "@nestjs/core";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { DashboardDailyService } from "../dashboard/dashboard-daily.service";
import { MerchantMetricService } from "../merchant/merchant-metric.service";
import { OpsService } from "./ops.service";
import { OpsTaskPriority } from "./ops.dto";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** 数字员工执行者标识（审计/任务 executor 统一用） */
export const INSPECTION_EXECUTOR = "CLAUDE";

/** 巡检阈值（设计§二.1 第4条契约） */
export const INSPECTION_THRESHOLDS = {
  /** 错误突增：近24h 错误数须超过此下限才判异常（防小样本噪声） */
  errorSurgeMin: 20,
  /** 错误突增：近24h ≥ 前24h × 此倍数 判异常 */
  errorSurgeFactor: 2,
  /** 超时未发货：PAID 超此小时数未 shipped 计入 */
  shipTimeoutHours: 48,
} as const;

export type InspectionItemStatus = "ok" | "anomaly" | "check_failed";

export interface InspectionItem {
  /** health | error_surge | settlement_reconcile | overdue_orders | cron_freshness */
  key: string;
  name: string;
  status: InspectionItemStatus;
  detail: Record<string, unknown>;
  /** 处置动作留痕：auto_fixed:目标 | task_created:任务id */
  actions: string[];
}

export interface InspectionReport {
  /** 巡检日（Asia/Shanghai 今日） */
  date: string;
  trigger: "CRON" | "MANUAL";
  /** 巡检时刻的一键接管开关状态（关=只建任务不自动处置） */
  automationEnabled: boolean;
  items: InspectionItem[];
  /** 非 ok 项数（含已自动处置项——处置了也如实记异常） */
  anomalies: number;
  /** 白名单自动处置成功次数 */
  autoFixed: number;
  /** 转人工待办任务数 */
  tasksCreated: number;
  /** 巡检日志任务（type=INSPECT status=completed）id */
  reportTaskId?: string;
}

/** 单项检查纯结果（不含处置） */
interface CheckOutcome {
  status: "ok" | "anomaly";
  detail: Record<string, unknown>;
}

/**
 * 每日巡检 cron + 分级处置（OS-P2·设计§二.1 第4条）
 *
 * 每日 07:30（redis.runExclusive "ops-inspection" 多实例互斥·早于 08:00 简报使简报可引用巡检结果）巡五项：
 * ① 健康检查 — 直查 prisma SELECT 1 + redis 读写（同 health.service 范式，免 HTTP 自调）
 * ② 错误突增 — TrackEvent action=error 近24h vs 前24h（翻倍且 >20 判异常）
 * ③ 结算对账 — Notification targetType=SETTLEMENT_RECONCILE 近24h 有新告警即异常
 * ④ 超时未发货 — Order PAID 超48h 未 shipped 计数
 * ⑤ 关键聚合新鲜度 — 无 cron 执行记录表（侦察结论），以 DashboardDaily / MerchantMetric
 *    昨日行存在性代检：缺行 = 疑似聚合 cron 未跑
 *
 * 分级处置：
 * - 白名单自动处置（仅两项·前置检查 automation_enabled·处置本身落 AuditLog executor=CLAUDE）：
 *   DashboardDaily 昨日缺行 → DashboardDailyService.rebuildDate 补跑；
 *   MerchantMetric 昨日缺行 → MerchantMetricService.aggregateDate 补跑。
 *   两服务经 ModuleRef 惰性获取（DashboardModule 未 export DashboardDailyService 且属他线勿动区，
 *   strict:false 直取全局单例，避免重复注册 provider 导致 @Cron 重复挂载）。
 * - 其余异常 → 建 OpsTask(type=INSPECT·priority 按严重度·needsApproval=false·payload=巡检详情) 转人工。
 * - 开关关（一键接管）→ 一律只建任务不动手。
 *
 * 巡检报告：无论有无异常都落一条 OpsTask(type=INSPECT status=completed result=五项汇总) 作巡检日志。
 */
@Injectable()
export class InspectionService {
  private readonly logger = new Logger(InspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly systemService: SystemService,
    private readonly opsService: OpsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** 每日 07:30 巡检（多实例互斥·早于 08:00 简报） */
  @Cron("30 7 * * *")
  async dailyInspectionCron(): Promise<void> {
    await this.redis.runExclusive("ops-inspection", 600, async () => {
      try {
        const r = await this.runInspection("CRON");
        this.logger.log(`每日巡检完成 ${r.date}：异常 ${r.anomalies} 项·自动处置 ${r.autoFixed}·转人工 ${r.tasksCreated}`);
      } catch (e) {
        this.logger.error("每日巡检失败", e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 执行一轮巡检（五项检查 → 分级处置 → 落巡检报告任务）。手动端点与 cron 共用 */
  async runInspection(trigger: "CRON" | "MANUAL" = "MANUAL"): Promise<InspectionReport> {
    const date = this.dateStrShanghai(0);
    // 开关读取失败按"关"保守处理：只建任务不动手
    const automationEnabled = await this.systemService.isAutomationEnabled().catch((e) => {
      this.logger.warn(`自动化开关读取失败，本轮按关闭处理：${e instanceof Error ? e.message : String(e)}`);
      return false;
    });

    const report: InspectionReport = { date, trigger, automationEnabled, items: [], anomalies: 0, autoFixed: 0, tasksCreated: 0 };

    // ① 健康检查
    const health = await this.runCheck("health", "健康检查", () => this.checkHealth());
    report.items.push(health);
    await this.disposeSimple(report, health, "HIGH", (d) => {
      const db = d.db as Record<string, unknown> | undefined;
      const rds = d.redis as Record<string, unknown> | undefined;
      return `巡检异常：健康检查失败（db=${db?.status}·redis=${rds?.status}）`;
    });

    // ② 错误突增
    const surge = await this.runCheck("error_surge", "错误突增", () => this.checkErrorSurge());
    report.items.push(surge);
    await this.disposeSimple(report, surge, "HIGH", (d) => `巡检异常：前端错误突增（近24h ${d.current} 条·前24h ${d.previous} 条）`);

    // ③ 结算对账告警
    const reconcile = await this.runCheck("settlement_reconcile", "结算对账", () => this.checkSettlementReconcile());
    report.items.push(reconcile);
    await this.disposeSimple(report, reconcile, "HIGH", (d) => `巡检异常：结算对账告警（近24h ${d.alerts} 条，请核对 SettlementReconcile 日志）`);

    // ④ 超时未发货
    const overdue = await this.runCheck("overdue_orders", "超时未发货", () => this.checkOverdueOrders());
    report.items.push(overdue);
    await this.disposeSimple(report, overdue, "MEDIUM", (d) => `巡检异常：超时未发货订单 ${d.count} 笔（PAID 超 ${INSPECTION_THRESHOLDS.shipTimeoutHours}h 未发货）`);

    // ⑤ 关键聚合新鲜度（白名单自动处置项）
    const fresh = await this.runCheck("cron_freshness", "关键聚合新鲜度", () => this.checkCronFreshness());
    report.items.push(fresh);
    await this.disposeCronFreshness(report, fresh, automationEnabled);

    report.anomalies = report.items.filter((i) => i.status !== "ok").length;
    await this.saveReportTask(report);
    return report;
  }

  // ───────── 五项检查 ─────────

  /** ① 健康检查：prisma SELECT 1 + redis 读写（任一失败即异常） */
  private async checkHealth(): Promise<CheckOutcome> {
    const db: Record<string, unknown> = {};
    const rds: Record<string, unknown> = {};
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      db.status = "ok";
      db.latencyMs = Date.now() - start;
    } catch (e) {
      db.status = "fail";
      db.error = e instanceof Error ? e.message : String(e);
    }
    try {
      const key = `ops:inspection:health:${Date.now()}`;
      await this.redis.set(key, "1", 10);
      const val = await this.redis.get(key);
      if (val !== "1") throw new Error("Redis 读写不一致");
      rds.status = "ok";
    } catch (e) {
      rds.status = "fail";
      rds.error = e instanceof Error ? e.message : String(e);
    }
    const ok = db.status === "ok" && rds.status === "ok";
    return { status: ok ? "ok" : "anomaly", detail: { db, redis: rds } };
  }

  /** ② 错误突增：TrackEvent action=error 近24h vs 前24h，翻倍且 >20 判异常 */
  private async checkErrorSurge(): Promise<CheckOutcome> {
    const now = Date.now();
    const [current, previous] = await Promise.all([
      this.prisma.trackEvent.count({ where: { action: "error", createdAt: { gte: new Date(now - DAY_MS) } } }),
      this.prisma.trackEvent.count({ where: { action: "error", createdAt: { gte: new Date(now - 2 * DAY_MS), lt: new Date(now - DAY_MS) } } }),
    ]);
    const surged = current > INSPECTION_THRESHOLDS.errorSurgeMin && current >= previous * INSPECTION_THRESHOLDS.errorSurgeFactor;
    return {
      status: surged ? "anomaly" : "ok",
      detail: { current, previous, min: INSPECTION_THRESHOLDS.errorSurgeMin, factor: INSPECTION_THRESHOLDS.errorSurgeFactor },
    };
  }

  /** ③ 结算对账：Notification targetType=SETTLEMENT_RECONCILE 近24h 有新告警即异常 */
  private async checkSettlementReconcile(): Promise<CheckOutcome> {
    const alerts = await this.prisma.notification.count({
      where: { targetType: "SETTLEMENT_RECONCILE", createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    return { status: alerts > 0 ? "anomaly" : "ok", detail: { alerts } };
  }

  /** ④ 超时未发货：Order PAID 超48h 未 shipped 计数 */
  private async checkOverdueOrders(): Promise<CheckOutcome> {
    const cutoff = new Date(Date.now() - INSPECTION_THRESHOLDS.shipTimeoutHours * HOUR_MS);
    const count = await this.prisma.order.count({
      where: { status: "PAID", shippedAt: null, paidAt: { lt: cutoff } },
    });
    return { status: count > 0 ? "anomaly" : "ok", detail: { count, timeoutHours: INSPECTION_THRESHOLDS.shipTimeoutHours } };
  }

  /**
   * ⑤ 关键聚合新鲜度：昨日 DashboardDaily 行 / MerchantMetric 行存在性。
   * MerchantMetric 无 ACTIVE 商家时缺行是合法空态（aggregateDate 0 商家早返不落行），不判异常。
   */
  private async checkCronFreshness(): Promise<CheckOutcome> {
    const date = this.dateStrShanghai(-1);
    const [dashRow, activeMerchants, metricRows] = await Promise.all([
      this.prisma.dashboardDaily.findUnique({ where: { date }, select: { id: true } }),
      this.prisma.merchant.count({ where: { status: "ACTIVE" } }),
      this.prisma.merchantMetric.count({ where: { date } }),
    ]);
    const dashboardDailyMissing = !dashRow;
    const merchantMetricMissing = activeMerchants > 0 && metricRows === 0;
    return {
      status: dashboardDailyMissing || merchantMetricMissing ? "anomaly" : "ok",
      detail: { date, dashboardDailyMissing, merchantMetricMissing, activeMerchants },
    };
  }

  // ───────── 分级处置 ─────────

  /** 检查项包裹：检查自身抛错不中断整轮巡检，记 check_failed */
  private async runCheck(key: string, name: string, fn: () => Promise<CheckOutcome>): Promise<InspectionItem> {
    try {
      const r = await fn();
      return { key, name, status: r.status, detail: r.detail, actions: [] };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.logger.error(`巡检项「${name}」执行失败：${error}`);
      return { key, name, status: "check_failed", detail: { error }, actions: [] };
    }
  }

  /** 白名单外异常统一处置：建 OpsTask 转人工（check_failed 也建·降 MEDIUM） */
  private async disposeSimple(
    report: InspectionReport,
    item: InspectionItem,
    priority: OpsTaskPriority,
    titleFn: (detail: Record<string, unknown>) => string,
  ): Promise<void> {
    if (item.status === "ok") return;
    if (item.status === "check_failed") {
      await this.createTask(report, item, "MEDIUM", `巡检项执行失败：${item.name}（${String(item.detail.error ?? "")}）`);
      return;
    }
    await this.createTask(report, item, priority, titleFn(item.detail));
  }

  /**
   * ⑤ 专属处置：白名单自动补跑（仅 DashboardDaily/MerchantMetric 两项）。
   * automation_enabled=false 或补跑失败 → 建任务转人工。
   */
  private async disposeCronFreshness(report: InspectionReport, item: InspectionItem, automationEnabled: boolean): Promise<void> {
    if (item.status === "ok") return;
    if (item.status === "check_failed") {
      await this.createTask(report, item, "MEDIUM", `巡检项执行失败：${item.name}（${String(item.detail.error ?? "")}）`);
      return;
    }
    const date = String(item.detail.date);
    const targets: Array<{ missing: boolean; label: string; fix: () => Promise<unknown> }> = [
      {
        missing: !!item.detail.dashboardDailyMissing,
        label: "DashboardDaily",
        fix: () => this.moduleRef.get(DashboardDailyService, { strict: false }).rebuildDate(date),
      },
      {
        missing: !!item.detail.merchantMetricMissing,
        label: "MerchantMetric",
        fix: () => this.moduleRef.get(MerchantMetricService, { strict: false }).aggregateDate(date),
      },
    ];
    for (const t of targets) {
      if (!t.missing) continue;
      if (!automationEnabled) {
        // 一键接管已关：只建任务不动手
        await this.createTask(report, item, "MEDIUM", `巡检异常：${t.label} 昨日(${date})聚合缺失（自动化已暂停·转人工补跑）`);
        continue;
      }
      try {
        await t.fix();
        item.actions.push(`auto_fixed:${t.label}`);
        report.autoFixed += 1;
        // 处置本身落审计（executor=CLAUDE）
        await this.audit("ops_inspection.autofix", date, `巡检白名单自动处置：补跑 ${t.label} ${date} 聚合`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`巡检自动补跑 ${t.label} ${date} 失败：${msg}`);
        await this.createTask(report, item, "HIGH", `巡检异常：${t.label} 昨日(${date})聚合缺失且自动补跑失败（${msg}）`);
      }
    }
  }

  /** 建转人工待办任务（复用 OpsService.create 含审计；失败仅记日志不中断巡检） */
  private async createTask(report: InspectionReport, item: InspectionItem, priority: OpsTaskPriority, title: string): Promise<void> {
    try {
      const task = await this.opsService.create(
        {
          type: "INSPECT",
          title,
          priority,
          needsApproval: false,
          payload: { inspectionDate: report.date, key: item.key, detail: item.detail },
        },
        INSPECTION_EXECUTOR,
      );
      item.actions.push(`task_created:${task.id}`);
      report.tasksCreated += 1;
    } catch (e) {
      this.logger.error(`巡检待办任务创建失败「${title}」`, e instanceof Error ? e.stack : String(e));
    }
  }

  /** 巡检报告落库：无论有无异常都落一条 completed 任务作巡检日志 */
  private async saveReportTask(report: InspectionReport): Promise<void> {
    try {
      const title = `每日巡检报告 ${report.date}（${report.anomalies === 0 ? "全绿" : `异常 ${report.anomalies} 项`}）`;
      const task = await this.prisma.opsTask.create({
        data: {
          type: "INSPECT",
          status: "completed",
          priority: "LOW",
          title,
          executor: INSPECTION_EXECUTOR,
          payload: { trigger: report.trigger, inspectionDate: report.date } as Prisma.InputJsonValue,
          result: {
            automationEnabled: report.automationEnabled,
            anomalies: report.anomalies,
            autoFixed: report.autoFixed,
            tasksCreated: report.tasksCreated,
            items: report.items,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      report.reportTaskId = task.id;
      await this.audit(
        "ops_inspection.report",
        report.date,
        `每日巡检完成：异常 ${report.anomalies} 项·自动处置 ${report.autoFixed}·转人工 ${report.tasksCreated}`,
      );
    } catch (e) {
      this.logger.error("巡检报告任务落库失败", e instanceof Error ? e.stack : String(e));
    }
  }

  /** 审计（executor=CLAUDE·失败仅记日志） */
  private async audit(action: string, targetId: string, detail: string): Promise<void> {
    try {
      await this.systemService.logAudit({
        userId: INSPECTION_EXECUTOR,
        executor: INSPECTION_EXECUTOR,
        action,
        targetType: "OPS_INSPECTION",
        targetId,
        detail,
      });
    } catch (e) {
      this.logger.warn("巡检审计写入失败", e instanceof Error ? e.message : String(e));
    }
  }

  /** 当前 Asia/Shanghai 日期串 YYYY-MM-DD（可传偏移天数，-1=昨天·与 DashboardDaily 同范式） */
  private dateStrShanghai(offsetDays = 0): string {
    const sh = new Date(new Date(Date.now() + offsetDays * DAY_MS).toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }
}
