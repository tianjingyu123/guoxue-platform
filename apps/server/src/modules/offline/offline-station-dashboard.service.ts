import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OfflineStationDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(stationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [courseRevenue, productRevenue, courseCount, studentCount, signedInCount] = await Promise.all([
      this.prisma.stationOrder.aggregate({
        where: { stationId, orderType: "OFFLINE_COURSE", createdAt: { gte: monthStart }, status: "PAID" },
        _sum: { amount: true },
      }),
      this.prisma.stationOrder.aggregate({
        where: { stationId, orderType: "PRODUCT", createdAt: { gte: monthStart }, status: "PAID" },
        _sum: { amount: true },
      }),
      this.prisma.offlineCourse.count({
        where: { stationId, startTime: { gte: monthStart } },
      }),
      this.prisma.offlineCourseRegistration.count({
        where: { course: { stationId }, createdAt: { gte: monthStart } },
      }),
      this.prisma.offlineCourseRegistration.count({
        where: { course: { stationId }, status: "SIGNED_IN" },
      }),
    ]);

    const totalRegistrations = await this.prisma.offlineCourseRegistration.count({
      where: { course: { stationId } },
    });

    const attendanceRate = totalRegistrations > 0
      ? ((signedInCount / totalRegistrations) * 100).toFixed(1)
      : "0";

    return {
      monthCourseRevenue: courseRevenue._sum.amount || 0,
      monthProductRevenue: productRevenue._sum.amount || 0,
      monthCourseCount: courseCount,
      totalStudents: studentCount,
      attendanceRate: `${attendanceRate}%`,
    };
  }

  async getTrends(stationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.stationOrder.findMany({
      where: { stationId, createdAt: { gte: thirtyDaysAgo }, status: "PAID" },
      select: { orderType: true, amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map<string, { course: number; product: number }>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) || { course: 0, product: 0 };
      if (o.orderType === "OFFLINE_COURSE") entry.course += Number(o.amount);
      else entry.product += Number(o.amount);
      dailyMap.set(day, entry);
    }

    return { trends: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })) };
  }

  async getCourseRanking(stationId: string) {
    const courses = await this.prisma.offlineCourse.findMany({
      where: { stationId, auditStatus: "APPROVED" },
      select: { id: true, title: true, cover: true, _count: { select: { registrations: true } } },
      orderBy: { registrations: { _count: "desc" } },
      take: 10,
    });
    return { ranking: courses.map(c => ({ id: c.id, title: c.title, cover: c.cover, registrations: c._count.registrations })) };
  }

  async getProductRanking(stationId: string) {
    const orders = await this.prisma.stationOrder.groupBy({
      by: ["targetId"],
      where: { stationId, orderType: "PRODUCT", status: "PAID" },
      _sum: { amount: true },
      _count: true,
      orderBy: { _count: { targetId: "desc" } },
      take: 10,
    });

    const productIds = orders.map(o => o.targetId);
    const products = await this.prisma.stationProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    return {
      ranking: orders.map(o => ({
        id: o.targetId,
        name: productMap.get(o.targetId)?.name || "未知商品",
        sales: o._count,
        amount: o._sum.amount,
      })),
    };
  }

  async getRecentStudents(stationId: string) {
    const registrations = await this.prisma.offlineCourseRegistration.findMany({
      where: { course: { stationId } },
      select: { id: true, userId: true, createdAt: true, course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const userIds = registrations.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      students: registrations.map(r => ({
        userId: r.userId,
        nickname: userMap.get(r.userId)?.nickname,
        avatar: userMap.get(r.userId)?.avatar,
        course: r.course.title,
        at: r.createdAt,
      })),
    };
  }

  async getStockAlerts(stationId: string) {
    const products = await this.prisma.stationProduct.findMany({
      where: { stationId, stock: { lte: 5 }, status: "ACTIVE" },
      select: { id: true, name: true, stock: true, price: true },
      take: 20,
    });
    return { alerts: products, count: products.length };
  }

  async getPendingBookings(stationId: string) {
    const bookings = await this.prisma.stationTeacherBooking.findMany({
      where: { stationId, status: "PENDING" },
      select: { id: true, teacherId: true, bookingDate: true, createdAt: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { bookings };
  }

  async getUpcomingCourses(stationId: string) {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);

    const courses = await this.prisma.offlineCourse.findMany({
      where: {
        stationId,
        auditStatus: "APPROVED",
        startTime: { gte: now, lte: sevenDaysLater },
      },
      select: { id: true, title: true, startTime: true, location: true, _count: { select: { registrations: true } } },
      orderBy: { startTime: "asc" },
    });
    return { courses };
  }
}
