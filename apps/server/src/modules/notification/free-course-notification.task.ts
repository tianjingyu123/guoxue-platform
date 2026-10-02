import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FreeCourseNotificationTask {
  private readonly logger = new Logger(FreeCourseNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPending();
    } catch {
      this.logger.error("免费课程订阅通知暂未落库，下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPending(): Promise<number> {
    // 与立即通知共用接收人前缀幂等键；只处理仍有效的新免费订阅。
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Notification"
        (id,"userId","idempotencyKey",type,title,content,"targetType","targetId","isRead","createdAt")
      SELECT gen_random_uuid()::text,f."userId",f."userId" || ':COURSE_ENROLLED:' || f.id,
        'COURSE','课程订阅成功','课程已加入我的课程，可查看并开始学习。',
        'COURSE',f."courseId",false,(NOW() AT TIME ZONE 'UTC')
      FROM "FreeCourseEnrollmentNotice" f
      JOIN "Order" o ON o.id=f.id AND o."userId"=f."userId" AND o."targetId"=f."courseId"
      JOIN "Course" c ON c.id=f."courseId"
      WHERE o.type='COURSE' AND o.status IN ('PAID','COMPLETED')
        AND o."payMethod"='FREE' AND o.amount=0 AND o."payAmount"=0 AND o."paidAt" IS NOT NULL
        AND c."deletedAt" IS NULL AND c."auditStatus"='APPROVED'
        AND (c."validityDays"<=0 OR o."paidAt" + c."validityDays" * INTERVAL '1 day' > (NOW() AT TIME ZONE 'UTC'))
        AND NOT EXISTS (
          SELECT 1 FROM "Notification" n
          WHERE n."idempotencyKey"=f."userId" || ':COURSE_ENROLLED:' || f.id
        )
      ORDER BY f."createdAt",f.id
      LIMIT 100
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `;
    return rows.length;
  }
}
