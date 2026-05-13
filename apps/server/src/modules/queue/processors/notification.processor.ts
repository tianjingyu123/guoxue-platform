import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  content: string;
  targetType?: string;
  targetId?: string;
  channel?: "push" | "sms" | "email";
}

@Processor("notification")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, title, channel } = job.data;
    this.logger.debug(`处理通知任务: job=${job.id} userId=${userId} type=${type}`);

    try {
      // TODO: 实际的通知分发逻辑（推送/SMS/邮件）
      // 当前为队列框架，具体推送实现由现有 NotificationService 注入完成
      this.logger.log(`[通知] ${channel || "push"} → userId=${userId}: ${title}`);
    } catch (err: any) {
      this.logger.error(`通知任务失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }
}
