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
  email?: string;
  phone?: string;
}

/** 通知渠道发送接口 — 新增钉钉/飞书只需实现此接口并注册 */
interface ChannelSender {
  send(job: NotificationJobData): Promise<void>;
}

@Processor("notification")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly channels = new Map<string, ChannelSender>();

  constructor(
    private readonly notification: NotificationService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.channels.set("email", { send: (j) => this.sendEmail(j) });
    this.channels.set("sms", { send: (j) => this.sendSms(j) });
    // 新增渠道在此注册：this.channels.set("dingtalk", { send: (j) => this.sendDingtalk(j) });
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, title, content, targetType, targetId } = job.data;
    const channel = job.data.channel;
    this.logger.debug(`处理通知任务: job=${job.id} userId=${userId} type=${type} channel=${channel || "push"}`);

    try {
      const sender = channel ? this.channels.get(channel) : undefined;
      if (sender) {
        await sender.send(job.data);
      } else {
        // 默认 push 通道：写入 DB + 推送
        await this.notification.send(userId, { type, title, content, targetType, targetId });
      }

      this.logger.log(`[通知] ${channel || "push"} → userId=${userId}: ${title}`);
    } catch (err: any) {
      this.logger.error(`通知任务失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }

  private async sendEmail(job: NotificationJobData) {
    let to = job.email;
    if (!to) {
      const user = await this.prisma.user.findUnique({ where: { id: job.userId }, select: { email: true } });
      to = user?.email ?? undefined;
    }
    if (!to) {
      this.logger.warn(`邮件通知跳过: userId=${job.userId} 未绑定邮箱`);
      return;
    }
    const result = await this.email.sendNotification(to, job.title, job.content);
    if (!result.success) {
      throw new Error(`邮件发送失败: ${result.error}`);
    }
  }

  private async sendSms(job: NotificationJobData) {
    let phone = job.phone;
    if (!phone) {
      const user = await this.prisma.user.findUnique({ where: { id: job.userId }, select: { phone: true } });
      phone = user?.phone ?? undefined;
    }
    if (!phone) {
      this.logger.warn(`短信通知跳过: userId=${job.userId} 未绑定手机号`);
      return;
    }
    await this.prisma.notification.create({
      data: { userId: job.userId, type: "SYSTEM", title: job.title, content: job.content, targetType: "sms" },
    });
    this.logger.log(`短信通知已记录: userId=${job.userId} phone=${phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}`);
  }
}
