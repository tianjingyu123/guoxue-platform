import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      articleCount,
      userCount,
      courseCount,
      circleCount,
      classicBookCount,
      productCount,
      todayNewUsers,
      pendingReports,
      totalViews,
      totalLikes,
      totalComments,
      totalCollects,
      orderCount,
      paidOrderCount,
      liveRoomCount,
      videoCount,
      monthNewUsers,
      monthNewArticles,
    ] = await Promise.all([
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.user.count(),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.classicBook.count(),
      this.prisma.product.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.article.aggregate({ _sum: { viewCount: true } }),
      this.prisma.like.count(),
      this.prisma.comment.count(),
      this.prisma.collect.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "PAID" } }),
      this.prisma.liveRoom.count(),
      this.prisma.video.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.article.count({
        where: { createdAt: { gte: thisMonth }, auditStatus: "APPROVED" },
      }),
    ]);

    return {
      articleCount,
      userCount,
      courseCount,
      circleCount,
      classicBookCount,
      productCount,
      todayNewUsers,
      pendingReports,
      totalViews: totalViews._sum.viewCount || 0,
      totalLikes,
      totalComments,
      totalCollects,
      orderCount,
      paidOrderCount,
      liveRoomCount,
      videoCount,
      monthNewUsers,
      monthNewArticles,
    };
  }
}
