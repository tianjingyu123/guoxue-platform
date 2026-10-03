import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";

/** 只恢复本版已提交的治理快照；数据库唯一键保证多进程重复执行不重复建通知。 */
export async function deliverCircleGovernanceNotices(prisma: PrismaService): Promise<number> {
  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH due AS (
      SELECT e.*, e."recipientId" || ':CIRCLE_GOVERNANCE:' || e."eventKey" AS notification_key
      FROM "CircleGovernanceNotice" e
      JOIN "User" u ON u.id=e."recipientId"
      JOIN "Circle" c ON c.id=e."circleId"
      WHERE u.status='ACTIVE' AND c."deletedAt" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "Notification" n
          WHERE n."idempotencyKey"=e."recipientId" || ':CIRCLE_GOVERNANCE:' || e."eventKey")
      ORDER BY e."occurredAt", e.id LIMIT 100
      FOR SHARE OF e, c SKIP LOCKED
    )
    INSERT INTO "Notification"
      (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", category, "circleId", "isRead", "createdAt")
    SELECT gen_random_uuid()::text, "recipientId", notification_key, 'CIRCLE_GOVERNANCE', title,
      '处理记录（北京时间 ' || to_char(("occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD HH24:MI') ||
      '）：' || content || ' 此消息记录当时的处理结果，当前权限、限制或帖子状态请查看对应页面。',
      "targetType", "targetId", 'GOVERN', "circleId", false, (NOW() AT TIME ZONE 'UTC') FROM due
    ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING id
  `;
  return inserted.length;
}

@Injectable()
export class CircleGovernanceNotificationTask {
  private readonly logger = new Logger(CircleGovernanceNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "circle_governance_notice_restore" })
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await deliverCircleGovernanceNotices(this.prisma);
    } catch {
      this.logger.warn("圈子治理通知恢复失败，将在下次调度重试");
    } finally {
      this.running = false;
    }
  }
}
