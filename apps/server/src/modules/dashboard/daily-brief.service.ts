import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { DashboardDailyService, DailyMetrics } from "./dashboard-daily.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 环比异常阈值：±30% 标 ⚠ */
const ANOMALY_PCT = 0.3;
/** 前端错误告警阈值：errors24h 超过则标 ⚠ */
const ERRORS_ALERT_THRESHOLD = 50;
/** 简报接收角色 */
const BRIEF_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN"] as const;
/** AI 解读场景：复用 data-explorer 已有的数据解读通用场景（免注册·路由带默认降级） */
const AI_SCENE = "data-summary";

/** 待办摘要计数 */
export interface BriefTodoCounts {
  /** 待审提现（WithdrawalApplication PENDING + Withdrawal PENDING 之和） */
  pendingWithdrawals: number;
  /** 待审商品（Product status=PENDING 且未软删） */
  pendingProducts: number;
  /** 合规扫描待处理（ComplianceScanRecord status=OPEN） */
  openComplianceScans: number;
  /** 冻结分账待复核（LedgerEntry status=FROZEN） */
  frozenLedgerEntries: number;
}

export interface DailyBriefResult {
  date: string;
  title: string;
  /** 简报正文（含 AI 解读段；AI 挂则为纯数字版） */
  text: string;
  /** AI 一句话解读；降级时省略 */
  aiInsight?: string;
  /** true = AI 解读失败已降级纯数字版 */
  degraded: boolean;
}

export interface SendBriefResult extends DailyBriefResult {
  /** true = 当日简报已发过，本次跳过（幂等） */
  skipped: boolean;
  /** 实际发送站内信条数 */
  sentTo: number;
}

/**
 * 每日运营简报（看-P2）
 *
 * - 每日 08:00 cron（redis.runExclusive "daily-brief" 多实例互斥）；
 * - 取昨日 DashboardDaily.metrics（缺则先调 DashboardDailyService.rebuildDate 重算）+ 环比前日；
 * - 环比 ±30% 或 errors24h>50 标 ⚠；待办摘要（待审提现/待审商品/OPEN 合规扫描/FROZEN 分账）各一行；
 * - AI 一句话解读走 ai-gateway（低温 200token·data-summary 场景），失败降级纯数字版——简报绝不因 AI 挂而缺席；
 * - 发送 = 给全部 SUPER_ADMIN/OPERATION_ADMIN 用户各建一条 Notification(type=SYSTEM)；
 * - 幂等：同日已存在同标题 SYSTEM 站内信则跳过。
 */
@Injectable()
export class DailyBriefService {
  private readonly logger = new Logger(DailyBriefService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly daily: DashboardDailyService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 每日 08:00 发送昨日简报（多实例互斥） */
  @Cron("0 8 * * *")
  async sendYesterdayBrief(): Promise<void> {
    await this.redis.runExclusive("daily-brief", 600, async () => {
      const date = this.daily.dateStrShanghai(-1);
      try {
        const res = await this.sendBrief(date);
        this.logger.log(`每日简报 ${date}：${res.skipped ? "已发过·跳过" : `发送 ${res.sentTo} 人${res.degraded ? "（AI 降级纯数字版）" : ""}`}`);
      } catch (e) {
        this.logger.error(`每日简报发送失败：${date}`, e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 生成并发送简报（幂等：当日已发跳过）。date 缺省为昨日 */
  async sendBrief(date?: string): Promise<SendBriefResult> {
    const day = date || this.daily.dateStrShanghai(-1);
    this.assertDate(day);
    const title = `运营日报 ${day}`;

    // 幂等：同标题 SYSTEM 站内信已存在 = 当日已发
    const existed = await this.prisma.notification.findFirst({
      where: { type: "SYSTEM", title },
      select: { id: true },
    });
    if (existed) {
      return { date: day, title, text: "", degraded: false, skipped: true, sentTo: 0 };
    }

    const brief = await this.generateBrief(day);

    // 收件人：全部 SUPER_ADMIN/OPERATION_ADMIN（去重）
    const roleRows = await this.prisma.userRole.findMany({
      where: { roleType: { in: [...BRIEF_ROLES] } },
      select: { userId: true },
    });
    const userIds = [...new Set(roleRows.map((r) => r.userId))];
    if (userIds.length === 0) {
      this.logger.warn(`每日简报 ${day}：无 SUPER_ADMIN/OPERATION_ADMIN 收件人，未发送`);
      return { ...brief, skipped: false, sentTo: 0 };
    }

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: "SYSTEM",
        title,
        content: brief.text,
      })),
    });
    return { ...brief, skipped: false, sentTo: userIds.length };
  }

  /** 组装简报（不发送）：昨日聚合（缺则重算）+ 环比前日 + 待办摘要 + AI 解读（失败降级） */
  async generateBrief(date: string): Promise<DailyBriefResult> {
    this.assertDate(date);
    const title = `运营日报 ${date}`;

    // 当日聚合：缺则调看-P1 的重算方法生成（幂等 upsert）
    const row = await this.prisma.dashboardDaily.findUnique({ where: { date }, select: { metrics: true } });
    let metrics: DailyMetrics;
    if (row) {
      metrics = row.metrics as unknown as DailyMetrics;
    } else {
      metrics = (await this.daily.rebuildDate(date)).metrics;
    }

    // 环比前日：只读不重算（缺则环比省略为 —）
    const prevRow = await this.prisma.dashboardDaily.findUnique({
      where: { date: this.addDays(date, -1) },
      select: { metrics: true },
    });
    const prev = prevRow ? (prevRow.metrics as unknown as DailyMetrics) : null;

    const todos = await this.countTodos();
    const bodyText = this.buildBriefText(date, metrics, prev, todos);

    // AI 一句话解读：失败降级纯数字版，绝不阻断简报
    let aiInsight: string | undefined;
    try {
      const result = await this.gateway.chat({
        scene: AI_SCENE,
        messages: [
          {
            role: "system",
            content:
              "你是平台运营分析师。根据当日运营简报，用一句话（不超过 80 字）点出最值得关注的变化或风险，并给一个可执行建议。只输出解读正文，不要任何前缀或标点装饰。",
          },
          { role: "user", content: bodyText },
        ],
        options: { temperature: 0.3, maxTokens: 200 },
      });
      aiInsight = result.content?.trim() || undefined;
    } catch (e) {
      this.logger.warn(`每日简报 AI 解读失败，降级纯数字版：${date} — ${e instanceof Error ? e.message : String(e)}`);
    }

    const text = aiInsight ? `${bodyText}\n── AI 解读 ──\n${aiInsight}` : bodyText;
    return { date, title, text, aiInsight, degraded: !aiInsight };
  }

  // ───────── 内部 ─────────

  /** 待办摘要计数（各来源并行 count） */
  private async countTodos(): Promise<BriefTodoCounts> {
    const [wa, w, products, scans, frozen] = await Promise.all([
      this.prisma.withdrawalApplication.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.product.count({ where: { status: "PENDING", deletedAt: null } }),
      this.prisma.complianceScanRecord.count({ where: { status: "OPEN" } }),
      this.prisma.ledgerEntry.count({ where: { status: "FROZEN" } }),
    ]);
    return {
      pendingWithdrawals: wa + w,
      pendingProducts: products,
      openComplianceScans: scans,
      frozenLedgerEntries: frozen,
    };
  }

  /** 组装纯数字简报正文（核心数+环比箭头+异常⚠+待办摘要） */
  private buildBriefText(date: string, m: DailyMetrics, prev: DailyMetrics | null, todos: BriefTodoCounts): string {
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const errors = num(m.errors24h);
    const lines = [
      `📊 运营日报 ${date}`,
      "── 核心指标（环比前日）──",
      `DAU ${num(m.dau)}（${this.trend(num(m.dau), prev ? num(prev.dau) : null)}）`,
      `新增用户 ${num(m.newUsers)}（${this.trend(num(m.newUsers), prev ? num(prev.newUsers) : null)}）`,
      `GMV ¥${num(m.gmv).toFixed(2)}（${this.trend(num(m.gmv), prev ? num(prev.gmv) : null)}）`,
      `佣金 ¥${num(m.commissionSum).toFixed(2)}（${this.trend(num(m.commissionSum), prev ? num(prev.commissionSum) : null)}）`,
      `会员新购 ${num(m.memberNew)}（${this.trend(num(m.memberNew), prev ? num(prev.memberNew) : null)}）`,
      errors > ERRORS_ALERT_THRESHOLD ? `⚠ 前端错误 ${errors}（超阈值 ${ERRORS_ALERT_THRESHOLD}）` : `前端错误 ${errors}`,
      "── 待办摘要 ──",
      `待审提现 ${todos.pendingWithdrawals} 笔`,
      `待审商品 ${todos.pendingProducts} 件`,
      `合规扫描待处理 ${todos.openComplianceScans} 条`,
      `冻结分账待复核 ${todos.frozenLedgerEntries} 笔`,
    ];
    return lines.join("\n");
  }

  /** 环比箭头：↑/↓/→ + 百分比；|环比| ≥ 30% 前缀 ⚠；无前日数据 → "—"；前日为 0 → "↑新增"/"→持平" */
  private trend(cur: number, prev: number | null): string {
    if (prev === null || prev === undefined) return "—";
    if (prev === 0) return cur > 0 ? "↑新增" : "→持平";
    const pct = (cur - prev) / prev;
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    const label = `${arrow}${Math.abs(pct * 100).toFixed(1)}%`;
    return Math.abs(pct) >= ANOMALY_PCT ? `⚠${label}` : label;
  }

  private assertDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00+08:00`).getTime())) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "日期格式须为 YYYY-MM-DD");
    }
  }

  /** YYYY-MM-DD 偏移天数（Asia/Shanghai） */
  private addDays(date: string, days: number): string {
    const d = new Date(new Date(`${date}T00:00:00+08:00`).getTime() + days * 86_400_000);
    const sh = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}`;
  }
}
