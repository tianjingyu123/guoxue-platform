import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OfflineService {
  constructor(private prisma: PrismaService) {}

  // ───────── 线下驿站 ─────────

  async createStation(dto: { name: string; city: string; address: string; phone: string; cover?: string; depositAmount?: number }, userId: string) {
    return this.prisma.stationOffline.create({
      data: {
        name: dto.name, city: dto.city, address: dto.address,
        phone: dto.phone, cover: dto.cover, depositAmount: dto.depositAmount ?? 0,
        ownerUserId: userId,
      },
    });
  }

  async listStations(page = 1, pageSize = 20, city?: string, status?: string) {
    const where: Prisma.StationOfflineWhereInput = {};
    if (city) where.city = city;
    if (status) where.status = status;

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        include: { owner: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  async getStation(id: string) {
    const s = await this.prisma.stationOffline.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        courses: { orderBy: { startTime: "asc" }, take: 10 },
        products: { where: { status: "ACTIVE" } },
        teacherBookings: { orderBy: { bookingDate: "desc" }, take: 10 },
      },
    });
    if (!s) throw new NotFoundException("驿站不存在");
    return s;
  }

  async auditStation(id: string, status: string) {
    return this.prisma.stationOffline.update({ where: { id }, data: { status } });
  }

  // ───────── 驿站发现（用户端） ─────────

  async discoverStations(params: { city?: string; keyword?: string; page?: number; pageSize?: number }) {
    const { city, keyword, page = 1, pageSize = 20 } = params;
    const where: Prisma.StationOfflineWhereInput = { status: "ACTIVE" };
    if (city) where.city = city;
    if (keyword) where.name = { contains: keyword };

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        select: {
          id: true, name: true, city: true, address: true,
          cover: true, phone: true,
          _count: { select: { courses: true, products: true } },
        },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  // ───────── 线下课程 ─────────

  async createOfflineCourse(dto: { stationId: string; title: string; cover?: string; intro?: string; teacherId?: string; price?: number; maxStudents: number; startTime: string; endTime: string; location: string }) {
    return this.prisma.offlineCourse.create({
      data: {
        ...dto,
        price: dto.price ?? 0,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async listOfflineCourses(stationId: string, page = 1, pageSize = 20) {
    const where = { stationId };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { _count: { select: { registrations: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  async getOfflineCourse(courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: {
        station: { select: { id: true, name: true, address: true } },
        registrations: true,
      },
    });
    if (!course) throw new NotFoundException("课程不存在");
    return course;
  }

  // ───────── 课程报名 ─────────

  async registerCourse(userId: string, courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: { _count: { select: { registrations: true } } },
    });
    if (!course) throw new NotFoundException("课程不存在");

    const existing = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (existing) throw new BadRequestException("已报名该课程");

    if (course._count.registrations >= course.maxStudents) {
      throw new BadRequestException("课程名额已满");
    }

    const qrCode = `QR_${courseId}_${userId}_${Date.now()}`;
    try {
      return this.prisma.offlineCourseRegistration.create({
        data: { courseId, userId, qrCode },
      });
    } catch (e: unknown) {
      if ((e as Record<string, unknown>)?.code === "P2002") throw new BadRequestException("已报名该课程");
      throw e;
    }
  }

  async cancelRegistration(userId: string, courseId: string) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (!reg) throw new NotFoundException("未报名该课程");
    if (reg.status === "SIGNED_IN") throw new BadRequestException("已签到，无法取消");

    return this.prisma.offlineCourseRegistration.update({
      where: { id: reg.id },
      data: { status: "CANCELLED" },
    });
  }

  async signInCourse(stationId: string, qrCode: string) {
    const reg = await this.prisma.offlineCourseRegistration.findFirst({
      where: { qrCode, course: { stationId } },
      include: { course: true },
    });
    if (!reg) throw new NotFoundException("无效的签到码");
    if (reg.status === "CANCELLED") throw new BadRequestException("报名已取消");
    if (reg.status === "SIGNED_IN") throw new BadRequestException("已签到");

    return this.prisma.offlineCourseRegistration.update({
      where: { id: reg.id },
      data: { status: "SIGNED_IN", signedAt: new Date() },
    });
  }

  async listRegistrations(courseId: string, page = 1, pageSize = 20) {
    const where = { courseId };
    const [registrations, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.offlineCourseRegistration.count({ where }),
    ]);
    return { registrations, total, page, pageSize };
  }

  // ───────── 驿站商品 ─────────

  async createProduct(stationId: string, dto: { name: string; price: number; stock?: number; isPlatform?: boolean }) {
    return this.prisma.stationProduct.create({
      data: {
        stationId,
        name: dto.name,
        price: dto.price,
        stock: dto.stock ?? 0,
        isPlatform: dto.isPlatform ?? false,
      },
    });
  }

  async updateProduct(productId: string, dto: { name?: string; price?: number; stock?: number; status?: string }) {
    return this.prisma.stationProduct.update({ where: { id: productId }, data: dto });
  }

  async listProducts(stationId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    const { status, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.StationProductWhereInput = { stationId };
    if (status) where.status = status;
    const [products, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { products, total, page, pageSize };
  }

  async deleteProduct(productId: string) {
    return this.prisma.stationProduct.update({ where: { id: productId }, data: { status: "INACTIVE" } });
  }

  // ───────── 师资预约 ─────────

  async createTeacherBooking(stationId: string, dto: { teacherId: string; courseId?: string; bookingDate: string; remark?: string }) {
    return this.prisma.stationTeacherBooking.create({
      data: {
        stationId,
        teacherId: dto.teacherId,
        courseId: dto.courseId,
        bookingDate: new Date(dto.bookingDate),
        remark: dto.remark,
      },
    });
  }

  async confirmBooking(bookingId: string) {
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }

  async cancelBooking(bookingId: string) {
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  async listTeacherBookings(stationId: string, params?: { teacherId?: string; status?: string; page?: number; pageSize?: number }) {
    const { teacherId, status, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.StationTeacherBookingWhereInput = { stationId };
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.stationTeacherBooking.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { bookingDate: "asc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { bookings, total, page, pageSize };
  }

  // ───────── 订单 ─────────

  async createOrder(stationId: string, userId: string, dto: { orderType: string; targetId: string; amount: number }) {
    // 驿站收益 = 订单金额的70%（默认分成比例）
    const stationIncome = dto.amount * 0.7;
    return this.prisma.stationOrder.create({
      data: {
        stationId,
        orderType: dto.orderType,
        targetId: dto.targetId,
        amount: dto.amount,
        stationIncome,
      },
    });
  }

  async listOrders(stationId: string, params?: { orderType?: string; status?: string; page?: number; pageSize?: number }) {
    const { orderType, status, page = 1, pageSize = 20 } = params || {};
    const where: Prisma.StationOrderWhereInput = { stationId };
    if (orderType) where.orderType = orderType;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.stationOrder.findMany({
        where,
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOrder.count({ where }),
    ]);
    return { orders, total, page, pageSize };
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.prisma.stationOrder.update({ where: { id: orderId }, data: { status } });
  }

  // ───────── 结算 ─────────

  async createSettlement(stationId: string, dto: { period: string; totalIncome: number }) {
    const platformShare = dto.totalIncome * 0.3; // 平台抽成30%
    const stationShare = dto.totalIncome * 0.7;

    return this.prisma.stationSettlement.create({
      data: {
        stationId,
        period: dto.period,
        totalIncome: dto.totalIncome,
        stationShare,
        platformShare,
      },
    });
  }

  async listSettlements(stationId: string, page = 1, pageSize = 20) {
    const where = { stationId };
    const [settlements, total] = await Promise.all([
      this.prisma.stationSettlement.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { period: "desc" },
      }),
      this.prisma.stationSettlement.count({ where }),
    ]);
    return { settlements, total, page, pageSize };
  }

  async settleStation(stationId: string, settlementId: string) {
    const settlement = await this.prisma.stationSettlement.findFirst({
      where: { id: settlementId, stationId },
    });
    if (!settlement) throw new NotFoundException("结算单不存在");
    if (settlement.settled) throw new BadRequestException("已结算");

    return this.prisma.stationSettlement.update({
      where: { id: settlementId },
      data: { settled: true, settledAt: new Date() },
    });
  }

  // ───────── 收益看板 ─────────

  async getRevenueDashboard(stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId } });
    if (!station) throw new NotFoundException("驿站不存在");

    const [orders, settlements, courses, products] = await Promise.all([
      this.prisma.stationOrder.aggregate({
        where: { stationId },
        _sum: { amount: true, stationIncome: true },
        _count: true,
      }),
      this.prisma.stationSettlement.aggregate({
        where: { stationId, settled: true },
        _sum: { stationShare: true, platformShare: true, totalIncome: true },
      }),
      this.prisma.offlineCourse.count({ where: { stationId } }),
      this.prisma.stationProduct.count({ where: { stationId, status: "ACTIVE" } }),
    ]);

    // 本月订单
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await this.prisma.stationOrder.aggregate({
      where: { stationId, createdAt: { gte: monthStart } },
      _sum: { amount: true, stationIncome: true },
      _count: true,
    });

    return {
      totalOrders: orders._count,
      totalRevenue: orders._sum.amount || 0,
      totalStationIncome: orders._sum.stationIncome || 0,
      settledAmount: settlements._sum.stationShare || 0,
      platformFee: settlements._sum.platformShare || 0,
      activeCourses: courses,
      activeProducts: products,
      monthOrders: monthOrders._count,
      monthRevenue: monthOrders._sum.amount || 0,
      monthStationIncome: monthOrders._sum.stationIncome || 0,
    };
  }

  // ───────── 研究院（平台管理视图） ─────────

  async listMembers(page = 1, pageSize = 20) {
    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { joinedAt: "desc" },
      }),
      this.prisma.instituteMember.count(),
    ]);
    return { members, total, page, pageSize };
  }

  async updateMember(id: string, dto: { role?: string; status?: string }) {
    return this.prisma.instituteMember.update({ where: { id }, data: dto as Prisma.InstituteMemberUpdateInput });
  }
}
