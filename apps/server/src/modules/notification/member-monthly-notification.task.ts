import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MemberMonthlyNotificationTask {
  private readonly logger = new Logger(MemberMonthlyNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPending();
    } catch {
      this.logger.error("月度权益通知暂未落库，下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPending(): Promise<number> {
    // 与原发放入口使用相同运行时月份；跨月不补旧月，不依赖数据库会话时区。
    const now = new Date();
    const source = `member_monthly_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Notification"
        (id,"userId","idempotencyKey",type,title,content,"targetType","targetId","isRead","createdAt")
      SELECT gen_random_uuid()::text,f."userId",f."userId" || ':' || x.event || ':' || f.source,
        'ENTITLEMENT',x.title,x.content,x.target,f."userId",false,(NOW() AT TIME ZONE 'UTC')
      FROM "MemberMonthlyBenefitNotice" f
      JOIN "PointsRecord" p ON p.id=f.id AND p."userId"=f."userId"
        AND p.source=f.source AND p.type='EARN' AND p.amount=f.points
      JOIN "User" u ON u.id=f."userId"
      CROSS JOIN LATERAL (
        SELECT 'MEMBER_MONTHLY_POINTS' AS event,'本月积分已到账' AS title,
          '本月获赠积分已发放，可查看积分余额和明细。' AS content,'POINTS' AS target
        WHERE f.points>0
        UNION ALL
        SELECT 'MEMBER_MONTHLY_COUPON','本月赠券已发放',
          '本月获赠优惠券已发放，可查看优惠券当前使用状态。','COUPON'
        WHERE f."couponRecordId" IS NOT NULL AND EXISTS (
          SELECT 1 FROM "CouponRecord" c
          WHERE c.id=f."couponRecordId" AND c."userId"=f."userId" AND c."couponId"=f."couponId"
        )
      ) x
      WHERE f.source=${source} AND f.points>=0
        AND u."memberLevel"<>'NONE'
        AND (u."memberExpire" IS NULL OR u."memberExpire">(NOW() AT TIME ZONE 'UTC'))
        AND NOT EXISTS (
          SELECT 1 FROM "Notification" n
          WHERE n."idempotencyKey"=f."userId" || ':' || x.event || ':' || f.source
        )
      ORDER BY f."createdAt",f.id,x.event
      LIMIT 100
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `;
    return rows.length;
  }
}
