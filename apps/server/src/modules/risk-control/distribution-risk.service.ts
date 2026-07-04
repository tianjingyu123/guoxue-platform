import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SensitiveWordService } from "../audit/sensitive-word.service";
import { SettlementFreezeService } from "../settlement/settlement-freeze.service";
import { SystemService } from "../system/system.service";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** 预警类别标记（RiskAlert.detail.category·admin 风控台「分销风控」类别筛选依据） */
export const DISTRIBUTION_ALERT_CATEGORY = "DISTRIBUTION";

/** 预警类型（RiskAlert.type·DISTRIBUTION_ 前缀即分销风控类别） */
export const DISTRIBUTION_ALERT_TYPES = {
  /** 违禁词：站长微页面/驿站简介命中 COMPLIANCE_A（含传销表述/站外返现承诺） */
  FORBIDDEN_WORD: "DISTRIBUTION_FORBIDDEN_WORD",
  /** 归因规则①：同推荐人当日批量绑定 */
  BATCH_BIND: "DISTRIBUTION_BATCH_BIND",
  /** 归因规则②：绑定后短时间内下单占比异常（秒下单刷佣） */
  QUICK_ORDER: "DISTRIBUTION_QUICK_ORDER",
  /** 归因规则③：互刷（A 的推荐人是 B 且 B 的推荐人是 A） */
  MUTUAL_REFERRAL: "DISTRIBUTION_MUTUAL_REFERRAL",
  /** 归因规则④：单推荐人绑定量周环比突增 */
  BIND_SURGE: "DISTRIBUTION_BIND_SURGE",
} as const;

/**
 * 阈值（默认值）——导出供后台配置留口：
 * 后续可由 SystemService 配置项（如 distribution_risk_thresholds）覆盖，本批先用常量（与履-P1 同范式）。
 */
export const DISTRIBUTION_RISK_THRESHOLDS = {
  /** 规则①：同推荐人当日新增绑定 > 此数 → 预警 */
  batchBindDailyCount: 20,
  /** 规则②：绑定后 N 分钟内下单视为"秒下单" */
  quickOrderWindowMinutes: 10,
  /** 规则②：秒下单笔数 ≥ 此数 */
  quickOrderMinCount: 5,
  /** 规则②：秒下单占当日新增绑定比例 > 此值 */
  quickOrderRatio: 0.8,
  /** 规则④：本周绑定量 > 上周 × 此倍数 */
  surgeFactor: 5,
  /** 规则④：且本周绑定量 ≥ 此数（防小样本噪声） */
  surgeMinCount: 30,
  /** 同推荐人同类预警去重窗口（秒·规则①②④滚动窗口用 redis 去重） */
  dedupTtlSeconds: 86_400,
} as const;

/**
 * 分销文案补充违禁词（设计§2.1「乱价」监测：站外承诺返现类话术）。
 * 真源=SensitiveWord 表 COMPLIANCE_A（合-P1 已灌传销表述类）；此三词为分销专项补充，
 * 种子 SQL prisma/manual-sql/20260706_distribution_words.sql 幂等入库；
 * 扫描前兜底校验：若 DB 缺失（种子未跑）则经敏感词 service 现有 addWord 方法补齐。
 */
export const DISTRIBUTION_EXTRA_WORDS = ["返现", "回扣", "保底收益"] as const;

/** 违禁词单条命中 */
interface WordHit {
  targetType: string; // STATION / MARKETING_PAGE / MARKETING_PAGE_COMPONENT
  targetId: string;
  field: string;
  word: string;
  snippet: string;
}

/** 扫描报告（手动触发端点返回） */
export interface DistributionScanReport {
  scanAt: string;
  durationMs: number;
  wordScan: { stationsScanned: number; pagesScanned: number; componentsScanned: number; hits: number; alerts: number };
  batchBind: number;
  quickOrder: number;
  mutualReferral: number;
  bindSurge: number;
  alertsCreated: number;
}

/**
 * 分销风控（商-P1·设计§2.1「AI 分销风控」）：违禁词存量扫描 + 归因异常四规则
 *
 * ## 违禁词扫描（乱价/违规宣传监测）
 * - 扫描对象 = 站长自定义文案域：MarketingPage(stationId≠null).name/description +
 *   其 MarketingPageComponent.title/config + Station.name/intro（简介类字段）
 * - 词库 = SensitiveWord COMPLIANCE_A（合-P1 已灌·含传销表述类），比对逻辑与合规扫描器
 *   （audit/compliance-scan）同款含匹配 + 上下文片段；分销专项补充"返现/回扣/保底收益"三词
 * - 与合-P1 月度全站扫描的分工：那边产 ComplianceScanRecord 报告制复核队列（全内容域·月扫）；
 *   本服务只盯分销文案域且**产 RiskAlert 工单**（日检·风控台即时处置），互不重复建词库
 *
 * ## 归因异常四规则（抢客/刷佣监测·日检 cron 02:30·redis.runExclusive 多实例互斥）
 * ① 同推荐人当日批量绑定 >20（ReferralRelation 建绑时未留设备指纹/IP 字段，
 *    无法按"同设备/同 IP"聚合，诚实降级为按推荐人绑定数量阈值检测；设备维度二期接 DeviceFingerprint）
 * ② 绑定后 10 分钟内下单占比 >80% 且秒下单笔数 ≥5（典型刷佣特征）
 * ③ 互刷：A 的推荐人是 B 且 B 的推荐人是 A（自环互相导佣）
 * ④ 单推荐人绑定量周环比 >5 倍且本周 ≥30（突增·上周为 0 时视为环比无穷大同样触发）
 *
 * ## 处置（工单制·DANGER 规则自动冻结）
 * - 触发 → RiskAlert（detail.category=DISTRIBUTION·type 带 DISTRIBUTION_ 前缀·level 按规则），
 *   admin 风控台 /risk-control/alerts 列表即工单队列（与履-P1 同范式：模块无通用工单 service，直接写行）
 * - 佣金冻结：结算引擎已补事后冻结接口（SettlementFreezeService.freezeBeneficiary·PENDING→FROZEN
 *   CAS 批量翻·P2-c 口径 FROZEN 不计可提现，冻结即扣）。互刷/秒下单两条 DANGER 规则触发时：
 *   automation_enabled 开 → 自动冻结涉事站长 STATION 台账并在 payload 记 commissionFreeze=AUTO_FROZEN+冻结行数；
 *   开关关/无名下驿站/冻结失败 → 维持 commissionFreeze=MANUAL_REQUIRED 由人工在后台冻结复核。
 *   复核放行走 POST /settlement/unfreeze（仅解事后冻结行，大额审批冻结不受影响）。
 * - 页面自动下架属处罚体系后置动作（须与站长协议条款对齐·设计§四待拍板 3），本批只落工单
 */
@Injectable()
export class DistributionRiskService {
  private readonly logger = new Logger(DistributionRiskService.name);
  private readonly SNIPPET_RADIUS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sensitiveWord: SensitiveWordService,
    private readonly settlementFreeze: SettlementFreezeService,
    private readonly system: SystemService,
  ) {}

  // ───────── 日检 cron ─────────

  /** 每日 02:30 全量扫描（多实例互斥·单项失败不影响其余规则） */
  @Cron("30 2 * * *")
  async dailyScanCron(): Promise<void> {
    await this.redis.runExclusive("distribution-risk", 1800, async () => {
      try {
        const report = await this.scanAll();
        this.logger.log(`分销风控日检完成：新增工单 ${report.alertsCreated} 条（${JSON.stringify(report)}）`);
      } catch (e) {
        this.logger.error("分销风控日检失败", e instanceof Error ? e.stack : String(e));
      }
    });
  }

  /** 全量扫描（手动触发端点与日检共用·单规则失败不阻断其余规则） */
  async scanAll(): Promise<DistributionScanReport> {
    const start = Date.now();
    const now = new Date();

    await this.ensureDistributionWords();

    const wordScan = await this.safeRun("违禁词扫描", () => this.scanForbiddenWords(), {
      stationsScanned: 0, pagesScanned: 0, componentsScanned: 0, hits: 0, alerts: 0,
    });
    const batchBind = await this.safeRun("规则①批量绑定", () => this.checkBatchBind(now), 0);
    const quickOrder = await this.safeRun("规则②秒下单", () => this.checkQuickOrder(now), 0);
    const mutualReferral = await this.safeRun("规则③互刷", () => this.checkMutualReferral(), 0);
    const bindSurge = await this.safeRun("规则④绑定突增", () => this.checkBindSurge(now), 0);

    return {
      scanAt: now.toISOString(),
      durationMs: Date.now() - start,
      wordScan,
      batchBind,
      quickOrder,
      mutualReferral,
      bindSurge,
      alertsCreated: wordScan.alerts + batchBind + quickOrder + mutualReferral + bindSurge,
    };
  }

  private async safeRun<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      this.logger.error(`分销风控[${name}]执行失败`, e instanceof Error ? e.stack : String(e));
      return fallback;
    }
  }

  // ───────── 违禁词扫描 ─────────

  /** 兜底：分销专项三词缺失（种子 SQL 未跑）时经现有 addWord 方法补入 COMPLIANCE_A */
  async ensureDistributionWords(): Promise<void> {
    const existing = new Set(this.sensitiveWord.getComplianceWords().map((w) => w.word));
    for (const word of DISTRIBUTION_EXTRA_WORDS) {
      if (existing.has(word)) continue;
      await this.sensitiveWord.addWord(word, "COMPLIANCE_A", undefined, "分销站外承诺类（商-P1·警惕误杀正常语境由人工忽略）");
    }
  }

  /**
   * 分销文案违禁词扫描：Station.name/intro + 站长微页面 MarketingPage.name/description
   * + 组件 title/config，比对 COMPLIANCE_A；命中按驿站聚合成一张工单（DANGER）。
   * 幂等：同站长已有同类 OPEN 工单则不重复产出（处置完 HANDLED 后再犯会重新触发）。
   */
  async scanForbiddenWords(): Promise<{ stationsScanned: number; pagesScanned: number; componentsScanned: number; hits: number; alerts: number }> {
    const words = this.sensitiveWord
      .getComplianceWords()
      .filter((w) => w.level === "A")
      .map((w) => w.word);
    if (words.length === 0) {
      this.logger.warn("COMPLIANCE_A 词库为空（种子 SQL 未执行），跳过违禁词扫描");
      return { stationsScanned: 0, pagesScanned: 0, componentsScanned: 0, hits: 0, alerts: 0 };
    }

    // 站长微页面量级小（站长手工建），全量拉取即可，不需要合-P1 的游标分批
    const [stations, pages] = await Promise.all([
      this.prisma.station.findMany({
        select: { id: true, name: true, intro: true },
      }),
      this.prisma.marketingPage.findMany({
        where: { stationId: { not: null } },
        select: {
          id: true,
          stationId: true,
          name: true,
          description: true,
          components: { select: { id: true, title: true, config: true } },
        },
      }),
    ]);

    // 按 stationId 聚合命中
    const hitsByStation = new Map<string, WordHit[]>();
    const push = (stationId: string, hit: WordHit) => {
      const arr = hitsByStation.get(stationId) ?? [];
      arr.push(hit);
      hitsByStation.set(stationId, arr);
    };

    let componentsScanned = 0;
    for (const s of stations) {
      for (const hit of this.matchFields(words, "STATION", s.id, { name: s.name, intro: s.intro })) {
        push(s.id, hit);
      }
    }
    for (const p of pages) {
      const stationId = p.stationId as string; // where 已保证非空
      for (const hit of this.matchFields(words, "MARKETING_PAGE", p.id, { name: p.name, description: p.description })) {
        push(stationId, hit);
      }
      for (const c of p.components) {
        componentsScanned += 1;
        const fields = { title: c.title, config: c.config ? JSON.stringify(c.config) : null };
        for (const hit of this.matchFields(words, "MARKETING_PAGE_COMPONENT", c.id, fields)) {
          push(stationId, hit);
        }
      }
    }

    let totalHits = 0;
    for (const arr of hitsByStation.values()) totalHits += arr.length;

    // 逐驿站落工单（同站长同类 OPEN 工单幂等跳过）
    let alerts = 0;
    for (const [stationId, hits] of hitsByStation) {
      if (await this.hasOpenAlert(DISTRIBUTION_ALERT_TYPES.FORBIDDEN_WORD, stationId)) continue;
      const uniqueWords = [...new Set(hits.map((h) => h.word))];
      await this.createAlert(
        DISTRIBUTION_ALERT_TYPES.FORBIDDEN_WORD,
        "DANGER",
        `分销文案违禁词：驿站文案命中 ${uniqueWords.length} 个 A 级禁止词（${uniqueWords.slice(0, 5).join("、")}${uniqueWords.length > 5 ? "…" : ""}）`,
        { targetType: "STATION", targetId: stationId, stationId },
        {
          words: uniqueWords,
          hits: hits.slice(0, 50),
          hitCount: hits.length,
          suggestion: "A 级禁止词，建议下架页面/整改文案并警告站长；再犯冻结推广权（页面自动下架待协议条款对齐后接入）",
        },
      );
      alerts += 1;
    }

    return { stationsScanned: stations.length, pagesScanned: pages.length, componentsScanned, hits: totalHits, alerts };
  }

  /** 含匹配（与合-P1 合规扫描器同款：lowercase includes + 上下文片段） */
  private matchFields(
    words: string[],
    targetType: string,
    targetId: string,
    fields: Record<string, string | null | undefined>,
  ): WordHit[] {
    const out: WordHit[] = [];
    for (const [field, text] of Object.entries(fields)) {
      if (!text) continue;
      const lower = text.toLowerCase();
      for (const word of words) {
        const idx = lower.indexOf(word.toLowerCase());
        if (idx < 0) continue;
        out.push({ targetType, targetId, field, word, snippet: this.snippet(text, idx, word.length) });
      }
    }
    return out;
  }

  private snippet(text: string, idx: number, wordLen: number): string {
    const start = Math.max(0, idx - this.SNIPPET_RADIUS);
    const end = Math.min(text.length, idx + wordLen + this.SNIPPET_RADIUS);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  }

  // ───────── 归因异常四规则 ─────────

  /**
   * 规则①：同推荐人当日（Asia/Shanghai 昨日整日）新增绑定 > 20 → WARN 工单。
   * 诚实注释：ReferralRelation 建绑链路未记录设备指纹/IP（DeviceFingerprint 是登录维度、
   * 与绑定事件无关联键），"同设备/同 IP 批量绑定"暂无数据支撑，降级为按推荐人数量阈值；
   * 设备/IP 维度待绑定链路补埋点后二期接入。
   */
  async checkBatchBind(now: Date): Promise<number> {
    const t = DISTRIBUTION_RISK_THRESHOLDS;
    const range = this.yesterdayRange(now);
    const groups = await this.prisma.referralRelation.groupBy({
      by: ["referrerId"],
      where: { createdAt: { gte: range.gte, lt: range.lt } },
      _count: { _all: true },
    });
    const over = groups.filter((g) => g._count._all > t.batchBindDailyCount);
    if (over.length === 0) return 0;

    const stationBy = await this.stationsByUser(over.map((g) => g.referrerId));
    let created = 0;
    for (const g of over) {
      if (!(await this.dedup(DISTRIBUTION_ALERT_TYPES.BATCH_BIND, g.referrerId))) continue;
      await this.createAlert(
        DISTRIBUTION_ALERT_TYPES.BATCH_BIND,
        "WARN",
        `归因异常·批量绑定：推荐人当日新增绑定 ${g._count._all} 人（阈值 ${t.batchBindDailyCount}）`,
        this.targetOf(g.referrerId, stationBy),
        {
          referrerId: g.referrerId,
          newBinds: g._count._all,
          threshold: t.batchBindDailyCount,
          window: { gte: range.gte.toISOString(), lt: range.lt.toISOString() },
          note: "绑定链路无设备/IP 埋点，本规则按数量阈值检测（设备维度二期）",
        },
      );
      created += 1;
    }
    return created;
  }

  /**
   * 规则②：昨日新增绑定中，绑定后 10 分钟内即下单的占比 >80% 且笔数 ≥5 → DANGER 工单。
   * 正常拉新极少出现"绑定即下单"高占比，属典型刷佣归因特征。
   */
  async checkQuickOrder(now: Date): Promise<number> {
    const t = DISTRIBUTION_RISK_THRESHOLDS;
    const range = this.yesterdayRange(now);
    const binds = await this.prisma.referralRelation.findMany({
      where: { createdAt: { gte: range.gte, lt: range.lt } },
      select: { userId: true, referrerId: true, createdAt: true },
    });
    if (binds.length === 0) return 0;

    // 秒下单笔数 ≥5 要求该推荐人昨日至少 5 个新绑定，先按推荐人聚合过滤
    const byReferrer = new Map<string, Array<{ userId: string; createdAt: Date }>>();
    for (const b of binds) {
      const arr = byReferrer.get(b.referrerId) ?? [];
      arr.push({ userId: b.userId, createdAt: b.createdAt });
      byReferrer.set(b.referrerId, arr);
    }
    const candidates = [...byReferrer.entries()].filter(([, arr]) => arr.length >= t.quickOrderMinCount);
    if (candidates.length === 0) return 0;

    // 拉取涉事新绑定用户在 [绑定窗口, 窗口末+10min] 内的订单，内存内按 (userId, 绑定时刻+10min) 判定
    const windowMs = t.quickOrderWindowMinutes * MINUTE_MS;
    const userIds = [...new Set(candidates.flatMap(([, arr]) => arr.map((b) => b.userId)))];
    const orders = await this.prisma.order.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: range.gte, lt: new Date(range.lt.getTime() + windowMs) },
        status: { notIn: ["CANCELLED"] },
      },
      select: { userId: true, createdAt: true },
    });
    const orderTimesBy = new Map<string, number[]>();
    for (const o of orders) {
      const arr = orderTimesBy.get(o.userId) ?? [];
      arr.push(o.createdAt.getTime());
      orderTimesBy.set(o.userId, arr);
    }

    const stationBy = await this.stationsByUser(candidates.map(([rid]) => rid));
    let created = 0;
    for (const [referrerId, arr] of candidates) {
      const quickUserIds = arr
        .filter((b) => {
          const times = orderTimesBy.get(b.userId);
          if (!times) return false;
          const bindAt = b.createdAt.getTime();
          return times.some((ts) => ts >= bindAt && ts <= bindAt + windowMs);
        })
        .map((b) => b.userId);
      const ratio = quickUserIds.length / arr.length;
      if (quickUserIds.length < t.quickOrderMinCount || ratio <= t.quickOrderRatio) continue;
      if (!(await this.dedup(DISTRIBUTION_ALERT_TYPES.QUICK_ORDER, referrerId))) continue;

      // DANGER 处置：automation_enabled 开 → 自动冻结该站长待结算佣金（无驿站/关/失败降级 MANUAL_REQUIRED）
      const freezePayload = await this.autoFreezeCommission(
        [stationBy.get(referrerId)?.id],
        `分销风控自动冻结：绑定即下单刷佣特征（推荐人 ${referrerId}）`,
      );

      await this.createAlert(
        DISTRIBUTION_ALERT_TYPES.QUICK_ORDER,
        "DANGER",
        `归因异常·绑定即下单：${arr.length} 个新绑定中 ${quickUserIds.length} 人于 ${t.quickOrderWindowMinutes} 分钟内下单（占比 ${(ratio * 100).toFixed(0)}%）`,
        this.targetOf(referrerId, stationBy),
        {
          referrerId,
          newBinds: arr.length,
          quickOrders: quickUserIds.length,
          ratio: Math.round(ratio * 10000) / 10000,
          quickUserIds: quickUserIds.slice(0, 50),
          windowMinutes: t.quickOrderWindowMinutes,
          thresholds: { minCount: t.quickOrderMinCount, ratio: t.quickOrderRatio },
          ...freezePayload,
        },
      );
      created += 1;
    }
    return created;
  }

  /**
   * 规则③：互刷检测——存在 A→B 与 B→A 的双向 ACTIVE 推荐关系 → DANGER 工单。
   * 每对只产一张工单（按 userId 字典序小者去重）；条件持续存在，按同类 OPEN 工单幂等。
   */
  async checkMutualReferral(): Promise<number> {
    const pairs = await this.prisma.$queryRaw<Array<{ userA: string; userB: string }>>`
      SELECT DISTINCT r1."userId" AS "userA", r1."referrerId" AS "userB"
      FROM "ReferralRelation" r1
      JOIN "ReferralRelation" r2
        ON r2."userId" = r1."referrerId" AND r2."referrerId" = r1."userId"
      WHERE r1."relationStatus" = 'ACTIVE' AND r2."relationStatus" = 'ACTIVE'
        AND r1."userId" < r1."referrerId"
    `;
    if (pairs.length === 0) return 0;

    const stationBy = await this.stationsByUser(pairs.flatMap((p) => [p.userA, p.userB]));
    let created = 0;
    for (const p of pairs) {
      // 工单目标锚定字典序小者（去重键）；detail 里双方齐全，涉站信息一并给出
      if (await this.hasOpenAlert(DISTRIBUTION_ALERT_TYPES.MUTUAL_REFERRAL, p.userA)) continue;
      const station = stationBy.get(p.userA) ?? stationBy.get(p.userB);
      // DANGER 处置：双方名下驿站（若有）均自动冻结（开关关/无驿站/失败降级 MANUAL_REQUIRED）
      const freezePayload = await this.autoFreezeCommission(
        [stationBy.get(p.userA)?.id, stationBy.get(p.userB)?.id],
        `分销风控自动冻结：互刷（${p.userA} ↔ ${p.userB}）`,
      );
      await this.createAlert(
        DISTRIBUTION_ALERT_TYPES.MUTUAL_REFERRAL,
        "DANGER",
        "归因异常·互刷：两用户互为推荐人（A↔B 自环导佣）",
        { targetType: "USER", targetId: p.userA, stationId: station?.id },
        {
          userA: p.userA,
          userB: p.userB,
          stationA: stationBy.get(p.userA)?.id ?? null,
          stationB: stationBy.get(p.userB)?.id ?? null,
          ...freezePayload,
        },
      );
      created += 1;
    }
    return created;
  }

  /**
   * 规则④：单推荐人近 7 日绑定量 > 前 7 日 × 5 且 ≥30 → WARN 工单。
   * 前 7 日为 0 时环比无穷大，本周 ≥30 即触发（新站长冷启动大量真实拉新也会命中，人工复核放行）。
   */
  async checkBindSurge(now: Date): Promise<number> {
    const t = DISTRIBUTION_RISK_THRESHOLDS;
    const curStart = new Date(now.getTime() - 7 * DAY_MS);
    const prevStart = new Date(now.getTime() - 14 * DAY_MS);

    const [cur, prev] = await Promise.all([
      this.prisma.referralRelation.groupBy({
        by: ["referrerId"],
        where: { createdAt: { gte: curStart, lt: now } },
        _count: { _all: true },
      }),
      this.prisma.referralRelation.groupBy({
        by: ["referrerId"],
        where: { createdAt: { gte: prevStart, lt: curStart } },
        _count: { _all: true },
      }),
    ]);
    const prevBy = new Map(prev.map((g) => [g.referrerId, g._count._all]));
    const over = cur.filter((g) => {
      const c = g._count._all;
      if (c < t.surgeMinCount) return false;
      const p = prevBy.get(g.referrerId) ?? 0;
      return p === 0 || c > p * t.surgeFactor;
    });
    if (over.length === 0) return 0;

    const stationBy = await this.stationsByUser(over.map((g) => g.referrerId));
    let created = 0;
    for (const g of over) {
      if (!(await this.dedup(DISTRIBUTION_ALERT_TYPES.BIND_SURGE, g.referrerId))) continue;
      const p = prevBy.get(g.referrerId) ?? 0;
      await this.createAlert(
        DISTRIBUTION_ALERT_TYPES.BIND_SURGE,
        "WARN",
        `归因异常·绑定突增：推荐人周绑定量 ${p} → ${g._count._all}（环比阈值 ×${t.surgeFactor}）`,
        this.targetOf(g.referrerId, stationBy),
        {
          referrerId: g.referrerId,
          bindsCur7d: g._count._all,
          bindsPrev7d: p,
          thresholds: { factor: t.surgeFactor, minCount: t.surgeMinCount },
        },
      );
      created += 1;
    }
    return created;
  }

  // ───────── 内部 ─────────

  /** Asia/Shanghai 昨日 [00:00, 次日00:00) 的 UTC 范围（与履-P1 dateStrShanghai 同范式） */
  yesterdayRange(now: Date): { gte: Date; lt: Date } {
    const sh = new Date(new Date(now.getTime() - DAY_MS).toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const pad = (n: number) => String(n).padStart(2, "0");
    const gte = new Date(`${sh.getFullYear()}-${pad(sh.getMonth() + 1)}-${pad(sh.getDate())}T00:00:00+08:00`);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  }

  /** 推荐人 userId → 名下驿站（Station.userId 唯一） */
  private async stationsByUser(userIds: string[]): Promise<Map<string, { id: string }>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const stations = await this.prisma.station.findMany({
      where: { userId: { in: unique } },
      select: { id: true, userId: true },
    });
    return new Map(stations.map((s) => [s.userId, { id: s.id }]));
  }

  /** 工单目标：推荐人有驿站 → STATION（风控台按驿站筛），否则 USER */
  private targetOf(
    referrerId: string,
    stationBy: Map<string, { id: string }>,
  ): { targetType: string; targetId: string; stationId?: string } {
    const station = stationBy.get(referrerId);
    return station
      ? { targetType: "STATION", targetId: station.id, stationId: station.id }
      : { targetType: "USER", targetId: referrerId };
  }

  /** 同推荐人同类预警 24h 去重（滚动窗口规则①②④·与履-P1 同范式） */
  private async dedup(type: string, key: string): Promise<boolean> {
    return this.redis.setNX(`distribution-risk:${type}:${key}`, "1", DISTRIBUTION_RISK_THRESHOLDS.dedupTtlSeconds);
  }

  /**
   * DANGER 规则自动冻结（互刷/秒下单）：automation_enabled 开 → 调结算引擎事后冻结接口
   * 冻结涉事站长 STATION 台账（PENDING→FROZEN·P2-c 口径冻结即扣可提现），返回工单 payload 覆盖片段。
   * 降级路径（均维持 MANUAL_REQUIRED，不阻断工单产出）：
   * - 推荐人无名下驿站（无 STATION 台账主体可冻结）
   * - automation_enabled=false（管理员一键接管已暂停自动化）
   * - 冻结调用失败（DB 异常等）
   */
  private async autoFreezeCommission(
    stationIds: Array<string | undefined>,
    reason: string,
  ): Promise<Record<string, unknown>> {
    const targets = [...new Set(stationIds.filter((s): s is string => !!s))];
    if (targets.length === 0) {
      return {
        commissionFreeze: "MANUAL_REQUIRED",
        commissionFreezeNote: "推荐人无名下驿站（无 STATION 台账主体可自动冻结），请人工核实后在后台处置",
      };
    }
    try {
      if (!(await this.system.isAutomationEnabled())) {
        return {
          commissionFreeze: "MANUAL_REQUIRED",
          commissionFreezeNote: "automation_enabled=false（管理员已暂停自动化），请人工在后台冻结该站长佣金待复核",
        };
      }
      let frozenRows = 0;
      const frozenByStation: Record<string, number> = {};
      for (const stationId of targets) {
        const r = await this.settlementFreeze.freezeBeneficiary("STATION", stationId, reason, "SYSTEM:DISTRIBUTION_RISK");
        frozenRows += r.frozen;
        frozenByStation[stationId] = r.frozen;
      }
      return {
        commissionFreeze: "AUTO_FROZEN",
        commissionFrozenRows: frozenRows,
        commissionFrozenByStation: frozenByStation,
        commissionFreezeNote: `已自动冻结站长待结算佣金 ${frozenRows} 行（复核放行走 POST /settlement/unfreeze·仅解事后冻结行）`,
      };
    } catch (e) {
      this.logger.error(`分销风控自动冻结失败，降级 MANUAL_REQUIRED（${targets.join(",")}）`, e instanceof Error ? e.stack : String(e));
      return {
        commissionFreeze: "MANUAL_REQUIRED",
        commissionFreezeNote: `自动冻结失败（${e instanceof Error ? e.message : String(e)}），请人工在后台冻结该站长佣金待复核`,
      };
    }
  }

  /** 同目标同类是否已有 OPEN 工单（持续性条件的 DB 幂等：违禁词/互刷） */
  private async hasOpenAlert(type: string, targetId: string): Promise<boolean> {
    const existing = await this.prisma.riskAlert.findFirst({
      where: { type, targetId, status: "OPEN" },
      select: { id: true },
    });
    return existing !== null;
  }

  /**
   * 落工单（履-P1 范式：risk-control 无通用工单创建方法，直接写 RiskAlert 行）。
   * detail 统一携带 category=DISTRIBUTION（分销风控类别标记）；佣金冻结标注默认
   * MANUAL_REQUIRED，DANGER 规则（互刷/秒下单）自动冻结成功时由调用方 detail 覆盖为 AUTO_FROZEN。
   */
  private createAlert(
    type: string,
    level: string,
    title: string,
    target: { targetType: string; targetId: string; stationId?: string },
    detail: Record<string, unknown>,
  ) {
    return this.prisma.riskAlert.create({
      data: {
        type,
        level,
        title,
        targetType: target.targetType,
        targetId: target.targetId,
        stationId: target.stationId ?? null,
        detail: {
          category: DISTRIBUTION_ALERT_CATEGORY,
          // 默认标注（可被 detail 覆盖）：非 DANGER 规则维持人工冻结工单制
          commissionFreeze: "MANUAL_REQUIRED",
          commissionFreezeNote: "请人工在后台冻结该站长佣金待复核（POST /settlement/freeze）",
          ...detail,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
