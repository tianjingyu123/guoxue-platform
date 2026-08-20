import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 直播观看会话的唯一事实源。
 *
 * - 活跃在线：45 秒滑动窗口，客户端每 20 秒续期。
 * - 累计观看：登录用户按 userId、游客按客户端会话去重；详情轮询绝不计数。
 * - Redis 键不保存原始 userId/clientSessionId，避免运维侧无谓暴露身份。
 */
@Injectable()
export class LivePresenceService {
  static readonly ACTIVE_WINDOW_MS = 45_000;
  private static readonly UNIQUE_VIEW_TTL_SECONDS = 90 * 24 * 60 * 60;
  private static readonly ONLINE_SNAPSHOT_TTL_SECONDS = 90;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private activeKey(roomId: string) {
    return `live:presence:${roomId}`;
  }

  private snapshotKey(roomId: string) {
    return `live:online:${roomId}`;
  }

  private memberId(viewerId: string | undefined, clientSessionId: string) {
    const source = viewerId ? `user:${viewerId}` : `session:${clientSessionId}`;
    return createHash("sha256").update(source).digest("hex").slice(0, 32);
  }

  private uniqueViewKey(roomId: string, memberId: string) {
    return `live:viewed:${roomId}:${memberId}`;
  }

  private async snapshot(roomId: string, onlineCount: number) {
    await this.redis.set(
      this.snapshotKey(roomId),
      String(onlineCount),
      LivePresenceService.ONLINE_SNAPSHOT_TTL_SECONDS,
    );
  }

  async getOnlineCount(roomId: string, now = Date.now()): Promise<number> {
    const key = this.activeKey(roomId);
    await this.redis.zremrangebyscore(
      key,
      Number.MIN_SAFE_INTEGER,
      now - LivePresenceService.ACTIVE_WINDOW_MS,
    );
    const onlineCount = await this.redis.zcard(key);
    await this.snapshot(roomId, onlineCount);
    return onlineCount;
  }

  async touch(roomId: string, clientSessionId: string, viewerId?: string) {
    const memberId = this.memberId(viewerId, clientSessionId);
    const now = Date.now();
    await this.redis.zadd(this.activeKey(roomId), now, memberId);
    await this.redis.expire(this.activeKey(roomId), LivePresenceService.UNIQUE_VIEW_TTL_SECONDS);

    const uniqueKey = this.uniqueViewKey(roomId, memberId);
    const firstVisit = await this.redis.setNX(
      uniqueKey,
      "1",
      LivePresenceService.UNIQUE_VIEW_TTL_SECONDS,
    );
    if (firstVisit) {
      try {
        await this.prisma.liveRoom.update({
          where: { id: roomId },
          data: { viewCount: { increment: 1 } },
        });
      } catch (error) {
        // 数据库未记账时撤销去重键，使下一次心跳可以安全重试。
        await this.redis.del(uniqueKey);
        throw error;
      }
    }

    const onlineCount = await this.getOnlineCount(roomId, now);
    return { onlineCount, firstVisit };
  }

  async leave(roomId: string, clientSessionId: string, viewerId?: string) {
    await this.redis.zrem(this.activeKey(roomId), this.memberId(viewerId, clientSessionId));
    const onlineCount = await this.getOnlineCount(roomId);
    return { onlineCount };
  }

  async clearActive(roomId: string) {
    await Promise.all([
      this.redis.del(this.activeKey(roomId)),
      this.redis.del(this.snapshotKey(roomId)),
    ]);
  }
}
