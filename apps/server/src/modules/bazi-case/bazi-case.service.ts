import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";

/**
 * 八字案例库
 *
 * 🔴 董事长口径：**答案 = 这个八字的真实人生经历；断语和思路只是参考。**
 *    所以 life（分维度经历）+ events（大事年表）才是答案；commentary（断语）只是参考。
 *
 * 两个玩法：
 *   ① 练手：选案例 → 自己断 → 点「公布答案」→ 逐维度对照（revealedAt 就是那道门）
 *   ② 参考：排完盘若命中「日柱相同 + 另任意两柱相同」的案例 → 提示有同类八字，用户点了才看
 *
 * 合规：真人经历是敏感信息，且投稿的多半是别人的八字。
 *   投稿必须 consent（本人/已获授权）、一律脱敏、必须审核通过才可见。
 */

/** 人生经历的六个维度（练手时逐维度对照，所以两边字段必须同名） */
export const LIFE_DIMENSIONS = ["career", "marriage", "wealth", "health", "family", "character"] as const;
export type LifeDimension = (typeof LIFE_DIMENSIONS)[number];

export const LIFE_DIMENSION_LABELS: Record<LifeDimension, string> = {
  career: "事业",
  marriage: "婚姻",
  wealth: "财运",
  health: "健康",
  family: "六亲",
  character: "性格",
};

interface LifeEvent {
  year: number;
  ganzhi?: string;
  event: string;
  category?: string;
}

/** 对外可见的案例（未 reveal 时，答案字段必须剥掉——否则用户按 F12 就看到答案了） */
const PUBLIC_SELECT = {
  id: true,
  gender: true,
  yearPillar: true,
  monthPillar: true,
  dayPillar: true,
  hourPillar: true,
  birthYear: true,
  birthMonth: true,
  birthDay: true,
  birthHour: true,
  source: true,
  title: true,
  realName: true,
  era: true,
  tags: true,
  quality: true,
  isPremium: true,
  viewCount: true,
  attemptCount: true,
  createdAt: true,
} satisfies Prisma.BaziCaseSelect;

@Injectable()
export class BaziCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coin: CoinService,
  ) {}

  // ────────────────────────── 浏览 ──────────────────────────

  /** 案例列表（只出已审核通过的；答案不下发） */
  async list(q: {
    page?: number;
    pageSize?: number;
    source?: string;
    tag?: string;
    keyword?: string;
    premiumOnly?: boolean;
    method?: string;
  }) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 20));

    const where: Prisma.BaziCaseWhereInput = { status: "APPROVED" };
    if (q.source) where.source = q.source;
    if (q.tag) where.tags = { has: q.tag };
    if (q.premiumOnly) where.isPremium = true;
    // 同一份真实人生档案供多种术式交叉研习。紫微必须有完整生辰，绝不拿残缺资料伪造盘面。
    if (q.method?.toUpperCase() === "ZIWEI") {
      where.birthYear = { not: null };
      where.birthMonth = { not: null };
      where.birthDay = { not: null };
      where.birthHour = { not: null };
    }
    if (q.keyword) {
      where.OR = [
        { title: { contains: q.keyword, mode: "insensitive" } },
        { era: { contains: q.keyword, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.baziCase.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: [{ quality: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.baziCase.count({ where }),
    ]);

    return {
      items: items.map((item) => this.withMethods(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 案例详情（公开）。
   * 🔴 **永远不含答案**（life / events / commentary）。答案只有一个出口：reveal()。
   *    这样即便有人直接扒接口，没点过「公布答案」也拿不到 —— 否则「先断后看」一秒被破解。
   */
  async detail(id: string) {
    const c = await this.prisma.baziCase.findFirst({ where: { id, status: "APPROVED" }, select: PUBLIC_SELECT });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在或未通过审核");

    await this.prisma.baziCase.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return this.withMethods(c);
  }

  /** 我在此案例的练手状态；只有我已 reveal 过，才把答案一并带回（刷新后回显用） */
  async myAttempt(userId: string, caseId: string) {
    const attempt = await this.prisma.baziCaseAttempt.findUnique({
      where: { caseId_userId: { caseId, userId } },
    });

    if (!attempt?.revealedAt) {
      return {
        guess: attempt?.guess ?? {},
        revealed: false,
        selfScore: attempt?.selfScore ?? null,
        dimensions: this.dimensionMeta(),
      };
    }

    const c = await this.prisma.baziCase.findUnique({ where: { id: caseId } });
    return {
      guess: attempt.guess,
      revealed: true,
      revealedAt: attempt.revealedAt,
      selfScore: attempt.selfScore,
      dimensions: this.dimensionMeta(),
      life: c?.life,
      events: c?.events,
      commentary: c?.commentary,
      commentarySrc: c?.commentarySrc,
    };
  }

  private dimensionMeta() {
    return LIFE_DIMENSIONS.map((k) => ({ key: k, label: LIFE_DIMENSION_LABELS[k] }));
  }

  /**
   * 案例只存一份真实经历，术式是观察视角而不是复制数据。
   * 八字与命理综合始终可用；紫微只有在公历年月日时完整时开放。
   */
  private withMethods<T extends {
    birthYear: number | null;
    birthMonth: number | null;
    birthDay: number | null;
    birthHour: number | null;
  }>(item: T): T & { availableMethods: string[] } {
    const availableMethods = ["BAZI", "MINGLI"];
    if ([item.birthYear, item.birthMonth, item.birthDay, item.birthHour].every((value) => value !== null)) {
      availableMethods.splice(1, 0, "ZIWEI");
    }
    return { ...item, availableMethods };
  }

  // ────────────────────────── 练手 ──────────────────────────

  /** 保存我的断语（还没公布答案） */
  async saveGuess(userId: string, caseId: string, guess: Record<string, string>) {
    const c = await this.prisma.baziCase.findFirst({ where: { id: caseId, status: "APPROVED" }, select: { id: true } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在或未通过审核");

    const clean = pickDimensions(guess);

    return this.prisma.baziCaseAttempt.upsert({
      where: { caseId_userId: { caseId, userId } },
      create: { caseId, userId, guess: clean },
      // 已经公布过答案的，不许再改断语 —— 否则「我早就断对了」无从证伪，练手就失去意义
      update: { guess: clean },
    });
  }

  /**
   * 公布答案。
   * 一旦 reveal，断语就锁定（不允许再改）—— 看过答案再改断语，练手就没有意义了。
   */
  async reveal(userId: string, caseId: string) {
    const c = await this.prisma.baziCase.findFirst({ where: { id: caseId, status: "APPROVED" } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在或未通过审核");

    const existing = await this.prisma.baziCaseAttempt.findUnique({
      where: { caseId_userId: { caseId, userId } },
    });

    const attempt = existing?.revealedAt
      ? existing
      : await this.prisma.baziCaseAttempt.upsert({
          where: { caseId_userId: { caseId, userId } },
          create: { caseId, userId, guess: {}, revealedAt: new Date() },
          update: { revealedAt: new Date() },
        });

    if (!existing) {
      await this.prisma.baziCase.update({ where: { id: caseId }, data: { attemptCount: { increment: 1 } } });
    }

    return {
      // 答案
      life: c.life,
      events: c.events,
      // 参考
      commentary: c.commentary,
      commentarySrc: c.commentarySrc,
      // 我的断语（供逐维度对照）
      myGuess: attempt.guess,
      dimensions: this.dimensionMeta(),
    };
  }

  /** 自评断中几项（用户自己判，平台不做「你断错了」的机器裁决 —— 命理没有标准答案的对错机） */
  async selfScore(userId: string, caseId: string, score: number) {
    const n = Math.max(0, Math.min(LIFE_DIMENSIONS.length, Math.round(score)));
    return this.prisma.baziCaseAttempt.update({
      where: { caseId_userId: { caseId, userId } },
      data: { selfScore: n },
    });
  }

  // ────────────────────────── 同类八字（三柱匹配）──────────────────────────

  /**
   * 找同类八字。
   * 口径（董事长拍板）：**日柱必须相同 + 年/月/时里另有任意两柱相同**。
   * 日柱是命主自身，日柱不同谈不上「同类」；再要求另两柱相同，才算得上参考价值。
   *
   * 先用 dayPillar 走索引把候选缩到极小（同日柱只占 1/60），再在内存里数相同柱数 —— 不扫全表。
   */
  async findSimilar(pillars: { year: string; month: string; day: string; hour: string }, limit = 5) {
    const candidates = await this.prisma.baziCase.findMany({
      where: { status: "APPROVED", dayPillar: pillars.day },
      select: { ...PUBLIC_SELECT },
      take: 200,
    });

    const matched = candidates
      .map((c) => {
        const same: string[] = ["日"];
        if (c.yearPillar === pillars.year) same.push("年");
        if (c.monthPillar === pillars.month) same.push("月");
        if (c.hourPillar === pillars.hour) same.push("时");
        return { ...c, samePillars: same, sameCount: same.length };
      })
      // 日柱已同（+1），再要另任意两柱 → 总数 ≥ 3
      .filter((c) => c.sameCount >= 3)
      .sort((a, b) => b.sameCount - a.sameCount || b.quality - a.quality);

    return { total: matched.length, items: matched.slice(0, limit).map((item) => this.withMethods(item)) };
  }

  // ────────────────────────── 投稿 ──────────────────────────

  /**
   * 投稿案例。
   * 合规三道闸：必须 consent（本人/已获授权）、强制脱敏（真名一律不存）、必须审核。
   */
  async submit(
    userId: string,
    dto: {
      gender: string;
      yearPillar: string;
      monthPillar: string;
      dayPillar: string;
      hourPillar: string;
      birthYear?: number;
      birthMonth?: number;
      birthDay?: number;
      birthHour?: number;
      title: string;
      era?: string;
      tags?: string[];
      life?: Record<string, string>;
      events?: LifeEvent[];
      commentary?: string;
      consent: boolean;
    },
  ) {
    if (!dto.consent) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        "请先确认：所投稿的八字与经历为本人，或已获得当事人授权",
      );
    }
    for (const p of [dto.yearPillar, dto.monthPillar, dto.dayPillar, dto.hourPillar]) {
      if (!p || p.length !== 2) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "四柱格式有误（应为「甲子」这样的两字干支）");
    }

    const life = pickDimensions(dto.life ?? {});
    const events = (dto.events ?? []).filter((e) => e && Number.isFinite(e.year) && e.event);
    const quality = scoreQuality(life, events);

    return this.prisma.baziCase.create({
      data: {
        gender: dto.gender === "female" ? "female" : "male",
        yearPillar: dto.yearPillar,
        monthPillar: dto.monthPillar,
        dayPillar: dto.dayPillar,
        hourPillar: dto.hourPillar,
        birthYear: dto.birthYear ?? null,
        birthMonth: dto.birthMonth ?? null,
        birthDay: dto.birthDay ?? null,
        birthHour: dto.birthHour ?? null,
        source: "USER",
        title: dto.title.slice(0, 40),
        // 🔴 用户投稿一律匿名，真名不落库（即便前端传了也不要）
        realName: null,
        era: dto.era ?? null,
        tags: dto.tags?.slice(0, 6) ?? [],
        life,
        events: events as unknown as Prisma.InputJsonValue,
        commentary: dto.commentary ?? null,
        contributorId: userId,
        status: "PENDING",
        consent: true,
        desensitized: true,
        quality,
        isPremium: quality >= 80,
      },
      select: { id: true, status: true, quality: true },
    });
  }

  /** 投稿奖励方案：三档配置必须同时存在且均为正数，否则整套方案停用，避免部分档位误导。 */
  async rewardPlan() {
    const definitions = [
      { key: "basic" as const, configKey: "case_reward_basic", minQuality: 0 },
      { key: "good" as const, configKey: "case_reward_good", minQuality: 50 },
      { key: "premium" as const, configKey: "case_reward_premium", minQuality: 80 },
    ];
    const rows = await this.prisma.commissionConfig.findMany({
      where: { configKey: { in: definitions.map((item) => item.configKey) } },
      select: { configKey: true, rateA: true },
    });
    const amountMap = new Map(rows.map((row) => [row.configKey, Number(row.rateA)]));
    const enabled = definitions.every((item) => {
      const amount = amountMap.get(item.configKey);
      return Number.isFinite(amount) && Number(amount) > 0;
    });

    return {
      enabled,
      tiers: definitions.map((item) => ({
        key: item.key,
        minQuality: item.minQuality,
        amount: enabled ? amountMap.get(item.configKey)! : null,
      })),
      note: enabled
        ? "最终奖励以审核通过时的平台配置为准"
        : "奖励方案尚未配置完整，当前投稿不承诺国学币奖励",
    };
  }

  /** 我的投稿 */
  async myContributions(userId: string) {
    const items = await this.prisma.baziCase.findMany({
      where: { contributorId: userId },
      select: { ...PUBLIC_SELECT, status: true, reviewNote: true },
      orderBy: { createdAt: "desc" },
    });
    const approved = items.filter((i) => i.status === "APPROVED").length;
    return { items: items.map((item) => this.withMethods(item)), approved, total: items.length, badge: badgeOf(approved) };
  }

  /** 贡献榜（按审核通过数） */
  async leaderboard(limit = 20) {
    const rows = await this.prisma.baziCase.groupBy({
      by: ["contributorId"],
      where: { status: "APPROVED", contributorId: { not: null }, source: "USER" },
      _count: { _all: true },
      orderBy: { _count: { contributorId: "desc" } },
      take: limit,
    });

    const ids = rows.map((r) => r.contributorId!).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nickname: true, avatar: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));

    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.contributorId,
      nickname: map.get(r.contributorId!)?.nickname ?? "国学同好",
      avatar: map.get(r.contributorId!)?.avatar ?? "",
      count: r._count._all,
      badge: badgeOf(r._count._all),
    }));
  }

  // ────────────────────────── 审核（admin）──────────────────────────

  async listForReview(status = "PENDING", page = 1, pageSize = 20) {
    const where: Prisma.BaziCaseWhereInput = { status };
    const [items, total] = await Promise.all([
      this.prisma.baziCase.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (Math.max(1, page) - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.baziCase.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * 审核通过 → 发放国学币（金额取自 CommissionConfig，禁硬编码）。
   * 只有用户投稿（source=USER）才发币；平台自己整理的不发。
   * 幂等：已经是 APPROVED 的不再重复发币。
   */
  async approve(adminId: string, id: string, note?: string) {
    const c = await this.prisma.baziCase.findUnique({ where: { id } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在");
    if (c.status === "APPROVED") return { id, status: "APPROVED", rewarded: 0, note: "已审核通过，未重复发币" };

    const amount = c.source === "USER" && c.contributorId ? await this.rewardOf(c.quality) : 0;
    const rewarded = await this.prisma.$transaction(async (tx) => {
      // 乐观锁抢占本次审核。两个管理员同时点击时，只有一个能把读取到的旧状态改为 APPROVED。
      const claimed = await tx.baziCase.updateMany({
        where: { id, status: c.status },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: adminId, reviewNote: note ?? null },
      });
      if (claimed.count === 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "案例状态已变化，请刷新后重试");
      }

      // 状态与奖励必须同事务：发币失败就回滚 APPROVED，避免“已收录但没收到奖励”。
      if (amount > 0 && c.contributorId) {
        await this.coin.income(
          c.contributorId,
          {
            amountCoin: amount,
            scene: "CASE_CONTRIBUTION",
            refId: id,
            description: `案例投稿采纳奖励（${tierName(c.quality)}）`,
          },
          tx,
        );
      }
      return amount;
    });

    return { id, status: "APPROVED", rewarded };
  }

  async reject(adminId: string, id: string, note: string) {
    const c = await this.prisma.baziCase.findUnique({ where: { id }, select: { status: true } });
    if (!c) throw new BusinessException(ErrorCode.NOT_FOUND, "案例不存在");
    if (c.status === "APPROVED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "案例已审核通过并可能发放奖励，不能改为未收录");
    }

    const claimed = await this.prisma.baziCase.updateMany({
      where: { id, status: c.status },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: adminId, reviewNote: note },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "案例状态已变化，请刷新后重试");
    }
    return { id, status: "REJECTED" };
  }

  /** 奖励币数：来自 CommissionConfig（与会员定价同一套治理口径，不硬编码） */
  private async rewardOf(quality: number): Promise<number> {
    const key = quality >= 80 ? "case_reward_premium" : quality >= 50 ? "case_reward_good" : "case_reward_basic";
    const cfg = await this.prisma.commissionConfig.findUnique({ where: { configKey: key } });
    if (!cfg) return 0; // 配置缺失就不发，绝不猜一个数字发出去
    return Number(cfg.rateA);
  }
}

// ────────────────────────── 纯函数 ──────────────────────────

/** 只留六个已知维度，别的字段一律丢掉（防止投稿塞进乱七八糟的键） */
function pickDimensions(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LIFE_DIMENSIONS) {
    const v = input?.[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 500);
  }
  return out;
}

/**
 * 案例质量分 —— 决定奖励档位与是否精品。
 * 权重体现董事长的口径：**大事年表最值钱**（能验应期），维度次之。
 *   六维度：每项 8 分（满 48）
 *   大事年表：每条 8 分，最多 40 分（5 条封顶）
 *   有生辰（可推真太阳时/大运）：12 分
 */
function scoreQuality(life: Record<string, string>, events: LifeEvent[]): number {
  const dims = Object.keys(life).length;
  const evs = events.length;
  let s = Math.min(dims, 6) * 8 + Math.min(evs, 5) * 8;
  if (evs > 0 && dims >= 3) s += 12; // 既有年表又有维度，才是真能拿来练手的好案例
  return Math.max(0, Math.min(100, s));
}

function tierName(quality: number): string {
  return quality >= 80 ? "精品档" : quality >= 50 ? "良好档" : "基础档";
}

/** 贡献称号（挂在用户名旁） */
function badgeOf(approved: number): string | null {
  if (approved >= 50) return "案例贡献者·金";
  if (approved >= 20) return "案例贡献者·银";
  if (approved >= 5) return "案例贡献者·铜";
  return null;
}
