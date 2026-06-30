import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 私信关系层级（优先级从高到低） */
export type ImRelation =
  | "self" // 自己
  | "blocked" // 黑名单（任一方向）
  | "circle" // 圈友（同在一个圈子）
  | "paid" // 付费关系（买过对方名下内容）
  | "mutual" // 互相关注
  | "following" // 单向关注（我关注对方）
  | "stranger"; // 陌生人

export interface ImMediaPerms {
  image: boolean;
  voice: boolean;
  file: boolean;
}

export interface ImC2CPolicy {
  relation: ImRelation;
  canSend: boolean;
  /** 本会话剩余可发条数；-1 表示不限 */
  remaining: number;
  mediaPerms: ImMediaPerms;
  hint: string;
  reason?: string;
}

const DEFAULT_CONFIG = {
  allowStrangerDM: false,
  followerDMQuota: 1,
  allowImage: true,
  allowVoice: true,
  allowFile: false,
};

const NO_MEDIA: ImMediaPerms = { image: false, voice: false, file: false };

@Injectable()
export class ImPolicyService {
  constructor(private prisma: PrismaService) {}

  /** 读取后台可调配置（单例 id="default"，缺失则用默认值） */
  async getConfig() {
    const cfg = await this.prisma.imPolicyConfig.findUnique({
      where: { id: "default" },
    });
    return cfg ?? { id: "default", ...DEFAULT_CONFIG };
  }

  /** 更新后台可调配置（管理员），缺失则创建 */
  async updateConfig(
    patch: Partial<{
      allowStrangerDM: boolean;
      followerDMQuota: number;
      allowImage: boolean;
      allowVoice: boolean;
      allowFile: boolean;
    }>,
  ) {
    return this.prisma.imPolicyConfig.upsert({
      where: { id: "default" },
      create: { id: "default", ...DEFAULT_CONFIG, ...patch },
      update: patch,
    });
  }

  /** 判定 fromUser → toUser 的私信权限 */
  async evaluateC2C(fromUserId: string, toUserId: string): Promise<ImC2CPolicy> {
    if (fromUserId === toUserId) {
      return { relation: "self", canSend: false, remaining: 0, mediaPerms: NO_MEDIA, hint: "不能给自己发消息", reason: "self" };
    }

    const cfg = await this.getConfig();
    const fullMedia: ImMediaPerms = { image: cfg.allowImage, voice: cfg.allowVoice, file: cfg.allowFile };

    // 1) 黑名单（任一方向命中即禁发）
    if (await this.isBlocked(fromUserId, toUserId)) {
      return { relation: "blocked", canSend: false, remaining: 0, mediaPerms: NO_MEDIA, hint: "对方与你之间存在黑名单关系，无法发送消息", reason: "blocked" };
    }

    // 2) 圈友（同在一个圈子）
    if (await this.isCircleMate(fromUserId, toUserId)) {
      return { relation: "circle", canSend: true, remaining: -1, mediaPerms: fullMedia, hint: "" };
    }

    // 3) 付费关系（买过对方圈子/课程/问答）
    if (await this.hasPaidRelation(fromUserId, toUserId)) {
      return { relation: "paid", canSend: true, remaining: -1, mediaPerms: fullMedia, hint: "" };
    }

    // 4/5) 关注关系
    const [iFollow, followsMe] = await Promise.all([
      this.follows(fromUserId, toUserId),
      this.follows(toUserId, fromUserId),
    ]);
    if (iFollow && followsMe) {
      return { relation: "mutual", canSend: true, remaining: -1, mediaPerms: fullMedia, hint: "你们已互相关注，可自由聊天" };
    }
    if (iFollow) {
      // 单向关注：未互关，受 followerDMQuota 限制（已发未回计数）
      const sent = await this.sentCount(fromUserId, toUserId);
      const remaining = Math.max(0, cfg.followerDMQuota - sent);
      return {
        relation: "following",
        canSend: remaining > 0,
        remaining,
        mediaPerms: NO_MEDIA, // 未互关不支持富媒体
        hint: remaining > 0 ? `未互相关注，对方回复前你还可发送 ${remaining} 条` : "消息已送达，等待对方回复后才能继续",
        reason: remaining > 0 ? undefined : "waiting_reply",
      };
    }

    // 6) 陌生人
    if (cfg.allowStrangerDM) {
      const sent = await this.sentCount(fromUserId, toUserId);
      const remaining = Math.max(0, cfg.followerDMQuota - sent);
      return {
        relation: "stranger",
        canSend: remaining > 0,
        remaining,
        mediaPerms: NO_MEDIA,
        hint: remaining > 0 ? "你们还不是好友，发送消息需等对方回复" : "等待对方回复后才能继续发送",
        reason: remaining > 0 ? undefined : "waiting_reply",
      };
    }
    return { relation: "stranger", canSend: false, remaining: 0, mediaPerms: NO_MEDIA, hint: "你们还不是好友，无法发送私信。关注对方或使用付费咨询", reason: "stranger" };
  }

  // ───────── 关系判定原子方法 ─────────

  /** 黑名单：任一方向命中 */
  private async isBlocked(a: string, b: string): Promise<boolean> {
    const n = await this.prisma.blacklist.count({
      where: {
        OR: [
          { userId: a, blockedUserId: b },
          { userId: b, blockedUserId: a },
        ],
      },
    });
    return n > 0;
  }

  /** 圈友：两人同在某一圈子 */
  private async isCircleMate(a: string, b: string): Promise<boolean> {
    const aCircles = await this.prisma.circleMember.findMany({
      where: { userId: a },
      select: { circleId: true },
    });
    if (aCircles.length === 0) return false;
    const ids = aCircles.map((c) => c.circleId);
    const n = await this.prisma.circleMember.count({
      where: { userId: b, circleId: { in: ids } },
    });
    return n > 0;
  }

  /**
   * 付费关系：fromUser 曾向 toUser 付费，覆盖四类（定位说明：加入圈子/购买课程/付费问答/连麦咨询）：
   * ① 加入 toUser 拥有的圈子  ② 付费购买 toUser 讲授的课程
   * ③ 向 toUser 付费提问(PaidQuestion)  ④ 与 toUser 付费通话(ConsultCall)
   */
  private async hasPaidRelation(fromUserId: string, toUserId: string): Promise<boolean> {
    // ① 加入了 toUser 拥有的圈子
    const ownedCircles = await this.prisma.circle.findMany({
      where: { ownerId: toUserId },
      select: { id: true },
    });
    if (ownedCircles.length > 0) {
      const n = await this.prisma.circleMember.count({
        where: { userId: fromUserId, circleId: { in: ownedCircles.map((c) => c.id) } },
      });
      if (n > 0) return true;
    }

    // ② 付费购买了 toUser 讲授的课程（Order: type=COURSE, status=PAID, targetId=课程id）
    const ownedCourses = await this.prisma.course.findMany({
      where: { userId: toUserId },
      select: { id: true },
    });
    if (ownedCourses.length > 0) {
      const paid = await this.prisma.order.count({
        where: {
          userId: fromUserId,
          type: "COURSE",
          status: "PAID",
          targetId: { in: ownedCourses.map((c) => c.id) },
        },
      });
      if (paid > 0) return true;
    }

    // ③ 向 toUser 付费提问
    const questions = await this.prisma.paidQuestion.count({
      where: { askerId: fromUserId, answererId: toUserId },
    });
    if (questions > 0) return true;

    // ④ 与 toUser 付费通话咨询
    const calls = await this.prisma.consultCall.count({
      where: { callerId: fromUserId, expertId: toUserId },
    });
    if (calls > 0) return true;

    return false;
  }

  /** a 是否关注 b */
  private async follows(a: string, b: string): Promise<boolean> {
    const f = await this.prisma.follow.findUnique({
      where: { userId_followedUserId: { userId: a, followedUserId: b } },
    });
    return !!f;
  }

  /** fromUser 向 toUser 已发未回条数 */
  private async sentCount(fromUserId: string, toUserId: string): Promise<number> {
    const c = await this.prisma.imC2CCounter.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
    });
    return c?.sentCount ?? 0;
  }

  // ───────── 计数维护（由发送/回复触发） ─────────

  /** 发送成功后：fromUser→toUser 计数 +1 */
  async incrementSent(fromUserId: string, toUserId: string): Promise<void> {
    await this.prisma.imC2CCounter.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      create: { fromUserId, toUserId, sentCount: 1 },
      update: { sentCount: { increment: 1 } },
    });
  }

  /** 对方回复后：清零 toUser→fromUser 的待回计数（A 回复 B，则清 B→A 计数） */
  async resetOnReply(fromUserId: string, toUserId: string): Promise<void> {
    await this.prisma.imC2CCounter.updateMany({
      where: { fromUserId: toUserId, toUserId: fromUserId },
      data: { sentCount: 0 },
    });
  }
}
