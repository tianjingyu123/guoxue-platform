import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { OfflineReminderService } from "./offline-reminder.service";

/** 回顾照片墙上限 */
const MAX_EVENT_PHOTOS = 30;

/** 统一经营日历条目（课程/活动/讲师预约三源同构） */
export interface CalendarItem {
  kind: "course" | "event" | "booking";
  id: string;
  title: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
}

/**
 * 驿站活动系统（T8 驿站 OMO P1a）
 * - C 端：活动发现（仅 PUBLISHED）/详情/报名（防超卖行锁，照抄课程报名范式）/取消/我的活动
 * - B 端：活动 CRUD/状态流转（发布|取消|结束）/扫码核销/回顾照片墙/统一经营日历（课程+活动+讲师预约三源聚合）
 * - 通知触点全套继承 P0 成果（报名/取消即时通知 + cron 两档开场提醒，见 OfflineReminderService）
 */
@Injectable()
export class OfflineEventService {
  constructor(
    private prisma: PrismaService,
    private reminder: OfflineReminderService,
  ) {}

  /** B 端驿站主鉴权地基：当前用户拥有的驿站（照抄 dashboard 现有模式） */
  private async getMyStationId(userId: string): Promise<string> {
    const station = await this.prisma.stationOffline.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "未找到关联驿站，请先创建驿站");
    return station.id;
  }

  /** 校验活动归属当前驿站主，返回活动实体（防跨驿站越权） */
  private async assertEventOwner(userId: string, eventId: string) {
    const event = await this.prisma.stationEvent.findUnique({
      where: { id: eventId },
      include: { station: { select: { id: true, ownerUserId: true } } },
    });
    if (!event) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    if (event.station.ownerUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站活动");
    }
    return event;
  }

  /** 报名有效人数过滤（REGISTERED + SIGNED_IN 占名额，CANCELLED 释放） */
  private get activeRegWhere() {
    return { status: { not: "CANCELLED" } } as const;
  }

  // ───────── C 端：活动发现 ─────────

  /**
   * 公开活动列表：仅 PUBLISHED；默认排序=未结束优先+临近在前（进行中/未开场按开场时间升序，
   * 已结束按开场时间倒序垫底），跨两段统一分页。
   */
  async listPublicEvents(params: { stationId?: string; type?: string; page?: number; pageSize?: number }) {
    const { stationId, type } = params;
    const page = Number(params.page) || 1;
    const pageSize = Math.min(50, Number(params.pageSize) || 20);
    const now = new Date();

    const baseWhere: Prisma.StationEventWhereInput = { status: "PUBLISHED" };
    if (stationId) baseWhere.stationId = stationId;
    if (type) baseWhere.type = type;

    const upcomingWhere: Prisma.StationEventWhereInput = { ...baseWhere, endTime: { gte: now } };
    const pastWhere: Prisma.StationEventWhereInput = { ...baseWhere, endTime: { lt: now } };

    const include = {
      _count: { select: { registrations: { where: this.activeRegWhere } } },
      station: { select: { id: true, name: true, city: true, address: true } },
    } satisfies Prisma.StationEventInclude;

    const [upcomingTotal, pastTotal] = await Promise.all([
      this.prisma.stationEvent.count({ where: upcomingWhere }),
      this.prisma.stationEvent.count({ where: pastWhere }),
    ]);
    const total = upcomingTotal + pastTotal;
    const skip = (page - 1) * pageSize;

    let events: unknown[] = [];
    if (skip < upcomingTotal) {
      events = await this.prisma.stationEvent.findMany({
        where: upcomingWhere,
        include,
        orderBy: { startTime: "asc" },
        skip,
        take: pageSize,
      });
    }
    const remaining = pageSize - events.length;
    if (remaining > 0 && skip + events.length < total) {
      const pastSkip = Math.max(0, skip - upcomingTotal);
      const past = await this.prisma.stationEvent.findMany({
        where: pastWhere,
        include,
        orderBy: { startTime: "desc" },
        skip: pastSkip,
        take: remaining,
      });
      events = events.concat(past);
    }
    return { events, total, page, pageSize };
  }

  /** 活动详情（公开）：草稿不可见；登录时附带 myRegistration 报名状态 */
  async getEvent(eventId: string, userId?: string) {
    const event = await this.prisma.stationEvent.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: { where: this.activeRegWhere } } },
        station: { select: { id: true, name: true, city: true, address: true, phone: true } },
      },
    });
    if (!event || event.status === "DRAFT") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    }

    let myRegistration: { id: string; status: string; qrCode: string | null; signedAt: Date | null } | null = null;
    if (userId) {
      myRegistration = await this.prisma.stationEventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { id: true, status: true, qrCode: true, signedAt: true },
      });
    }
    return { ...event, myRegistration };
  }

  // ───────── C 端：活动报名（防超卖行锁·照抄课程报名范式） ─────────

  async registerEvent(userId: string, eventId: string) {
    const event = await this.prisma.stationEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new BusinessException(ErrorCode.NOT_FOUND, "活动不存在");
    if (event.status !== "PUBLISHED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "活动未发布或已取消，无法报名");
    }
    if (event.startTime.getTime() <= Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已开场，无法报名");
    }

    const qrCode = `QRE_${eventId}_${userId}_${Date.now()}`;
    // 行锁串行化防超卖：锁定活动行后，在锁内查重 + 计数 + 创建（消除 count-then-create 竞态）
    const registration = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "StationEvent" WHERE id = ${eventId} FOR UPDATE`;

      const existing = await tx.stationEventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该活动");
      }

      const count = await tx.stationEventRegistration.count({
        where: { eventId, ...this.activeRegWhere },
      });
      if (count >= event.maxAttendees) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "活动名额已满");
      }

      // 取消后可重报：复用原报名行（eventId+userId 唯一约束下无法二次 create）
      if (existing) {
        return tx.stationEventRegistration.update({
          where: { id: existing.id },
          data: { status: "REGISTERED", qrCode, signedAt: null },
        });
      }

      try {
        return await tx.stationEventRegistration.create({
          data: { eventId, userId, qrCode },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "已报名该活动");
        throw e;
      }
    });

    // 报名成功站内通知（通知失败不影响报名主流程）
    try {
      await this.reminder.notifyEventRegistered(userId, {
        id: event.id, title: event.title, startTime: event.startTime, location: event.location,
      });
    } catch { /* 通知层已自吞异常，此处双保险 */ }

    return registration;
  }

  /** 取消报名：开场前可取消；已签到不可取消 */
  async cancelEventRegistration(userId: string, eventId: string) {
    const reg = await this.prisma.stationEventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: { select: { id: true, title: true, startTime: true, location: true } } },
    });
    if (!reg || reg.status === "CANCELLED") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "未报名该活动");
    }
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到，无法取消");
    if (reg.event.startTime.getTime() <= Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已开场，无法取消报名");
    }

    const updated = await this.prisma.stationEventRegistration.update({
      where: { id: reg.id },
      data: { status: "CANCELLED" },
    });

    // 取消确认站内通知（通知失败不影响取消主流程）
    try {
      await this.reminder.notifyEventCancelled(userId, reg.event);
    } catch { /* 通知层已自吞异常，此处双保险 */ }

    return updated;
  }

  /** 我的活动报名列表（带活动与驿站简要信息） */
  async listMyEventRegistrations(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [registrations, total] = await Promise.all([
      this.prisma.stationEventRegistration.findMany({
        where,
        include: {
          event: {
            select: {
              id: true, title: true, type: true, cover: true, startTime: true, endTime: true,
              location: true, status: true,
              station: { select: { id: true, name: true, city: true, address: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationEventRegistration.count({ where }),
    ]);
    return { registrations, total, page, pageSize };
  }

  // ───────── B 端：活动管理（驿站主） ─────────

  async createEvent(userId: string, dto: {
    title: string; type: string; cover?: string; intro?: string; price?: number;
    maxAttendees: number; startTime: string; endTime: string; location: string;
  }) {
    const stationId = await this.getMyStationId(userId);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结束时间必须晚于开始时间");
    }
    return this.prisma.stationEvent.create({
      data: {
        stationId,
        title: dto.title,
        type: dto.type,
        cover: dto.cover,
        intro: dto.intro,
        price: dto.price ?? 0,
        maxAttendees: dto.maxAttendees,
        startTime,
        endTime,
        location: dto.location,
        // status 走模型默认 DRAFT
      },
    });
  }

  async updateEvent(userId: string, eventId: string, dto: {
    title?: string; type?: string; cover?: string; intro?: string; price?: number;
    maxAttendees?: number; startTime?: string; endTime?: string; location?: string;
  }) {
    const event = await this.assertEventOwner(userId, eventId);
    if (event.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已取消，不可编辑");
    if (event.status === "FINISHED") throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已结束，不可编辑");

    const startTime = dto.startTime ? new Date(dto.startTime) : event.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : event.endTime;
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结束时间必须晚于开始时间");
    }

    return this.prisma.stationEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.cover !== undefined && { cover: dto.cover }),
        ...(dto.intro !== undefined && { intro: dto.intro }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.maxAttendees !== undefined && { maxAttendees: dto.maxAttendees }),
        ...(dto.startTime !== undefined && { startTime }),
        ...(dto.endTime !== undefined && { endTime }),
        ...(dto.location !== undefined && { location: dto.location }),
      },
    });
  }

  /** 状态流转：publish（DRAFT→PUBLISHED）/ cancel（DRAFT|PUBLISHED→CANCELLED，群发通知报名者）/ finish（PUBLISHED→FINISHED） */
  async updateEventStatus(userId: string, eventId: string, action: "publish" | "cancel" | "finish") {
    const event = await this.assertEventOwner(userId, eventId);

    if (action === "publish") {
      if (event.status !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅草稿活动可发布");
      return this.prisma.stationEvent.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });
    }

    if (action === "finish") {
      if (event.status !== "PUBLISHED") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已发布活动可标记结束");
      return this.prisma.stationEvent.update({ where: { id: eventId }, data: { status: "FINISHED" } });
    }

    // cancel
    if (event.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已取消");
    if (event.status === "FINISHED") throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已结束，无法取消");

    const updated = await this.prisma.stationEvent.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
    });

    // 取消活动 → 群发通知全部 REGISTERED 报名者（通知失败不影响取消主流程）
    try {
      const regs = await this.prisma.stationEventRegistration.findMany({
        where: { eventId, status: "REGISTERED" },
        select: { userId: true },
      });
      if (regs.length) {
        await this.reminder.notifyEventCancelledByStation(
          regs.map((r) => r.userId),
          { id: event.id, title: event.title, startTime: event.startTime, location: event.location },
        );
      }
    } catch { /* 通知层已自吞异常，此处双保险 */ }

    return updated;
  }

  /** B 端活动列表（本驿站全状态，可按 status 过滤） */
  async listDashboardEvents(userId: string, params?: { status?: string; page?: number; pageSize?: number }) {
    const stationId = await this.getMyStationId(userId);
    const page = Number(params?.page) || 1;
    const pageSize = Math.min(50, Number(params?.pageSize) || 20);
    const where: Prisma.StationEventWhereInput = { stationId };
    if (params?.status) where.status = params.status;

    const [events, total] = await Promise.all([
      this.prisma.stationEvent.findMany({
        where,
        include: { _count: { select: { registrations: { where: this.activeRegWhere } } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "desc" },
      }),
      this.prisma.stationEvent.count({ where }),
    ]);
    return { events, total, page, pageSize };
  }

  /** 扫码核销（照抄课程 signInCourse：本驿站范围内按 qrCode 查报名） */
  async signInEvent(userId: string, qrCode: string) {
    const stationId = await this.getMyStationId(userId);
    const reg = await this.prisma.stationEventRegistration.findFirst({
      where: { qrCode, event: { stationId } },
      include: { event: { select: { id: true, title: true, status: true } } },
    });
    if (!reg) throw new BusinessException(ErrorCode.NOT_FOUND, "无效的签到码");
    if (reg.event.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已取消");
    if (reg.status === "CANCELLED") throw new BusinessException(ErrorCode.BAD_REQUEST, "报名已取消");
    if (reg.status === "SIGNED_IN") throw new BusinessException(ErrorCode.BAD_REQUEST, "已签到");

    return this.prisma.stationEventRegistration.update({
      where: { id: reg.id },
      data: { status: "SIGNED_IN", signedAt: new Date() },
    });
  }

  /** 回顾照片墙：URL 数组 ≤30 张；仅活动结束（FINISHED）或已开场后可传 */
  async updateEventPhotos(userId: string, eventId: string, photos: string[]) {
    const event = await this.assertEventOwner(userId, eventId);
    if (event.status === "CANCELLED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "活动已取消，无法上传回顾照片");
    }
    if (event.status !== "FINISHED" && event.startTime.getTime() > Date.now()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "活动开场后才能上传回顾照片");
    }
    if (photos.length > MAX_EVENT_PHOTOS) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `回顾照片最多 ${MAX_EVENT_PHOTOS} 张`);
    }
    return this.prisma.stationEvent.update({
      where: { id: eventId },
      data: { photos },
    });
  }

  // ───────── B 端：统一经营日历（课程+活动+讲师预约三源聚合） ─────────

  /** 本地日期 key：YYYY-MM-DD */
  private dayKey(d: Date): string {
    const t = new Date(d);
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${t.getFullYear()}-${mm}-${dd}`;
  }

  async getCalendar(userId: string, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month || "")) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "月份格式应为 YYYY-MM");
    }
    const stationId = await this.getMyStationId(userId);
    const [year, m] = month.split("-").map(Number);
    if (m < 1 || m > 12) throw new BusinessException(ErrorCode.BAD_REQUEST, "月份格式应为 YYYY-MM");
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const [courses, events, bookings] = await Promise.all([
      this.prisma.offlineCourse.findMany({
        where: { stationId, startTime: { gte: start, lt: end } },
        select: { id: true, title: true, startTime: true, endTime: true, status: true },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.stationEvent.findMany({
        where: { stationId, startTime: { gte: start, lt: end } },
        select: { id: true, title: true, startTime: true, endTime: true, status: true },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.stationTeacherBooking.findMany({
        where: { stationId, bookingDate: { gte: start, lt: end } },
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { bookingDate: "asc" },
      }),
    ]);

    const items: CalendarItem[] = [
      ...courses.map((c): CalendarItem => ({
        kind: "course", id: c.id, title: c.title, startTime: c.startTime, endTime: c.endTime, status: c.status,
      })),
      ...events.map((e): CalendarItem => ({
        kind: "event", id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, status: e.status,
      })),
      ...bookings.map((b): CalendarItem => ({
        kind: "booking", id: b.id, title: `讲师预约·${b.teacher?.name || "待定"}`,
        startTime: b.bookingDate, endTime: null, status: b.status,
      })),
    ];

    const days: Record<string, CalendarItem[]> = {};
    for (const item of items) {
      const key = this.dayKey(item.startTime);
      (days[key] ||= []).push(item);
    }
    for (const key of Object.keys(days)) {
      days[key].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }
    return { month, days };
  }
}
