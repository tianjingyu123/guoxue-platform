import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 探针返回：hit=命中规则（需生成建议），facts=结构化事实（渲染文案用） */
export interface ProbeResult {
  hit: boolean;
  facts?: Record<string, string | number>;
}

/** 同主体同规则的建议冷却期（天）：避免重复打扰 */
const INSIGHT_COOLDOWN_DAYS = 7;
/** 每主体每日新建议上限 */
const MAX_INSIGHTS_PER_DAY = 3;

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 智能商业顾问引擎（T2-P1 MVP）
 * 「诊断-建议-执行-反馈」闭环的诊断与建议层：
 * - 探针（PROBES）读现有业务数据评估经营状况，命中即按规则模板生成建议（P2 接 AI 个性化文案）
 * - 每日 6AM cron 对全部启用规则 × 对应角色主体评估；7 天冷却防打扰
 * - 建议实例落 AdvisorInsight，工作台「经营顾问」卡拉取并可标记 已读/已采纳/忽略
 */
@Injectable()
export class AdvisorService {
  private readonly logger = new Logger(AdvisorService.name);

  constructor(private prisma: PrismaService) {}

  // ───────── 探针库：metric 名 → 评估函数 ─────────

  private readonly PROBES: Record<
    string,
    (subjectId: string, cond: Record<string, number>) => Promise<ProbeResult>
  > = {
    /** 分站佣金周环比下滑：近7天 vs 前7天 */
    station_earning_wow_drop: async (stationId, cond) => {
      const threshold = cond.thresholdPct ?? 30;
      const now = Date.now();
      const [last7, prev7] = await Promise.all([
        this.sumStationEarning(stationId, new Date(now - 7 * DAY_MS), new Date(now)),
        this.sumStationEarning(stationId, new Date(now - 14 * DAY_MS), new Date(now - 7 * DAY_MS)),
      ]);
      if (prev7 <= 0) return { hit: false };
      const dropPct = round2(((prev7 - last7) / prev7) * 100);
      return dropPct >= threshold
        ? { hit: true, facts: { last7: round2(last7), prev7: round2(prev7), dropPct } }
        : { hit: false };
    },

    /** 分站连续 N 天零佣金（且分站已建站超过 N 天） */
    station_zero_earning: async (stationId, cond) => {
      const days = cond.days ?? 14;
      const since = new Date(Date.now() - days * DAY_MS);
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { createdAt: true },
      });
      if (!station || station.createdAt > since) return { hit: false };
      const count = await this.prisma.stationEarning.count({
        where: { stationId, createdAt: { gte: since }, earned: { gt: 0 } },
      });
      return count === 0 ? { hit: true, facts: { days } } : { hit: false };
    },

    /** 锁定用户沉睡占比：归属用户中近 N 天无支付订单的比例 */
    station_idle_locked_users: async (stationId, cond) => {
      const days = cond.days ?? 30;
      const threshold = cond.thresholdPct ?? 70;
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { userId: true },
      });
      if (!station) return { hit: false };
      const relations = await this.prisma.referralRelation.findMany({
        where: { referrerId: station.userId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
        select: { userId: true },
        take: 500,
      });
      const total = relations.length;
      if (total < 5) return { hit: false }; // 样本太小不打扰
      const activeBuyers = await this.prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: relations.map((r) => r.userId) },
          status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
          createdAt: { gte: new Date(Date.now() - days * DAY_MS) },
        },
      });
      const idle = total - activeBuyers.length;
      const idlePct = round2((idle / total) * 100);
      return idlePct >= threshold
        ? { hit: true, facts: { idle, total, idlePct, days } }
        : { hit: false };
    },

    /** 驿站库存预警：在售商品库存 ≤ 阈值 */
    offline_stock_low: async (stationOfflineId, cond) => {
      const threshold = cond.threshold ?? 5;
      const count = await this.prisma.stationProduct.count({
        where: { stationId: stationOfflineId, status: "ACTIVE", stock: { lte: threshold } },
      });
      return count > 0 ? { hit: true, facts: { count, threshold } } : { hit: false };
    },

    /** 驿站待确认讲师预约积压 */
    offline_pending_bookings: async (stationOfflineId) => {
      const count = await this.prisma.stationTeacherBooking.count({
        where: { stationId: stationOfflineId, status: "PENDING" },
      });
      return count > 0 ? { hit: true, facts: { count } } : { hit: false };
    },

    /** 驿站营收周环比下滑：StationOrder 近7天 vs 前7天 */
    offline_revenue_wow_drop: async (stationOfflineId, cond) => {
      const threshold = cond.thresholdPct ?? 30;
      const now = Date.now();
      const [last7, prev7] = await Promise.all([
        this.sumOfflineRevenue(stationOfflineId, new Date(now - 7 * DAY_MS), new Date(now)),
        this.sumOfflineRevenue(stationOfflineId, new Date(now - 14 * DAY_MS), new Date(now - 7 * DAY_MS)),
      ]);
      if (prev7 <= 0) return { hit: false };
      const dropPct = round2(((prev7 - last7) / prev7) * 100);
      return dropPct >= threshold
        ? { hit: true, facts: { last7: round2(last7), prev7: round2(prev7), dropPct } }
        : { hit: false };
    },
  };

  private async sumStationEarning(stationId: string, gte: Date, lt: Date) {
    const agg = await this.prisma.stationEarning.aggregate({
      where: { stationId, createdAt: { gte, lt } },
      _sum: { earned: true },
    });
    return Number(agg._sum.earned || 0);
  }

  private async sumOfflineRevenue(stationId: string, gte: Date, lt: Date) {
    const agg = await this.prisma.stationOrder.aggregate({
      where: { stationId, status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte, lt } },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount || 0);
  }

  // ───────── 评估与生成 ─────────

  /** 每日 6AM 全量评估（同主体同规则 7 天冷却；每主体每日最多 3 条） */
  @Cron("0 6 * * *")
  async evaluateAllCron() {
    try {
      const result = await this.evaluateAll();
      this.logger.log(`顾问引擎评估完成：${result.evaluated} 次探针，生成 ${result.generated} 条建议`);
    } catch (e) {
      this.logger.error("顾问引擎评估失败", e as Error);
    }
  }

  async evaluateAll() {
    const rules = await this.prisma.advisorRule.findMany({ where: { enabled: true } });
    let evaluated = 0;
    let generated = 0;
    for (const rule of rules) {
      const subjects = await this.listSubjects(rule.roleType);
      for (const subjectId of subjects) {
        evaluated++;
        try {
          if (await this.generateForSubject(rule, subjectId)) generated++;
        } catch (e) {
          this.logger.warn(`规则 ${rule.ruleKey} 主体 ${subjectId} 评估失败`, e as Error);
        }
      }
    }
    return { evaluated, generated };
  }

  /** 角色 → 主体清单（MVP 覆盖站长/驿站，其余角色 P3 扩展） */
  private async listSubjects(roleType: string): Promise<string[]> {
    if (roleType === "STATION_MASTER") {
      const rows = await this.prisma.station.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 2000 });
      return rows.map((r) => r.id);
    }
    if (roleType === "STATION_OFFLINE_OWNER") {
      const rows = await this.prisma.stationOffline.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 2000 });
      return rows.map((r) => r.id);
    }
    return [];
  }

  /** 单主体单规则：探针评估 → 冷却/限额检查 → 模板渲染 → 落库。返回是否生成 */
  private async generateForSubject(
    rule: { ruleKey: string; roleType: string; metric: string; condition: unknown; severity: string; suggestion: string; actions: unknown },
    subjectId: string,
  ): Promise<boolean> {
    const probe = this.PROBES[rule.metric];
    if (!probe) {
      this.logger.warn(`规则 ${rule.ruleKey} 引用未知探针 ${rule.metric}，跳过`);
      return false;
    }

    // 冷却：同主体同规则 7 天内已有建议则不重复
    const recent = await this.prisma.advisorInsight.findFirst({
      where: {
        ruleKey: rule.ruleKey,
        subjectId,
        createdAt: { gte: new Date(Date.now() - INSIGHT_COOLDOWN_DAYS * DAY_MS) },
      },
      select: { id: true },
    });
    if (recent) return false;

    // 每日限额：防止单主体被建议轰炸
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.advisorInsight.count({
      where: { subjectId, createdAt: { gte: todayStart } },
    });
    if (todayCount >= MAX_INSIGHTS_PER_DAY) return false;

    const result = await probe(subjectId, (rule.condition as Record<string, number>) || {});
    if (!result.hit) return false;

    const content = this.renderTemplate(rule.suggestion, result.facts || {});
    await this.prisma.advisorInsight.create({
      data: {
        ruleKey: rule.ruleKey,
        roleType: rule.roleType,
        subjectId,
        severity: rule.severity,
        facts: result.facts || {},
        content,
        actions: rule.actions as object,
      },
    });
    return true;
  }

  /** {{key}} 占位符渲染（P2 升级为 AI 个性化，模板保留为降级路径） */
  renderTemplate(template: string, facts: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
      facts[key] !== undefined ? String(facts[key]) : `{{${key}}}`,
    );
  }

  // ───────── 工作台读取与状态流转 ─────────

  /** 当前用户按角色解析主体ID（服务端解析，杜绝越权读他人建议） */
  async resolveSubjectId(userId: string, roleType: string): Promise<string | null> {
    if (roleType === "STATION_MASTER") {
      const s = await this.prisma.station.findUnique({ where: { userId }, select: { id: true } });
      return s?.id ?? null;
    }
    if (roleType === "STATION_OFFLINE_OWNER") {
      const s = await this.prisma.stationOffline.findFirst({ where: { ownerUserId: userId }, select: { id: true } });
      return s?.id ?? null;
    }
    return null;
  }

  async listInsights(userId: string, roleType: string) {
    const subjectId = await this.resolveSubjectId(userId, roleType);
    if (!subjectId) return { insights: [] };
    const insights = await this.prisma.advisorInsight.findMany({
      where: { roleType, subjectId, status: { in: ["OPEN", "READ"] } },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });
    return { insights };
  }

  async transition(userId: string, insightId: string, action: "read" | "act" | "dismiss") {
    const insight = await this.prisma.advisorInsight.findUnique({ where: { id: insightId } });
    if (!insight) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    // 归属校验：只能操作自己主体的建议
    const subjectId = await this.resolveSubjectId(userId, insight.roleType);
    if (!subjectId || subjectId !== insight.subjectId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该建议");
    }
    const statusMap = { read: "READ", act: "ACTED", dismiss: "DISMISSED" } as const;
    return this.prisma.advisorInsight.update({
      where: { id: insightId },
      data: {
        status: statusMap[action],
        ...(action === "act" ? { actedAt: new Date() } : {}),
      },
    });
  }
}
