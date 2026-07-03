import { Test } from "@nestjs/testing";
import { OfflineReminderService } from "./offline-reminder.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

const mockPrisma = {
  offlineCourseRegistration: {
    findMany: jest.fn(),
  },
  stationEventRegistration: {
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

const event = {
  id: "se1",
  title: "中秋雅集",
  startTime: new Date("2026-07-12T15:00:00"),
  location: "听松茶室",
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
    mockPrisma.stationEventRegistration.findMany.mockResolvedValue([]);
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

    it("提醒扫描含活动：StationEventRegistration 同窗口扫描·防重前缀 offline:event-reminder:·仅已发布活动", async () => {
      mockPrisma.stationEventRegistration.findMany
        .mockResolvedValueOnce([{ id: "ereg24", userId: "u1", event }]) // 24h 档
        .mockResolvedValueOnce([{ id: "ereg2", userId: "u2", event }]); // 2h 档

      const sent = await svc.scanAndRemind();
      expect(sent).toBe(2);

      // 两档窗口各查一次，仅 REGISTERED 报名 + 仅 PUBLISHED 活动
      expect(mockPrisma.stationEventRegistration.findMany).toHaveBeenCalledTimes(2);
      const [call24, call2] = mockPrisma.stationEventRegistration.findMany.mock.calls;
      expect(call24[0].where.status).toBe("REGISTERED");
      expect(call24[0].where.event.status).toBe("PUBLISHED");
      const w24 = call24[0].where.event.startTime;
      const w2 = call2[0].where.event.startTime;
      expect(w24.lt.getTime() - w24.gte.getTime()).toBe(10 * 60 * 1000);
      expect(w24.gte.getTime() - w2.gte.getTime()).toBe(22 * 3600 * 1000);

      // 防重 key 契约 offline:event-reminder:{registrationId}:{h24|h2}，TTL 48h（与课程前缀隔离）
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:event-reminder:ereg24:h24", "1", 48 * 3600);
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:event-reminder:ereg2:h2", "1", 48 * 3600);

      // 文案两档（明天 / 2小时后开场）
      const contents = mockNotification.send.mock.calls.map((c) => c[1].content as string);
      expect(contents.some((c) => c.includes("「中秋雅集」明天开场"))).toBe(true);
      expect(contents.some((c) => c.includes("「中秋雅集」2小时后开场"))).toBe(true);
      const payloads = mockNotification.send.mock.calls.map((c) => c[1]);
      expect(payloads.every((p) => p.type === "STATION_EVENT" && p.targetId === "se1")).toBe(true);
    });

    it("课程+活动同轮混扫：共享预算逐条发送互不干扰", async () => {
      mockPrisma.offlineCourseRegistration.findMany
        .mockResolvedValueOnce([{ id: "reg24", userId: "u1", course }])
        .mockResolvedValueOnce([]);
      mockPrisma.stationEventRegistration.findMany
        .mockResolvedValueOnce([{ id: "ereg24", userId: "u2", event }])
        .mockResolvedValueOnce([]);

      const sent = await svc.scanAndRemind();
      expect(sent).toBe(2);
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:reminder:reg24:h24", "1", 48 * 3600);
      expect(mockRedis.setNX).toHaveBeenCalledWith("offline:event-reminder:ereg24:h24", "1", 48 * 3600);
    });
  });

  describe("活动即时通知（T8 OMO P1a）", () => {
    it("活动报名成功/取消报名通知：含活动名/时间/地点", async () => {
      await svc.notifyEventRegistered("u1", event);
      expect(mockNotification.send).toHaveBeenCalledWith("u1",
        expect.objectContaining({
          type: "STATION_EVENT",
          title: "活动报名成功",
          content: expect.stringContaining("「中秋雅集」"),
          targetType: "STATION_EVENT",
          targetId: "se1",
        }),
      );
      expect(mockNotification.send.mock.calls[0][1].content).toContain("@听松茶室");

      await svc.notifyEventCancelled("u1", event);
      expect(mockNotification.send).toHaveBeenLastCalledWith("u1",
        expect.objectContaining({ title: "取消报名成功", content: expect.stringContaining("已取消报名") }),
      );
    });

    it("取消活动群发：逐个 REGISTERED 报名者发送，单条失败不阻断其余", async () => {
      mockNotification.send
        .mockRejectedValueOnce(new Error("push 通道故障"))
        .mockResolvedValue({ id: "n2" });
      const sent = await svc.notifyEventCancelledByStation(["u1", "u2", "u3"], event);
      expect(sent).toBe(2); // u1 失败被吞，u2/u3 照发
      expect(mockNotification.send).toHaveBeenCalledTimes(3);
      const payload = mockNotification.send.mock.calls[1][1];
      expect(payload.title).toBe("活动已取消");
      expect(payload.content).toContain("已被主办方取消");
    });

    it("活动通知服务抛错时吞掉不上抛（不影响主流程）", async () => {
      mockNotification.send.mockRejectedValue(new Error("通知服务不可用"));
      await expect(svc.notifyEventRegistered("u1", event)).resolves.toBeUndefined();
      await expect(svc.notifyEventCancelled("u1", event)).resolves.toBeUndefined();
    });
  });
});
