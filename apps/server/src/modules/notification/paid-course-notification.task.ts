import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

/** 付费课程只根据新开通流水补站内通知，不修改付款或权益。 */
@Injectable()
export class PaidCourseNotificationTask {
  private readonly logger = new Logger(PaidCourseNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPending();
    } catch {
      this.logger.error("付费课程开通站内通知暂未落库，下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPending(): Promise<number> {
    // 订单、实际权益和课程同时有效；收件人事件唯一键收敛双节点并发。
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Notification"
        (id,"userId","idempotencyKey",type,title,content,"targetType","targetId","isRead","createdAt")
      SELECT gen_random_uuid()::text,l."userId",l."userId" || ':COURSE_ENROLLED:' || o.id,
        'COURSE','课程开通成功','课程已开通，可查看并开始学习。',
        'COURSE',o."targetId",false,(NOW() AT TIME ZONE 'UTC')
      FROM "EntitlementLedger" l
      JOIN "Order" o ON o.id=l."sourceId" AND o."userId"=l."userId" AND o."targetId"=l."resourceId"
      JOIN "Course" c ON c.id=o."targetId"
      WHERE l.action='GRANT' AND l."sourceType"='ORDER' AND l.kind='ACCESS'
        AND l."entitlementKey"='course.access' AND l."resourceType"='COURSE' AND l.scope='GLOBAL'
        AND l.quantity=1 AND NOT l.unlimited
        AND l.metadata ->> 'notificationEvent'='COURSE_PAID_GRANTED_V1'
        AND l."idempotencyKey"='order:' || o.id || ':course.access'
        AND l."validFrom" <= (NOW() AT TIME ZONE 'UTC')
        AND (l."validUntil" IS NULL OR l."validUntil" > (NOW() AT TIME ZONE 'UTC'))
        AND o.type='COURSE' AND o.status IN ('PAID','COMPLETED') AND o."paidAt" IS NOT NULL
        AND c."deletedAt" IS NULL AND c."auditStatus"='APPROVED'
        AND (c."validityDays"<=0 OR o."paidAt" + c."validityDays" * INTERVAL '1 day' > (NOW() AT TIME ZONE 'UTC'))
        AND NOT EXISTS (SELECT 1 FROM "EntitlementLedger" r WHERE r.action='REVOKE' AND r."reversesLedgerId"=l.id)
        AND NOT EXISTS (SELECT 1 FROM "Notification" n WHERE n."idempotencyKey"=l."userId" || ':COURSE_ENROLLED:' || o.id)
      ORDER BY l."createdAt",l.id
      LIMIT 100
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `;
    return rows.length;
  }
}
