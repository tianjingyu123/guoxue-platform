import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

/** 权益到账站内通知：仅处理已核验入口的新持久事实，会员还须核对实际生效状态。 */
@Injectable()
export class EntitlementNotificationTask {
  private readonly logger = new Logger(EntitlementNotificationTask.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPendingGrants();
    } catch {
      // 不记录流水、用户信息或 SQL 参数；待办保留，下次调度重试。
      this.logger.error("权益到账站内通知写入失败，将在下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPendingGrants(): Promise<number> {
    // 单条 SQL 原子建立通知；双节点并发由数据库唯一键收敛，不依赖 Redis 认领。
    // 必须先排除已发送记录再 LIMIT，避免已完成的旧记录长期占满批次。
    // 此入口只建立站内通知，不调用微信、短信或 App 推送。
    const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Notification"
        (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", "isRead", "createdAt")
      SELECT gen_random_uuid()::text, l."userId",
        l."userId" || ':ENTITLEMENT_GRANTED:' || l.id,
        'ENTITLEMENT', '权益已到账', '有一笔权益已发放，可在我的权益查看当前状态。',
        'ENTITLEMENT', l."userId", false, (NOW() AT TIME ZONE 'UTC')
      FROM "EntitlementLedger" l
      WHERE l.action = 'GRANT'
        AND ((l."sourceType" = 'ADMIN' AND (
          (l."entitlementKey" NOT IN ('membership.school', 'membership.practitioner')
            AND l.metadata ->> 'notificationEvent' = 'ENTITLEMENT_GRANTED_V1')
          OR (l."entitlementKey" = 'membership.school' AND l.kind = 'MEMBERSHIP' AND l.unlimited
            AND l."resourceType" = 'MEMBER_PLAN' AND l."resourceId" = '' AND l.scope = 'GLOBAL'
            AND l.metadata ->> 'notificationEvent' = 'MEMBER_GRANTED_V1'
            -- 只接受真实会员授予入口的购买记录，当前等级和到期日须与本次授予匹配。
            -- 已被新授予覆盖、已撤销、伪造来源或仅写独立权益流水的记录不报成功。
            AND EXISTS (
              SELECT 1 FROM "User" u JOIN "MemberPurchase" p ON p."userId" = u.id
              WHERE u.id = l."userId" AND p.id = l."sourceId" AND p.amount = 0
                AND u."memberLevel"::text <> 'NONE'
                AND u."memberLevel"::text = l.metadata ->> 'level'
                AND p."memberType"::text = l.metadata ->> 'level'
                AND u."memberExpire" IS NOT DISTINCT FROM l."validUntil"
                AND p."expireAt" IS NOT DISTINCT FROM l."validUntil"
            ))
        )) OR (l."sourceType" = 'ORDER'
          AND l."entitlementKey" = 'membership.practitioner' AND l.kind = 'MEMBERSHIP' AND l.unlimited
          AND l."resourceType" = 'PRACTITIONER_PRO' AND l."resourceId" = '' AND l.scope = 'GLOBAL'
          AND l.metadata ->> 'notificationEvent' = 'PRACTITIONER_GRANTED_V1'
          AND l."idempotencyKey" = 'order:' || l."sourceId" || ':membership.practitioner'
          AND l."validUntil" IS NOT NULL
          -- 订单与实际从业状态同时生效；仅写流水、错用户、旧流水和已退款均不报成功。
          AND EXISTS (
            SELECT 1 FROM "Order" o JOIN "PractitionerProfile" p ON p."userId" = o."userId"
            WHERE o.id = l."sourceId" AND o."userId" = l."userId" AND o.type = 'PRACTITIONER_PRO'
              AND o.status IN ('PAID', 'COMPLETED') AND o."paidAt" IS NOT NULL
              AND p."proExpireAt" > (NOW() AT TIME ZONE 'UTC')
          )))
        AND (l.quantity > 0 OR l.unlimited)
        -- Prisma 的 timestamp 无时区列按 UTC 保存，不能隐式使用数据库会话时区。
        AND l."validFrom" <= (NOW() AT TIME ZONE 'UTC')
        AND (l."validUntil" IS NULL OR l."validUntil" > (NOW() AT TIME ZONE 'UTC'))
        AND NOT EXISTS (
          SELECT 1 FROM "EntitlementLedger" r
          WHERE r.action = 'REVOKE' AND r."reversesLedgerId" = l.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Notification" n
          WHERE n."idempotencyKey" = l."userId" || ':ENTITLEMENT_GRANTED:' || l.id
        )
      ORDER BY l."createdAt", l.id
      LIMIT 100
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `;
    return inserted.length;
  }
}
