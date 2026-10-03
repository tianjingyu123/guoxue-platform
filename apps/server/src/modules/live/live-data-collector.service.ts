import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LiveQualityService } from "./live-quality.service";
import { LivePresenceService } from "./live-presence.service";

@Injectable()
export class LiveDataCollectorService {
  private readonly logger = new Logger(LiveDataCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly quality: LiveQualityService,
    private readonly presence: LivePresenceService,
  ) {}

  @Cron("* * * * *")
  async collectMinuteData() {
    await this.redis.runExclusive("live_data_collect", 600, () => this._collectMinuteData());
  }

  private async _collectMinuteData() {
    const liveRooms = await this.prisma.liveRoom.findMany({
      where: { status: "LIVING" },
      select: { id: true, quality: true, hostUserId: true },
    });

    if (liveRooms.length === 0) return;

    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
    const oneMinuteAgo = new Date(minuteStart.getTime() - 60000);

    for (const room of liveRooms) {
      try {
        const [onlineCount, comments, likes, gifts, orders] = await Promise.all([
          this.presence.getOnlineCount(room.id).catch((err) => { this.logger.error(`获取直播间在线人数失败`, err.stack); return 0; }),
          this.prisma.comment.count({
            where: { targetType: "LIVESTREAM", targetId: room.id, createdAt: { gte: oneMinuteAgo, lt: minuteStart } },
          }),
          this.prisma.like.count({
            where: { targetType: "LIVESTREAM", targetId: room.id, createdAt: { gte: oneMinuteAgo, lt: minuteStart } },
          }),
          this.prisma.giftRecord.aggregate({
            where: { liveRoomId: room.id, createdAt: { gte: oneMinuteAgo, lt: minuteStart } },
            _sum: { totalCoin: true },
          }),
          this.prisma.order.aggregate({
            where: {
              type: "PRODUCT",
              sourceContentType: "LIVE",
              sourceContentId: room.id,
              status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
              paidAt: { gte: oneMinuteAgo, lt: minuteStart },
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        await this.prisma.liveMinuteData.create({
          data: {
            roomId: room.id,
            minute: minuteStart,
            onlineCount,
            commentCount: comments,
            likeCount: likes,
            shareCount: 0,
            giftAmount: Number(gifts._sum.totalCoin || 0),
            gmw: Math.round(Number(orders._sum.amount || 0) * 100),
            orderCount: orders._count,
          },
        });
      } catch (err) {
        this.logger.error(`采集直播间 ${room.id} 分钟数据失败: ${(err as Error).message}`, (err as Error).stack);
      }

      // 画质计费核销（C5 闭环）：LIVING 且 hd/uhd 的房间每分钟按档扣主播 1 分钟额度；
      // basic 档不扣；额度耗尽自动降级 basic（room.quality 落库 → 观众端 play-url 选流随之切原流）。
      // cron 已有 redis 锁（live_data_collect）防多实例重复扣。
      await this.consumeQualityQuota(room);
    }
  }

  private async consumeQualityQuota(room: { id: string; quality: string; hostUserId: string }) {
    if (room.quality !== "hd" && room.quality !== "uhd") return;
    try {
      const res = await this.quality.consumeQuota(room.hostUserId, room.quality, 1, room.id);
      if (!res.ok) {
        await this.prisma.liveRoom.update({ where: { id: room.id }, data: { quality: "basic" } });
        this.logger.warn(`直播间 ${room.id} ${room.quality} 画质额度耗尽，已自动降级 basic（主播 ${room.hostUserId}）`);
      }
    } catch (err) {
      this.logger.error(`直播间 ${room.id} 画质额度核销失败: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}
