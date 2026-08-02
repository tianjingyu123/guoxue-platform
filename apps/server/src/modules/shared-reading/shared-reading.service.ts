import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { UserGrowthService } from "../user-growth/user-growth.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CreateGroupDto } from "./shared-reading.dto";
import { serverConfig } from "../../config/server-config";

/** 单章视为"读完"的进度阈值（ReadingProgress.progress 为 0-100） */
export const PROGRESS_THRESHOLD = 80;
/** 共读完成奖励学分（user-growth 荣誉值·不可兑现·可配） */
export const SHARED_READING_REWARD_EXP = 50;
/** 共读结业成就 code（user-growth 无公开成就颁发方法·当前跳过·见报告） */
export const SHARED_READING_ACHIEVEMENT = "shared_reading_complete";

const DAY_MS = 86_400_000;

interface MemberStat {
  memberId: string;
  userId: string;
  isLeader: boolean;
  rewardedAt: Date | null;
  completedChapters: number;
  completed: boolean;
}

/**
 * V3 共读拼团（纯学习激励·无资金·合规）
 * - 奖励=user-growth 荣誉学分（UserGrowthService.addExp），与商城 GroupBuy 物理隔离
 * - 进度对接采用「拉取式」：GET 详情时实时查 ReadingProgress 统计各成员完成章节数，不改 classic 模块
 * - 结算「惰性」：GET 详情时若达成条件（全员完成 或 deadline 到）且未结算则发奖并流转状态
 *
 * ⚠️ ReadingProgress 表 @@unique([userId, bookId]) —— 每人每书仅一行（记录当前章 + 该章进度）。
 *    故无法「count(progress>=80 的行)」得到章节数。这里以「当前章之前的章节数 + (当前章是否读完)」
 *    作为已完成章节数的诚实代理（见 computeProgress）。
 */
@Injectable()
export class SharedReadingService {
  private readonly logger = new Logger(SharedReadingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly userGrowth: UserGrowthService,
  ) {}

  /**
   * 每日兜底结算超时未结算的共读组（分布式锁防多实例重复跑）。
   * 修复(后端审计D8)：结算原仅在 getDetail 内惰性触发，deadline 已过但无人 GET 详情时
   * 状态恒 READING、已完成成员的荣誉学分永不发放。此处补每日扫描兜底。
   * settle 内发奖用 rewardedAt CAS 占位，与惰性结算并发安全、可重复调用不重复发奖。
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async settleExpiredGroupsCron() {
    await this.redis.runExclusive("shared_reading_settle_expired", 300, async () => {
      const expired = await this.prisma.sharedReadingGroup.findMany({
        where: { status: "READING", deadline: { lte: new Date() } },
        select: { id: true, classicBookId: true, targetChapters: true },
      });
      let settled = 0;
      for (const group of expired) {
        try {
          const members = await this.prisma.sharedReadingMember.findMany({ where: { groupId: group.id } });
          const stats: MemberStat[] = await Promise.all(
            members.map(async (m) => {
              const p = await this.computeProgress(m.userId, group.classicBookId, group.targetChapters);
              return {
                memberId: m.id,
                userId: m.userId,
                isLeader: m.isLeader,
                rewardedAt: m.rewardedAt,
                completedChapters: p.completedChapters,
                completed: p.completed,
              };
            }),
          );
          const allCompleted = stats.length > 0 && stats.every((s) => s.completed);
          await this.settle(group.id, stats, allCompleted);
          settled++;
        } catch (err) {
          this.logger.warn(`共读组兜底结算失败 [${group.id}]`, err instanceof Error ? err.message : err);
        }
      }
      if (settled > 0) this.logger.log(`共读组超时兜底结算: ${settled} 组`);
    });
  }

  // ── 1. 建组 ──
  async createGroup(userId: string, dto: CreateGroupDto) {
    const book = await this.prisma.classicBook.findFirst({
      where: { id: dto.classicBookId, deletedAt: null },
      select: { id: true, title: true, chapterCount: true },
    });
    if (!book) throw new BusinessException(ErrorCode.CLASSIC_BOOK_NOT_FOUND);

    let targetChapters = dto.targetChapters ?? 0;
    if (targetChapters <= 0) {
      targetChapters =
        book.chapterCount > 0
          ? book.chapterCount
          : await this.prisma.classicChapter.count({ where: { bookId: book.id, deletedAt: null } });
    }
    if (targetChapters <= 0) targetChapters = 1; // 空书兜底

    const minMembers = dto.minMembers ?? 3;
    const maxMembers = dto.maxMembers ?? 5;
    if (maxMembers < minMembers) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "最多人数不能小于最少人数");
    }
    const durationDays = dto.durationDays ?? 7;
    const inviteToken = randomBytes(16).toString("hex"); // 32 位十六进制

    const group = await this.prisma.sharedReadingGroup.create({
      data: {
        classicBookId: book.id,
        bookTitle: book.title,
        initiatorId: userId,
        targetChapters,
        minMembers,
        maxMembers,
        durationDays,
        inviteToken,
      },
      select: { id: true },
    });
    // 发起人自动入组（isLeader）
    await this.prisma.sharedReadingMember.create({
      data: { groupId: group.id, userId, isLeader: true },
    });

    return {
      groupId: group.id,
      inviteToken,
      shareUrl: `${serverConfig.publicH5BaseUrl}/#/pkg-classics/shared-reading/invite?token=${inviteToken}`,
    };
  }

  // ── 2. 组详情（实时统计 + 惰性结算） ──
  async getDetail(id: string, userId: string) {
    const group = await this.prisma.sharedReadingGroup.findUnique({ where: { id } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "共读组不存在");

    const members = await this.prisma.sharedReadingMember.findMany({
      where: { groupId: id },
      orderBy: { joinedAt: "asc" },
    });
    const userIds = members.map((m) => m.userId);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true, avatar: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 实时统计每个成员进度
    const stats: MemberStat[] = await Promise.all(
      members.map(async (m) => {
        const p = await this.computeProgress(m.userId, group.classicBookId, group.targetChapters);
        return {
          memberId: m.id,
          userId: m.userId,
          isLeader: m.isLeader,
          rewardedAt: m.rewardedAt,
          completedChapters: p.completedChapters,
          completed: p.completed,
        };
      }),
    );

    // 惰性结算：仅 READING 期，全员完成 或 deadline 到 → 发奖 + 流转
    let status = group.status;
    if (status === "READING") {
      const allCompleted = stats.length > 0 && stats.every((s) => s.completed);
      const deadlinePassed = !!group.deadline && group.deadline.getTime() <= Date.now();
      if (allCompleted || deadlinePassed) {
        await this.settle(group.id, stats, allCompleted);
        status = allCompleted ? "COMPLETED" : "EXPIRED";
      }
    }

    const iAmMember = userIds.includes(userId);
    const mine = stats.find((s) => s.userId === userId);
    const myProgress = mine
      ? { completedChapters: mine.completedChapters, completed: mine.completed }
      : await this.computeProgress(userId, group.classicBookId, group.targetChapters);

    return {
      id: group.id,
      book: { id: group.classicBookId, title: group.bookTitle },
      status,
      targetChapters: group.targetChapters,
      durationDays: group.durationDays,
      minMembers: group.minMembers,
      maxMembers: group.maxMembers,
      memberCount: members.length,
      deadline: group.deadline,
      members: stats.map((s) => {
        const u = userMap.get(s.userId);
        return {
          userId: s.userId,
          nickname: u?.nickname ?? "",
          avatar: u?.avatar ?? null,
          completedChapters: s.completedChapters,
          completed: s.completed,
          isLeader: s.isLeader,
        };
      }),
      myProgress,
      iAmMember,
      // 招募中的组·成员可拿到 token 就地续拉新人（裂变闭环·非成员/非招募态不下发）
      inviteToken: iAmMember && status === "RECRUITING" ? group.inviteToken : null,
      shareUrl:
        iAmMember && status === "RECRUITING"
          ? `${serverConfig.publicH5BaseUrl}/#/pkg-classics/shared-reading/invite?token=${group.inviteToken}`
          : null,
    };
  }

  // ── 3. 邀请卡（公开） ──
  async inviteInfo(token: string) {
    const group = await this.prisma.sharedReadingGroup.findUnique({ where: { inviteToken: token } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "邀请已失效");
    const [memberCount, initiator] = await Promise.all([
      this.prisma.sharedReadingMember.count({ where: { groupId: group.id } }),
      this.prisma.user.findUnique({ where: { id: group.initiatorId }, select: { nickname: true } }),
    ]);
    return {
      bookTitle: group.bookTitle,
      initiatorNickname: initiator?.nickname ?? "",
      memberCount,
      minMembers: group.minMembers,
      status: group.status,
    };
  }

  // ── 4. 加入 ──
  async join(userId: string, token: string) {
    const group = await this.prisma.sharedReadingGroup.findUnique({ where: { inviteToken: token } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "共读组不存在或邀请已失效");
    if (group.status !== "RECRUITING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该共读组已开读或已结束，无法加入");
    }
    const existing = await this.prisma.sharedReadingMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) throw new BusinessException(ErrorCode.CONFLICT, "你已加入该共读组");

    const count = await this.prisma.sharedReadingMember.count({ where: { groupId: group.id } });
    if (count >= group.maxMembers) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "共读组人数已满");
    }

    await this.prisma.sharedReadingMember.create({ data: { groupId: group.id, userId } });

    // 满 minMembers 自动转 READING（原子：仅当仍处 RECRUITING）
    if (count + 1 >= group.minMembers) {
      const now = new Date();
      const deadline = new Date(now.getTime() + group.durationDays * DAY_MS);
      await this.prisma.sharedReadingGroup.updateMany({
        where: { id: group.id, status: "RECRUITING" },
        data: { status: "READING", startAt: now, deadline },
      });
    }
    return { groupId: group.id };
  }

  // ── 5. 发起人手动开读 ──
  async start(userId: string, id: string) {
    const group = await this.prisma.sharedReadingGroup.findUnique({ where: { id } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "共读组不存在");
    if (group.initiatorId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有发起人可以开读");
    }
    if (group.status !== "RECRUITING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "共读组已开读或已结束");
    }
    const count = await this.prisma.sharedReadingMember.count({ where: { groupId: id } });
    if (count < group.minMembers) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `尚未满 ${group.minMembers} 人，无法开读`);
    }
    const now = new Date();
    const deadline = new Date(now.getTime() + group.durationDays * DAY_MS);
    await this.prisma.sharedReadingGroup.update({
      where: { id },
      data: { status: "READING", startAt: now, deadline },
    });
    return { groupId: id, status: "READING" };
  }

  // ── 6. 我参与的共读 ──
  async mine(userId: string) {
    const memberships = await this.prisma.sharedReadingMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (!groupIds.length) return { items: [] };

    const [groups, counts] = await Promise.all([
      this.prisma.sharedReadingGroup.findMany({ where: { id: { in: groupIds } } }),
      this.prisma.sharedReadingMember.groupBy({
        by: ["groupId"],
        where: { groupId: { in: groupIds } },
        _count: { _all: true },
      }),
    ]);
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const countMap = new Map(counts.map((c) => [c.groupId, c._count._all]));

    const items = memberships
      .map((m) => {
        const g = groupMap.get(m.groupId);
        if (!g) return null;
        return {
          groupId: m.groupId,
          bookTitle: g.bookTitle,
          status: g.status,
          memberCount: countMap.get(m.groupId) ?? 0,
          myCompleted: m.completed,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return { items };
  }

  // ── 7. 退组 / 解散 ──
  async leave(userId: string, id: string) {
    const group = await this.prisma.sharedReadingGroup.findUnique({ where: { id } });
    if (!group) throw new BusinessException(ErrorCode.NOT_FOUND, "共读组不存在");

    // 发起人退出 = 解散整组（仅 RECRUITING 期）
    if (group.initiatorId === userId) {
      if (group.status !== "RECRUITING") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "已开读，发起人无法解散共读组");
      }
      await this.prisma.sharedReadingMember.deleteMany({ where: { groupId: id } });
      await this.prisma.sharedReadingGroup.delete({ where: { id } });
      return { dissolved: true };
    }

    // 普通成员退出（仅 RECRUITING 期）
    if (group.status !== "RECRUITING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已开读，无法退出共读组");
    }
    const member = await this.prisma.sharedReadingMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.BAD_REQUEST, "你不是该共读组成员");
    await this.prisma.sharedReadingMember.delete({ where: { id: member.id } });
    return { left: true };
  }

  // ── 进度统计（拉取式·只读 ReadingProgress·不改 classic） ──
  /**
   * 统计某成员在某书的已完成章节数。
   * ReadingProgress @@unique([userId, bookId]) → 每人每书一行（当前章 chapterId + 该章 progress）。
   * 代理算法：当前章之前的章节数 + (当前章 progress≥阈值 ? 1 : 0)。单调、诚实、无需改古籍模块。
   */
  private async computeProgress(
    userId: string,
    bookId: string,
    targetChapters: number,
  ): Promise<{ completedChapters: number; completed: boolean }> {
    if (!userId) return { completedChapters: 0, completed: false };
    const row = await this.prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
      include: { chapter: { select: { sortOrder: true } } },
    });
    if (!row) return { completedChapters: 0, completed: false };

    const before = await this.prisma.classicChapter.count({
      where: { bookId, deletedAt: null, sortOrder: { lt: row.chapter.sortOrder } },
    });
    const completedChapters = before + (row.progress >= PROGRESS_THRESHOLD ? 1 : 0);
    return { completedChapters, completed: completedChapters >= targetChapters };
  }

  // ── 结算（惰性触发·发学分·防重发） ──
  /**
   * 持久化各成员完成快照，并为「已完成且未发过奖」的成员发放学分（rewardedAt 原子占位防重）。
   */
  private async settle(groupId: string, stats: MemberStat[], allCompleted: boolean) {
    for (const s of stats) {
      // 持久化实时统计快照
      await this.prisma.sharedReadingMember.update({
        where: { id: s.memberId },
        data: { completedChapters: s.completedChapters, completed: s.completed },
      });
      // 发奖：已完成 + 未发过（原子占位）
      if (s.completed && !s.rewardedAt) {
        const claimed = await this.prisma.sharedReadingMember.updateMany({
          where: { id: s.memberId, rewardedAt: null },
          data: { rewardedAt: new Date() },
        });
        if (claimed.count === 1) {
          await this.userGrowth.addExp(s.userId, SHARED_READING_REWARD_EXP, "shared_reading");
          // 共读结业成就（幂等直建·B1 补齐：此前常量已定义但从未颁发）
          await this.prisma.userAchievement
            .createMany({ data: [{ userId: s.userId, code: SHARED_READING_ACHIEVEMENT }], skipDuplicates: true })
            .catch(() => undefined);
          s.rewardedAt = new Date();
        }
      }
    }
    await this.prisma.sharedReadingGroup.update({
      where: { id: groupId },
      data: { status: allCompleted ? "COMPLETED" : "EXPIRED" },
    });
  }
}
