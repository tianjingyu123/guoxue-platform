import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LiveDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 归属校验（防 IDOR 越权）：当前用户必须是该直播间的主播（hostUserId），
   * 否则禁止访问直播间经营数据。
   */
  private async assertRoomHost(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true },
    });
    if (!room) throw new NotFoundException("直播间不存在");
    if (room.hostUserId !== userId) throw new ForbiddenException("无权访问该直播间数据");
  }

  async getOverview(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, title: true, viewCount: true, status: true, startTime: true, endTime: true, hostUserId: true },
    });
    if (!room) throw new NotFoundException("直播间不存在");
    if (room.hostUserId !== userId) throw new ForbiddenException("无权访问该直播间数据");

    const [commentCount, likeCount, giftAgg, orderAgg, peakMinute] = await Promise.all([
      this.prisma.comment.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.like.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.giftRecord.aggregate({ where: { liveRoomId: roomId }, _sum: { totalCoin: true }, _count: true }),
      this.prisma.order.aggregate({ where: { type: "LIVESTREAM", targetId: roomId, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true }, _count: true }),
      this.prisma.liveMinuteData.findFirst({ where: { roomId }, orderBy: { onlineCount: "desc" }, select: { onlineCount: true } }),
    ]);

    const newFollowers = await this.prisma.giftRecord.groupBy({
      by: ["userId"],
      where: { liveRoomId: roomId },
    }).then(r => r.length);

    return {
      title: room.title,
      status: room.status,
      viewCount: room.viewCount,
      peakOnline: peakMinute?.onlineCount || 0,
      newFollowers,
      totalGiftCoin: Number(giftAgg._sum.totalCoin || 0),
      giftCount: giftAgg._count,
      gmv: Number(orderAgg._sum.amount || 0),
      orderCount: orderAgg._count,
      commentCount,
      likeCount,
      interactionRate: room.viewCount > 0 ? ((commentCount + likeCount) / room.viewCount * 100).toFixed(1) + "%" : "0%",
      startTime: room.startTime,
      endTime: room.endTime,
    };
  }

  async getTrends(roomId: string, userId: string) {
    await this.assertRoomHost(roomId, userId);
    const data = await this.prisma.liveMinuteData.findMany({
      where: { roomId },
      orderBy: { minute: "asc" },
      select: { minute: true, onlineCount: true, gmw: true, orderCount: true, commentCount: true, likeCount: true, giftAmount: true },
    });

    return {
      trends: data.map(d => ({
        minute: d.minute,
        online: d.onlineCount,
        gmv: d.gmw,
        orders: d.orderCount,
        comments: d.commentCount,
        likes: d.likeCount,
        gifts: d.giftAmount,
      })),
    };
  }

  async getProducts(roomId: string, userId: string) {
    await this.assertRoomHost(roomId, userId);
    const products = await this.prisma.liveProduct.findMany({
      where: { liveId: roomId },
      select: { productId: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });

    const productIds = products.map(p => p.productId);
    const productDetails = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, price: true, images: true },
    });
    const productMap = new Map(productDetails.map(p => [p.id, p]));

    const orderStats = productIds.length > 0
      ? await this.prisma.order.groupBy({
          by: ["targetId"],
          where: { type: "PRODUCT", targetId: { in: productIds }, status: { in: ["PAID", "COMPLETED"] } },
          _sum: { amount: true },
          _count: true,
        })
      : [];
    const orderMap = new Map(orderStats.map(o => [o.targetId, { sales: o._count, revenue: Number(o._sum.amount || 0) }]));

    return {
      products: products.map(p => {
        const detail = productMap.get(p.productId);
        const stats = orderMap.get(p.productId);
        return {
          productId: p.productId,
          title: detail?.title,
          price: detail ? Number(detail.price) : 0,
          image: detail?.images?.[0],
          sales: stats?.sales || 0,
          revenue: stats?.revenue || 0,
        };
      }),
    };
  }

  async getInteractions(roomId: string, userId: string) {
    await this.assertRoomHost(roomId, userId);
    const [topGifters, recentComments] = await Promise.all([
      this.prisma.giftRecord.groupBy({
        by: ["userId"],
        where: { liveRoomId: roomId },
        _sum: { totalCoin: true },
        orderBy: { _sum: { totalCoin: "desc" } },
        take: 10,
      }),
      this.prisma.comment.findMany({
        where: { targetType: "LIVESTREAM", targetId: roomId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { userId: true, content: true, createdAt: true },
      }),
    ]);

    const gifterIds = topGifters.map(g => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: gifterIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      topGifters: topGifters.map(g => ({
        userId: g.userId,
        nickname: userMap.get(g.userId)?.nickname,
        avatar: userMap.get(g.userId)?.avatar,
        totalCoin: Number(g._sum.totalCoin || 0),
      })),
      recentComments: recentComments.slice(0, 20),
    };
  }

  async getAudience(roomId: string, userId: string) {
    await this.assertRoomHost(roomId, userId);
    const giftUserIds = await this.prisma.giftRecord.findMany({
      where: { liveRoomId: roomId },
      select: { userId: true },
      distinct: ["userId"],
    });
    const commentUserIds = await this.prisma.comment.findMany({
      where: { targetType: "LIVESTREAM", targetId: roomId },
      select: { userId: true },
      distinct: ["userId"],
    });
    const allUserIds = [...new Set([...giftUserIds.map(g => g.userId), ...commentUserIds.map(c => c.userId)])];

    if (!allUserIds.length) {
      return { totalAudience: 0, gender: "--", age: "--", region: "--", interests: "--" };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { gender: true, birthday: true, interestCategories: true },
    });

    const maleCount = users.filter((u: { gender: number | null }) => u.gender === 1).length;
    const femaleCount = users.filter((u: { gender: number | null }) => u.gender === 0).length;

    const now = new Date();
    const ageGroups: Record<string, number> = { under20: 0, "20s": 0, "30s": 0, "40s": 0, over50: 0 };
    users.forEach((u: { birthday: Date | null }) => {
      if (!u.birthday) return;
      const age = now.getFullYear() - new Date(u.birthday).getFullYear();
      if (age < 20) ageGroups.under20++;
      else if (age < 30) ageGroups["20s"]++;
      else if (age < 40) ageGroups["30s"]++;
      else if (age < 50) ageGroups["40s"]++;
      else ageGroups.over50++;
    });

    const tagCount: Record<string, number> = {};
    users.forEach((u: { interestCategories: string[] }) => {
      (u.interestCategories || []).forEach((t: string) => { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

    return {
      totalAudience: allUserIds.length,
      gender: `男${maleCount} / 女${femaleCount}`,
      age: Object.entries(ageGroups).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}人`).join(" ") || "--",
      region: "--",
      interests: topTags.join("、") || "--",
    };
  }

  async getHostStats(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true, startTime: true, endTime: true },
    });
    if (!room) throw new NotFoundException("直播间不存在");
    if (room.hostUserId !== userId) throw new ForbiddenException("无权访问该直播间数据");

    const duration = room.startTime && room.endTime
      ? Math.round((room.endTime.getTime() - room.startTime.getTime()) / 60000)
      : 0;

    const products = await this.prisma.liveProduct.count({ where: { liveId: roomId } });

    return {
      hostUserId: room.hostUserId,
      durationMinutes: duration,
      totalProductsPresented: products,
    };
  }
}
