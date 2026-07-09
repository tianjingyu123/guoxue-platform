import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import {
  BADGE_DEFS,
  CHECKIN_BASE_EXP,
  CHECKIN_STREAK_BONUS,
  LEADERBOARD_TOP_N,
  computeLevel,
} from "./growth.constants";

/**
 * 圈子成长体系 service（签到 / 成长等级 / 徽章 / 入圈审批）。
 * 4 张新表（CircleCheckin / CircleMemberGrowth / CircleBadgeRecord / CircleJoinRequest）
 * 因 prisma generate 被 dev server 锁（EPERM），统一用 $queryRawUnsafe / $executeRawUnsafe 访问；
 * Post / Like / CircleMember / User 等既有表走 prisma client。
 * 范式参考 modules/circle-refund。
 */
@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── 工具 ──────────────────────────────────────────

  /** 本地日期 YYYY-MM-DD */
  private ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private num(v: any): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  /** 圈主/合伙人/管理员权限校验（同 article.service.ensureCircleAdmin） */
  private async ensureCircleAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主/合伙人/管理员可操作");
    }
  }

  /** 统计某成员在圈内的发帖数与获赞总数（既有表，走 prisma） */
  private async getPostStats(circleId: string, userId: string): Promise<{ posts: number; likes: number }> {
    const posts = await this.prisma.post.findMany({
      where: { circleId, userId },
      select: { id: true },
    });
    const postCount = posts.length;
    let likes = 0;
    if (postCount > 0) {
      likes = await this.prisma.like.count({
        where: { targetType: "POST", targetId: { in: posts.map((p) => p.id) } },
      });
    }
    return { posts: postCount, likes };
  }

  /** 读取成员成长行（无则返回零值默认） */
  private async getGrowthRow(circleId: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CircleMemberGrowth" WHERE "circleId"=$1 AND "userId"=$2 LIMIT 1`,
      circleId, userId,
    );
    return rows[0] ?? null;
  }

  /** 总经验 = 签到累计经验 + 发帖×10 + 获赞×2 */
  private calcTotalExp(checkinExp: number, posts: number, likes: number): number {
    return checkinExp + posts * 10 + likes * 2;
  }

  // ── 签到 ──────────────────────────────────────────

  /**
   * 今日签到（幂等）。每日 +10 基础经验；连续第 7 天额外 +20、第 30 天额外 +50；
   * 昨日未签则 streak 重置为 1；当日重复签到返回「今日已签到」不重复加；不允许补签。
   */
  async checkin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "你不是该圈子成员，无法签到");

    const today = this.ymd(new Date());
    const yesterday = this.ymd(new Date(Date.now() - 86_400_000));

    const g = await this.getGrowthRow(circleId, userId);
    // 当日重复签到：幂等返回
    if (g && g.lastCheckin === today) {
      return {
        alreadyChecked: true,
        message: "今日已签到",
        expGained: 0,
        checkinStreak: this.num(g.checkinStreak),
        totalCheckins: this.num(g.totalCheckins),
        checkinExp: this.num(g.checkinExp),
      };
    }

    // 连续天数：昨日有签到则 +1，否则重置为 1
    const streak = g && g.lastCheckin === yesterday ? this.num(g.checkinStreak) + 1 : 1;
    const bonus = CHECKIN_STREAK_BONUS[streak] ?? 0;
    const expGained = CHECKIN_BASE_EXP + bonus;

    // 插入签到记录（唯一索引兜底幂等：并发下若已存在则 affected=0）
    const inserted = await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CircleCheckin" ("id","circleId","userId","checkinDate","expGained","createdAt")
       VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
       ON CONFLICT ("circleId","userId","checkinDate") DO NOTHING`,
      randomUUID(), circleId, userId, today, expGained,
    );
    if (inserted === 0) {
      const cur = await this.getGrowthRow(circleId, userId);
      return {
        alreadyChecked: true,
        message: "今日已签到",
        expGained: 0,
        checkinStreak: this.num(cur?.checkinStreak),
        totalCheckins: this.num(cur?.totalCheckins),
        checkinExp: this.num(cur?.checkinExp),
      };
    }

    // upsert 成长行：经验累加、连续天数置为计算值、记录今日、总签到 +1
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CircleMemberGrowth" ("id","circleId","userId","checkinExp","checkinStreak","lastCheckin","totalCheckins","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,1,CURRENT_TIMESTAMP)
       ON CONFLICT ("circleId","userId") DO UPDATE SET
         "checkinExp" = "CircleMemberGrowth"."checkinExp" + $4,
         "checkinStreak" = $5,
         "lastCheckin" = $6,
         "totalCheckins" = "CircleMemberGrowth"."totalCheckins" + 1,
         "updatedAt" = CURRENT_TIMESTAMP`,
      randomUUID(), circleId, userId, expGained, streak, today,
    );

    const after = await this.getGrowthRow(circleId, userId);
    return {
      alreadyChecked: false,
      message: bonus > 0 ? `签到成功，连续${streak}天额外奖励 +${bonus} 经验` : "签到成功",
      expGained,
      bonus,
      checkinStreak: this.num(after?.checkinStreak) || streak,
      totalCheckins: this.num(after?.totalCheckins),
      checkinExp: this.num(after?.checkinExp),
    };
  }

  /** 本月签到日历：返回该月已签到日期及当日经验 + 当前连续/累计 */
  async getCheckinCalendar(circleId: string, userId: string, month?: string) {
    const m = month && /^\d{4}-\d{2}$/.test(month) ? month : this.ymd(new Date()).slice(0, 7);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "checkinDate","expGained" FROM "CircleCheckin"
       WHERE "circleId"=$1 AND "userId"=$2 AND "checkinDate" LIKE $3
       ORDER BY "checkinDate" ASC`,
      circleId, userId, `${m}%`,
    );
    const g = await this.getGrowthRow(circleId, userId);
    return {
      month: m,
      today: this.ymd(new Date()),
      checkedToday: g?.lastCheckin === this.ymd(new Date()),
      checkinStreak: this.num(g?.checkinStreak),
      totalCheckins: this.num(g?.totalCheckins),
      days: rows.map((r) => ({ date: r.checkinDate, expGained: this.num(r.expGained) })),
    };
  }

  // ── 成长 / 等级 ────────────────────────────────────

  /** 我的成长（等级/总经验/进度/连续签到）+ 该圈等级排行榜 Top N */
  async getGrowth(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "你不是该圈子成员");

    // 一次性取全圈成员的成长 + 发帖/获赞统计，JS 内折算总经验后排序
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT cm."userId",
              u."nickname" AS "nickname",
              u."avatar"   AS "avatar",
              COALESCE(g."checkinExp", 0)    AS "checkinExp",
              COALESCE(g."checkinStreak", 0) AS "checkinStreak",
              (SELECT COUNT(*) FROM "Post" p WHERE p."circleId"=cm."circleId" AND p."userId"=cm."userId") AS "posts",
              (SELECT COUNT(*) FROM "Like" l WHERE l."targetType"='POST'
                 AND l."targetId" IN (SELECT id FROM "Post" p2 WHERE p2."circleId"=cm."circleId" AND p2."userId"=cm."userId")) AS "likes"
       FROM "CircleMember" cm
       LEFT JOIN "CircleMemberGrowth" g ON g."circleId"=cm."circleId" AND g."userId"=cm."userId"
       LEFT JOIN "User" u ON u.id=cm."userId"
       WHERE cm."circleId"=$1`,
      circleId,
    );

    const ranked = rows
      .map((r) => {
        const checkinExp = this.num(r.checkinExp);
        const posts = this.num(r.posts);
        const likes = this.num(r.likes);
        const totalExp = this.calcTotalExp(checkinExp, posts, likes);
        const lv = computeLevel(totalExp);
        return {
          userId: r.userId as string,
          nickname: r.nickname ?? "学员",
          avatar: r.avatar ?? "",
          checkinExp,
          checkinStreak: this.num(r.checkinStreak),
          posts,
          likes,
          totalExp,
          level: lv.level,
          levelName: lv.levelName,
        };
      })
      .sort((a, b) => b.totalExp - a.totalExp);

    const leaderboard = ranked.slice(0, LEADERBOARD_TOP_N).map((x, i) => ({ rank: i + 1, ...x }));
    const myIndex = ranked.findIndex((x) => x.userId === userId);
    const mine = ranked[myIndex];
    const lv = computeLevel(mine?.totalExp ?? 0);
    const joinedDays = Math.max(0, Math.floor((Date.now() - new Date(member.joinedAt).getTime()) / 86_400_000));
    const badgesCount = this.num(
      (await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS c FROM "CircleBadgeRecord" WHERE "circleId"=$1 AND "userId"=$2`,
        circleId, userId,
      ))[0]?.c,
    );

    return {
      me: {
        userId,
        rank: myIndex >= 0 ? myIndex + 1 : ranked.length + 1,
        memberCount: ranked.length,
        joinedDays,
        posts: mine?.posts ?? 0,
        likes: mine?.likes ?? 0,
        checkinExp: mine?.checkinExp ?? 0,
        checkinStreak: mine?.checkinStreak ?? 0,
        badgesCount,
        ...lv, // level, levelName, totalExp, nextLevelMinExp, expIntoLevel, progressPercent, isMax ...
      },
      leaderboard,
    };
  }

  // ── 徽章 ──────────────────────────────────────────

  /** 徽章列表：判断达成并写入记录（幂等），返回全部定义 + 是否获得 + 获得时间 */
  async getBadges(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, "你不是该圈子成员");

    const g = await this.getGrowthRow(circleId, userId);
    const { posts, likes } = await this.getPostStats(circleId, userId);
    const joinedDays = Math.max(0, Math.floor((Date.now() - new Date(member.joinedAt).getTime()) / 86_400_000));
    const streak = this.num(g?.checkinStreak);

    // 各徽章达成条件 + 进度（未达成时供前端展示）
    const status: Record<string, { achieved: boolean; progress: number; total: number }> = {
      newcomer:   { achieved: true,            progress: 1, total: 1 },
      persistent: { achieved: streak >= 7,     progress: Math.min(streak, 7), total: 7 },
      prolific:   { achieved: posts >= 10,     progress: Math.min(posts, 10), total: 10 },
      popular:    { achieved: likes >= 100,    progress: Math.min(likes, 100), total: 100 },
      veteran:    { achieved: joinedDays >= 30, progress: Math.min(joinedDays, 30), total: 30 },
    };

    // 写入达成记录（幂等：唯一索引 ON CONFLICT DO NOTHING）
    for (const def of BADGE_DEFS) {
      if (status[def.code]?.achieved) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "CircleBadgeRecord" ("id","circleId","userId","badgeCode","gainedAt")
           VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
           ON CONFLICT ("circleId","userId","badgeCode") DO NOTHING`,
          randomUUID(), circleId, userId, def.code,
        );
      }
    }

    const records = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "badgeCode","gainedAt" FROM "CircleBadgeRecord" WHERE "circleId"=$1 AND "userId"=$2`,
      circleId, userId,
    );
    const gainedMap = new Map(records.map((r) => [r.badgeCode, r.gainedAt]));

    const badges = BADGE_DEFS.map((def) => ({
      ...def,
      earned: gainedMap.has(def.code),
      gainedAt: gainedMap.get(def.code) ?? null,
      progress: status[def.code]?.progress ?? 0,
      total: status[def.code]?.total ?? 1,
    }));
    return {
      earnedCount: badges.filter((b) => b.earned).length,
      total: badges.length,
      badges,
    };
  }

  // ── 入圈审批 ───────────────────────────────────────
  // ⚠️ 待接：申请的「产生」目前仅由演示脚本注入（scripts/seed-growth-demo.ts）。
  //    完整「免费圈/需审批圈 加入即生成 CircleJoinRequest」流程需接入 circle.service 的 join 入口，
  //    为避免侵入现有 join 逻辑（另有支付/成员创建分支），此处暂不改动 join，仅提供审批侧能力。

  /** 待审批 + 已处理列表（圈主权限），带申请人昵称/头像 */
  async getJoinRequests(circleId: string, operatorId: string) {
    await this.ensureCircleAdmin(circleId, operatorId);
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r."id", r."circleId", r."userId", r."status", r."message",
              r."reviewedBy", r."reviewedAt", r."rejectReason", r."createdAt",
              u."nickname" AS "userNickname", u."avatar" AS "userAvatar"
       FROM "CircleJoinRequest" r
       LEFT JOIN "User" u ON u.id = r."userId"
       WHERE r."circleId"=$1
       ORDER BY (r."status"='PENDING') DESC, r."createdAt" DESC`,
      circleId,
    );
  }

  /**
   * 审批入圈申请（圈主权限，幂等防重复审）。
   * 通过则把申请人加入圈子成员（不存在才建，成员数 +1）。
   */
  async reviewJoinRequest(circleId: string, reqId: string, operatorId: string, action: "approve" | "reject", rejectReason?: string) {
    await this.ensureCircleAdmin(circleId, operatorId);
    if (action !== "approve" && action !== "reject") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "action 必须为 approve 或 reject");
    }

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CircleJoinRequest" WHERE id=$1 AND "circleId"=$2 LIMIT 1`,
      reqId, circleId,
    );
    const req = rows[0];
    if (!req) throw new BusinessException(ErrorCode.NOT_FOUND, "入圈申请不存在");
    if (req.status !== "PENDING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请已处理，请勿重复审批");
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    // 状态流转加 PENDING 条件，防并发重复审批
    const updated = await this.prisma.$executeRawUnsafe(
      `UPDATE "CircleJoinRequest"
       SET "status"=$3, "reviewedBy"=$4, "reviewedAt"=CURRENT_TIMESTAMP, "rejectReason"=$5
       WHERE id=$1 AND "circleId"=$2 AND "status"='PENDING'`,
      reqId, circleId, newStatus, operatorId, action === "reject" ? (rejectReason?.trim() || null) : null,
    );
    if (updated === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请已处理，请勿重复审批");
    }

    // 通过则加入成员（幂等：已是成员则跳过）
    if (action === "approve") {
      const exist = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId: req.userId } },
      });
      if (!exist) {
        await this.prisma.$transaction([
          this.prisma.circleMember.create({ data: { circleId, userId: req.userId } }),
          this.prisma.circle.update({ where: { id: circleId }, data: { memberCount: { increment: 1 } } }),
        ]);
      }
    }
    return { success: true, action, status: newStatus };
  }
}
