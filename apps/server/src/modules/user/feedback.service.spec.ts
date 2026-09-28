import { FeedbackService } from "./feedback.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";

describe("反馈结案与用户回复", () => {
  const prisma = {
    feedback: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const notifications = { sendOnce: jest.fn() };
  const service = new FeedbackService(prisma as unknown as PrismaService, notifications as unknown as NotificationService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("只向反馈本人返回明确标记的结案回复，历史内部备注和处理中备注不泄露", async () => {
    prisma.feedback.findMany.mockResolvedValue([
      { id: "new", status: "resolved", result: "[public-reply:v1]\n已修复" },
      { id: "old", status: "resolved", result: "内部排查人电话：13800000000" },
      { id: "pending", status: "processing", result: "[public-reply:v1]\n旧回复" },
    ]);
    const rows = await service.getHistoryFeedbacks("owner");
    expect(prisma.feedback.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" } }));
    expect(rows.map((row) => row.reply)).toEqual(["已修复", null, null]);
    expect(JSON.stringify(rows)).not.toContain("内部排查人电话");
    expect(rows[0]).not.toHaveProperty("result");
  });

  it("管理端列表的处理备注仍保持默认脱敏", async () => {
    prisma.feedback.findMany.mockResolvedValue([{
      id: "ticket", userId: "user-123456", type: "bug", content: "反馈", contact: null,
      images: [], status: "pending", result: "请联系 13800000000", createdAt: new Date(), updatedAt: new Date(),
    }]);
    prisma.feedback.count.mockResolvedValue(1);
    const result = await service.adminList({});
    expect(JSON.stringify(result)).not.toContain("13800000000");
  });

  it("仅在状态条件更新成功后通知对应用户，通知不含处理原文", async () => {
    prisma.feedback.findUnique.mockResolvedValue({ userId: "owner", type: "bug", status: "processing" });
    prisma.feedback.updateMany.mockResolvedValue({ count: 1 });
    notifications.sendOnce.mockResolvedValue({ id: "notice" });
    await expect(service.adminUpdateStatus("ticket", { status: "resolved", result: "已修复，请重试" }))
      .resolves.toEqual({ id: "ticket", status: "resolved" });
    expect(prisma.feedback.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ticket", status: "processing" },
      data: expect.objectContaining({ result: "[public-reply:v1]\n已修复，请重试" }),
    }));
    expect(notifications.sendOnce).toHaveBeenCalledTimes(1);
    expect(notifications.sendOnce).toHaveBeenCalledWith("owner", expect.stringMatching(/^FEEDBACK_RESOLVED:ticket:/),
      expect.objectContaining({ targetType: "FEEDBACK", targetId: "ticket" }));
    expect(JSON.stringify(notifications.sendOnce.mock.calls)).not.toContain("已修复，请重试");
  });

  it("并发状态更新失败时不发送成功通知", async () => {
    prisma.feedback.findUnique.mockResolvedValue({ userId: "owner", type: "bug", status: "processing" });
    prisma.feedback.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.adminUpdateStatus("ticket", { status: "resolved", result: "已修复" })).rejects.toThrow();
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });

  it("通知落库失败不阻断已经成功的结案", async () => {
    prisma.feedback.findUnique.mockResolvedValue({ userId: "owner", type: "bug", status: "processing" });
    prisma.feedback.updateMany.mockResolvedValue({ count: 1 });
    notifications.sendOnce.mockRejectedValue(new Error("通知服务暂不可用"));
    await expect(service.adminUpdateStatus("ticket", { status: "resolved", result: "已处理" }))
      .resolves.toEqual({ id: "ticket", status: "resolved" });
  });

  it("普通状态流转和推荐负反馈信号不发送结案通知", async () => {
    prisma.feedback.findUnique.mockResolvedValueOnce({ userId: "owner", type: "bug", status: "pending" })
      .mockResolvedValueOnce({ userId: "owner", type: "feed_dislike", status: "processing" });
    prisma.feedback.updateMany.mockResolvedValue({ count: 1 });
    await service.adminUpdateStatus("ticket", { status: "processing" });
    await service.adminUpdateStatus("signal", { status: "resolved", result: "已处理" });
    expect(notifications.sendOnce).not.toHaveBeenCalled();
  });
});
