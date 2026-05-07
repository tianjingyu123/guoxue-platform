import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      articleCount,
      userCount,
      courseCount,
      circleCount,
      classicBookCount,
      productCount,
      todayNewUsers,
      pendingReports,
    ] = await Promise.all([
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.user.count(),
      this.prisma.course.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.circle.count(),
      this.prisma.classicBook.count(),
      this.prisma.product.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
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
    };
  }
}
