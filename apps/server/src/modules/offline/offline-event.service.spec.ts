import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { OfflineEventService } from "./offline-event.service";
import { OfflineReminderService } from "./offline-reminder.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  stationOffline: {
    findFirst: jest.fn(),
  },
  stationEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  stationEventRegistration: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  offlineCourse: {
    findMany: jest.fn(),
  },
  stationTeacherBooking: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

const mockReminder = {
  notifyEventRegistered: jest.fn(),
  notifyEventCancelled: jest.fn(),
  notifyEventCancelledByStation: jest.fn(),
};

/** 构造 Prisma P2002 唯一约束冲突错误（并发重复报名兜底测试） */
function uniqueError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
  });
}

/** 未来开场的已发布活动样例 */
const futureStart = new Date(Date.now() + 24 * 3600 * 1000);
const futureEnd = new Date(Date.now() + 26 * 3600 * 1000);
const publishedEvent = {
  id: "e1",
  stationId: "s1",
  title: "中秋雅集",
  type: "YAJI",
  price: 0,
  maxAttendees: 20,
  startTime: futureStart,
  endTime: futureEnd,
  location: "听松茶室",
  status: "PUBLISHED",
  photos: null,
  station: { id: "s1", ownerUserId: "owner1" },
};

describe("OfflineEventService", () => {
  let svc: OfflineEventService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OfflineEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OfflineReminderService, useValue: mockReminder },
      ],
    }).compile();
    svc = mod.get(OfflineEventService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // $transaction 默认把 mockPrisma 自身当 tx 传给回调
    mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma));
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.stationOffline.findFirst.mockResolvedValue({ id: "s1" });
    mockReminder.notifyEventRegistered.mockResolvedValue(undefined);
    mockReminder.notifyEventCancelled.mockResolvedValue(undefined);
    mockReminder.notifyEventCancelledByStation.mockResolvedValue(1);
  });

  // ───────── B 端 CRUD 与权限 ─────────

  describe("createEvent 创建活动（驿站主）", () => {
    const dto = {
      title: "中秋雅集", type: "YAJI", maxAttendees: 20,
      startTime: futureStart.toISOString(), endTime: futureEnd.toISOString(), location: "听松茶室",
    };

    it("驿站主创建成功：默认草稿 DRAFT（不显式覆盖 status，走模型默认）", async () => {
      mockPrisma.stationEvent.create.mockResolvedValue({ id: "e1", status: "DRAFT" });
      const result = await svc.createEvent("owner1", dto);
      expect(result.status).toBe("DRAFT");
      const data = mockPrisma.stationEvent.create.mock.calls[0][0].data;
      expect(data.stationId).toBe("s1");
      expect(data.status).toBeUndefined(); // 走 schema 默认 DRAFT
      expect(data.price).toBe(0); // 本期免费报名
    });

    it("非驿站主（无关联驿站）创建被拒", async () => {
      mockPrisma.stationOffline.findFirst.mockResolvedValue(null);
      await expect(svc.createEvent("u-normal", dto)).rejects.toThrow("未找到关联驿站");
      expect(mockPrisma.stationEvent.create).not.toHaveBeenCalled();
    });

    it("结束时间不晚于开始时间被拒", async () => {
      await expect(svc.createEvent("owner1", { ...dto, endTime: dto.startTime }))
        .rejects.toThrow("结束时间必须晚于开始时间");
    });
  });

  describe("updateEvent 编辑活动权限", () => {
    it("非本驿站主编辑他站活动 → FORBIDDEN", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent);
      await expect(svc.updateEvent("intruder", "e1", { title: "篡改" }))
        .rejects.toThrow("无权操作该驿站活动");
      expect(mockPrisma.stationEvent.update).not.toHaveBeenCalled();
    });

    it("本驿站主编辑成功", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
      mockPrisma.stationEvent.update.mockResolvedValue({ id: "e1", title: "新标题" });
      const result = await svc.updateEvent("owner1", "e1", { title: "新标题" });
      expect(result.title).toBe("新标题");
    });

    it("已取消的活动不可编辑", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "CANCELLED" });
      await expect(svc.updateEvent("owner1", "e1", { title: "x" })).rejects.toThrow("活动已取消，不可编辑");
    });
  });

  // ───────── C 端报名：防超卖 / 重复报名 / 取消重报 ─────────

  describe("registerEvent 活动报名", () => {
    beforeEach(() => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent);
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.stationEventRegistration.count.mockResolvedValue(0);
      mockPrisma.stationEventRegistration.create.mockResolvedValue({ id: "r1", eventId: "e1", userId: "u1", status: "REGISTERED" });
    });

    it("报名成功：行锁串行化（FOR UPDATE）+ 报名成功站内通知", async () => {
      const result = await svc.registerEvent("u1", "e1");
      expect(result.id).toBe("r1");
      // 行锁：事务内先 SELECT ... FOR UPDATE 锁活动行
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      const rawSql = (mockPrisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join("?");
      expect(rawSql).toContain('FROM "StationEvent"');
      expect(rawSql).toContain("FOR UPDATE");
      // 通知触点
      expect(mockReminder.notifyEventRegistered).toHaveBeenCalledWith("u1",
        expect.objectContaining({ id: "e1", title: "中秋雅集" }));
    });

    it("防超卖：有效报名数达到 maxAttendees 拒绝", async () => {
      mockPrisma.stationEventRegistration.count.mockResolvedValue(20);
      await expect(svc.registerEvent("u1", "e1")).rejects.toThrow("活动名额已满");
      // 计数只统计未取消（CANCELLED 释放名额）
      expect(mockPrisma.stationEventRegistration.count).toHaveBeenCalledWith({
        where: { eventId: "e1", status: { not: "CANCELLED" } },
      });
      expect(mockPrisma.stationEventRegistration.create).not.toHaveBeenCalled();
    });

    it("重复报名拒绝（锁内查重）", async () => {
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({ id: "r1", status: "REGISTERED" });
      await expect(svc.registerEvent("u1", "e1")).rejects.toThrow("已报名该活动");
      expect(mockPrisma.stationEventRegistration.create).not.toHaveBeenCalled();
    });

    it("并发唯一约束冲突（P2002）兜底转中文业务异常", async () => {
      mockPrisma.stationEventRegistration.create.mockRejectedValue(uniqueError());
      await expect(svc.registerEvent("u1", "e1")).rejects.toThrow("已报名该活动");
    });

    it("取消后可重报：复用原报名行 update 回 REGISTERED 并换新 qrCode", async () => {
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({ id: "r1", status: "CANCELLED" });
      mockPrisma.stationEventRegistration.update.mockResolvedValue({ id: "r1", status: "REGISTERED" });
      const result = await svc.registerEvent("u1", "e1");
      expect(result.status).toBe("REGISTERED");
      expect(mockPrisma.stationEventRegistration.create).not.toHaveBeenCalled();
      const updateArgs = mockPrisma.stationEventRegistration.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: "r1" });
      expect(updateArgs.data.status).toBe("REGISTERED");
      expect(updateArgs.data.qrCode).toMatch(/^QRE_e1_u1_/);
      expect(updateArgs.data.signedAt).toBeNull();
    });

    it("未发布活动（DRAFT）不可报名", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
      await expect(svc.registerEvent("u1", "e1")).rejects.toThrow("活动未发布或已取消，无法报名");
    });

    it("已开场活动不可报名", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({
        ...publishedEvent, startTime: new Date(Date.now() - 3600 * 1000),
      });
      await expect(svc.registerEvent("u1", "e1")).rejects.toThrow("活动已开场，无法报名");
    });
  });

  describe("cancelEventRegistration 取消报名", () => {
    it("开场前取消成功并发确认通知", async () => {
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({
        id: "r1", status: "REGISTERED",
        event: { id: "e1", title: "中秋雅集", startTime: futureStart, location: "听松茶室" },
      });
      mockPrisma.stationEventRegistration.update.mockResolvedValue({ id: "r1", status: "CANCELLED" });
      const result = await svc.cancelEventRegistration("u1", "e1");
      expect(result.status).toBe("CANCELLED");
      expect(mockReminder.notifyEventCancelled).toHaveBeenCalledWith("u1",
        expect.objectContaining({ id: "e1" }));
    });

    it("已签到不可取消", async () => {
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({
        id: "r1", status: "SIGNED_IN",
        event: { id: "e1", title: "中秋雅集", startTime: futureStart, location: "听松茶室" },
      });
      await expect(svc.cancelEventRegistration("u1", "e1")).rejects.toThrow("已签到，无法取消");
    });

    it("活动已开场不可取消", async () => {
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({
        id: "r1", status: "REGISTERED",
        event: { id: "e1", title: "中秋雅集", startTime: new Date(Date.now() - 1000), location: "听松茶室" },
      });
      await expect(svc.cancelEventRegistration("u1", "e1")).rejects.toThrow("活动已开场，无法取消报名");
    });
  });

  // ───────── B 端：核销 / 状态流转 / 照片墙 ─────────

  describe("signInEvent 扫码核销", () => {
    it("核销成功：状态置 SIGNED_IN 并记录签到时间", async () => {
      mockPrisma.stationEventRegistration.findFirst.mockResolvedValue({
        id: "r1", status: "REGISTERED", event: { id: "e1", title: "中秋雅集", status: "PUBLISHED" },
      });
      mockPrisma.stationEventRegistration.update.mockResolvedValue({ id: "r1", status: "SIGNED_IN" });
      const result = await svc.signInEvent("owner1", "QRE_e1_u1_123");
      expect(result.status).toBe("SIGNED_IN");
      // 限定本驿站范围内按 qrCode 查报名（防跨驿站核销）
      expect(mockPrisma.stationEventRegistration.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { qrCode: "QRE_e1_u1_123", event: { stationId: "s1" } } }),
      );
      const data = mockPrisma.stationEventRegistration.update.mock.calls[0][0].data;
      expect(data.status).toBe("SIGNED_IN");
      expect(data.signedAt).toBeInstanceOf(Date);
    });

    it("无效签到码拒绝", async () => {
      mockPrisma.stationEventRegistration.findFirst.mockResolvedValue(null);
      await expect(svc.signInEvent("owner1", "QRE_bad")).rejects.toThrow("无效的签到码");
    });

    it("已签到重复核销拒绝", async () => {
      mockPrisma.stationEventRegistration.findFirst.mockResolvedValue({
        id: "r1", status: "SIGNED_IN", event: { id: "e1", status: "PUBLISHED" },
      });
      await expect(svc.signInEvent("owner1", "QRE_x")).rejects.toThrow("已签到");
    });
  });

  describe("updateEventStatus 状态流转", () => {
    it("cancel：取消活动并群发通知全部 REGISTERED 报名者", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent);
      mockPrisma.stationEvent.update.mockResolvedValue({ ...publishedEvent, status: "CANCELLED" });
      mockPrisma.stationEventRegistration.findMany.mockResolvedValue([
        { userId: "u1" }, { userId: "u2" }, { userId: "u3" },
      ]);
      const result = await svc.updateEventStatus("owner1", "e1", "cancel");
      expect(result.status).toBe("CANCELLED");
      // 只通知 REGISTERED（已取消/已签到不群发）
      expect(mockPrisma.stationEventRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: "e1", status: "REGISTERED" } }),
      );
      expect(mockReminder.notifyEventCancelledByStation).toHaveBeenCalledWith(
        ["u1", "u2", "u3"],
        expect.objectContaining({ id: "e1", title: "中秋雅集" }),
      );
    });

    it("publish：仅草稿可发布", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
      mockPrisma.stationEvent.update.mockResolvedValue({ ...publishedEvent, status: "PUBLISHED" });
      const result = await svc.updateEventStatus("owner1", "e1", "publish");
      expect(result.status).toBe("PUBLISHED");

      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent); // 已是 PUBLISHED
      await expect(svc.updateEventStatus("owner1", "e1", "publish")).rejects.toThrow("仅草稿活动可发布");
    });

    it("finish：仅已发布可结束；非驿站主流转被拒", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
      await expect(svc.updateEventStatus("owner1", "e1", "finish")).rejects.toThrow("仅已发布活动可标记结束");

      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent);
      await expect(svc.updateEventStatus("intruder", "e1", "finish")).rejects.toThrow("无权操作该驿站活动");
    });
  });

  describe("updateEventPhotos 回顾照片墙", () => {
    const photos = ["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p2.jpg"];

    it("FINISHED 活动可传照片墙", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "FINISHED" });
      mockPrisma.stationEvent.update.mockResolvedValue({ id: "e1", photos });
      const result = await svc.updateEventPhotos("owner1", "e1", photos);
      expect(result.photos).toEqual(photos);
      expect(mockPrisma.stationEvent.update).toHaveBeenCalledWith({
        where: { id: "e1" }, data: { photos },
      });
    });

    it("活动未开场不可传照片墙", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent); // startTime 在未来
      await expect(svc.updateEventPhotos("owner1", "e1", photos)).rejects.toThrow("活动开场后才能上传回顾照片");
    });

    it("非驿站主上传被拒（照片墙权限）", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "FINISHED" });
      await expect(svc.updateEventPhotos("intruder", "e1", photos)).rejects.toThrow("无权操作该驿站活动");
    });

    it("超过 30 张被拒", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "FINISHED" });
      const tooMany = Array.from({ length: 31 }, (_, i) => `https://cdn.example.com/p${i}.jpg`);
      await expect(svc.updateEventPhotos("owner1", "e1", tooMany)).rejects.toThrow("回顾照片最多 30 张");
    });
  });

  // ───────── 统一经营日历 ─────────

  describe("getCalendar 统一经营日历（三源聚合）", () => {
    it("聚合课程+活动+讲师预约三源，按日分组且日内按时间排序", async () => {
      mockPrisma.offlineCourse.findMany.mockResolvedValue([
        { id: "c1", title: "易经面授课", startTime: new Date("2026-07-05T14:00:00"), endTime: new Date("2026-07-05T16:00:00"), status: "PUBLISHED" },
      ]);
      mockPrisma.stationEvent.findMany.mockResolvedValue([
        { id: "e1", title: "中秋雅集", startTime: new Date("2026-07-05T09:00:00"), endTime: new Date("2026-07-05T11:00:00"), status: "PUBLISHED" },
        { id: "e2", title: "节气茶会", startTime: new Date("2026-07-20T15:00:00"), endTime: new Date("2026-07-20T17:00:00"), status: "DRAFT" },
      ]);
      mockPrisma.stationTeacherBooking.findMany.mockResolvedValue([
        { id: "b1", bookingDate: new Date("2026-07-05T10:00:00"), status: "CONFIRMED", teacher: { id: "t1", name: "王老师" } },
      ]);

      const result = await svc.getCalendar("owner1", "2026-07");
      expect(result.month).toBe("2026-07");
      // 7月5日三源同日：event(09:00) → booking(10:00) → course(14:00)
      const day5 = result.days["2026-07-05"];
      expect(day5).toHaveLength(3);
      expect(day5.map((i) => i.kind)).toEqual(["event", "booking", "course"]);
      expect(day5[1].title).toBe("讲师预约·王老师");
      expect(day5[1].endTime).toBeNull();
      // 7月20日只有活动（B 端日历含全状态）
      expect(result.days["2026-07-20"]).toHaveLength(1);
      expect(result.days["2026-07-20"][0]).toMatchObject({ kind: "event", id: "e2", status: "DRAFT" });
      // 三源查询均限定本驿站与当月窗口
      const courseWhere = mockPrisma.offlineCourse.findMany.mock.calls[0][0].where;
      expect(courseWhere.stationId).toBe("s1");
      expect(courseWhere.startTime.gte).toEqual(new Date(2026, 6, 1));
      expect(courseWhere.startTime.lt).toEqual(new Date(2026, 7, 1));
      expect(mockPrisma.stationTeacherBooking.findMany.mock.calls[0][0].where.bookingDate.gte).toEqual(new Date(2026, 6, 1));
    });

    it("月份格式非 YYYY-MM 拒绝", async () => {
      await expect(svc.getCalendar("owner1", "2026/07")).rejects.toThrow("月份格式应为 YYYY-MM");
      await expect(svc.getCalendar("owner1", "2026-13")).rejects.toThrow("月份格式应为 YYYY-MM");
    });
  });

  // ───────── C 端列表/详情 ─────────

  describe("listPublicEvents 公开活动列表", () => {
    it("只见 PUBLISHED，未结束优先+临近排序（进行/未开场升序在前，已结束倒序垫底）", async () => {
      mockPrisma.stationEvent.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1); // upcoming=1, past=1
      const upcoming = { id: "e-up", title: "即将开场", startTime: futureStart, status: "PUBLISHED" };
      const past = { id: "e-past", title: "已结束回顾", startTime: new Date(Date.now() - 86400000), status: "PUBLISHED" };
      mockPrisma.stationEvent.findMany
        .mockResolvedValueOnce([upcoming])
        .mockResolvedValueOnce([past]);

      const result = await svc.listPublicEvents({ page: 1, pageSize: 20 });
      expect(result.total).toBe(2);
      expect((result.events as { id: string }[]).map((e) => e.id)).toEqual(["e-up", "e-past"]);

      // 两段查询均硬编码只查 PUBLISHED
      for (const call of mockPrisma.stationEvent.count.mock.calls) {
        expect(call[0].where.status).toBe("PUBLISHED");
      }
      const [upCall, pastCall] = mockPrisma.stationEvent.findMany.mock.calls;
      expect(upCall[0].where.status).toBe("PUBLISHED");
      expect(upCall[0].where.endTime.gte).toBeInstanceOf(Date);
      expect(upCall[0].orderBy).toEqual({ startTime: "asc" });
      expect(pastCall[0].where.endTime.lt).toBeInstanceOf(Date);
      expect(pastCall[0].orderBy).toEqual({ startTime: "desc" });
      // 带报名数（仅有效报名）与驿站简要
      expect(upCall[0].include._count.select.registrations.where).toEqual({ status: { not: "CANCELLED" } });
      expect(upCall[0].include.station.select.name).toBe(true);
    });

    it("支持 stationId/type 过滤", async () => {
      mockPrisma.stationEvent.count.mockResolvedValue(0);
      await svc.listPublicEvents({ stationId: "s1", type: "READING" });
      const where = mockPrisma.stationEvent.count.mock.calls[0][0].where;
      expect(where).toMatchObject({ status: "PUBLISHED", stationId: "s1", type: "READING" });
    });
  });

  describe("getEvent 活动详情", () => {
    it("草稿活动对外不可见（404）", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
      await expect(svc.getEvent("e1")).rejects.toThrow(BusinessException);
      await expect(svc.getEvent("e1")).rejects.toThrow("活动不存在");
    });

    it("登录用户附带 myRegistration 报名状态；未登录不查", async () => {
      mockPrisma.stationEvent.findUnique.mockResolvedValue(publishedEvent);
      mockPrisma.stationEventRegistration.findUnique.mockResolvedValue({
        id: "r1", status: "REGISTERED", qrCode: "QRE_x", signedAt: null,
      });
      const withUser = await svc.getEvent("e1", "u1");
      expect(withUser.myRegistration).toMatchObject({ id: "r1", status: "REGISTERED" });

      mockPrisma.stationEventRegistration.findUnique.mockClear();
      const anonymous = await svc.getEvent("e1");
      expect(anonymous.myRegistration).toBeNull();
      expect(mockPrisma.stationEventRegistration.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("listMyEventRegistrations 我的活动", () => {
    it("返回带活动与驿站信息的报名列表", async () => {
      mockPrisma.stationEventRegistration.findMany.mockResolvedValue([
        { id: "r1", status: "REGISTERED", event: { id: "e1", title: "中秋雅集", station: { id: "s1", name: "听松驿站" } } },
      ]);
      mockPrisma.stationEventRegistration.count.mockResolvedValue(1);
      const result = await svc.listMyEventRegistrations("u1");
      expect(result.total).toBe(1);
      expect(result.registrations[0].event.station.name).toBe("听松驿站");
      const args = mockPrisma.stationEventRegistration.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ userId: "u1" });
      expect(args.orderBy).toEqual({ createdAt: "desc" });
    });
  });

  describe("listDashboardEvents B 端活动列表", () => {
    it("本驿站全状态列表，可按 status 过滤", async () => {
      mockPrisma.stationEvent.findMany.mockResolvedValue([{ id: "e1", status: "DRAFT" }]);
      mockPrisma.stationEvent.count.mockResolvedValue(1);
      const result = await svc.listDashboardEvents("owner1", { status: "DRAFT" });
      expect(result.total).toBe(1);
      expect(mockPrisma.stationEvent.findMany.mock.calls[0][0].where).toEqual({ stationId: "s1", status: "DRAFT" });
    });
  });
});
