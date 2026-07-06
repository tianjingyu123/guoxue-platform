import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { safePagination } from "../../../common/pagination";
import { OfflineSharedService } from "./offline-shared.service";

/**
 * 线下驿站-讲师域（从 offline.service 拆出·纯搬家不改逻辑）。
 * 职责：师资预约（创建/确认/取消/列表）+ 讲师管理（CRUD/签约引入/排期/冲突/可预约时段）
 * + 驿站-老师双向选择邀约 + 师资预约（平台监控 adminListBookings）。
 * 依赖：共享叶子域（assertStationOwner）·单向不循环。
 */
@Injectable()
export class OfflineTeacherService {
  constructor(
    private prisma: PrismaService,
    private shared: OfflineSharedService,
  ) {}

  // ───────── 师资预约 ─────────

  async createTeacherBooking(userId: string, stationId: string, dto: { teacherId: string; courseId?: string; bookingDate: string; remark?: string }) {
    await this.shared.assertStationOwner(userId, stationId);
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

  async confirmBooking(userId: string, bookingId: string) {
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
    await this.shared.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
  }

  async cancelBooking(userId: string, bookingId: string) {
    const existing = await this.prisma.stationTeacherBooking.findUnique({ where: { id: bookingId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "预约记录不存在");
    await this.shared.assertStationOwner(userId, existing.stationId);
    return this.prisma.stationTeacherBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }

  async listTeacherBookings(operatorUserId: string, stationId: string, params?: { teacherId?: string; status?: string; page?: number; pageSize?: number }) {
    await this.shared.assertStationOwner(operatorUserId, stationId);
    const { teacherId, status } = params || {};
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
    const where: Prisma.StationTeacherBookingWhereInput = { stationId };
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.stationTeacherBooking.findMany({
        where,
        skip, take: pageSize,
        orderBy: { bookingDate: "asc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { bookings, total, page, pageSize };
  }

  // ───────── 讲师管理 ─────────

  async createTeacher(dto: { name: string; stationId: string; avatar?: string; specialties?: string[]; bio?: string }) {
    return this.prisma.stationTeacher.create({ data: dto });
  }

  /** 从研究院签约讲师库引入讲师到本驿站（研究院→驿站师资供给闭环）*/
  async createTeacherFromSigned(userId: string, stationId: string, sourceUserId: string, specialties?: string[], bio?: string) {
    await this.shared.assertStationOwner(userId, stationId);
    // T9-P1 多院化：userId 不再全局唯一（@@unique([instituteId,userId])），改 findFirst 取有效签约会籍
    const member = await this.prisma.instituteMember.findFirst({
      where: { userId: sourceUserId, lecturerLevel: "SIGNED", status: "ACTIVE" },
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

  async listTeachers(stationId?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.StationTeacherWhereInput = {};
    if (stationId) where.stationId = stationId;
    const [teachers, total] = await Promise.all([
      this.prisma.stationTeacher.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        skip,
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
  async adminListTeacherRequests(status?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.stationTeacherRequest.findMany({
        where,
        include: {
          station: { select: { id: true, name: true, city: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationTeacherRequest.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // ───────── 平台管理视图（跨驿站只读监控） ─────────

  /** 师资预约（跨驿站列表，平台监控）*/
  async adminListBookings(params?: { stationId?: string; status?: string; page?: number; pageSize?: number }) {
    const { page, pageSize, skip } = safePagination(params?.page, params?.pageSize);
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
        skip,
        take: pageSize,
        orderBy: { bookingDate: "desc" },
      }),
      this.prisma.stationTeacherBooking.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
