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

  // ───────── AI 个性化文案（T2-P2）─────────

  /** AI 开关：需配置 DEEPSEEK_API_KEY，且可用 ADVISOR_AI_ENABLED=false 关闭；单测环境强制关闭 */
  private aiEnabled(): boolean {
    return (
      !!process.env.DEEPSEEK_API_KEY &&
      process.env.ADVISOR_AI_ENABLED !== "false" &&
      process.env.NODE_ENV !== "test"
    );
  }

  /** 生成建议文案：优先 AI 个性化（6 秒超时），失败/未配置降级为模板渲染 */
  private async renderContent(
    rule: { ruleKey: string; suggestion: string },
    facts: Record<string, string | number>,
  ): Promise<string> {
    const fallback = this.renderTemplate(rule.suggestion, facts);
    if (!this.aiEnabled()) return fallback;
    try {
      const resp = await fetch(
        `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "你是国学传统文化平台的经营顾问。基于给定的诊断事实，用不超过90字的中文输出一条具体、温和、专业的经营建议：先陈述关键数据事实，再给一个可立即执行的行动建议。禁止承诺收益，禁止夸大，不要寒暄，不要 markdown 格式。",
              },
              {
                role: "user",
                content: `诊断类型：${rule.ruleKey}\n事实数据：${JSON.stringify(facts)}\n参考模板：${fallback}`,
              },
            ],
            temperature: 0.4,
            max_tokens: 200,
          }),
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!resp.ok) return fallback;
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data?.choices?.[0]?.message?.content?.trim();
      return text && text.length >= 10 ? text.slice(0, 200) : fallback;
    } catch {
      return fallback; // AI 不可用绝不阻塞建议生成
    }
  }

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

    // ── 圈主（T2-P3）──

    /** 圈子发帖量周环比下滑（前7天≥5帖才有统计意义） */
    circle_activity_drop: async (circleId, cond) => {
      const threshold = cond.thresholdPct ?? 40;
      const now = Date.now();
      const [last7, prev7] = await Promise.all([
        this.prisma.post.count({ where: { circleId, createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
        this.prisma.post.count({
          where: { circleId, createdAt: { gte: new Date(now - 14 * DAY_MS), lt: new Date(now - 7 * DAY_MS) } },
        }),
      ]);
      if (prev7 < 5) return { hit: false };
      const dropPct = round2(((prev7 - last7) / prev7) * 100);
      return dropPct >= threshold
        ? { hit: true, facts: { last7, prev7, dropPct } }
        : { hit: false };
    },

    /** 圈子成员增长停滞：连续 N 天零新成员（成员数达一定规模才提醒） */
    circle_member_growth_stall: async (circleId, cond) => {
      const days = cond.days ?? 14;
      const minMembers = cond.minMembers ?? 10;
      const total = await this.prisma.circleMember.count({ where: { circleId } });
      if (total < minMembers) return { hit: false };
      const newcomers = await this.prisma.circleMember.count({
        where: { circleId, joinedAt: { gte: new Date(Date.now() - days * DAY_MS) } },
      });
      return newcomers === 0 ? { hit: true, facts: { days, total } } : { hit: false };
    },

    /** 付费圈 30 天零入圈收入（圈子创建满 30 天才评估） */
    circle_zero_join_revenue: async (circleId, cond) => {
      const days = cond.days ?? 30;
      const circle = await this.prisma.circle.findUnique({
        where: { id: circleId },
        select: { price: true, createdAt: true },
      });
      if (!circle || Number(circle.price) <= 0) return { hit: false };
      if (circle.createdAt > new Date(Date.now() - days * DAY_MS)) return { hit: false };
      const paid = await this.prisma.order.count({
        where: { type: "CIRCLE_JOIN", targetId: circleId, status: "PAID", createdAt: { gte: new Date(Date.now() - days * DAY_MS) } },
      });
      return paid === 0 ? { hit: true, facts: { days } } : { hit: false };
    },

    // ── 讲师（T2-P3·主体=讲师 userId）──

    /** 近 N 天出现低分差评（≤2星） */
    teacher_new_bad_review: async (teacherUserId, cond) => {
      const days = cond.days ?? 7;
      const maxRating = cond.maxRating ?? 2;
      const courses = await this.prisma.course.findMany({
        where: { userId: teacherUserId },
        select: { id: true },
        take: 500,
      });
      if (courses.length === 0) return { hit: false };
      const count = await this.prisma.courseReview.count({
        where: {
          courseId: { in: courses.map((c) => c.id) },
          rating: { lte: maxRating },
          status: "PUBLISHED",
          createdAt: { gte: new Date(Date.now() - days * DAY_MS) },
        },
      });
      return count > 0 ? { hit: true, facts: { count, days } } : { hit: false };
    },

    /** 讲师连续 N 天未发布新课（已有课程的活跃讲师才提醒） */
    teacher_no_new_content: async (teacherUserId, cond) => {
      const days = cond.days ?? 45;
      const total = await this.prisma.course.count({ where: { userId: teacherUserId } });
      if (total === 0) return { hit: false };
      const recent = await this.prisma.course.count({
        where: { userId: teacherUserId, createdAt: { gte: new Date(Date.now() - days * DAY_MS) } },
      });
      return recent === 0 ? { hit: true, facts: { days, total } } : { hit: false };
    },

    // ── 运营商（T2-P3）──

    /** 沉寂站长：名下站长近 N 天零佣金的数量 */
    operator_dormant_stations: async (operatorId, cond) => {
      const days = cond.days ?? 30;
      const stations = await this.prisma.station.findMany({
        where: { operatorId, status: "ACTIVE" },
        select: { id: true },
        take: 500,
      });
      if (stations.length === 0) return { hit: false };
      const active = await this.prisma.stationEarning.groupBy({
        by: ["stationId"],
        where: {
          stationId: { in: stations.map((s) => s.id) },
          createdAt: { gte: new Date(Date.now() - days * DAY_MS) },
          earned: { gt: 0 },
        },
      });
      const dormant = stations.length - active.length;
      return dormant >= 1
        ? { hit: true, facts: { dormant, total: stations.length, days } }
        : { hit: false };
    },

    /** 新站长开局停滞：加入 N 天内仍零佣金的新站长数量 */
    operator_new_station_stall: async (operatorId, cond) => {
      const days = cond.days ?? 14;
      const newStations = await this.prisma.station.findMany({
        where: { operatorId, status: "ACTIVE", createdAt: { gte: new Date(Date.now() - days * DAY_MS) } },
        select: { id: true },
        take: 200,
      });
      if (newStations.length === 0) return { hit: false };
      const earned = await this.prisma.stationEarning.groupBy({
        by: ["stationId"],
        where: { stationId: { in: newStations.map((s) => s.id) }, earned: { gt: 0 } },
      });
      const stalled = newStations.length - earned.length;
      return stalled > 0 ? { hit: true, facts: { stalled, days } } : { hit: false };
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

  /** 角色 → 主体清单（cron 评估用；P3 起覆盖五角色） */
  private async listSubjects(roleType: string): Promise<string[]> {
    if (roleType === "STATION_MASTER") {
      const rows = await this.prisma.station.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 2000 });
      return rows.map((r) => r.id);
    }
    if (roleType === "STATION_OFFLINE_OWNER") {
      const rows = await this.prisma.stationOffline.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 2000 });
      return rows.map((r) => r.id);
    }
    if (roleType === "CIRCLE_OWNER") {
      const rows = await this.prisma.circle.findMany({ where: { deletedAt: null }, select: { id: true }, take: 2000 });
      return rows.map((r) => r.id);
    }
    if (roleType === "LECTURER") {
      const rows = await this.prisma.userRole.findMany({ where: { roleType: "LECTURER" }, select: { userId: true }, take: 2000 });
      return [...new Set(rows.map((r) => r.userId))];
    }
    if (roleType === "OPERATOR") {
      const rows = await this.prisma.operator.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 2000 });
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

    const content = await this.renderContent(rule, result.facts || {});
    // 动作目标支持 {{subjectId}} 占位（多主体角色如圈主需要带圈子ID跳转）
    const actions = JSON.parse(JSON.stringify(rule.actions).replace(/\{\{subjectId\}\}/g, subjectId)) as object;
    await this.prisma.advisorInsight.create({
      data: {
        ruleKey: rule.ruleKey,
        roleType: rule.roleType,
        subjectId,
        severity: rule.severity,
        facts: result.facts || {},
        content,
        actions,
      },
    });
    return true;
  }

  /** {{key}} 占位符渲染（AI 个性化的降级路径） */
  renderTemplate(template: string, facts: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
      facts[key] !== undefined ? String(facts[key]) : `{{${key}}}`,
    );
  }

  // ───────── 效果回访（T2-P2）─────────

  /** 每日 7AM：对采纳满 7 天的建议复跑探针，回填问题是否解决（反哺规则有效性统计） */
  @Cron("0 7 * * *")
  async feedbackCron() {
    try {
      const result = await this.collectFeedback();
      if (result.updated > 0) this.logger.log(`效果回访完成：回填 ${result.updated} 条建议反馈`);
    } catch (e) {
      this.logger.error("效果回访执行失败", e as Error);
    }
  }

  async collectFeedback() {
    // 采纳时间落在 [8天前, 7天前) 窗口且尚未回填的建议
    const acted = await this.prisma.advisorInsight.findMany({
      where: {
        status: "ACTED",
        actedAt: { gte: new Date(Date.now() - 8 * DAY_MS), lt: new Date(Date.now() - 7 * DAY_MS) },
      },
      take: 200,
    });
    const pending = acted.filter((a) => !a.feedback);
    if (pending.length === 0) return { updated: 0 };

    const rules = await this.prisma.advisorRule.findMany({
      where: { ruleKey: { in: [...new Set(pending.map((a) => a.ruleKey))] } },
    });
    const ruleMap = new Map(rules.map((r) => [r.ruleKey, r]));

    let updated = 0;
    for (const insight of pending) {
      const rule = ruleMap.get(insight.ruleKey);
      const probe = rule ? this.PROBES[rule.metric] : undefined;
      if (!rule || !probe) continue;
      try {
        const after = await probe(insight.subjectId, (rule.condition as Record<string, number>) || {});
        await this.prisma.advisorInsight.update({
          where: { id: insight.id },
          data: {
            feedback: {
              resolved: !after.hit, // 探针不再命中 = 问题已解决
              factsAfter: after.facts ?? {},
              checkedAt: new Date().toISOString(),
            },
          },
        });
        updated++;
      } catch (e) {
        this.logger.warn(`效果回访失败(insight=${insight.id})`, e as Error);
      }
    }
    return { updated };
  }

  // ───────── 工作台读取与状态流转 ─────────

  /** 当前用户按角色解析主体ID列表（服务端解析，杜绝越权读他人建议；圈主可拥有多个圈子） */
  async resolveSubjectIds(userId: string, roleType: string): Promise<string[]> {
    if (roleType === "STATION_MASTER") {
      const s = await this.prisma.station.findUnique({ where: { userId }, select: { id: true } });
      return s ? [s.id] : [];
    }
    if (roleType === "STATION_OFFLINE_OWNER") {
      const s = await this.prisma.stationOffline.findFirst({ where: { ownerUserId: userId }, select: { id: true } });
      return s ? [s.id] : [];
    }
    if (roleType === "CIRCLE_OWNER") {
      const rows = await this.prisma.circleMember.findMany({
        where: { userId, role: "OWNER" },
        select: { circleId: true },
        take: 20,
      });
      return rows.map((r) => r.circleId);
    }
    if (roleType === "LECTURER") {
      return [userId]; // 讲师主体即本人
    }
    if (roleType === "OPERATOR") {
      const op = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true } });
      return op ? [op.id] : [];
    }
    return [];
  }

  async listInsights(userId: string, roleType: string) {
    const subjectIds = await this.resolveSubjectIds(userId, roleType);
    if (subjectIds.length === 0) return { insights: [] };
    const insights = await this.prisma.advisorInsight.findMany({
      where: { roleType, subjectId: { in: subjectIds }, status: { in: ["OPEN", "READ"] } },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });
    return { insights };
  }

  async transition(userId: string, insightId: string, action: "read" | "act" | "dismiss") {
    const insight = await this.prisma.advisorInsight.findUnique({ where: { id: insightId } });
    if (!insight) throw new BusinessException(ErrorCode.NOT_FOUND, "建议不存在");
    // 归属校验：只能操作自己主体的建议
    const subjectIds = await this.resolveSubjectIds(userId, insight.roleType);
    if (!subjectIds.includes(insight.subjectId)) {
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
