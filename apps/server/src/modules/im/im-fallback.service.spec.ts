import { ImFallbackService } from "./im-fallback.service";

describe("ImFallbackService", () => {
  const prisma: any = {
    imFallbackMessage: {
      create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(),
    },
    imFallbackConversationPreference: {
      findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };
  const policy: any = { evaluateC2C: jest.fn() };
  const audit: any = { hasLocalViolation: jest.fn(), classifyTextRisk: jest.fn() };
  const ws: any = { sendToUser: jest.fn() };
  const service = new ImFallbackService(prisma, policy, audit, ws);

  beforeEach(() => jest.clearAllMocks());

  it("关系允许时保存文本并实时推送给双方", async () => {
    policy.evaluateC2C.mockResolvedValue({ canSend: true });
    audit.hasLocalViolation.mockReturnValue([]);
    audit.classifyTextRisk.mockResolvedValue(undefined);
    const saved = { id: "m1", fromUserId: "u1", toUserId: "u2", content: "你好" };
    prisma.imFallbackMessage.create.mockResolvedValue(saved);

    await expect(service.sendText("u1", "u2", " 你好 ")).resolves.toEqual(saved);
    expect(prisma.imFallbackMessage.create).toHaveBeenCalledWith({
      data: { fromUserId: "u1", toUserId: "u2", type: "TEXT", content: "你好" },
    });
    expect(ws.sendToUser).toHaveBeenCalledTimes(2);
  });

  it("清空会话只隐藏当前用户历史，不删除双方消息", async () => {
    prisma.imFallbackConversationPreference.upsert.mockResolvedValue({});
    await expect(service.clearConversation("u1", "u2")).resolves.toEqual({ success: true });
    expect(prisma.imFallbackMessage.updateMany).not.toHaveBeenCalled();
    expect(prisma.imFallbackConversationPreference.upsert).toHaveBeenCalled();
  });
});
