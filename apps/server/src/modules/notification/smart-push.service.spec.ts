import { Test } from "@nestjs/testing";
import { SmartPushService } from "./smart-push.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PushService } from "./push.service";

const mockPrisma = {
  notification: { findFirst: jest.fn() },
  auth: { findFirst: jest.fn() },
  userInterest: { findMany: jest.fn() },
  aiAnalysisRecord: { findFirst: jest.fn() },
};

const mockGateway = { chat: jest.fn() };
const mockPush = { sendMiniSubscribeMsg: jest.fn() };

describe("SmartPushService", () => {
  let svc: SmartPushService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SmartPushService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();
    svc = mod.get(SmartPushService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("decidePush", () => {
    beforeEach(() => {
      mockPrisma.userInterest.findMany.mockResolvedValue([{ tag: "国学", score: 0.9 }]);
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({ createdAt: new Date("2024-06-15T10:30:00Z") });
    });

    it("4小时内已有推送则拒绝", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
      });
      const result = await svc.decidePush("u1", "daily_remind");
      expect(result.shouldPush).toBe(false);
      expect(result.reason).toContain("小时");
    });

    it("超过4小时且AI返回JSON决策成功", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({
        content: '{"shouldPush":true,"timing":"10:00-11:00","title":"今日推荐","content":"点击查看","reason":"用户活跃"}',
      });
      const result = await svc.decidePush("u1", "new_content", { type: "article" });
      expect(result.shouldPush).toBe(true);
      expect(result.title).toBe("今日推荐");
      expect(mockGateway.chat).toHaveBeenCalled();
    });

    it("AI返回false则不推送", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({
        content: '{"shouldPush":false,"reason":"不在活跃时段"}',
      });
      const result = await svc.decidePush("u1", "event_notice");
      expect(result.shouldPush).toBe(false);
    });

    it("AI调用失败使用默认推送策略", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockRejectedValue(new Error("AI超时"));
      const result = await svc.decidePush("u1", "daily_remind");
      expect(result.shouldPush).toBe(true);
      expect(result.title).toBe("今日国学经典");
      expect(result.reason).toBe("默认推送策略");
    });

    it("AI返回非JSON使用默认策略", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({ content: "无法确定，建议推送" });
      const result = await svc.decidePush("u1", "course_update");
      expect(result.shouldPush).toBe(true);
      expect(result.title).toBe("课程更新提醒");
    });
  });

  describe("generateDailyPush", () => {
    it("无微信openid时返回失败", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue(null);
      const result = await svc.generateDailyPush("u1");
      expect(result.sent).toBe(false);
      expect(result.error).toBe("无openid");
    });

    it("AI决定不推送时返回频控限制", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ openId: "o_test" });
      mockPrisma.userInterest.findMany.mockResolvedValue([]);
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({ createdAt: new Date() });
      mockPrisma.notification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      const result = await svc.generateDailyPush("u1");
      expect(result.sent).toBe(false);
      expect(result.error).toBe("频控限制");
    });

    it("AI决定推送时调用微信发送", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ openId: "o_test" });
      mockPrisma.userInterest.findMany.mockResolvedValue([]);
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({ createdAt: new Date() });
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({
        content: '{"shouldPush":true,"timing":"09:00","title":"今日国学","content":"查看精选","reason":"alive"}',
      });
      mockPush.sendMiniSubscribeMsg.mockResolvedValue(undefined);

      const result = await svc.generateDailyPush("u1");
      expect(result.sent).toBe(true);
      expect(mockPush.sendMiniSubscribeMsg).toHaveBeenCalledWith(expect.objectContaining({
        touser: "o_test",
        templateId: "daily_remind_template",
      }));
    });

    it("微信推送失败返回错误", async () => {
      mockPrisma.auth.findFirst.mockResolvedValue({ openId: "o_test" });
      mockPrisma.userInterest.findMany.mockResolvedValue([]);
      mockPrisma.aiAnalysisRecord.findFirst.mockResolvedValue({ createdAt: new Date() });
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockGateway.chat.mockResolvedValue({
        content: '{"shouldPush":true,"timing":"09:00","title":"标题","content":"文案","reason":"alive"}',
      });
      mockPush.sendMiniSubscribeMsg.mockRejectedValue(new Error("微信API错误"));

      const result = await svc.generateDailyPush("u1");
      expect(result.sent).toBe(false);
      expect(result.error).toBe("微信API错误");
    });
  });
});
