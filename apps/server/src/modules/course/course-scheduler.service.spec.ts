import { Test } from "@nestjs/testing";
import { CourseSchedulerService } from "./course-scheduler.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

const mockPrisma = {
  course: { updateMany: jest.fn(), findMany: jest.fn() },
  order: { findMany: jest.fn() },
};

const mockNotification = { batchSend: jest.fn() };

const mockRedis = {
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

describe("CourseSchedulerService", () => {
  let svc: CourseSchedulerService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CourseSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(CourseSchedulerService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotification.batchSend.mockReset().mockImplementation(async (dto) => ({
      success: true, count: dto.userIds.length, pushSkipped: 0,
    }));
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("publishScheduledCourses", () => {
    it("定时发布到期的草稿课程", async () => {
      mockPrisma.course.updateMany.mockResolvedValue({ count: 3 });
      await svc.publishScheduledCourses();
      expect(mockPrisma.course.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ auditStatus: "DRAFT" }),
        data: expect.objectContaining({ auditStatus: "PENDING" }),
      }));
    });

    it("无到期课程时不报错", async () => {
      mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.publishScheduledCourses()).resolves.not.toThrow();
    });

    it("数据库错误时捕获不抛出", async () => {
      mockPrisma.course.updateMany.mockRejectedValue(new Error("DB down"));
      await expect(svc.publishScheduledCourses()).resolves.not.toThrow();
    });
  });

  describe("checkExpiringCourses", () => {
    it("无通知服务时直接跳过", async () => {
      // 创建一个没有 notification 的实例
      const mod = await Test.createTestingModule({
        providers: [
          CourseSchedulerService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
          // 不提供 NotificationService
        ],
      }).compile();
      const svcNoNotify = mod.get(CourseSchedulerService);
      await svcNoNotify.checkExpiringCourses();
      expect(mockPrisma.course.findMany).not.toHaveBeenCalled();
    });

    it("无有效期课程时跳过", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      await svc.checkExpiringCourses();
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });

    it("课程3天内到期发送提醒", async () => {
      // 订单2天前购买，课程有效期3天 → 还剩1天到期，应在提醒范围内
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "国学入门", validityDays: 3 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt: twoDaysAgo },
      ]);
      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend).toHaveBeenCalledWith(expect.objectContaining({
        title: "课程即将到期",
      }), `COURSE_EXPIRING:c1:${new Date().toISOString().slice(0, 10)}`);
    });

    it("续购后不被旧单误报，乱序订单仍按最新有效付款计算", async () => {
      mockPrisma.course.findMany.mockResolvedValue([{ id: "c1", title: "课程", validityDays: 30 }]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt: new Date() },
        { targetId: "c1", userId: "u1", paidAt: new Date(Date.now() - 28 * 86400000) },
      ]);
      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend).not.toHaveBeenCalled();
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["PAID", "COMPLETED"] }, paidAt: { not: null } }),
      }));
    });

    it("同一用户多笔临近到期单一次只提醒一次，课程之间互不串用", async () => {
      const paidAt = new Date(Date.now() - 28 * 86400000);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "课程一", validityDays: 30 },
        { id: "c2", title: "课程二", validityDays: 30 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt },
        { targetId: "c1", userId: "u1", paidAt },
        { targetId: "c2", userId: "u1", paidAt: new Date() },
        { targetId: "c1", userId: "u2", paidAt },
      ]);
      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend).toHaveBeenCalledTimes(1);
      expect(mockNotification.batchSend).toHaveBeenCalledWith(expect.objectContaining({
        userIds: ["u1", "u2"], targetId: "c1",
      }), expect.stringMatching(/^COURSE_EXPIRING:c1:\d{4}-\d{2}-\d{2}$/));
    });

    it("同一天两次任务使用同一个持久事件键，次日允许继续提醒", async () => {
      const clock = jest.spyOn(Date, "now");
      try {
        const start = Date.parse("2026-10-01T09:00:00.000Z");
        clock.mockReturnValue(start);
        mockPrisma.course.findMany.mockResolvedValue([{ id: "c1", title: "课程", validityDays: 30 }]);
        mockPrisma.order.findMany.mockResolvedValue([
          { targetId: "c1", userId: "u1", paidAt: new Date(start - 28 * 86400000) },
        ]);
        await svc.checkExpiringCourses();
        clock.mockReturnValue(start + 60000);
        await svc.checkExpiringCourses();
        clock.mockReturnValue(start + 86400000);
        await svc.checkExpiringCourses();
        expect(mockNotification.batchSend.mock.calls.map((call) => call[1])).toEqual([
          "COURSE_EXPIRING:c1:2026-10-01", "COURSE_EXPIRING:c1:2026-10-01", "COURSE_EXPIRING:c1:2026-10-02",
        ]);
      } finally {
        clock.mockRestore();
      }
    });

    it("一门课程通知落库失败不阻断其他课程，并允许同日重试", async () => {
      const paidAt = new Date(Date.now() - 28 * 86400000);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "课程一", validityDays: 30 },
        { id: "c2", title: "课程二", validityDays: 30 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt },
        { targetId: "c2", userId: "u2", paidAt },
      ]);
      mockNotification.batchSend.mockRejectedValueOnce(new Error("temporary notification DB failure"));
      await expect(svc.checkExpiringCourses()).resolves.not.toThrow();
      expect(mockNotification.batchSend.mock.calls.map((call) => call[0].targetId)).toEqual(["c1", "c2"]);
      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend.mock.calls.map((call) => call[0].targetId)).toEqual(["c1", "c2", "c1", "c2"]);
      expect(mockNotification.batchSend.mock.calls[0][1]).toBe(mockNotification.batchSend.mock.calls[2][1]);
    });

    it("日志仅统计本次实际新增通知，防重命中不记成重新发送", async () => {
      const paidAt = new Date(Date.now() - 28 * 86400000);
      mockPrisma.course.findMany.mockResolvedValue([{ id: "c1", title: "课程", validityDays: 30 }]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt },
        { targetId: "c1", userId: "u2", paidAt },
      ]);
      mockNotification.batchSend.mockResolvedValueOnce({ success: true, count: 1, pushSkipped: 0 });
      const log = jest.spyOn((svc as any).logger, "log");
      try {
        await svc.checkExpiringCourses();
        expect(log).toHaveBeenCalledWith("到期提醒: 新增 1 条课程到期站内通知");
        log.mockClear();
        mockNotification.batchSend.mockResolvedValueOnce({ success: true, count: 0, pushSkipped: 0 });
        await svc.checkExpiringCourses();
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    });

    it("未到期的课程不发送提醒", async () => {
      // 刚刚购买，有效期365天 → 还剩365天，不在3天提醒范围内
      const justNow = new Date();
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "课程", validityDays: 365 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt: justNow },
      ]);

      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend).not.toHaveBeenCalled();
    });

    it("恰好三天进入提醒，已到期和超过三天的用户不提醒", async () => {
      const now = Date.parse("2026-10-01T09:00:00.000Z");
      const clock = jest.spyOn(Date, "now").mockReturnValue(now);
      try {
        mockPrisma.course.findMany.mockResolvedValue([{ id: "c1", title: "课程", validityDays: 30 }]);
        mockPrisma.order.findMany.mockResolvedValue([
          { targetId: "c1", userId: "boundary", paidAt: new Date(now - 27 * 86400000) },
          { targetId: "c1", userId: "expired", paidAt: new Date(now - 30 * 86400000) },
          { targetId: "c1", userId: "far", paidAt: new Date(now - 27 * 86400000 + 1) },
        ]);
        await svc.checkExpiringCourses();
        expect(mockNotification.batchSend).toHaveBeenCalledWith(expect.objectContaining({
          userIds: ["boundary"], targetType: "COURSE", targetId: "c1",
        }), "COURSE_EXPIRING:c1:2026-10-01");
      } finally {
        clock.mockRestore();
      }
    });
  });

  describe("handleExpiredCourses", () => {
    it("无有效期课程时跳过", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      await svc.handleExpiredCourses();
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });

    it("巡检过期学习记录（仅统计+日志）", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", validityDays: 1 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { targetId: "c1", userId: "u1", paidAt: twoDaysAgo },
      ]);

      await svc.handleExpiredCourses();
      // 不应抛错，只做统计
    });
  });
});
