import { Test } from "@nestjs/testing";
import { NotificationService } from "./notification.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PushService } from "./push.service";
import { PushAudienceService } from "../user/push-audience.service";

const mockPush = {
  send: jest.fn().mockResolvedValue(null),
  sendMiniSubscribeMsg: jest.fn().mockResolvedValue({}),
  sendMpTemplateMsg: jest.fn().mockResolvedValue({}),
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(null),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(null),
};

const mockPrisma = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  auth: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
};

describe("NotificationService", () => {
  let svc: NotificationService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        NotificationService,
        PushAudienceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();
    svc = mod.get(NotificationService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("send", () => {
    it("发送单条通知成功", async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: "n1", userId: "u1", type: "SYSTEM", title: "通知", content: "内容",
      });
      const result = await svc.send("u1", { type: "SYSTEM", title: "通知", content: "内容" });
      expect(result.id).toBe("n1");
    });

    it("发送带 target 的通知", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1", targetType: "ORDER", targetId: "order-1" });
      const result = await svc.send("u1", {
        type: "SYSTEM", title: "通知", content: "内容", targetType: "ORDER", targetId: "order-1",
      });
      expect(result.targetType).toBe("ORDER");
    });
  });

  describe("batchSend", () => {
    it("批量发送通知成功", async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });
      const result = await svc.batchSend({
        userIds: ["u1", "u2", "u3"], type: "SYSTEM", title: "群发", content: "测试",
      });
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
    });

    it("批量发送空数组返回 0", async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 0 });
      const result = await svc.batchSend({
        userIds: [], type: "SYSTEM", title: "群发", content: "测试",
      });
      expect(result.count).toBe(0);
    });
  });

  describe("getUserNotifications", () => {
    it("获取用户通知列表", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: "n1", type: "SYSTEM" }]);
      mockPrisma.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const result = await svc.getUserNotifications("u1");
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(0);
    });

    it("支持分页", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      await svc.getUserNotifications("u1", 2, 10);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("page 传 'abc' 时 findMany skip 不为 NaN", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);
      await svc.getUserNotifications("u1", "abc" as unknown as number, 20);
      const call = mockPrisma.notification.findMany.mock.calls[0];
      const arg = call[0] as { skip: number };
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  describe("getUnreadCount", () => {
    it("获取未读数成功", async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await svc.getUnreadCount("u1");
      expect(result.unreadCount).toBe(5);
    });

    it("无未读通知返回 0", async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      const result = await svc.getUnreadCount("u1");
      expect(result.unreadCount).toBe(0);
    });
  });

  describe("markRead", () => {
    it("标记单条已读成功", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ userId: "u1" });
      mockPrisma.notification.update.mockResolvedValue({ id: "n1", isRead: true });
      const result = await svc.markRead("n1", "u1");
      expect(result.isRead).toBe(true);
    });
  });

  // ───────── 圈内通知中心（V0 待办 #36·复用本表·category/circleId 经原生 SQL） ─────────

  describe("圈内通知：send 分类落库", () => {
    it("send 带 category 时原生 SQL 补写 category+circleId", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      await svc.send("u1", { type: "POST_COMMENT", title: "帖子有新回复", content: "x", category: "INTERACT", circleId: "c1" });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`SET "category"=$1, "circleId"=$2`),
        "INTERACT", "c1", "n1",
      );
    });

    it("send 不带 category 不触发分类落库", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      await svc.send("u1", { type: "SYSTEM", title: "t", content: "c" });
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it("分类落库失败不阻断主流程（仍返回通知）", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("column not exists"));
      const result = await svc.send("u1", { type: "LIVE_STARTED", title: "t", content: "c", category: "LIVE" });
      expect(result.id).toBe("n1");
    });

    it("batchSend 带 category 按用户集合+type+target 窗口补打标", async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
      await svc.batchSend({ userIds: ["u1", "u2"], type: "LIVE_STARTED", title: "t", content: "c", targetId: "r1", category: "LIVE", circleId: "c1" });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`"category" IS NULL`),
        "LIVE", "c1", ["u1", "u2"], "LIVE_STARTED", "r1",
      );
    });
  });

  describe("圈内通知：getCircleNotifications", () => {
    it("全部分类：只取 category 非空并返回四类未读分组", async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: "n1", category: "GOVERN", isRead: false }]) // 列表
        .mockResolvedValueOnce([{ cnt: 1 }]) // total
        .mockResolvedValueOnce([{ category: "GOVERN", cnt: 2 }, { category: "LIVE", cnt: 1 }]); // 未读分组
      const result = await svc.getCircleNotifications("u1");
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unread).toEqual({ ALL: 3, INTERACT: 0, TRADE: 0, GOVERN: 2, LIVE: 1 });
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0][0]).toContain(`"category" IS NOT NULL`);
    });

    it("按分类筛选：SQL 带 category 条件且传入分类参数", async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([]);
      await svc.getCircleNotifications("u1", "TRADE", 1, 20);
      const [sql, ...params] = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(sql).toContain(`AND "category"=$2`);
      expect(params).toEqual(["u1", "TRADE", 20, 0]);
    });

    it("非法分类抛业务异常", async () => {
      await expect(svc.getCircleNotifications("u1", "FOO")).rejects.toThrow("INTERACT/TRADE/GOVERN/LIVE");
    });
  });

  describe("圈内通知：markCircleAllRead", () => {
    it("全量已读：只更新 category 非空的未读", async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(3);
      const result = await svc.markCircleAllRead("u1");
      expect(result).toEqual({ success: true, count: 3 });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`"category" IS NOT NULL`),
        "u1",
      );
    });

    it("按分类已读：SQL 附加分类条件", async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(1);
      await svc.markCircleAllRead("u1", "LIVE");
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(`AND "category"=$2`),
        "u1", "LIVE",
      );
    });

    it("非法分类抛业务异常", async () => {
      await expect(svc.markCircleAllRead("u1", "BAD")).rejects.toThrow("INTERACT/TRADE/GOVERN/LIVE");
    });
  });

  describe("markAllRead", () => {
    it("全部标记已读成功", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const result = await svc.markAllRead("u1");
      expect(result.success).toBe(true);
    });

    it("无未读通知时也成功", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
      const result = await svc.markAllRead("u1");
      expect(result.success).toBe(true);
    });
  });
});
