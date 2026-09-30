import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ImPolicyService } from "./im-policy.service";
import { AuditService } from "../audit/audit.service";
import { AppGateway } from "../websocket/websocket.gateway";

@Injectable()
export class ImFallbackService {
  constructor(
    private prisma: PrismaService,
    private policy: ImPolicyService,
    private audit: AuditService,
    private ws: AppGateway,
  ) {}

  async sendText(fromUserId: string, toUserId: string, rawContent: string) {
    const content = String(rawContent || "").trim().slice(0, 2000);
    if (!content) throw new BusinessException(ErrorCode.BAD_REQUEST, "消息内容不能为空");
    const relation = await this.policy.evaluateC2C(fromUserId, toUserId);
    if (!relation.canSend) throw new BusinessException(ErrorCode.FORBIDDEN, relation.hint || "当前关系无法向对方发送消息");
    if (this.audit.hasLocalViolation(content).length) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "消息包含不适合发送的内容");
    }
    const limited = relation.relation === "following" || relation.relation === "stranger";
    const quota = limited ? (await this.policy.getConfig()).followerDMQuota : 0;
    const message = await this.prisma.$transaction(async (tx) => {
      // 同一对用户的发送与回复串行，避免首次建计数行冲突及双向回复锁顺序相反。
      // 事务锁跨应用节点生效，消息落库失败时自动释放，不消耗额度。
      const pairKey = JSON.stringify([fromUserId, toUserId].sort());
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pairKey}, 0))`;
      await tx.imC2CCounter.createMany({
        data: [{ fromUserId, toUserId, sentCount: 0 }],
        skipDuplicates: true,
      });
      if (limited) {
        // 两节点并发发送时用数据库条件更新占用额度；消息写入失败则一起回滚。
        const reserved = await tx.imC2CCounter.updateMany({
          where: { fromUserId, toUserId, sentCount: { lt: quota } },
          data: { sentCount: { increment: 1 } },
        });
        if (reserved.count !== 1) {
          throw new BusinessException(ErrorCode.FORBIDDEN, "消息已送达，等待对方回复后才能继续");
        }
      } else {
        await tx.imC2CCounter.updateMany({
          where: { fromUserId, toUserId },
          data: { sentCount: { increment: 1 } },
        });
      }
      const created = await tx.imFallbackMessage.create({
        data: { fromUserId, toUserId, type: "TEXT", content },
      });
      await tx.imC2CCounter.updateMany({
        where: { fromUserId: toUserId, toUserId: fromUserId },
        data: { sentCount: 0 },
      });
      return created;
    });
    this.ws.sendToUser(toUserId, "im:fallback_message", message);
    this.ws.sendToUser(fromUserId, "im:fallback_message", message);
    void this.audit.classifyTextRisk(content, { scene: "IM_C2C", userId: fromUserId, dataId: toUserId }).catch(() => undefined);
    return message;
  }

  async history(userId: string, peerUserId: string, take = 50) {
    const pref = await this.prisma.imFallbackConversationPreference.findUnique({
      where: { userId_peerUserId: { userId, peerUserId } },
    });
    const messages = await this.prisma.imFallbackMessage.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: peerUserId },
          { fromUserId: peerUserId, toUserId: userId },
        ],
        ...(pref?.hiddenBefore ? { createdAt: { gt: pref.hiddenBefore } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(take, 1), 100),
    });
    return { messages: messages.reverse(), isCompleted: messages.length < take };
  }

  async markRead(userId: string, peerUserId: string) {
    await this.prisma.imFallbackMessage.updateMany({
      where: { fromUserId: peerUserId, toUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async conversations(userId: string) {
    const [rows, prefs] = await Promise.all([
      this.prisma.imFallbackMessage.findMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      this.prisma.imFallbackConversationPreference.findMany({ where: { userId } }),
    ]);
    const prefMap = new Map(prefs.map((p) => [p.peerUserId, p]));
    const latest = new Map<string, (typeof rows)[number]>();
    const unread = new Map<string, number>();
    for (const row of rows) {
      const peerId = row.fromUserId === userId ? row.toUserId : row.fromUserId;
      const pref = prefMap.get(peerId);
      if (pref?.hiddenBefore && row.createdAt <= pref.hiddenBefore) continue;
      if (!latest.has(peerId)) latest.set(peerId, row);
      if (row.toUserId === userId && !row.readAt) unread.set(peerId, (unread.get(peerId) || 0) + 1);
    }
    const peerIds = Array.from(latest.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return Array.from(latest.entries()).map(([peerId, last]) => {
      const peer = userMap.get(peerId);
      const pref = prefMap.get(peerId);
      return {
        id: `FALLBACK${peerId}`,
        type: "private",
        targetId: peerId,
        targetName: peer?.nickname || "用户",
        targetAvatar: peer?.avatar || "",
        lastMessage: { type: "text", content: last.content, senderId: last.fromUserId, time: last.createdAt },
        unreadCount: unread.get(peerId) || 0,
        isPinned: pref?.isPinned || false,
        isMuted: pref?.isMuted || false,
        updatedAt: last.createdAt,
      };
    }).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }

  async updatePreference(userId: string, peerUserId: string, input: { isPinned?: boolean; isMuted?: boolean }) {
    // 所属用户和对端只来自鉴权及路径；内部调用同样不能透传任意数据库字段。
    const preference: { isPinned?: boolean; isMuted?: boolean } = {};
    if (typeof input.isPinned === "boolean") preference.isPinned = input.isPinned;
    if (typeof input.isMuted === "boolean") preference.isMuted = input.isMuted;
    return this.prisma.imFallbackConversationPreference.upsert({
      where: { userId_peerUserId: { userId, peerUserId } },
      create: { userId, peerUserId, ...preference },
      update: preference,
    });
  }

  async clearConversation(userId: string, peerUserId: string) {
    await this.prisma.imFallbackConversationPreference.upsert({
      where: { userId_peerUserId: { userId, peerUserId } },
      create: { userId, peerUserId, hiddenBefore: new Date() },
      update: { hiddenBefore: new Date() },
    });
    return { success: true };
  }
}
