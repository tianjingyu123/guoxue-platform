import { Test } from "@nestjs/testing";
import { CheckinService } from "./checkin.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PointsService } from "../user/points.service";
import { BusinessException } from "../../common/business.exception";

const mockTx = {
  checkIn: {
    create: jest.fn(),
  },
  dailyTask: {
    upsert: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn((arg: any) => (typeof arg === "function" ? arg(mockTx) : arg)),
  checkIn: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { rewardPoints: 0 } }),
  },
  dailyTask: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockPoints = {
  earnPoints: jest.fn().mockResolvedValue({ balance: 5 }),
};

describe("CheckinService", () => {
  let svc: CheckinService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CheckinService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PointsService, useValue: mockPoints },
      ],
    }).compile();
    svc = mod.get(CheckinService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("checkIn", () => {
    it("首次签到成功，连续1天，5积分", async () => {
      mockPrisma.checkIn.findUnique
        .mockResolvedValueOnce(null) // 今天未签到
        .mockResolvedValueOnce(null); // 昨天也没签到

      const result = await svc.checkIn("u1");
      expect(result.consecutiveDays).toBe(1);
      expect(result.rewardPoints).toBe(5);
      // 事务内创建签到记录
      expect(mockTx.checkIn.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "u1", consecutiveDays: 1, rewardPoints: 5 }),
      });
      // 积分入账
      expect(mockPoints.earnPoints).toHaveBeenCalledWith("u1", 5, "CHECKIN", expect.any(String));
    });

    it("连续签到3天，奖励额外3积分", async () => {
      mockPrisma.checkIn.findUnique
        .mockResolvedValueOnce(null) // 今天未签到
        .mockResolvedValueOnce({ consecutiveDays: 2 }); // 昨天已签到2天

      await svc.checkIn("u1");
      // consecutiveDays = 3, rewardPoints = 5 + floor((3-1)/3)*3 = 5 + 0*3 = 5
      expect(mockTx.checkIn.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ consecutiveDays: 3, rewardPoints: 5 }),
      });
      expect(mockPoints.earnPoints).toHaveBeenCalledWith("u1", 5, "CHECKIN", expect.any(String));
    });

    it("连续签到4天，奖励8积分", async () => {
      mockPrisma.checkIn.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ consecutiveDays: 3 });

      await svc.checkIn("u1");
      // consecutiveDays = 4, rewardPoints = 5 + floor((4-1)/3)*3 = 5 + 1*3 = 8
      expect(mockTx.checkIn.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ consecutiveDays: 4, rewardPoints: 8 }),
      });
      expect(mockPoints.earnPoints).toHaveBeenCalledWith("u1", 8, "CHECKIN", expect.any(String));
    });

    it("重复签到抛出异常", async () => {
      mockPrisma.checkIn.findUnique.mockResolvedValueOnce({ id: "existing" });

      await expect(svc.checkIn("u1")).rejects.toThrow(BusinessException);
      expect(mockTx.checkIn.create).not.toHaveBeenCalled();
      expect(mockPoints.earnPoints).not.toHaveBeenCalled();
    });

    it("签到同步更新每日任务", async () => {
      mockPrisma.checkIn.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await svc.checkIn("u1");
      // 事务内同步更新每日任务
      expect(mockTx.dailyTask.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ taskType: "checkin", completed: true }),
        }),
      );
      // 积分入账
      expect(mockPoints.earnPoints).toHaveBeenCalledWith("u1", 5, "CHECKIN", expect.any(String));
    });
  });

  describe("getStatus", () => {
    it("已签到返回状态", async () => {
      mockPrisma.checkIn.findUnique.mockResolvedValue({ consecutiveDays: 5, rewardPoints: 8 });
      mockPrisma.checkIn.aggregate.mockResolvedValue({ _sum: { rewardPoints: 100 } });

      const result = await svc.getStatus("u1");
      expect(result.todayChecked).toBe(true);
      expect(result.continuousDays).toBe(5);
      expect(result.totalPoints).toBe(100);
    });

    it("未签到返回默认值", async () => {
      mockPrisma.checkIn.findUnique.mockResolvedValue(null);
      mockPrisma.checkIn.aggregate.mockResolvedValue({ _sum: { rewardPoints: null } });

      const result = await svc.getStatus("u1");
      expect(result.todayChecked).toBe(false);
      expect(result.continuousDays).toBe(0);
    });
  });

  describe("getCalendar", () => {
    it("返回月度签到日历", async () => {
      const records = [
        { checkInDate: new Date("2026-05-01"), rewardPoints: 5 },
        { checkInDate: new Date("2026-05-02"), rewardPoints: 5 },
        { checkInDate: new Date("2026-05-03"), rewardPoints: 5 },
      ];
      mockPrisma.checkIn.findMany.mockResolvedValue(records);

      const result = await svc.getCalendar("u1", { year: 2026, month: 5 });
      expect(result.year).toBe(2026);
      expect(result.month).toBe(5);
      expect(result.totalDays).toBe(3);
      expect(result.days).toHaveLength(3);
      expect(result.days[0].date).toBe("2026-05-01");
    });
  });

  describe("getDailyTasks", () => {
    it("返回已有的每日任务", async () => {
      const tasks = [
        { id: "t1", taskType: "checkin", title: "每日签到", completed: true },
        { id: "t2", taskType: "read", title: "阅读一篇内容", completed: false },
      ];
      mockPrisma.dailyTask.findMany.mockResolvedValue(tasks);

      const result = await svc.getDailyTasks("u1");
      expect(result.tasks).toEqual(tasks);
    });

    it("无任务时自动初始化5个模板", async () => {
      mockPrisma.dailyTask.findMany.mockResolvedValue([]);
      mockPrisma.dailyTask.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const result = await svc.getDailyTasks("u1");
      expect(mockPrisma.dailyTask.upsert).toHaveBeenCalledTimes(5);
      expect(result.tasks).toHaveLength(5);
    });
  });

  describe("completeTask", () => {
    it("完成任务返回奖励", async () => {
      mockPrisma.dailyTask.findFirst.mockResolvedValue({ id: "t1", userId: "u1", doneCount: 0, completed: false });
      mockPrisma.dailyTask.update.mockResolvedValue({ id: "t1", completed: true, rewardPoints: 3 });

      const result = await svc.completeTask("u1", "t1");
      expect(result.completed).toBe(true);
      expect(result.rewardPoints).toBe(3);
    });

    it("任务不存在抛出异常", async () => {
      mockPrisma.dailyTask.findFirst.mockResolvedValue(null);
      await expect(svc.completeTask("u1", "nonexist")).rejects.toThrow(BusinessException);
    });

    it("已完成任务重复提交抛出异常", async () => {
      mockPrisma.dailyTask.findFirst.mockResolvedValue({ id: "t1", userId: "u1", doneCount: 1, completed: true });
      await expect(svc.completeTask("u1", "t1")).rejects.toThrow(BusinessException);
    });
  });
});
