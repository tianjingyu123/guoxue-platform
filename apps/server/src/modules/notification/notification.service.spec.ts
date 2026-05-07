import { Test } from "@nestjs/testing";
import { NotificationService } from "./notification.service";
import { PrismaService } from "../../prisma/prisma.service";

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
};

describe("NotificationService", () => {
  let svc: NotificationService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
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
      mockPrisma.notification.update.mockResolvedValue({ id: "n1", isRead: true });
      const result = await svc.markRead("n1");
      expect(result.isRead).toBe(true);
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
