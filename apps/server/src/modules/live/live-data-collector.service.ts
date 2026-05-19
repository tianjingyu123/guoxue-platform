import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class LiveDataCollectorService {
  private readonly logger = new Logger(LiveDataCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron("* * * * *")
  async collectMinuteData() {
    const lockKey = "cron:lock:live_data_collect";
    const locked = await this.redis.setNX(lockKey, "1", 55);
    if (!locked) return;

    const liveRooms = await this.prisma.liveRoom.findMany({
      where: { status: "LIVING" },
      select: { id: true },
    });

    if (liveRooms.length === 0) return;

    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
    const oneMinuteAgo = new Date(minuteStart.getTime() - 60000);

    for (const room of liveRooms) {
      try {
        const [onlineCount, comments, likes, gifts, orders] = await Promise.all([
          this.redis.get(`live:online:${room.id}`).then(v => parseInt(v || "0") || 0).catch((err) => { this.logger.error(`获取直播间在线人数失败`, err.stack); return 0; }),
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
            where: { type: "LIVESTREAM", targetId: room.id, status: { in: ["PAID", "COMPLETED"] }, createdAt: { gte: oneMinuteAgo, lt: minuteStart } },
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
    }
  }
}
