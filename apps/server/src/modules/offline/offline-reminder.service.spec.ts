import { Test } from "@nestjs/testing";
import { OfflineReminderService } from "./offline-reminder.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

const mockPrisma = {
  offlineCourseRegistration: {
    findMany: jest.fn(),
  },
};

const mockRedis = {
  setNX: jest.fn(),
};

const mockNotification = {
  send: jest.fn(),
};

const course = {
  id: "oc1",
  title: "易经面授课",
  startTime: new Date("2026-07-10T09:00:00"),
  location: "北京国学馆",
};

describe("OfflineReminderService", () => {
  let svc: OfflineReminderService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        OfflineReminderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();
    svc = mod.get(OfflineReminderService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.offlineCourseRegistration.findMany.mockResolvedValue([]);
    mockRedis.setNX.mockResolvedValue(true);
    mockNotification.send.mockResolvedValue({ id: "n1" });
  });

  describe("notifyRegistered / notifyCancelled 即时通知", () => {
    it("报名成功通知：含课程名/时间/地点与提醒预告", async () => {
      await svc.notifyRegistered("u1", course);
      expect(mockNotification.send).toHaveBeenCalledWith("u1",
        expect.objectContaining({
          type: "OFFLINE_COURSE",
          title: "报名成功",
          content: expect.stringContaining("《易经面授课》"),
          targetType: "OFFLINE_COURSE",
          targetId: "oc1",
        }),
      );
      const { content } = mockNotification.send.mock.calls[0][1];
      expect(content).toContain("7月10日 9时");
      expect(content).toContain("@北京国学馆");
      expect(content).toContain("开课前我们会提醒你");
    });

    it("通知服务抛错时吞掉不上抛（不影响报名主流程）", async () => {
      mockNotification.send.mockRejectedValue(new Error("通知服务不可用"));
      await expect(svc.notifyRegistered("u1", course)).resolves.toBeUndefined();
      await expect(svc.notifyCancelled("u1", course)).resolves.toBeUndefined();
    });

    it("取消报名确认通知", async () => {
      await svc.notifyCancelled("u1", course);
      expect(mockNotification.send).toHaveBeenCalledWith("u1",
        expect.objectContaining({ title: "取消报名成功", content: expect.stringContaining("已取消报名") }),
      );
    });
  });

  describe("scanAndRemind 开课提醒扫描", () => {
    it("扫描命中：REGISTERED 报名逐条发送两档提醒（24h=明天 / 2h=2小时后）", async () => {
      mockPrisma.offlineCourseRegistration.findMany
        .mockResolvedValueOnce([{ id: "reg24", userId: "u1", course }]) // 24h 档
        .mockResolvedValueOnce([{ id: "reg2", userId: "u2", course }]); // 2h 档

      const sent = await svc.scanAndRemind();
      expect(sent).toBe(2);

      // 两档窗口各查一次，均限定 REGISTERED，窗口宽 10 分钟
      expect(mockPrisma.offlineCourseRegistration.findMany).toHaveBeenCalledTimes(2);
      const [call24, call2] = mockPrisma.offlineCourseRegistration.findMany.mock.calls;
      expect(call24[0].where.status).toBe("REGISTERED");
      const w24 = call24[0].where.course.startTime;
      const w2 = call2[0].where.course.startTime;
      expect(w24.lt.getTime() - w24.gte.getTime()).toBe(10 * 60 * 1000);
      expect(w2.lt.getTime() - w2.gte.getTime()).toBe(10 * 60 * 1000);
      // 24h 档与 2h 档窗口起点相差 22 小时
      expect(w24.gte.getTime() - w2.gte.getTime()).toBe(22 * 3600 * 1000);

      // 防重 key 契约 offline:reminder:{registrationId}:{h24|h2}，TTL 48h
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:reminder:reg24:h24", "1", 48 * 3600);
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:reminder:reg2:h2", "1", 48 * 3600);

      // 文案两档
      const contents = mockNotification.send.mock.calls.map((c) => c[1].content as string);
      expect(contents.some((c) => c.includes("明天开课"))).toBe(true);
      expect(contents.some((c) => c.includes("2小时后开课"))).toBe(true);
    });

    it("防重跳过：setNX 返回 false（已提醒过）不发送", async () => {
      mockPrisma.offlineCourseRegistration.findMany
        .mockResolvedValueOnce([{ id: "reg24", userId: "u1", course }])
        .mockResolvedValueOnce([]);
      mockRedis.setNX.mockResolvedValue(false);

      const sent = await svc.scanAndRemind();
      expect(sent).toBe(0);
      expect(mockNotification.send).not.toHaveBeenCalled();
    });

    it("单轮上限 500 条防雪崩：首档查询 take=500", async () => {
      await svc.scanAndRemind();
      expect(mockPrisma.offlineCourseRegistration.findMany.mock.calls[0][0].take).toBe(500);
    });

    it("单条发送失败不阻断其余条目", async () => {
      mockPrisma.offlineCourseRegistration.findMany
        .mockResolvedValueOnce([
          { id: "regA", userId: "u1", course },
          { id: "regB", userId: "u2", course },
        ])
        .mockResolvedValueOnce([]);
      mockNotification.send
        .mockRejectedValueOnce(new Error("push 通道故障"))
        .mockResolvedValueOnce({ id: "n2" });

      const sent = await svc.scanAndRemind();
      expect(sent).toBe(1); // regA 失败被吞，regB 照发
      expect(mockNotification.send).toHaveBeenCalledTimes(2);
    });

    it("扫描查询失败仅记录日志不上抛（cron 安全）", async () => {
      mockPrisma.offlineCourseRegistration.findMany.mockRejectedValue(new Error("db down"));
      await expect(svc.scanAndRemind()).resolves.toBe(0);
    });
  });
});
