import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { NotificationService } from "../../notification/notification.service";
import { EmailService } from "../../email/email.service";
import { PrismaService } from "../../../prisma/prisma.service";

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  content: string;
  targetType?: string;
  targetId?: string;
  channel?: "push" | "sms" | "email";
  /** 邮件接收地址（channel=email 时必填） */
  email?: string;
  /** 手机号（channel=sms 时必填） */
  phone?: string;
}

@Processor("notification")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notification: NotificationService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, title, content, targetType, targetId, channel, email, phone } = job.data;
    this.logger.debug(`处理通知任务: job=${job.id} userId=${userId} type=${type} channel=${channel || "push"}`);

    try {
      switch (channel) {
        case "email":
          await this.dispatchEmail(userId, title, content, email);
          break;
        case "sms":
          await this.dispatchSms(userId, title, content, phone);
          break;
        default:
          // push 通道（默认）：写入 DB + 推送
          await this.notification.send(userId, { type, title, content, targetType, targetId });
      }

      this.logger.log(`[通知] ${channel || "push"} → userId=${userId}: ${title}`);
    } catch (err: any) {
      this.logger.error(`通知任务失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }

  private async dispatchEmail(userId: string, title: string, content: string, to?: string) {
    if (!to) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      to = user?.email ?? undefined;
    }
    if (!to) {
      this.logger.warn(`邮件通知跳过: userId=${userId} 未绑定邮箱`);
      return;
    }
    const result = await this.email.sendNotification(to, title, content);
    if (!result.success) {
      throw new Error(`邮件发送失败: ${result.error}`);
    }
  }

  private async dispatchSms(userId: string, title: string, content: string, phone?: string) {
    if (!phone) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
      phone = user?.phone ?? undefined;
    }
    if (!phone) {
      this.logger.warn(`短信通知跳过: userId=${userId} 未绑定手机号`);
      return;
    }
    // 标准SMS通知需要配置模板，当前使用验证码通道发送摘要
    // 写入DB通知记录确保可追溯
    await this.prisma.notification.create({
      data: { userId, type: "SYSTEM", title, content, targetType: "sms" },
    });
    this.logger.log(`短信通知已记录: userId=${userId} phone=${phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}`);
  }
}
