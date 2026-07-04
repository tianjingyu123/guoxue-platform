import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { maskName } from "../../common/crypto.util";
import { safePagination, paginated } from "../../common/pagination";

/**
 * talentScore 加权（设计钉死·赛-P4）：
 * 冠军100 / 亚军60 / 季军40 / 每次阶段晋级10 / 参与2，逐赛事累计。
 */
export const TALENT_WEIGHTS = {
  CHAMPION: 100,
  RUNNER_UP: 60,
  THIRD_PLACE: 40,
  PROMOTED: 10,
  PARTICIPATION: 2,
} as const;

/** 奖牌名次状态（进 badges 的冠亚季军语义，沿用 PromotionStatus 枚举值） */
const MEDAL_STATUS = ["CHAMPION", "RUNNER_UP", "THIRD_PLACE"] as const;

/** 有效报名状态（与 stage-flow 契约一致：可参赛者才计参与） */
const ACTIVE_REG_STATUS = ["REGISTERED", "QUALIFIED"] as const;

/** 战绩徽章（badges Json 元素·competitionId 兼作幂等判重键） */
export interface TalentBadge {
  competitionId: string;
  title: string; // 赛事标题快照
  status: string; // CHAMPION / RUNNER_UP / THIRD_PLACE / PARTICIPANT
  rank: number | null; // 终榜名次（未进终榜为 null）
  score: number; // 该赛事贡献的人才积分
  finishedAt: string; // 赛事收官时间 ISO
}

interface TalentRow {
  id: string;
  userId: string;
  bestRank: number | null;
  totalCompetitions: number;
  totalWins: number;
  talentScore: number;
  badges: unknown;
  updatedAt: Date;
}

/**
 * 赛事人才沉淀（二期·赛-P4）
 *
 * 定位（引二期设计 §2.5 / 总设计北极星=获奖者签约转化率）：
 * 赛事是 L2→L3 选拔漏斗，人才档案是漏斗出口的数据地基——
 * 榜单公开展示战绩吸引参赛，isCertified 联查讲师认证，
 * 未认证的高分人才由前端挂「申请讲师认证」引导标，导向从业者转化。
 *
 * 幂等设计：badges 数组以 competitionId 判重——同一赛事重算（cron 重跑/
 * 人工强推重放）只累计一次，天然可重放。
 */
@Injectable()
export class TalentService {
  private readonly logger = new Logger(TalentService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════ 收官重算（stage-flow 收官处接线） ═══════════════════

  /**
   * 赛事 FINISHED 时重算全体参赛者的人才档案（幂等·badges 判重）。
   * 积分构成：参与2 + 阶段晋级10×次（阶段榜 PROMOTED 行）+ 终榜奖牌（100/60/40）。
   */
  async recalcForCompetition(competitionId: string) {
    const comp = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, title: true, status: true, finishedAt: true },
    });
    if (!comp) return { processed: 0, skipped: 0, reason: "赛事不存在" };
    if (comp.status !== "FINISHED") {
      // 只沉淀已收官赛事（stage-flow 在 FINISHED CAS 之后调用，此处是防御闸）
      return { processed: 0, skipped: 0, reason: `赛事未收官（${comp.status}）` };
    }
    const finishedAt = (comp.finishedAt ?? new Date()).toISOString();

    const participants = await this.prisma.competitionRegistration.findMany({
      where: { competitionId, status: { in: [...ACTIVE_REG_STATUS] as never[] } },
      select: { userId: true },
    });
    if (participants.length === 0) return { processed: 0, skipped: 0 };
    const userIds = participants.map((p) => p.userId);

    // 榜单一次拉全：roundId=null 终榜（冠亚季军名次）+ roundId=stage.id 阶段榜（PROMOTED 晋级次数）
    const rankings = await this.prisma.competitionRanking.findMany({
      where: { competitionId },
      select: { userId: true, roundId: true, rank: true, status: true },
    });
    const finalByUser = new Map<string, { rank: number; status: string }>();
    const promotedCount = new Map<string, number>();
    for (const r of rankings) {
      if (r.roundId === null) {
        finalByUser.set(r.userId, { rank: r.rank, status: r.status });
      } else if (r.status === "PROMOTED") {
        promotedCount.set(r.userId, (promotedCount.get(r.userId) ?? 0) + 1);
      }
    }

    const existing = (await this.prisma.competitionTalent.findMany({
      where: { userId: { in: userIds } },
    })) as TalentRow[];
    const talentByUser = new Map(existing.map((t) => [t.userId, t]));

    let processed = 0;
    let skipped = 0;
    for (const userId of userIds) {
      const talent = talentByUser.get(userId);
      const badges = this.parseBadges(talent?.badges);
      // 幂等命门：同赛事已入档则跳过，不重复累计
      if (badges.some((b) => b.competitionId === competitionId)) {
        skipped++;
        continue;
      }

      const final = finalByUser.get(userId);
      const isMedal = !!final && (MEDAL_STATUS as readonly string[]).includes(final.status);
      const delta =
        TALENT_WEIGHTS.PARTICIPATION +
        TALENT_WEIGHTS.PROMOTED * (promotedCount.get(userId) ?? 0) +
        (isMedal ? TALENT_WEIGHTS[final.status as keyof typeof TALENT_WEIGHTS] : 0);
      const rank = final?.rank ?? null;
      const isWin = final?.status === "CHAMPION";

      const badge: TalentBadge = {
        competitionId,
        title: comp.title,
        status: isMedal ? final.status : "PARTICIPANT",
        rank,
        score: delta,
        finishedAt,
      };

      const bestRank =
        talent?.bestRank == null ? rank : rank == null ? talent.bestRank : Math.min(talent.bestRank, rank);

      await this.prisma.competitionTalent.upsert({
        where: { userId },
        create: {
          userId,
          bestRank: rank,
          totalCompetitions: 1,
          totalWins: isWin ? 1 : 0,
          talentScore: delta,
          badges: [badge] as never,
        },
        update: {
          bestRank,
          totalCompetitions: (talent?.totalCompetitions ?? 0) + 1,
          totalWins: (talent?.totalWins ?? 0) + (isWin ? 1 : 0),
          talentScore: (talent?.talentScore ?? 0) + delta,
          badges: [...badges, badge] as never,
        },
      });
      processed++;
    }

    this.logger.log(`人才档案重算：「${comp.title}」入档${processed} 幂等跳过${skipped}`);
    return { processed, skipped };
  }

  // ═══════════════════ 人才榜（公开·脱敏） ═══════════════════

  /**
   * 人才榜分页：按 talentScore 降序。脱敏出口——昵称掩码、只出头像与战绩，
   * 不出手机号等身份信息；isCertified 联查讲师认证（APPROVED），
   * 未认证高分人才由前端挂「申请讲师认证」引导标（生态出口）。
   */
  async listTalents(pageRaw?: string | number, pageSizeRaw?: string | number) {
    const { page, pageSize, skip } = safePagination(pageRaw, pageSizeRaw);
    const [rows, total] = await Promise.all([
      this.prisma.competitionTalent.findMany({
        orderBy: [{ talentScore: "desc" }, { updatedAt: "asc" }],
        skip,
        take: pageSize,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
      }),
      this.prisma.competitionTalent.count(),
    ]);

    const certified = await this.certifiedMap(rows.map((r) => r.userId));

    const items = rows.map((r, i) => {
      const cert = certified.get(r.userId);
      return {
        position: skip + i + 1,
        userId: r.userId,
        nickname: maskName((r.user as { nickname: string | null } | null)?.nickname ?? null) || "参赛者",
        avatar: (r.user as { avatar: string | null } | null)?.avatar ?? null,
        bestRank: r.bestRank,
        totalCompetitions: r.totalCompetitions,
        totalWins: r.totalWins,
        talentScore: r.talentScore,
        // 战绩徽章只出奖牌（冠亚季军）·公开榜不暴露完整参赛轨迹
        medals: this.parseBadges(r.badges)
          .filter((b) => (MEDAL_STATUS as readonly string[]).includes(b.status))
          .map((b) => ({ competitionId: b.competitionId, title: b.title, status: b.status, finishedAt: b.finishedAt })),
        isCertified: !!cert,
        verifiedTitle: cert?.verifiedTitle ?? null,
      };
    });
    return paginated(items, total, page, pageSize);
  }

  // ═══════════════════ 我的战绩档案（JWT） ═══════════════════

  /** 我的战绩档案：完整 badges 轨迹 + 榜上位次 + 认证状态（未入档返回零档案） */
  async getMyProfile(userId: string) {
    const talent = (await this.prisma.competitionTalent.findUnique({
      where: { userId },
    })) as TalentRow | null;
    const cert = (await this.certifiedMap([userId])).get(userId);

    if (!talent) {
      return {
        userId,
        bestRank: null,
        totalCompetitions: 0,
        totalWins: 0,
        talentScore: 0,
        badges: [] as TalentBadge[],
        position: null,
        isCertified: !!cert,
        verifiedTitle: cert?.verifiedTitle ?? null,
      };
    }

    const higher = await this.prisma.competitionTalent.count({
      where: { talentScore: { gt: talent.talentScore } },
    });
    return {
      userId,
      bestRank: talent.bestRank,
      totalCompetitions: talent.totalCompetitions,
      totalWins: talent.totalWins,
      talentScore: talent.talentScore,
      badges: this.parseBadges(talent.badges),
      position: higher + 1,
      isCertified: !!cert,
      verifiedTitle: cert?.verifiedTitle ?? null,
    };
  }

  // ═══════════════════ 内部工具 ═══════════════════

  /** 讲师认证联查（APPROVED 才算已认证·生态出口字段） */
  private async certifiedMap(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, { verifiedTitle: string | null }>();
    const certs = await this.prisma.teacherCertification.findMany({
      where: { userId: { in: userIds }, status: "APPROVED" },
      select: { userId: true, verifiedTitle: true },
    });
    return new Map(certs.map((c) => [c.userId, { verifiedTitle: c.verifiedTitle }]));
  }

  /** badges Json 防御解析（历史脏数据/非数组归一为空数组） */
  private parseBadges(raw: unknown): TalentBadge[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((b): b is TalentBadge => !!b && typeof b === "object" && typeof (b as TalentBadge).competitionId === "string");
  }
}
