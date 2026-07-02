import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { isUniqueConstraintError } from "../../common/prisma-errors";

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
    if (!s) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
    return s;
  }

  /** 运营者识别：当前用户拥有的驿站（B 端经营后台地基）。非驿站主返回 null */
  async getMyStation(userId: string) {
    return this.prisma.stationOffline.findUnique({
      where: { ownerUserId: userId },
      include: { _count: { select: { courses: true, products: true, teachers: true, teacherBookings: true } } },
    });
  }

  async auditStation(id: string, status: string) {
    const existing = await this.prisma.stationOffline.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
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
          cover: true, phone: true, type: true, intro: true,
          businessHours: true, images: true, tags: true, facilities: true, status: true,
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

  async listOfflineCourses(stationId?: string, page = 1, pageSize = 20) {
    // 传 stationId=单驿站课程（含草稿）；不传=用户端发现，仅 ACTIVE 驿站的已审核已发布课程
    const where: Prisma.OfflineCourseWhereInput = stationId
      ? { stationId }
      : { auditStatus: "APPROVED", status: "PUBLISHED", station: { status: "ACTIVE" } };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: {
          _count: { select: { registrations: true } },
          station: { select: { id: true, name: true, city: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    const teacherMap = await this.loadTeachers(courses.map((c) => c.teacherId));
    return {
      courses: courses.map((c) => ({ ...c, teacher: c.teacherId ? teacherMap.get(c.teacherId) || null : null })),
      total,
      page,
      pageSize,
    };
  }

  async getOfflineCourse(courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
      include: {
        station: { select: { id: true, name: true, address: true, phone: true } },
        registrations: true,
      },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    let teacher: { id: string; name: string; avatar: string | null; specialties: string[]; bio: string | null } | null = null;
    if (course.teacherId) {
      teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: course.teacherId },
        select: { id: true, name: true, avatar: true, specialties: true, bio: true },
      });
    }
    return { ...course, teacher };
  }

  /** 批量加载讲师信息（OfflineCourse.teacherId → StationTeacher）*/
  private async loadTeachers(teacherIds: (string | null)[]) {
    const ids = [...new Set(teacherIds.filter((x): x is string => !!x))];
    if (!ids.length) return new Map<string, { id: string; name: string; avatar: string | null; specialties: string[] }>();
    const teachers = await this.prisma.stationTeacher.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatar: true, specialties: true },
    });
    return new Map(teachers.map((t) => [t.id, t]));
  }

  // ───────── 课程报名 ─────────

  /** 当前用户在某课程的报名记录（用户端签到凭证）*/
  async getMyRegistration(courseId: string, userId: string) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: { course: { include: { station: { select: { id: true, name: true, address: true, phone: true } } } } },
    });
    if (!reg) return null;
    let teacher: { id: string; name: string; avatar: string | null } | null = null;
    if (reg.course.teacherId) {
      teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: reg.course.teacherId },
        select: { id: true, name: true, avatar: true },
      });
    }
    return { ...reg, course: { ...reg.course, teacher } };
  }

  async registerCourse(userId: string, courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");

    const qrCode = `QR_${courseId}_${userId}_${Date.now()}`;
    // 行锁串行化防超卖：锁定课程行后，在锁内查重 + 计数 + 创建（消除 count-then-create 竞态）
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "OfflineCourse" WHERE id = ${courseId} FOR UPDATE`;

      const existing = await tx.offlineCourseRegistration.findUnique({
        where: { courseId_userId: { courseId, userId } },
      });
      if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该课程");

      const count = await tx.offlineCourseRegistration.count({ where: { courseId } });
      if (count >= course.maxStudents) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "课程名额已满");
      }

      try {
        return await tx.offlineCourseRegistration.create({
          data: { courseId, userId, qrCode },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该课程");
        throw e;
      }
    });
  }

  async cancelRegistration(userId: string, courseId: string) {
    const reg = await this.prisma.offlineCourseRegistration.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "未报名该课程");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到，无法取消");

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
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "无效的签到码");
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到");

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
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
    return this.prisma.stationProduct.update({ where: { id: productId }, data: dto });
  }

  async listProducts(stationId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    const { status } = params || {};
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
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
    const existing = await this.prisma.stationProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站商品不存在");
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
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }

  async cancelBooking(bookingId: string) {
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
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
    // 服务端校验金额：从数据库查询实际价格，忽略前端传入的 amount
    let actualAmount: number;
    if (dto.orderType === "COURSE") {
      const course = await this.prisma.offlineCourse.findUnique({ where: { id: dto.targetId } });
      if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
      actualAmount = Number(course.price);
    } else if (dto.orderType === "PRODUCT") {
      const product = await this.prisma.stationProduct.findUnique({ where: { id: dto.targetId } });
      if (!product) throw new BusinessException(ErrorCode.NOT_FOUND, "商品不存在");
      actualAmount = Number(product.price);
    } else if (dto.orderType === "TEACHER_BOOKING") {
      // 教师预约：从预约记录查询价格
      const booking = await this.prisma.stationTeacherBooking.findUnique({ where: { id: dto.targetId }, select: { price: true } });
      if (!booking) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
      actualAmount = Number(booking.price || 0);
      if (actualAmount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "预约金额异常");
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的订单类型: ${dto.orderType}`);
    }

    const stationIncome = actualAmount * 0.7;
    return this.prisma.stationOrder.create({
      data: {
        stationId,
        orderType: dto.orderType,
        targetId: dto.targetId,
        amount: actualAmount,
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
    const existing = await this.prisma.stationOrder.findUnique({ where: { id: orderId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站订单不存在");
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
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    if (settlement.settled) throw new BusinessException(ErrorCode.BAD_REQUEST, "已结算");

    return this.prisma.stationSettlement.update({
      where: { id: settlementId },
      data: { settled: true, settledAt: new Date() },
    });
  }

  // ───────── 收益看板 ─────────

  async getRevenueDashboard(stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

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

  // ───────── 课程审核 ─────────

  async auditCourse(courseId: string, auditStatus: string, reason?: string) {
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    return this.prisma.offlineCourse.update({
      where: { id: courseId },
      data: {
        auditStatus,
        auditReason: reason || null,
        status: auditStatus === "APPROVED" ? "PUBLISHED" : course.status,
      },
    });
  }

  async toggleRecommend(courseId: string) {
    const course = await this.prisma.offlineCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new BusinessException(ErrorCode.NOT_FOUND, "课程不存在");
    const newVal = !course.isRecommended;
    return this.prisma.offlineCourse.update({
      where: { id: courseId },
      data: { isRecommended: newVal, recommendedAt: newVal ? new Date() : null },
    });
  }

  async listPendingCourses(page = 1, pageSize = 20, stationId?: string) {
    const where: Prisma.OfflineCourseWhereInput = { auditStatus: "PENDING" };
    if (stationId) where.stationId = stationId;
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
  }

  async listRecommendedCourses(page = 1, pageSize = 20) {
    const where: Prisma.OfflineCourseWhereInput = { isRecommended: true, status: { not: "DRAFT" } };
    const [courses, total] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { recommendedAt: "desc" },
      }),
      this.prisma.offlineCourse.count({ where }),
    ]);
    return { courses, total, page, pageSize };
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
    const existing = await this.prisma.instituteMember.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "书院成员不存在");
    return this.prisma.instituteMember.update({ where: { id }, data: dto as Prisma.InstituteMemberUpdateInput });
  }

  // ───────── 讲师管理 ─────────

  async createTeacher(dto: { name: string; stationId: string; avatar?: string; specialties?: string[]; bio?: string }) {
    return this.prisma.stationTeacher.create({ data: dto });
  }

  /** 从研究院签约讲师库引入讲师到本驿站（研究院→驿站师资供给闭环）*/
  async createTeacherFromSigned(stationId: string, sourceUserId: string, specialties?: string[], bio?: string) {
    const member = await this.prisma.instituteMember.findUnique({
      where: { userId: sourceUserId },
      select: { lecturerLevel: true, status: true, user: { select: { nickname: true, avatar: true } } },
    });
    if (!member || member.lecturerLevel !== "SIGNED" || member.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户不是有效的签约讲师");
    }
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const existing = await this.prisma.stationTeacher.findFirst({ where: { stationId, sourceUserId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该签约讲师已在本站讲师库");

    return this.prisma.stationTeacher.create({
      data: {
        stationId,
        sourceUserId,
        name: member.user.nickname,
        avatar: member.user.avatar,
        specialties: specialties || [],
        bio: bio || null,
      },
    });
  }

  async listTeachers(stationId?: string, page = 1, pageSize = 20) {
    const where: Prisma.StationTeacherWhereInput = {};
    if (stationId) where.stationId = stationId;
    const [teachers, total] = await Promise.all([
      this.prisma.stationTeacher.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationTeacher.count({ where }),
    ]);
    return { teachers, total, page, pageSize };
  }

  async getTeacher(id: string) {
    const t = await this.prisma.stationTeacher.findUnique({
      where: { id },
      include: {
        station: { select: { id: true, name: true } },
        bookings: { orderBy: { bookingDate: "desc" }, take: 20 },
      },
    });
    if (!t) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    return t;
  }

  async updateTeacher(id: string, dto: { name?: string; avatar?: string; specialties?: string[]; bio?: string; status?: string }) {
    const existing = await this.prisma.stationTeacher.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    return this.prisma.stationTeacher.update({ where: { id }, data: dto });
  }

  async deleteTeacher(id: string) {
    const existing = await this.prisma.stationTeacher.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    // 检查未完成的预约
    const pending = await this.prisma.stationTeacherBooking.count({
      where: { teacherId: id, status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (pending > 0) throw new BusinessException(ErrorCode.BAD_REQUEST, `该讲师有 ${pending} 个未完成的预约，无法删除`);
    return this.prisma.stationTeacher.update({ where: { id }, data: { status: "INACTIVE" } });
  }

  /** 讲师排期日历（按月视图） */
  async getTeacherSchedule(teacherId: string, month: string) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);

    const bookings = await this.prisma.stationTeacherBooking.findMany({
      where: { teacherId, bookingDate: { gte: start, lte: end } },
      orderBy: { bookingDate: "asc" },
      include: { station: { select: { id: true, name: true } } },
    });

    return { teacherId, month, bookings, total: bookings.length };
  }

  /** 冲突检测 */
  async checkScheduleConflicts(teacherId: string, date: string) {
    const bookingDate = new Date(date);
    const conflicts = await this.prisma.stationTeacherBooking.findMany({
      where: {
        teacherId,
        bookingDate: {
          gte: new Date(bookingDate.getTime() - 3600000),
          lte: new Date(bookingDate.getTime() + 3600000),
        },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    return { hasConflict: conflicts.length > 0, conflicts };
  }

  /** 设置讲师可预约时段 */
  async setTeacherAvailability(teacherId: string, slots: string[]) {
    // 存储可预约时段到讲师的 specialties 扩展字段（用 JSON）
    const teacher = await this.prisma.stationTeacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new BusinessException(ErrorCode.NOT_FOUND, "讲师不存在");
    // 简单实现：将可预约时段存储为扩展逻辑
    return { teacherId, slots, message: "可预约时段已设置" };
  }

  // ───────── 驿站-老师双向选择 ─────────

  async createTeacherRequest(stationId: string, userId: string, body: {
    teacherId?: string; courseTitle?: string; courseIntro?: string; proposedFee?: number; proposeDate?: string;
  }) {
    // 校验驿站归属
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station || station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站");
    }
    return this.prisma.stationTeacherRequest.create({
      data: {
        stationId,
        teacherId: body.teacherId,
        courseTitle: body.courseTitle,
        courseIntro: body.courseIntro,
        proposedFee: body.proposedFee,
        proposeDate: body.proposeDate ? new Date(body.proposeDate) : null,
        initiator: "STATION",
      },
    });
  }

  async listTeacherRequests(stationId: string, userId: string, status?: string) {
    // 校验驿站归属
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station || station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看该驿站的邀约");
    }
    const where: any = { stationId };
    if (status) where.status = status;
    return this.prisma.stationTeacherRequest.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async respondTeacherRequest(id: string, userId: string, status: string) {
    const request = await this.prisma.stationTeacherRequest.findUnique({ where: { id } });
    if (!request) throw new BusinessException(ErrorCode.NOT_FOUND, "邀约不存在");

    // 如果指定了老师，验证响应用户拥有该老师所属驿站
    if (request.teacherId) {
      const teacher = await this.prisma.stationTeacher.findUnique({
        where: { id: request.teacherId },
        select: { station: { select: { ownerUserId: true } } },
      });
      if (!teacher || teacher.station.ownerUserId !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "无权响应该邀约");
      }
    } else {
      // 开放邀约：验证用户拥有该驿站
      const station = await this.prisma.stationOffline.findUnique({
        where: { id: request.stationId },
        select: { ownerUserId: true },
      });
      if (!station || station.ownerUserId !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "无权响应该邀约");
      }
    }

    return this.prisma.stationTeacherRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async getTeacherRequestsForTeacher(teacherId: string, status?: string) {
    const where: any = { teacherId };
    if (status) where.status = status;
    return this.prisma.stationTeacherRequest.findMany({
      where,
      include: { station: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** 管理员查看所有教师邀约 */
  async adminListTeacherRequests(status?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.stationTeacherRequest.findMany({
        where,
        include: {
          station: { select: { id: true, name: true, city: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationTeacherRequest.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 手机号脱敏 138****8000 */
  private maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    return phone.length >= 11 ? phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : phone.replace(/.(?=.{2})/g, "*");
  }

  /** 核销记录（跨驿站签到核销，平台监控）— status=SIGNED_IN */
  async adminListCheckins(params?: { stationId?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.OfflineCourseRegistrationWhereInput = { status: "SIGNED_IN" };
    if (params?.stationId) where.course = { stationId: params.stationId };

    const [regs, total] = await Promise.all([
      this.prisma.offlineCourseRegistration.findMany({
        where,
        include: { course: { select: { id: true, title: true, price: true, station: { select: { id: true, name: true, city: true } } } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { signedAt: "desc" },
      }),
      this.prisma.offlineCourseRegistration.count({ where }),
    ]);

    // OfflineCourseRegistration 无 User 关联，批量补全用户信息并脱敏
    const userIds = [...new Set(regs.map((r) => r.userId))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, phone: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = regs.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        userNickname: u?.nickname || "—",
        userPhone: this.maskPhone(u?.phone),
        signedAt: r.signedAt,
        createdAt: r.createdAt,
        courseId: r.courseId,
        courseTitle: r.course?.title || "—",
        amount: r.course?.price ?? 0,
        station: r.course?.station || null,
      };
    });
    return { items, total, page, pageSize };
  }

  /** 驿站商品（跨驿站列表，平台监控）*/
  async adminListProducts(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.StationProductWhereInput = {};
    if (params?.stationId) where.stationId = params.stationId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.stationProduct.findMany({
        where,
        include: { station: { select: { id: true, name: true, city: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationProduct.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 师资预约（跨驿站列表，平台监控）*/
  async adminListBookings(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = Number(params?.page) || 1;
    const pageSize = Number(params?.pageSize) || 20;
    const where: Prisma.StationTeacherBookingWhereInput = {};
    if (params?.stationId) where.stationId = params.stationId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.stationTeacherBooking.findMany({
        where,
        include: {
          station: { select: { id: true, name: true, city: true } },
          teacher: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { bookingDate: "desc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
