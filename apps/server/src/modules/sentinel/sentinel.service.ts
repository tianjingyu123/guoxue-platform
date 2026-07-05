import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { execFile } from "child_process";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { safePagination } from "../../common/pagination";

/**
 * 业务哨兵（O-T1·运维守护体系·设计真源 docs/design/运维守护体系-监控告警应急灾备-20260705.md）
 *
 * 八条规则每 5 分钟巡检一次（runExclusive 多实例互斥）。阈值全部可由 ConfigSystem
 * `sentinel.*` 覆盖（缺省用代码默认值）。告警落 SentinelAlert 表，同 rule 未 resolved
 * 不重发（去重）；通知走站内信（SUPER_ADMIN/OPERATION_ADMIN），webhook 通道读
 * `sentinel.webhook_url`（短信密钥/群机器人就绪后配置即生效）。
 * 恢复语义：规则连续一轮不再触发时自动 resolve 并发"已恢复"通知（P1/P2）。
 */

export interface SentinelFinding {
  rule: string;
  level: "P1" | "P2" | "P3";
  message: string;
  context?: Record<string, unknown>;
}

const MIN = 60 * 1000;

@Injectable()
export class SentinelService {
  private readonly logger = new Logger(SentinelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 阈值读取：ConfigSystem sentinel.{key} 优先，缺省用默认值 */
  private async threshold(key: string, fallback: number): Promise<number> {
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: `sentinel.${key}` },
        select: { configValue: true },
      });
      const v = row ? Number(row.configValue) : NaN;
      return Number.isFinite(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  @Cron("*/5 * * * *")
  async patrol() {
    await this.redis.runExclusive("sentinel_patrol", 240, () => this.runPatrol());
  }

  /** 巡检主体（独立出来便于测试/手动触发） */
  async runPatrol(): Promise<{ fired: number; resolved: number }> {
    const checks: Array<() => Promise<SentinelFinding | null>> = [
      () => this.checkPaySuccessRate(),
      () => this.checkPayCallbackSilence(),
      () => this.checkReconcileRelay(),
      () => this.checkDauDrop(),
      () => this.checkRefundSpike(),
      () => this.checkSmsFailRate(),
      () => this.checkAiStall(),
      () => this.checkDiskWatermark(),
      () => this.checkNginx5xxRate(),
    ];

    const findings: SentinelFinding[] = [];
    const healthyRules: string[] = [];
    for (const check of checks) {
      try {
        const f = await check();
        if (f) findings.push(f);
        else healthyRules.push(this.ruleNameOf(check));
      } catch (e) {
        this.logger.warn("哨兵规则执行失败（跳过本轮）", e as Error);
      }
    }

    let fired = 0;
    for (const f of findings) {
      if (await this.fireDeduped(f)) fired++;
    }
    const resolved = await this.autoResolve(findings.map((f) => f.rule));
    if (fired || resolved) this.logger.log(`哨兵巡检：新告警 ${fired}，自动恢复 ${resolved}`);
    return { fired, resolved };
  }

  private ruleNameOf(fn: () => Promise<SentinelFinding | null>): string {
    // 依赖箭头函数体内的方法名提取（仅用于恢复判定的兜底，不精确无害）
    const m = /this\.(check\w+)/.exec(fn.toString());
    return m ? m[1] : "unknown";
  }

  // ───────── 八条规则 ─────────

  /** R1 支付成功率（P1）：创建于 [45m,15m) 前的订单（已给足30分钟支付窗）中支付占比过低 */
  private async checkPaySuccessRate(): Promise<SentinelFinding | null> {
    const now = Date.now();
    const windowWhere = { createdAt: { gte: new Date(now - 45 * MIN), lt: new Date(now - 15 * MIN) } };
    const [total, paid] = await Promise.all([
      this.prisma.order.count({ where: windowWhere }),
      this.prisma.order.count({ where: { ...windowWhere, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } } }),
    ]);
    const minSample = await this.threshold("pay_min_sample", 5);
    const minRate = await this.threshold("pay_success_rate", 0.5);
    if (total < minSample) return null;
    const rate = paid / total;
    if (rate >= minRate) return null;
    return {
      rule: "pay_success_rate",
      level: "P1",
      message: `支付成功率异常：近30分钟窗口 ${paid}/${total}=${(rate * 100).toFixed(0)}%（阈值 ${minRate * 100}%），疑似回调/渠道故障`,
      context: { total, paid, rate, minRate },
    };
  }

  /** R2 回调静默（P1）：近60分钟有新订单但零单进入已支付态 */
  private async checkPayCallbackSilence(): Promise<SentinelFinding | null> {
    const since = new Date(Date.now() - 60 * MIN);
    const [created, paid] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.order.count({ where: { createdAt: { gte: since }, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } } }),
    ]);
    const minCreated = await this.threshold("silence_min_created", 3);
    if (created < minCreated || paid > 0) return null;
    return {
      rule: "pay_callback_silence",
      level: "P1",
      message: `支付回调静默：近60分钟新增 ${created} 单但零支付成功，检查回调地址/验签/渠道`,
      context: { created, paid },
    };
  }

  /** R3 资金对账告警中继（P1）：结算对账 cron 已发现差异（复用其站内信记录），升级到哨兵通道 */
  private async checkReconcileRelay(): Promise<SentinelFinding | null> {
    const since = new Date(Date.now() - 10 * MIN);
    const count = await this.prisma.notification.count({
      where: { targetType: "SETTLEMENT_RECONCILE", createdAt: { gte: since } },
    });
    if (count === 0) return null;
    return {
      rule: "reconcile_alert_relay",
      level: "P1",
      message: "结算对账发现总账与实付差异（详见结算对账通知与服务端日志 SettlementReconcile）",
      context: { notifications: count },
    };
  }

  /** R4 日活暴跌（P2）：当前小时活跃 < 上周同期×40%（样本保护+时段限定9-23点） */
  private async checkDauDrop(): Promise<SentinelFinding | null> {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 9 || hour > 23) return null;
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
    const lastWeekStart = new Date(hourStart.getTime() - 7 * 24 * 60 * MIN);
    const lastWeekEnd = new Date(lastWeekStart.getTime() + (now.getTime() - hourStart.getTime()));
    const [cur, prev] = await Promise.all([
      this.prisma.trackEvent.findMany({
        where: { createdAt: { gte: hourStart }, userId: { not: null } },
        distinct: ["userId"], select: { userId: true },
      }).then((r) => r.length),
      this.prisma.trackEvent.findMany({
        where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd }, userId: { not: null } },
        distinct: ["userId"], select: { userId: true },
      }).then((r) => r.length),
    ]);
    const minPrev = await this.threshold("dau_min_baseline", 50);
    const ratio = await this.threshold("dau_drop_ratio", 0.4);
    if (prev < minPrev || cur >= prev * ratio) return null;
    return {
      rule: "dau_drop",
      level: "P2",
      message: `日活暴跌：当前小时活跃 ${cur} 不足上周同期 ${prev} 的 ${ratio * 100}%，检查前端可用性/登录链路`,
      context: { cur, prev, ratio },
    };
  }

  /** R5 退款率飙升（P2） */
  private async checkRefundSpike(): Promise<SentinelFinding | null> {
    const since = new Date(Date.now() - 24 * 60 * MIN);
    const [refunded, paidTotal] = await Promise.all([
      this.prisma.order.count({ where: { updatedAt: { gte: since }, status: "REFUNDED" } }),
      this.prisma.order.count({ where: { createdAt: { gte: since }, status: { in: ["PAID", "SHIPPED", "COMPLETED", "REFUNDED"] } } }),
    ]);
    const minPaid = await this.threshold("refund_min_paid", 10);
    const maxRate = await this.threshold("refund_spike_rate", 0.2);
    if (paidTotal < minPaid) return null;
    const rate = refunded / paidTotal;
    if (rate <= maxRate) return null;
    return {
      rule: "refund_spike",
      level: "P2",
      message: `退款率飙升：24小时 ${refunded}/${paidTotal}=${(rate * 100).toFixed(0)}%（阈值 ${maxRate * 100}%）`,
      context: { refunded, paidTotal, rate },
    };
  }

  /** R6 短信失败率（P2）：登录主通道故障探测 */
  private async checkSmsFailRate(): Promise<SentinelFinding | null> {
    const since = new Date(Date.now() - 15 * MIN);
    const [total, failed] = await Promise.all([
      this.prisma.smsLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.smsLog.count({ where: { createdAt: { gte: since }, status: { not: "SUCCESS" } } }),
    ]);
    const minSample = await this.threshold("sms_min_sample", 5);
    const maxRate = await this.threshold("sms_fail_rate", 0.5);
    if (total < minSample) return null;
    const rate = failed / total;
    if (rate <= maxRate) return null;
    return {
      rule: "sms_fail_rate",
      level: "P2",
      message: `短信发送失败率 ${(rate * 100).toFixed(0)}%（${failed}/${total}），检查短信通道/余额，提示用户改用密码登录`,
      context: { total, failed, rate },
    };
  }

  /** R7 AI 停摆（P3）：工作时段近2小时零 AI 记录且昨日同窗口有量 */
  private async checkAiStall(): Promise<SentinelFinding | null> {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 9 || hour > 23) return null;
    const since = new Date(now.getTime() - 120 * MIN);
    const ySince = new Date(since.getTime() - 24 * 60 * MIN);
    const yUntil = new Date(now.getTime() - 24 * 60 * MIN);
    const [cur, prev] = await Promise.all([
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiAnalysisRecord.count({ where: { createdAt: { gte: ySince, lt: yUntil } } }),
    ]);
    const minPrev = await this.threshold("ai_min_baseline", 10);
    if (cur > 0 || prev < minPrev) return null;
    return {
      rule: "ai_stall",
      level: "P3",
      message: `AI 服务疑似停摆：近2小时零调用（昨日同期 ${prev}），检查供应商/密钥/预算封顶`,
      context: { cur, prev },
    };
  }

  /** R8 磁盘水位（P2）：>85% 告警（build/日志/备份吃满盘是已知风险） */
  private async checkDiskWatermark(): Promise<SentinelFinding | null> {
    if (process.platform !== "linux") return null; // 仅生产环境有意义
    const usedPct = await this.diskUsedPercent();
    if (usedPct === null) return null;
    const max = await this.threshold("disk_watermark", 85);
    if (usedPct <= max) return null;
    return {
      rule: "disk_watermark",
      level: "P2",
      message: `磁盘使用率 ${usedPct}%（阈值 ${max}%），清理构建产物/旧日志/旧备份`,
      context: { usedPct, max },
    };
  }

  /** R9 nginx 5xx 率（P1·T3 可观测接线）：接入层最近 5 分钟窗口 5xx 占比过高（数据源 NginxLogService） */
  private async checkNginx5xxRate(): Promise<SentinelFinding | null> {
    const stat = await this.redis.getJson<{ total: number; s5xx: number; at: string }>("obs:nginx:latest");
    if (!stat) return null; // 分析器未运行/键过期：不告警（哨兵不替观测系统自证）
    const minTotal = await this.threshold("nginx_min_total", 50);
    const maxRate = await this.threshold("nginx_5xx_rate", 0.05);
    if (stat.total < minTotal) return null;
    const rate = stat.s5xx / stat.total;
    if (rate <= maxRate) return null;
    return {
      rule: "nginx_5xx_rate",
      level: "P1",
      message: `接入层 5xx 风暴：最近5分钟窗口 ${stat.s5xx}/${stat.total}=${(rate * 100).toFixed(1)}%（阈值 ${maxRate * 100}%），检查后端进程/upstream/磁盘`,
      context: { total: stat.total, s5xx: stat.s5xx, rate, windowAt: stat.at },
    };
  }

  /** df 查根分区使用率（linux）。测试中可 spy 替换 */
  protected diskUsedPercent(): Promise<number | null> {
    return new Promise((resolve) => {
      execFile("df", ["-k", "/"], { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve(null);
        const line = stdout.trim().split("\n").pop() || "";
        const m = /(\d+)%/.exec(line);
        resolve(m ? Number(m[1]) : null);
      });
    });
  }

  // ───────── 告警落库/去重/恢复/通知 ─────────

  /** 同 rule 存在未 resolved 的告警则不重发；否则落库+通知 */
  private async fireDeduped(f: SentinelFinding): Promise<boolean> {
    const open = await this.prisma.sentinelAlert.findFirst({
      where: { rule: f.rule, resolvedAt: null },
      select: { id: true },
    });
    if (open) return false;
    const alert = await this.prisma.sentinelAlert.create({
      data: { rule: f.rule, level: f.level, message: f.message, context: (f.context ?? {}) as object, notified: true },
    });
    await this.notify(`【哨兵·${f.level}】${f.message}`, f.rule, alert.id);
    return true;
  }

  /** 本轮未触发的规则：若存在 open 告警则自动恢复并通知 */
  private async autoResolve(firedRules: string[]): Promise<number> {
    const open = await this.prisma.sentinelAlert.findMany({
      where: { resolvedAt: null, rule: { notIn: firedRules.length ? firedRules : ["__none__"] } },
      select: { id: true, rule: true, level: true },
    });
    if (open.length === 0) return 0;
    await this.prisma.sentinelAlert.updateMany({
      where: { id: { in: open.map((a) => a.id) } },
      data: { resolvedAt: new Date() },
    });
    for (const a of open) {
      if (a.level !== "P3") {
        await this.notify(`【哨兵·已恢复】规则 ${a.rule} 不再触发，告警解除`, a.rule, a.id);
      }
    }
    return open.length;
  }

  // ───────── 查询/手动处置（admin 告警列表页用） ─────────

  /** 告警分页列表：status=open(未解除)|resolved(已解除)|缺省全部，可按 level/rule 过滤 */
  async listAlerts(opts: { page?: number; pageSize?: number; status?: string; level?: string; rule?: string }) {
    const { page, pageSize, skip } = safePagination(opts.page, opts.pageSize, 100);
    const where: Record<string, unknown> = {};
    if (opts.status === "open") where.resolvedAt = null;
    else if (opts.status === "resolved") where.resolvedAt = { not: null };
    if (opts.level) where.level = opts.level;
    if (opts.rule) where.rule = opts.rule;
    const [alerts, total, openCount] = await Promise.all([
      this.prisma.sentinelAlert.findMany({
        where,
        orderBy: { firedAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.sentinelAlert.count({ where }),
      this.prisma.sentinelAlert.count({ where: { resolvedAt: null } }),
    ]);
    // 键名用 alerts（非 items）：绕开 ResponseInterceptor 的分页自动识别，openCount 才能随响应带出
    return { alerts, total, page, pageSize, openCount };
  }

  /** 手动解除告警（幂等：仅未解除的会被更新；不存在则 404） */
  async resolveAlert(id: string): Promise<{ ok: true; already: boolean }> {
    const r = await this.prisma.sentinelAlert.updateMany({
      where: { id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    if (r.count > 0) return { ok: true, already: false };
    const exists = await this.prisma.sentinelAlert.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException("告警不存在");
    return { ok: true, already: true };
  }

  /** 通知：站内信(管理员) + webhook 留口（sentinel.webhook_url 配置后生效） */
  private async notify(content: string, rule: string, alertId: string) {
    try {
      const admins = await this.prisma.userRole.findMany({
        where: { roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] } },
        select: { userId: true },
        take: 10,
      });
      if (admins.length > 0) {
        await this.prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.userId,
            type: "SYSTEM",
            title: "业务哨兵告警",
            content,
            targetType: "SENTINEL",
            targetId: alertId,
          })),
        });
      }
    } catch (e) {
      this.logger.warn("哨兵站内信发送失败", e as Error);
    }
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: "sentinel.webhook_url" },
        select: { configValue: true },
      });
      const url = row?.configValue?.trim();
      if (url) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ msgtype: "text", text: { content } }),
        });
      }
    } catch (e) {
      this.logger.warn("哨兵 webhook 发送失败", e as Error);
    }
  }
}
