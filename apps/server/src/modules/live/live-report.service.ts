import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LiveReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, title: true, hostUserId: true, viewCount: true, startTime: true, endTime: true, status: true },
    });
    if (!room) throw new NotFoundException("直播间不存在");

    const duration = room.startTime && room.endTime
      ? Math.round((room.endTime.getTime() - room.startTime.getTime()) / 60000)
      : 0;

    const minuteData = await this.prisma.liveMinuteData.findMany({
      where: { roomId },
      orderBy: { minute: "asc" },
    });

    const peakOnline = minuteData.reduce((max, d) => Math.max(max, d.onlineCount), 0);
    const avgOnline = minuteData.length > 0
      ? Math.round(minuteData.reduce((sum, d) => sum + d.onlineCount, 0) / minuteData.length)
      : 0;

    const totalGmv = minuteData.reduce((sum, d) => sum + d.gmw, 0);
    const totalOrders = minuteData.reduce((sum, d) => sum + d.orderCount, 0);
    const totalComments = minuteData.reduce((sum, d) => sum + d.commentCount, 0);
    const totalLikes = minuteData.reduce((sum, d) => sum + d.likeCount, 0);
    const totalGifts = minuteData.reduce((sum, d) => sum + d.giftAmount, 0);

    const [giftRecordCount, uniqueViewers] = await Promise.all([
      this.prisma.giftRecord.count({ where: { liveRoomId: roomId } }),
      this.prisma.giftRecord.groupBy({ by: ["userId"], where: { liveRoomId: roomId } }).then(r => r.length),
    ]);

    return {
      summary: {
        title: room.title,
        durationMinutes: duration,
        totalViews: room.viewCount,
        peakOnline,
        avgOnline,
        totalGmv: totalGmv / 100,
        totalOrders,
        totalComments,
        totalLikes,
        totalGiftCoin: totalGifts,
        giftTransactions: giftRecordCount,
        uniqueGifters: uniqueViewers,
        interactionRate: room.viewCount > 0 ? ((totalComments + totalLikes) / room.viewCount * 100).toFixed(1) + "%" : "0%",
      },
      minuteData: minuteData.map(d => ({
        minute: d.minute,
        online: d.onlineCount,
        gmv: d.gmw / 100,
        orders: d.orderCount,
        comments: d.commentCount,
        likes: d.likeCount,
        gifts: d.giftAmount,
      })),
    };
  }

  async getCompare(roomId: string) {
    const current = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostUserId: true, viewCount: true, startTime: true, endTime: true },
    });
    if (!current) throw new NotFoundException("直播间不存在");

    const previous = await this.prisma.liveRoom.findFirst({
      where: { hostUserId: current.hostUserId, id: { not: roomId }, status: "ENDED" },
      orderBy: { endTime: "desc" },
      select: { id: true, title: true, viewCount: true, startTime: true, endTime: true },
    });

    if (!previous) return { current: await this.getReport(roomId), previous: null };

    const [currentData, previousData] = await Promise.all([
      this.prisma.liveMinuteData.aggregate({ where: { roomId }, _sum: { gmw: true, orderCount: true, commentCount: true, likeCount: true, giftAmount: true }, _max: { onlineCount: true } }),
      this.prisma.liveMinuteData.aggregate({ where: { roomId: previous.id }, _sum: { gmw: true, orderCount: true, commentCount: true, likeCount: true, giftAmount: true }, _max: { onlineCount: true } }),
    ]);

    const compare = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      return ((curr - prev) / prev * 100).toFixed(1) + "%";
    };

    return {
      current: {
        roomId,
        views: current.viewCount,
        peakOnline: currentData._max.onlineCount || 0,
        gmv: (currentData._sum.gmw || 0) / 100,
        orders: currentData._sum.orderCount || 0,
        comments: currentData._sum.commentCount || 0,
        gifts: currentData._sum.giftAmount || 0,
      },
      previous: {
        roomId: previous.id,
        title: previous.title,
        views: previous.viewCount,
        peakOnline: previousData._max.onlineCount || 0,
        gmv: (previousData._sum.gmw || 0) / 100,
        orders: previousData._sum.orderCount || 0,
        comments: previousData._sum.commentCount || 0,
        gifts: previousData._sum.giftAmount || 0,
      },
      changes: {
        views: compare(current.viewCount, previous.viewCount),
        peakOnline: compare(currentData._max.onlineCount || 0, previousData._max.onlineCount || 0),
        gmv: compare(currentData._sum.gmw || 0, previousData._sum.gmw || 0),
        orders: compare(currentData._sum.orderCount || 0, previousData._sum.orderCount || 0),
      },
    };
  }
}
