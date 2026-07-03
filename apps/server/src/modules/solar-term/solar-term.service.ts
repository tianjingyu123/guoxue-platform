import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { calcAllJieQi } from "@guoxue/bazi-engine";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import {
  getTermByName,
  SolarTermContent,
  ACH_SOLAR_TERM_RITUAL,
  ACH_SOLAR_TERM_4,
  ACH_SOLAR_TERM_12,
  ACH_SOLAR_TERM_24,
} from "./solar-term.constants";
import {
  TodayResponseDto,
  ParticipateResponseDto,
  MyParticipationDto,
} from "./solar-term.dto";

const DAY_MS = 86_400_000;
/** 节气推送覆盖的活跃用户上限（防打扰） */
const PUSH_MAX_USERS = 500;
/** 活跃判定窗口（天）：近 N 天有埋点事件视为活跃 */
const ACTIVE_WINDOW_DAYS = 30;

/**
 * V8 节气仪式裂变（纯文化内容 + 荣誉成就·无资金·无抽奖）
 *
 * - 节气判定：复用 bazi-engine `calcAllJieQi(year)`（Meeus 天文算法，精确到分），
 *   以 Asia/Shanghai 当日「月/日」匹配某节气 → 今日即节气日；
 *   下一节气取当年+次年全部节气中「距今 ≥1 天」的最近者。
 * - 参与记录落轻表 SolarTermParticipation（@@unique 防重）；
 * - 节气限定成就直建 UserAchievement（createMany skipDuplicates 幂等·纯荣誉不可兑现）——
 *   user-growth 无公开成就颁发方法（evaluateAchievements 为 private 且硬编码），故本模块自建。
 */
@Injectable()
export class SolarTermService {
  private readonly logger = new Logger(SolarTermService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notification: NotificationService,
  ) {}

  // ───────── 日期/节气工具 ─────────

  /** 当前 Asia/Shanghai 日期（年/月/日 + 当日 UTC 零点毫秒，供整天差值计算） */
  private todayShanghai(): { year: number; month: number; day: number; utcMidnight: number } {
    const now = new Date();
    const sh = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
    const year = sh.getFullYear();
    const month = sh.getMonth() + 1;
    const day = sh.getDate();
    return { year, month, day, utcMidnight: Date.UTC(year, month - 1, day) };
  }

  /** 今日公历字符串 YYYY-MM-DD（Asia/Shanghai） */
  private todayDateStr(): string {
    const { year, month, day } = this.todayShanghai();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  /** 今日是否某节气日 → 返回该节气内容，否则 null */
  private findTodayTerm(): SolarTermContent | null {
    const { year, month, day } = this.todayShanghai();
    const map = calcAllJieQi(year);
    for (const [name, t] of map) {
      if (t.month === month && t.day === day) {
        return getTermByName(name) ?? null;
      }
    }
    return null;
  }

  /** 下一节气 + 距今整天数（永远返回未来最近的一个） */
  private findNextTerm(): { name: string; daysUntil: number } {
    const { year, utcMidnight } = this.todayShanghai();
    let best: { name: string; daysUntil: number } | null = null;
    for (const y of [year, year + 1]) {
      const map = calcAllJieQi(y);
      for (const [name, t] of map) {
        const termUtc = Date.UTC(y, t.month - 1, t.day);
        const days = Math.round((termUtc - utcMidnight) / DAY_MS);
        if (days >= 1 && (best === null || days < best.daysUntil)) {
          best = { name, daysUntil: days };
        }
      }
    }
    // 理论上恒有下一节气；极端兜底返回冬至占位
    return best ?? { name: "冬至", daysUntil: 0 };
  }

  // ───────── 端点逻辑 ─────────

  /** GET /solar-term/today（可选登录） */
  async today(userId?: string): Promise<TodayResponseDto> {
    const current = this.findTodayTerm();
    const next = this.findNextTerm();

    let myParticipated = false;
    if (userId && current) {
      const { year } = this.todayShanghai();
      const existing = await this.prisma.solarTermParticipation.findUnique({
        where: { userId_termName_year: { userId, termName: current.name, year } },
      });
      myParticipated = !!existing;
    }

    return {
      isSolarTermDay: !!current,
      current: current
        ? {
            key: current.key,
            name: current.name,
            date: this.todayDateStr(),
            sanHou: current.sanHou,
            custom: current.custom,
            health: current.health,
            poem: current.poem,
          }
        : null,
      next,
      myParticipated,
    };
  }

  /** POST /solar-term/participate（登录·仅节气日当天） */
  async participate(userId: string): Promise<ParticipateResponseDto> {
    const current = this.findTodayTerm();
    if (!current) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "今日非节气日");
    }
    const { year } = this.todayShanghai();

    // 建参与记录·防重（撞唯一约束 → 今日已参与）
    try {
      await this.prisma.solarTermParticipation.create({
        data: { userId, termName: current.name, year },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "今日已参与");
      }
      throw e;
    }

    // 去重参与节气数（跨年同名节气算一个，对应集齐 x/24）
    const parts = await this.prisma.solarTermParticipation.findMany({
      where: { userId },
      select: { termName: true },
    });
    const totalTerms = new Set(parts.map((p) => p.termName)).size;

    // 颁发成就：首次参与 + 里程碑 4/12/24（直建 UserAchievement·幂等）
    const eligible: string[] = [ACH_SOLAR_TERM_RITUAL];
    if (totalTerms >= 4) eligible.push(ACH_SOLAR_TERM_4);
    if (totalTerms >= 12) eligible.push(ACH_SOLAR_TERM_12);
    if (totalTerms >= 24) eligible.push(ACH_SOLAR_TERM_24);

    const owned = await this.prisma.userAchievement.findMany({
      where: { userId, code: { in: eligible } },
      select: { code: true },
    });
    const ownedSet = new Set(owned.map((o) => o.code));
    const newAchievements = eligible.filter((c) => !ownedSet.has(c));
    if (newAchievements.length > 0) {
      await this.prisma.userAchievement
        .createMany({ data: newAchievements.map((code) => ({ userId, code })), skipDuplicates: true })
        .catch(() => undefined);
    }

    return { term: current.name, newAchievements, totalTerms };
  }

  /** GET /solar-term/my（登录） */
  async my(userId: string): Promise<MyParticipationDto> {
    const rows = await this.prisma.solarTermParticipation.findMany({
      where: { userId },
      orderBy: { participatedAt: "desc" },
    });
    const totalUniqueTerms = new Set(rows.map((r) => r.termName)).size;
    return {
      participated: rows.map((r) => ({ termName: r.termName, year: r.year, participatedAt: r.participatedAt })),
      totalUniqueTerms,
      collectProgress: `${totalUniqueTerms}/24`,
    };
  }

  // ───────── 节气日推送 cron ─────────

  /**
   * 每日 8AM 节气日推送（多实例互斥）：今日是节气日 → 给近 30 天活跃用户发站内通知；
   * 非节气日直接跳过。活跃信号=近 30 天有埋点事件（TrackEvent），上限 500 防打扰。
   */
  @Cron("0 8 * * *")
  async dailyPush(): Promise<void> {
    await this.redis.runExclusive("solar_term_push", 3600, async () => {
      const current = this.findTodayTerm();
      if (!current) return; // 非节气日跳过

      const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * DAY_MS);
      const events = await this.prisma.trackEvent.findMany({
        where: { userId: { not: null }, createdAt: { gte: since } },
        select: { userId: true },
        distinct: ["userId"],
        take: PUSH_MAX_USERS,
      });
      const userIds = events.map((e) => e.userId).filter((id): id is string => !!id);
      if (userIds.length === 0) return;

      await this.notification.batchSend({
        userIds,
        type: "SYSTEM",
        title: `今日${current.name}`,
        content: `今日${current.name}·${current.poem}`,
      });
      this.logger.log(`节气推送：${current.name} → ${userIds.length} 位活跃用户`);
    });
  }
}
