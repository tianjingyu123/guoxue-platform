import { Test } from "@nestjs/testing";
import { CourseSchedulerService } from "./course-scheduler.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";

const mockPrisma = {
  course: { updateMany: jest.fn(), findMany: jest.fn() },
  order: { findMany: jest.fn() },
};

const mockNotification = { batchSend: jest.fn() };

describe("CourseSchedulerService", () => {
  let svc: CourseSchedulerService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CourseSchedulerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(CourseSchedulerService);
  });

  beforeEach(() => jest.clearAllMocks());

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
      mockNotification.batchSend.mockResolvedValue(undefined);

      await svc.checkExpiringCourses();
      expect(mockNotification.batchSend).toHaveBeenCalledWith(expect.objectContaining({
        title: "课程即将到期",
      }));
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
