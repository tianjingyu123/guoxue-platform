import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { GROWTH_LEVELS } from "../user-growth/user-growth.service";
import { serverConfig } from "../../config/server-config";

/** 拜师邀请 token 有效期（7 天） */
const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
/** 出师学分阈值（可配·默认 1000·对应「举人」附近门槛） */
const GRADUATE_EXP = Number(process.env.MENTORSHIP_GRADUATE_EXP) || 1000;
/** 出师一次性给师父的传道值 */
const GRADUATE_POINTS = 50;

function inviteKey(token: string): string {
  return `mentor:invite:${token}`;
}

/** 功名等级 → 称号 */
function titleOf(level: number): string {
  const l = GROWTH_LEVELS.find((x) => x.level === level);
  return l?.name ?? GROWTH_LEVELS[0].name;
}

/**
 * 师徒传承（V5·纯荣誉体系）
 *
 * 合规隔离铁律（R1 传销红线第一约束）：
 * - 完全独立于 ReferralRelation/commission/settlement，本服务不引用任何计酬代码
 * - 传道值（mentorshipPoints）是纯荣誉整数，不可兑换现金/国学币/任何财物，只上荣誉榜
 * - 师徒单层不嵌套计酬（师父的师父不因徒孙得任何东西）
 * - 拜师不产生任何资金关系
 */
@Injectable()
export class MentorshipService {
  private readonly logger = new Logger(MentorshipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 生成拜师邀请（师父）：随机 token 存 Redis 7 天，返回分享链接 */
  async invite(mentorId: string): Promise<{ inviteToken: string; shareUrl: string }> {
    const inviteToken = randomBytes(16).toString("hex"); // 32 位十六进制
    await this.redis.set(inviteKey(inviteToken), mentorId, INVITE_TTL_SECONDS);
    const base = serverConfig.publicH5BaseUrl;
    const shareUrl = `${base}/#/pkg-mine/mentorship/accept?token=${inviteToken}`;
    return { inviteToken, shareUrl };
  }

  /** 邀请落地页（公开）：展示师父招徒卡 */
  async getInvite(token: string) {
    const mentorId = await this.redis.get(inviteKey(token));
    if (!mentorId) throw new NotFoundException("邀请已失效或不存在");
    const [user, growth, discipleCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: mentorId }, select: { nickname: true } }),
      this.prisma.userGrowth.findUnique({ where: { userId: mentorId }, select: { level: true } }),
      this.prisma.mentorship.count({ where: { mentorId, status: "ACTIVE" } }),
    ]);
    const level = growth?.level ?? 1;
    return {
      mentorNickname: user?.nickname ?? "",
      mentorLevel: level,
      mentorTitle: titleOf(level),
      discipleCount,
    };
  }

  /** 拜师（徒弟）：校验无 ACTIVE 师父 + token 有效 + 不能拜自己 */
  async accept(discipleId: string, token: string, pledge?: string) {
    const mentorId = await this.redis.get(inviteKey(token));
    if (!mentorId) throw new NotFoundException("邀请已失效或不存在");
    if (mentorId === discipleId) throw new BadRequestException("不能拜自己为师");

    // 应用层保证「一人一师」：已有 ACTIVE 师父则拒（GRADUATED 不占位）
    const existing = await this.prisma.mentorship.findFirst({
      where: { discipleId, status: "ACTIVE" },
      select: { id: true },
    });
    if (existing) throw new BadRequestException("你已有师父，需先出师方可再拜师");

    const created = await this.prisma.mentorship.create({
      data: { mentorId, discipleId, status: "ACTIVE", disciplePledge: pledge ?? null },
      select: { id: true },
    });
    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
      select: { nickname: true },
    });
    return { mentorshipId: created.id, mentorNickname: mentor?.nickname ?? "" };
  }

  /** 我的师父（ACTIVE） */
  async myMentor(discipleId: string) {
    const m = await this.prisma.mentorship.findFirst({
      where: { discipleId, status: "ACTIVE" },
    });
    if (!m) return null;
    const [user, growth] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: m.mentorId }, select: { nickname: true } }),
      this.prisma.userGrowth.findUnique({ where: { userId: m.mentorId }, select: { level: true } }),
    ]);
    const level = growth?.level ?? 1;
    return {
      mentorNickname: user?.nickname ?? "",
      mentorLevel: level,
      mentorTitle: titleOf(level),
      since: m.createdAt,
      myContributedPoints: m.mentorshipPoints,
    };
  }

  /** 我的徒弟列表 + 汇总（师父视角） */
  async myDisciples(mentorId: string) {
    const list = await this.prisma.mentorship.findMany({
      where: { mentorId },
      orderBy: { createdAt: "desc" },
    });
    const growths = await this.prisma.userGrowth.findMany({
      where: { userId: { in: list.map((m) => m.discipleId) } },
      select: { userId: true, level: true },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: list.map((m) => m.discipleId) } },
      select: { id: true, nickname: true },
    });
    const levelMap = new Map(growths.map((g) => [g.userId, g.level]));
    const nameMap = new Map(users.map((u) => [u.id, u.nickname]));

    const disciples = list.map((m) => ({
      discipleNickname: nameMap.get(m.discipleId) ?? "",
      level: levelMap.get(m.discipleId) ?? 1,
      status: m.status,
      contributedPoints: m.mentorshipPoints,
      since: m.createdAt,
    }));
    const summary = {
      totalPoints: list.reduce((s, m) => s + m.mentorshipPoints, 0),
      activeCount: list.filter((m) => m.status === "ACTIVE").length,
      graduatedCount: list.filter((m) => m.status === "GRADUATED").length,
    };
    return { disciples, summary };
  }

  /** 出师（徒弟自主·满条件）：status=GRADUATED + 师父 +50 传道值 + 双方成就 */
  async graduate(discipleId: string) {
    const m = await this.prisma.mentorship.findFirst({
      where: { discipleId, status: "ACTIVE" },
    });
    if (!m) throw new BadRequestException("你当前没有在学的师父");

    const growth = await this.prisma.userGrowth.findUnique({
      where: { userId: discipleId },
      select: { totalExp: true },
    });
    const totalExp = growth?.totalExp ?? 0;
    if (totalExp < GRADUATE_EXP) {
      throw new BadRequestException(`未达出师条件（需学分 ≥ ${GRADUATE_EXP}，当前 ${totalExp}）`);
    }

    // 出师：关系置为荣誉记录 + 归属明细 +50
    await this.prisma.mentorship.update({
      where: { id: m.id },
      data: {
        status: "GRADUATED",
        graduatedAt: new Date(),
        mentorshipPoints: { increment: GRADUATE_POINTS },
      },
    });
    // 师父荣誉总和 +50
    await this.prisma.userGrowth.upsert({
      where: { userId: m.mentorId },
      create: { userId: m.mentorId, mentorshipPoints: GRADUATE_POINTS },
      update: { mentorshipPoints: { increment: GRADUATE_POINTS } },
    });
    // 双方出师成就（UserAchievement 无枚举表约束·幂等 skipDuplicates）
    await this.prisma.userAchievement
      .createMany({
        data: [
          { userId: m.mentorId, code: "mentor_graduate" },
          { userId: discipleId, code: "graduated_disciple" },
        ],
        skipDuplicates: true,
      })
      .catch((e) => this.logger.warn(`出师成就颁发失败(mentorship=${m.id})`, e as Error));

    return { success: true };
  }

  /** 传道值荣誉榜 TOP20（公开·按 mentorshipPoints 降序·只取 >0） */
  async ranking() {
    const top = await this.prisma.userGrowth.findMany({
      where: { mentorshipPoints: { gt: 0 } },
      orderBy: { mentorshipPoints: "desc" },
      take: 20,
      select: { userId: true, level: true, mentorshipPoints: true },
    });
    if (top.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, nickname: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.nickname]));
    const counts = await Promise.all(
      top.map((t) => this.prisma.mentorship.count({ where: { mentorId: t.userId, status: "ACTIVE" } })),
    );
    return top.map((t, i) => ({
      mentorNickname: nameMap.get(t.userId) ?? "",
      mentorLevel: t.level,
      mentorshipPoints: t.mentorshipPoints,
      discipleCount: counts[i],
    }));
  }
}
