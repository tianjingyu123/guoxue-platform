import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { DashboardDailyService, DailyMetrics } from "./dashboard-daily.service";

const DAY_MS = 86_400_000;
const AI_SCENE = "data-summary";
const BRIEF_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN"] as const;
/** 上周建议存档键（本周周报回顾闭环用） */
const LAST_SUGGESTION_KEY = "weekly_brief.last_suggestions";

export interface WeeklyBriefResult {
  weekStart: string;
  title: string;
  text: string;
  degraded: boolean;
  skipped: boolean;
  sentTo: number;
}

/**
 * AI 运营周报（D-T4·设计真源 docs/design/数据运营引擎-看板漏斗标签周报-20260705.md §四）
 *
 * 与日报的分工：日报看"有没有异常"，周报看"趋势与动作"。
 * 每周一 09:00 聚合上周：核心指标周汇总+周环比 → 漏斗周转化率 → 哨兵告警周回顾 →
 * AI 三段式（本周结论 3 条 / 异常与原因假设 / 下周建议动作·具体到"给谁做什么"）。
 * 建议闭环：本期建议存 ConfigSystem，下期周报把上期建议喂给 AI 做执行回顾。
 * AI 失败降级纯数字版——周报绝不缺席。幂等：同标题站内信已存在则跳过。
 */
@Injectable()
export class WeeklyBriefService {
  private readonly logger = new Logger(WeeklyBriefService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly daily: DashboardDailyService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 每周一 09:00（多实例互斥） */
  @Cron("0 9 * * 1")
  async sendWeeklyCron(): Promise<void> {
    await this.redis.runExclusive("weekly-brief", 900, async () => {
      try {
        const res = await this.sendWeekly();
        this.logger.log(`运营周报：${res.skipped ? "已发过·跳过" : `发送 ${res.sentTo} 人${res.degraded ? "（AI 降级）" : ""}`}`);
      } catch (e) {
        this.logger.error("运营周报发送失败", e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 生成并发送上周周报（幂等） */
  async sendWeekly(): Promise<WeeklyBriefResult> {
    const weekDates = this.lastWeekDates();
    const weekStart = weekDates[0];
    const title = `运营周报 ${weekStart} 起一周`;

    const existed = await this.prisma.notification.findFirst({
      where: { type: "SYSTEM", title },
      select: { id: true },
    });
    if (existed) return { weekStart, title, text: "", degraded: false, skipped: true, sentTo: 0 };

    const prevDates = weekDates.map((d) => this.addDays(d, -7));
    const [curSum, prevSum, funnelText, alertText, lastSuggestions] = await Promise.all([
      this.sumWeek(weekDates),
      this.sumWeek(prevDates),
      this.funnelSection(weekDates),
      this.alertSection(weekDates),
      this.prisma.configSystem.findUnique({ where: { configKey: LAST_SUGGESTION_KEY }, select: { configValue: true } }).catch(() => null),
    ]);

    const bodyText = [
      `📈 ${title}`,
      "── 核心指标（周环比）──",
      `DAU均值 ${curSum.dauAvg}（${this.trend(curSum.dauAvg, prevSum.dauAvg)}）`,
      `新增用户 ${curSum.newUsers}（${this.trend(curSum.newUsers, prevSum.newUsers)}）`,
      `GMV ¥${curSum.gmv.toFixed(2)}（${this.trend(curSum.gmv, prevSum.gmv)}）`,
      `支付订单 ${curSum.ordersPaid}（${this.trend(curSum.ordersPaid, prevSum.ordersPaid)}）`,
      `会员新购 ${curSum.memberNew}（${this.trend(curSum.memberNew, prevSum.memberNew)}）`,
      funnelText,
      alertText,
    ].join("\n");

    // AI 三段式（附上期建议做执行回顾）
    let aiText: string | undefined;
    try {
      const reviewNote = lastSuggestions?.configValue
        ? `\n【上期建议回顾】上周周报给出过以下建议，请先用一行评估其是否在本周数据中体现效果：\n${lastSuggestions.configValue}`
        : "";
      const result = await this.gateway.chat({
        scene: AI_SCENE,
        messages: [
          {
            role: "system",
            content:
              "你是平台运营顾问。根据周报数据输出三段：【本周结论】3条要点；【异常与假设】1-3条异常及原因假设；【下周建议】3条可执行动作，每条必须具体到\"给谁做什么\"（如\"运营：给price_sensitive标签用户发连续包月首月券\"）。总长不超过300字。",
          },
          { role: "user", content: bodyText + reviewNote },
        ],
        options: { temperature: 0.4, maxTokens: 600 },
      });
      aiText = result.content?.trim() || undefined;
    } catch (e) {
      this.logger.warn(`周报 AI 分析失败，降级纯数字版：${e instanceof Error ? e.message : String(e)}`);
    }

    // 建议存档（闭环）：仅在 AI 成功时更新
    if (aiText) {
      await this.prisma.configSystem.upsert({
        where: { configKey: LAST_SUGGESTION_KEY },
        create: { configKey: LAST_SUGGESTION_KEY, configValue: aiText.slice(0, 2000), description: "上期周报AI建议（回顾闭环用）" },
        update: { configValue: aiText.slice(0, 2000) },
      }).catch((e) => this.logger.warn("周报建议存档失败", e as Error));
    }

    const text = aiText ? `${bodyText}\n── AI 周度分析 ──\n${aiText}` : bodyText;

    const roleRows = await this.prisma.userRole.findMany({
      where: { roleType: { in: [...BRIEF_ROLES] } },
      select: { userId: true },
    });
    const userIds = [...new Set(roleRows.map((r) => r.userId))];
    if (userIds.length > 0) {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type: "SYSTEM", title, content: text })),
      });
    }
    await this.pushWebhook(text);
    return { weekStart, title, text, degraded: !aiText, skipped: false, sentTo: userIds.length };
  }

  // ───────── 数据段 ─────────

  private async sumWeek(dates: string[]) {
    const rows = await this.prisma.dashboardDaily.findMany({
      where: { date: { in: dates } },
      select: { metrics: true },
    });
    const ms = rows.map((r) => r.metrics as unknown as DailyMetrics);
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const sum = (pick: (m: DailyMetrics) => unknown) => ms.reduce((a, m) => a + num(pick(m)), 0);
    return {
      days: ms.length,
      dauAvg: ms.length ? Math.round(sum((m) => m.dau) / ms.length) : 0,
      newUsers: sum((m) => m.newUsers),
      gmv: sum((m) => m.gmv),
      ordersPaid: sum((m) => m.ordersPaid),
      memberNew: sum((m) => m.memberNew),
    };
  }

  /** 漏斗周转化：F2/F3 各步骤周求和 + 末步/首步转化率 */
  private async funnelSection(dates: string[]): Promise<string> {
    const rows = await this.prisma.funnelDaily.findMany({
      where: { date: { in: dates }, funnel: { in: ["F2_member", "F3_commerce"] } },
    });
    const agg = new Map<string, Map<number, { key: string; sum: number }>>();
    for (const r of rows) {
      if (!agg.has(r.funnel)) agg.set(r.funnel, new Map());
      const m = agg.get(r.funnel)!;
      const cur = m.get(r.step) ?? { key: r.stepKey, sum: 0 };
      cur.sum += r.count;
      m.set(r.step, cur);
    }
    const fmt = (funnel: string, label: string) => {
      const m = agg.get(funnel);
      if (!m || m.size === 0) return `${label}：暂无数据`;
      const steps = [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
      const first = steps[0]?.sum ?? 0;
      const last = steps[steps.length - 1]?.sum ?? 0;
      const rate = first > 0 ? `${((last / first) * 100).toFixed(1)}%` : "—";
      return `${label}：${steps.map((s) => `${s.key} ${s.sum}`).join(" → ")}（转化率 ${rate}）`;
    };
    return ["── 漏斗周转化 ──", fmt("F2_member", "会员"), fmt("F3_commerce", "电商")].join("\n");
  }

  /** 哨兵告警周回顾 */
  private async alertSection(dates: string[]): Promise<string> {
    const gte = new Date(`${dates[0]}T00:00:00+08:00`);
    const lt = new Date(gte.getTime() + 7 * DAY_MS);
    const rows = await this.prisma.sentinelAlert.groupBy({
      by: ["rule", "level"],
      where: { firedAt: { gte, lt } },
      _count: { _all: true },
    });
    if (rows.length === 0) return "── 哨兵周回顾 ──\n本周无告警 ✅";
    const lines = rows
      .sort((a, b) => a.level.localeCompare(b.level))
      .map((r) => `${r.level} ${r.rule} ×${r._count._all}`);
    return ["── 哨兵周回顾 ──", ...lines].join("\n");
  }

  // ───────── 工具 ─────────

  /** 上周一至周日的 7 个日期串（Asia/Shanghai）。正午基准回避时区日界（+08 正午=UTC 04:00 同一天，getUTCDay 与上海星期一致） */
  lastWeekDates(): string[] {
    const today = this.daily.dateStrShanghai(0);
    const noon = new Date(`${today}T12:00:00+08:00`);
    const dow = noon.getUTCDay() === 0 ? 7 : noon.getUTCDay(); // 周一=1..周日=7
    const thisMonday = this.addDays(today, -(dow - 1));
    const lastMonday = this.addDays(thisMonday, -7);
    return Array.from({ length: 7 }, (_, i) => this.addDays(lastMonday, i));
  }

  private addDays(date: string, days: number): string {
    const base = new Date(`${date}T12:00:00+08:00`); // 正午基准回避时区日界
    const nd = new Date(base.getTime() + days * DAY_MS);
    const sh = new Date(nd.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }

  private trend(cur: number, prev: number): string {
    if (prev === 0) return cur > 0 ? "↑新增" : "→持平";
    const pct = (cur - prev) / prev;
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    const label = `${arrow}${Math.abs(pct * 100).toFixed(1)}%`;
    return Math.abs(pct) >= 0.3 ? `⚠${label}` : label;
  }

  /** webhook 推送（读哨兵同款配置·未配置静默跳过） */
  private async pushWebhook(content: string): Promise<void> {
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: "sentinel.webhook_url" },
        select: { configValue: true },
      });
      const url = row?.configValue?.trim();
      if (!url) return;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msgtype: "text", text: { content: content.slice(0, 2000) } }),
      });
    } catch (e) {
      this.logger.warn("周报 webhook 推送失败", e as Error);
    }
  }
}
