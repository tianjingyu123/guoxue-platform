import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { InsightService } from "../track/insight.service";

/** 有效报名状态（学员归属判定口径）：已报名 / 已签到；CANCELLED 不算 */
const VALID_REG_STATUS = ["REGISTERED", "SIGNED_IN"];

@Injectable()
export class OfflineStationDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insight: InsightService,
  ) {}

  // ───────── 学员洞察（智能名片）─────────
  // 合规边界：仅驿站运营者本人可查本驿站报名学员（OfflineCourseRegistration）；
  // 不返回手机号等敏感字段（InsightService 已保证）；时间线仅供经营分析使用。
  // 画像聚合/时间线摘要委托公共 InsightService（与站长/圈主同一套）。

  /** 归属校验：查当前用户名下驿站，无则 NOT_FOUND（与 station 侧「你还没有开通分站」同款模式） */
  private async resolveOwnedStationId(ownerUserId: string): Promise<string> {
    const station = await this.prisma.stationOffline.findFirst({
      where: { ownerUserId },
      select: { id: true },
    });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "未找到关联驿站，请先创建驿站");
    return station.id;
  }

  /**
   * 学员洞察列表：本驿站报名学员（去重）画像 —— 最近活跃/30天行为量/消费力/兴趣标签TOP3。
   * boundAt = 该学员最早一条报名的 createdAt；total = 去重学员总数；聚合委托 InsightService。
   */
  async listStudents(ownerUserId: string, page = 1, pageSize = 20) {
    const stationId = await this.resolveOwnedStationId(ownerUserId);
    // 一个学员可能报多门课：按 userId 去重，取最早报名时间作为归属建立时间
    const grouped = await this.prisma.offlineCourseRegistration.groupBy({
      by: ["userId"],
      where: { status: { in: VALID_REG_STATUS }, course: { stationId } },
      _min: { createdAt: true },
    });
    grouped.sort(
      (a, b) => (b._min.createdAt?.getTime() || 0) - (a._min.createdAt?.getTime() || 0),
    );
    const total = grouped.length;
    const pageItems = grouped.slice((page - 1) * pageSize, page * pageSize);
    const customers = await this.insight.buildCustomerProfiles(
      pageItems.map((g) => ({ userId: g.userId, boundAt: g._min.createdAt ?? null })),
    );
    return { customers, total };
  }

  /** 单个学员的最近行为时间线（先校验其确为本驿站报名学员，防越权窥探） */
  async getStudentTimeline(ownerUserId: string, studentUserId: string, limit = 30) {
    const stationId = await this.resolveOwnedStationId(ownerUserId);
    const registration = await this.prisma.offlineCourseRegistration.findFirst({
      where: { userId: studentUserId, status: { in: VALID_REG_STATUS }, course: { stationId } },
      select: { id: true },
    });
    if (!registration) throw new BusinessException(ErrorCode.FORBIDDEN, "该用户不是本驿站报名学员");
    return this.insight.getTimeline(studentUserId, limit);
  }

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
