import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** 只在本版首次支付/退款的业务事务内记录；重投不得把历史订单变成补发事实。 */
export async function recordOrderNoticeWithTx(tx: Prisma.TransactionClient, orderId: string,
  kind: "ORDER_PAID" | "ORDER_REFUNDED"): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "OrderBusinessNotice" ("eventKey","orderId","recipientId",kind,"sourceVersion","createdAt","readyAt")
    SELECT ${kind} || ':' || o.id,o.id,o."userId",${kind},'ORDER_NOTICE_V1',
      (NOW() AT TIME ZONE 'UTC'),CASE WHEN ${kind}='ORDER_PAID' THEN (NOW() AT TIME ZONE 'UTC') ELSE NULL END
    FROM "Order" o
    WHERE o.id=${orderId} AND
      ((${kind}='ORDER_PAID' AND o.status IN ('PAID','SHIPPED','COMPLETED') AND o."paidAt" IS NOT NULL)
       OR (${kind}='ORDER_REFUNDED' AND o.status='REFUNDED' AND o."refundedAt" IS NOT NULL))
    ON CONFLICT ("eventKey") DO NOTHING
  `;
}

/** 与售后终态写入同一事务；只有已记录的新退款事实可放行，不为旧退款补建事实。 */
export async function releaseRefundNoticeWithTx(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "OrderBusinessNotice" f SET "readyAt"=COALESCE(f."readyAt",(NOW() AT TIME ZONE 'UTC'))
    FROM "Order" o
    WHERE f."orderId"=${orderId} AND f.kind='ORDER_REFUNDED' AND f."sourceVersion"='ORDER_NOTICE_V1'
      AND o.id=f."orderId" AND o."userId"=f."recipientId" AND o.status='REFUNDED'
      AND NOT EXISTS (SELECT 1 FROM "AfterSale" a WHERE a."orderId"=o.id
        AND a.type IN ('refund','return','refund_only','refund_with_return') AND a.status='PROCESSING')
  `;
}

@Injectable()
export class OrderBusinessNotificationTask {
  private readonly logger = new Logger(OrderBusinessNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try { await this.deliverPending(); }
    catch { this.logger.error("新订单站内通知未落库，下次调度重试"); }
    finally { this.running = false; }
  }

  async deliverPending(): Promise<number> {
    // 只恢复站内通知。订单锁与唯一键保护双进程；不调用微信、短信、App或任何外部订阅。
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH eligible AS (
        SELECT f.* FROM "OrderBusinessNotice" f
        JOIN "Order" o ON o.id=f."orderId" AND o."userId"=f."recipientId"
        WHERE f."sourceVersion"='ORDER_NOTICE_V1' AND f."readyAt" IS NOT NULL
          AND ((f.kind='ORDER_PAID' AND o.status IN ('PAID','SHIPPED','COMPLETED') AND o."paidAt" IS NOT NULL)
            OR (f.kind='ORDER_REFUNDED' AND o.status='REFUNDED' AND o."refundedAt" IS NOT NULL))
          AND NOT EXISTS (SELECT 1 FROM "Notification" n
            WHERE n."idempotencyKey"=f."recipientId" || ':' || f."eventKey")
        ORDER BY f."createdAt",f."eventKey" LIMIT 100 FOR UPDATE OF o SKIP LOCKED
      )
      INSERT INTO "Notification"
        (id,"userId","idempotencyKey",type,title,content,"targetType","targetId","isRead","createdAt")
      SELECT gen_random_uuid()::text,f."recipientId",f."recipientId" || ':' || f."eventKey",
        CASE WHEN f.kind='ORDER_PAID' THEN 'PURCHASE' ELSE 'REFUND' END,
        CASE WHEN f.kind='ORDER_PAID' THEN '支付成功' ELSE '退款完成' END,
        CASE WHEN f.kind='ORDER_PAID' THEN '订单已支付成功，可查看订单详情。' ELSE '退款已完成，可查看售后详情。' END,
        'ORDER',f."orderId",false,(NOW() AT TIME ZONE 'UTC') FROM eligible f
      ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING id
    `;
    return rows.length;
  }
}
