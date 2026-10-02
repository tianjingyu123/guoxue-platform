import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NON_TICKET_TYPES } from "./feedback-admin.dto";
import { FEEDBACK_REPLY_EVENT_PATTERN } from "./feedback-reply";

@Injectable()
export class FeedbackNotificationTask {
  private readonly logger = new Logger(FeedbackNotificationTask.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPendingReplies();
    } catch {
      // 不输出用户、回复、联系方式或 SQL；已提交的待办保留，下次重试。
      this.logger.warn("反馈结案站内通知写入失败，将在下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPendingReplies(feedbackId: string | null = null): Promise<number> {
    // 当前结案与通知建立同一条原子 SQL，行锁防止同时回退；唯一键防双节点重复。
    // 只建站内通知，不调用外部推送；旧 V1 及无标记备注不历史补发。
    const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH due AS (
        SELECT f.id, f."userId", substring(f.result FROM ${FEEDBACK_REPLY_EVENT_PATTERN}) AS event
        FROM "Feedback" f
        WHERE f.status = 'resolved' AND f.type <> ALL(${[...NON_TICKET_TYPES]}::text[])
          AND (${feedbackId}::text IS NULL OR f.id = ${feedbackId})
          AND f.result ~ ${FEEDBACK_REPLY_EVENT_PATTERN}
          AND NOT EXISTS (
            SELECT 1 FROM "Notification" n WHERE n."idempotencyKey" =
              f."userId" || ':FEEDBACK_RESOLVED:' || f.id || ':' || substring(f.result FROM ${FEEDBACK_REPLY_EVENT_PATTERN})
          )
        ORDER BY f."updatedAt", f.id LIMIT 100
        FOR SHARE OF f SKIP LOCKED
      )
      INSERT INTO "Notification"
        (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", "isRead", "createdAt")
      SELECT gen_random_uuid()::text, "userId", "userId" || ':FEEDBACK_RESOLVED:' || id || ':' || event,
        'SYSTEM', '反馈已有处理结果', '你提交的反馈已有处理结果，可在“我的反馈”查看当前状态。',
        'FEEDBACK', id, false, (NOW() AT TIME ZONE 'UTC') FROM due
      ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING id
    `;
    return inserted.length;
  }
}
