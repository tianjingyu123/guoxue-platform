import { ImFallbackService } from "./im-fallback.service";

describe("ImFallbackService", () => {
  const prisma: any = {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    imFallbackMessage: {
      create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(),
    },
    imC2CCounter: { createMany: jest.fn(), updateMany: jest.fn() },
    imFallbackConversationPreference: {
      findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };
  const policy: any = { evaluateC2C: jest.fn(), getConfig: jest.fn() };
  const audit: any = { hasLocalViolation: jest.fn(), classifyTextRisk: jest.fn() };
  const ws: any = { sendToUser: jest.fn() };
  const service = new ImFallbackService(prisma, policy, audit, ws);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(prisma));
    prisma.imC2CCounter.updateMany.mockResolvedValue({ count: 1 });
  });

  it("关系允许时保存文本并实时推送给双方", async () => {
    policy.evaluateC2C.mockResolvedValue({ canSend: true, relation: "mutual" });
    audit.hasLocalViolation.mockReturnValue([]);
    audit.classifyTextRisk.mockResolvedValue(undefined);
    const saved = { id: "m1", fromUserId: "u1", toUserId: "u2", content: "你好" };
    prisma.imFallbackMessage.create.mockResolvedValue(saved);

    await expect(service.sendText("u1", "u2", " 你好 ")).resolves.toEqual(saved);
    expect(prisma.imFallbackMessage.create).toHaveBeenCalledWith({
      data: { fromUserId: "u1", toUserId: "u2", type: "TEXT", content: "你好" },
    });
    expect(ws.sendToUser).toHaveBeenCalledTimes(2);
    expect(prisma.imC2CCounter.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.imC2CCounter.updateMany).toHaveBeenCalledWith({
      where: { fromUserId: "u2", toUserId: "u1" }, data: { sentCount: 0 },
    });
  });

  it("单向关注额度耗尽时不建消息也不推送", async () => {
    policy.evaluateC2C.mockResolvedValue({ canSend: true, relation: "following" });
    policy.getConfig.mockResolvedValue({ followerDMQuota: 1 });
    audit.hasLocalViolation.mockReturnValue([]);
    prisma.imC2CCounter.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.sendText("u1", "u2", "你好")).rejects.toThrow();
    expect(prisma.imFallbackMessage.create).not.toHaveBeenCalled();
    expect(ws.sendToUser).not.toHaveBeenCalled();
  });

  it("单向关注发送时原子占用额度并在提交后推送", async () => {
    policy.evaluateC2C.mockResolvedValue({ canSend: true, relation: "following" });
    policy.getConfig.mockResolvedValue({ followerDMQuota: 1 });
    audit.hasLocalViolation.mockReturnValue([]);
    audit.classifyTextRisk.mockResolvedValue(undefined);
    prisma.imFallbackMessage.create.mockResolvedValue({ id: "m2", fromUserId: "u1", toUserId: "u2", content: "你好" });
    await service.sendText("u1", "u2", "你好");
    expect(prisma.imC2CCounter.updateMany).toHaveBeenCalledWith({
      where: { fromUserId: "u1", toUserId: "u2", sentCount: { lt: 1 } },
      data: { sentCount: { increment: 1 } },
    });
    expect(ws.sendToUser).toHaveBeenCalledTimes(2);
  });

  it("清空会话只隐藏当前用户历史，不删除双方消息", async () => {
    prisma.imFallbackConversationPreference.upsert.mockResolvedValue({});
    await expect(service.clearConversation("u1", "u2")).resolves.toEqual({ success: true });
    expect(prisma.imFallbackMessage.updateMany).not.toHaveBeenCalled();
    expect(prisma.imFallbackConversationPreference.upsert).toHaveBeenCalled();
  });

  it("会话偏好只允许置顶和免打扰，不能由请求体改写用户、对端或隐藏时点", async () => {
    await service.updatePreference("u1", "u2", {
      isPinned: true, isMuted: false, userId: "victim", peerUserId: "other",
      hiddenBefore: new Date("2099-01-01"),
    } as any);
    expect(prisma.imFallbackConversationPreference.upsert).toHaveBeenCalledWith({
      where: { userId_peerUserId: { userId: "u1", peerUserId: "u2" } },
      create: { userId: "u1", peerUserId: "u2", isPinned: true, isMuted: false },
      update: { isPinned: true, isMuted: false },
    });
  });
});
