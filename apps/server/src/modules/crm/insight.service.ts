import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";
import { computeRfmTier } from "./crm.service";

/**
 * 课-P4 经营洞察（收尾单·从业者工作台侧）
 *
 * 合规红线 R3（设计 §五·只做统计聚合，禁个体画像）：
 * - 全部数据 = 本人 ownerId 名下客户池的**统计聚合**，任何查询不跨从业者；
 * - 洞察页不输出任何个体名单/姓名/生辰/手机号——商机雷达只给数量与建议动作，
 *   名单在 CRM 列表页的分层 tab（本页仅挂数字+跳转）；
 * - AI 建议输入只含聚合数字（buildAdvicePrompt 入参类型只有数值/占比结构，
 *   spec 断言 prompt 不含任何客户姓名/生辰/手机号）。
 */

const DAY_MS = 86_400_000;

/** AI 经营建议场景（模型路由未单配时走 default 便宜档） */
const ADVICE_SCENE = "crm_insight_advice";

/** 服务类型 → 中文（与 crm.dto SERVE_TYPES 对应） */
const SERVE_TYPE_LABEL: Record<string, string> = {
  consult: "咨询",
  course: "课程",
  product: "商品",
  paipan: "排盘",
};

/** 服务结构条目（近90天按 serveType 聚合） */
export interface ServeStructureItem {
  type: string;
  label: string;
  count: number;
  amount: number;
  /** 次数占比（%·1位小数） */
  countPct: number;
  /** 金额占比（%·1位小数） */
  amountPct: number;
}

/**
 * 洞察快照（R3 关键：全字段只有聚合数值，**结构上不存在**姓名/生辰/手机号等个体字段，
 * AI prompt 只从本结构构建，设计即合规）
 */
export interface InsightSnapshot {
  totalClients: number;
  /** 服务结构：近90天 ClientServeLog 按 serveType 分布 */
  serve90: { totalCount: number; totalAmount: number; items: ServeStructureItem[] };
  /** 客群节律：月度服务频次趋势（近6个自然月·含0补齐） */
  monthlyTrend: { month: string; count: number; amount: number }[];
  /** 复购间隔（不同日期再次服务的间隔天数·平均/中位·样本不足=null） */
  repurchase: { avgDays: number; medianDays: number; sampledClients: number } | null;
  /** 商机雷达：只给数量（名单在 CRM 列表页分层 tab·R3 不列个体） */
  radar: {
    dormant: number;
    atRisk: number;
    /** 本月生日客户数（ClientReminder BIRTHDAY 按 dueAt 当月聚合） */
    birthdayThisMonth: number;
    /** 立春窗口（静态日历·与 P3 提醒 cron 同口径取每年2月4日） */
    lichun: { date: string; daysUntil: number; isNear: boolean };
  };
}

export interface InsightResult extends InsightSnapshot {
  advice: { text: string; source: "ai" | "template" };
}

/** 下一个立春（静态日历·近似取每年2月4日，与 P3 立春提醒 cron 同口径）；30 天内视为临近 */
export function nextLichun(now: Date = new Date()): { date: string; daysUntil: number; isNear: boolean } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let lichun = new Date(now.getFullYear(), 1, 4);
  if (lichun.getTime() < today.getTime()) lichun = new Date(now.getFullYear() + 1, 1, 4);
  const daysUntil = Math.round((lichun.getTime() - today.getTime()) / DAY_MS);
  const mm = String(lichun.getMonth() + 1).padStart(2, "0");
  return { date: `${lichun.getFullYear()}-${mm}-04`, daysUntil, isNear: daysUntil <= 30 };
}

/**
 * AI 建议 prompt（导出供 spec 做 R3 断言）：入参只有 InsightSnapshot 聚合数值，
 * 输出串里只可能出现数字与统计口径文案，不含任何客户姓名/生辰/手机号。
 */
export function buildAdvicePrompt(s: InsightSnapshot): string {
  const structure =
    s.serve90.items.map((i) => `${i.label}${i.count}次(${i.countPct}%)`).join("、") || "暂无服务记录";
  const trend = s.monthlyTrend.map((m) => `${m.month}:${m.count}次`).join("、");
  const repurchase = s.repurchase
    ? `平均${s.repurchase.avgDays}天/中位${s.repurchase.medianDays}天`
    : "样本不足";
  return [
    `客户总数 ${s.totalClients} 人`,
    `近90天服务 ${s.serve90.totalCount} 次、合计 ${s.serve90.totalAmount} 元`,
    `服务结构：${structure}`,
    `近6月月度服务次数：${trend}`,
    `复购间隔：${repurchase}`,
    `沉睡客户 ${s.radar.dormant} 人、流失预警 ${s.radar.atRisk} 人、本月生日 ${s.radar.birthdayThisMonth} 人`,
    `距立春 ${s.radar.lichun.daysUntil} 天`,
  ].join("；");
}

/** 规则模板建议（AI 失败/未配置/空数据兜底·按优先级取首条命中） */
export function fallbackAdvice(s: InsightSnapshot): string {
  if (s.totalClients === 0) {
    return "还没有客户档案。先从「可入库的成交客户」一键归档，或手工录入老客户，积累第一批客户后这里会给出经营建议。";
  }
  const dormantPct = (s.radar.dormant / s.totalClients) * 100;
  if (dormantPct >= 40) {
    return `沉睡客户占比超40%（${s.radar.dormant}/${s.totalClients}），建议本周安排一轮回访，可在提醒页用 AI 话术逐客户跟进唤醒。`;
  }
  if (s.radar.atRisk > 0) {
    return `有 ${s.radar.atRisk} 位客户处于流失预警期（超过30天未服务），建议优先安排问候跟进，避免滑入沉睡。`;
  }
  if (s.radar.birthdayThisMonth > 0) {
    return `本月有 ${s.radar.birthdayThisMonth} 位客户生日，生日关怀是最自然的回访契机，建议提前准备祝福话术并按提醒逐一跟进。`;
  }
  if (s.radar.lichun.isNear) {
    return `距立春还有 ${s.radar.lichun.daysUntil} 天，流年更替前后是咨询高峰，建议提前准备立春主题内容与客户问候。`;
  }
  return "客户池状态健康，保持当前服务节奏；可重点经营高价值客户，把一次性服务沉淀为长期信任关系。";
}

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AiGatewayService,
  ) {}

  /** 经营洞察（数据仅聚合本人 ownerId 名下·R3 无任何个体字段输出） */
  async getInsights(ownerId: string, now: Date = new Date()): Promise<InsightResult> {
    const lichun = nextLichun(now);

    // RFM 分层计数：与 listClients 同口径实时计算（只取聚合三字段，不取姓名/生辰等个体字段）
    const clients = await this.prisma.clientBook.findMany({
      where: { ownerId },
      select: { lastServeAt: true, serveCount: true, totalSpend: true },
      take: 2000,
    });

    // 空数据空态：无客户直接返回零快照+引导模板（不打 AI）
    if (clients.length === 0) {
      const empty: InsightSnapshot = {
        totalClients: 0,
        serve90: { totalCount: 0, totalAmount: 0, items: [] },
        monthlyTrend: this.emptyTrend(now),
        repurchase: null,
        radar: { dormant: 0, atRisk: 0, birthdayThisMonth: 0, lichun },
      };
      return { ...empty, advice: { text: fallbackAdvice(empty), source: "template" } };
    }

    const since90 = new Date(now.getTime() - 90 * DAY_MS);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 近6个自然月
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [grouped, trendLogs, birthdayThisMonth] = await Promise.all([
      // 服务结构：近90天按 serveType 聚合（次数+金额）
      this.prisma.clientServeLog.groupBy({
        by: ["type"],
        where: { ownerId, servedAt: { gte: since90 } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      // 节律：近6月服务记录（只取聚合所需三列·无个体字段）
      this.prisma.clientServeLog.findMany({
        where: { ownerId, servedAt: { gte: trendStart } },
        select: { clientId: true, servedAt: true, amount: true },
        orderBy: { servedAt: "asc" },
        take: 5000,
      }),
      // 本月生日客户数：提醒表聚合（BIRTHDAY 每客户每年一条·count 即人数）
      this.prisma.clientReminder.count({
        where: { ownerId, kind: "BIRTHDAY", dueAt: { gte: monthStart, lt: nextMonthStart } },
      }),
    ]);

    // ── 服务结构 ──
    const rawItems = grouped.map((g) => ({
      type: g.type,
      label: SERVE_TYPE_LABEL[g.type] ?? g.type,
      count: g._count._all,
      amount: round2(Number(g._sum.amount ?? 0)),
    }));
    const totalCount = rawItems.reduce((a, b) => a + b.count, 0);
    const totalAmount = round2(rawItems.reduce((a, b) => a + b.amount, 0));
    const items: ServeStructureItem[] = rawItems
      .map((i) => ({ ...i, countPct: pct(i.count, totalCount), amountPct: pct(i.amount, totalAmount) }))
      .sort((a, b) => b.count - a.count);

    // ── 月度趋势（近6月·0补齐）──
    const trend = this.emptyTrend(now);
    const trendIdx = new Map(trend.map((t, i) => [t.month, i]));
    for (const log of trendLogs) {
      const idx = trendIdx.get(monthKey(log.servedAt));
      if (idx === undefined) continue;
      trend[idx].count++;
      trend[idx].amount = round2(trend[idx].amount + Number(log.amount ?? 0));
    }

    // ── 复购间隔：同一客户不同日期再次服务的间隔（同日多条记录只算一天）──
    const daysByClient = new Map<string, Set<number>>();
    for (const log of trendLogs) {
      const d = log.servedAt;
      const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (!daysByClient.has(log.clientId)) daysByClient.set(log.clientId, new Set());
      daysByClient.get(log.clientId)!.add(dayTs);
    }
    const gaps: number[] = [];
    let sampledClients = 0;
    for (const days of daysByClient.values()) {
      if (days.size < 2) continue;
      sampledClients++;
      const sorted = [...days].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i] - sorted[i - 1]) / DAY_MS);
    }
    const repurchase =
      gaps.length > 0
        ? { avgDays: round1(gaps.reduce((a, b) => a + b, 0) / gaps.length), medianDays: median(gaps), sampledClients }
        : null;

    // ── 商机雷达：RFM 沉睡/流失预警层计数（只给数量·名单在列表页 tab）──
    let dormant = 0;
    let atRisk = 0;
    for (const c of clients) {
      const tier = computeRfmTier(
        { lastServeAt: c.lastServeAt, serveCount: c.serveCount, totalSpend: Number(c.totalSpend) },
        now,
      );
      if (tier === "DORMANT") dormant++;
      else if (tier === "AT_RISK") atRisk++;
    }

    const snapshot: InsightSnapshot = {
      totalClients: clients.length,
      serve90: { totalCount, totalAmount, items },
      monthlyTrend: trend,
      repurchase,
      radar: { dormant, atRisk, birthdayThisMonth, lichun },
    };
    const advice = await this.generateAdvice(ownerId, snapshot);
    return { ...snapshot, advice };
  }

  /** AI 经营建议（便宜档·失败降级规则模板）。R3：输入只有聚合快照，prompt 无任何个体字段 */
  private async generateAdvice(userId: string, snapshot: InsightSnapshot): Promise<InsightResult["advice"]> {
    const fallback = fallbackAdvice(snapshot);
    if (process.env.NODE_ENV === "test") return { text: fallback, source: "template" };
    try {
      const messages: AiMessage[] = [
        {
          role: "system",
          content:
            "你是国学传统文化从业者的经营顾问。基于给出的客户池统计聚合数据（不含任何个体信息），输出一段60~160字中文经营建议：指出当下最值得做的1~2个动作（如回访沉睡客户、生日关怀、立春前内容准备），语气务实具体。合规红线：不做任何命理预测、改运化解、收益保证类表述；只输出建议正文，不要标题不要解释。",
        },
        { role: "user", content: buildAdvicePrompt(snapshot) },
      ];
      const res = await this.gateway.chat({
        scene: ADVICE_SCENE, // 未在模型路由单配时走 default 便宜档
        userId,
        messages,
        options: { temperature: 0.6, maxTokens: 320 },
        skipCache: true, // 聚合数字随时间变化，避免语义缓存误命中旧建议
      });
      const text = res.content?.trim();
      return text && text.length >= 20
        ? { text: text.slice(0, 500), source: "ai" }
        : { text: fallback, source: "template" };
    } catch (err) {
      this.logger.warn(`经营洞察 AI 建议失败，降级规则模板：${(err as Error).message}`);
      return { text: fallback, source: "template" };
    }
  }

  /** 近6个自然月的零趋势桶（含当月·升序） */
  private emptyTrend(now: Date): { month: string; count: number; amount: number }[] {
    const out: { month: string; count: number; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ month: monthKey(d), count: 0, amount: 0 });
    }
    return out;
  }
}

// ───────── 纯工具 ─────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? round1(sorted[mid]) : round1((sorted[mid - 1] + sorted[mid]) / 2);
}
