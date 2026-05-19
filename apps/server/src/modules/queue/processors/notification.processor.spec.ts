import { Test, TestingModule } from "@nestjs/testing";
import { NotificationProcessor, NotificationJobData } from "./notification.processor";
import { NotificationService } from "../../notification/notification.service";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { Job } from "bullmq";

function mockJob(data: NotificationJobData): Job<NotificationJobData> {
  return { id: "job-1", data, opts: {} } as Job<NotificationJobData>;
}

describe("NotificationProcessor", () => {
  let processor: NotificationProcessor;
  let notification: any;
  let email: any;
  let prisma: any;

  beforeEach(async () => {
    notification = { send: jest.fn().mockResolvedValue({ id: "n1" }) };
    email = { sendNotification: jest.fn().mockResolvedValue({ success: true }) };
    prisma = {
      user: { findUnique: jest.fn() },
      notification: { create: jest.fn().mockResolvedValue({ id: "n1" }) },
    };

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: NotificationService, useValue: notification },
        { provide: EmailService, useValue: email },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = mod.get(NotificationProcessor);
  });

  describe("process", () => {
    it("push 通道写入DB+推送", async () => {
      await processor.process(mockJob({
        userId: "u1", type: "SYSTEM", title: "系统通知", content: "测试内容",
      }));

      expect(notification.send).toHaveBeenCalledWith("u1", {
        type: "SYSTEM", title: "系统通知", content: "测试内容", targetType: undefined, targetId: undefined,
      });
    });

    it("email 通道发送邮件通知", async () => {
      prisma.user.findUnique.mockResolvedValue({ email: "user@test.com" });

      await processor.process(mockJob({
        userId: "u1", type: "SYSTEM", title: "邮件通知", content: "内容",
        channel: "email",
      }));

      expect(email.sendNotification).toHaveBeenCalledWith("user@test.com", "邮件通知", "内容");
    });

    it("email 通道用户无邮箱时跳过", async () => {
      prisma.user.findUnique.mockResolvedValue({ email: null });

      await processor.process(mockJob({
        userId: "u1", type: "SYSTEM", title: "邮件通知", content: "内容",
        channel: "email",
      }));

      expect(email.sendNotification).not.toHaveBeenCalled();
    });

    it("sms 通道记录DB通知", async () => {
      await processor.process(mockJob({
        userId: "u1", type: "SYSTEM", title: "短信通知", content: "内容",
        channel: "sms", phone: "13800138000",
      }));

      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it("sms 通道用户无手机号时跳过", async () => {
      prisma.user.findUnique.mockResolvedValue({ phone: null });

      await processor.process(mockJob({
        userId: "u1", type: "SYSTEM", title: "短信通知", content: "内容",
        channel: "sms",
      }));

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("通知发送失败时抛出异常", async () => {
      notification.send.mockRejectedValue(new Error("推送服务不可用"));

      await expect(
        processor.process(mockJob({
          userId: "u1", type: "SYSTEM", title: "失败通知", content: "内容",
        })),
      ).rejects.toThrow("推送服务不可用");
    });
  });
});
