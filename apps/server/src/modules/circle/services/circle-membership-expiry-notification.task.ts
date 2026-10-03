import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

// 实际删除、人数与事实同事务提交；恢复任务只处理新事实，不补删成员或操作资金。
export async function deliverCircleExpiryNotices(prisma: PrismaService): Promise<number> {
  const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH due AS (
      SELECT e."memberId", e."recipientId", e."circleId", e."expiredAt",
        e."recipientId" || ':CIRCLE_EXPIRED:' || e."memberId" || ':' ||
          to_char(e."expiredAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS event_key
      FROM "CircleMembershipExpiryNotice" e
      JOIN "User" u ON u.id = e."recipientId"
      JOIN "Circle" c ON c.id = e."circleId"
      WHERE c."deletedAt" IS NULL AND u.status = 'ACTIVE'
        AND e."expiredAt" < e."removedAt"
        AND NOT EXISTS (
          SELECT 1 FROM "Notification" n WHERE n."idempotencyKey" =
            e."recipientId" || ':CIRCLE_EXPIRED:' || e."memberId" || ':' ||
              to_char(e."expiredAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      ORDER BY e."removedAt", e."memberId" LIMIT 100
      FOR SHARE OF e, c SKIP LOCKED
    )
    INSERT INTO "Notification"
      (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", category, "circleId", "isRead", "createdAt")
    SELECT gen_random_uuid()::text, "recipientId", event_key, 'CIRCLE_EXPIRED', '圈子会员到期记录',
      '您在该圈子的会员于 ' || to_char(("expiredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD HH24:MI') ||
        ' 到期，请查看当前权益或续费情况。',
      'CIRCLE', "circleId", 'GOVERN', "circleId", false, (NOW() AT TIME ZONE 'UTC') FROM due
    ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING id
  `;
  return inserted.length;
}

export async function clearCircleExpiryCaches(prisma: PrismaService, redis: RedisService): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ memberId: string; recipientId: string; circleId: string }>>`
    SELECT "memberId", "recipientId", "circleId" FROM "CircleMembershipExpiryNotice"
    WHERE "cacheClearedAt" IS NULL ORDER BY "removedAt", "memberId" LIMIT 100
  `;
  if (!rows.length) return 0;
  // 持久完成标记必须代表共享缓存已清理，不能接受 Redis 的进程内降级。
  await redis.pingShared();
  // 每批只扫描一次公共列表缓存，避免大量到期记录重复扫描相同前缀。
  await redis.delByPattern("circles:list:*");
  let cleared = 0;
  for (const row of rows) {
    try {
      await Promise.all([
        redis.del(`circles:member:${row.circleId}:${row.recipientId}`),
        redis.del(`circles:detail:${row.circleId}`),
      ]);
      cleared += await prisma.$executeRaw`
        UPDATE "CircleMembershipExpiryNotice" SET "cacheClearedAt"=(NOW() AT TIME ZONE 'UTC')
        WHERE "memberId"=${row.memberId} AND "cacheClearedAt" IS NULL
      `;
    } catch {
      // 缓存失败保持持久待办，并继续后续行；通知落库与缓存恢复互不阻断。
    }
  }
  return cleared;
}

@Injectable()
export class CircleMembershipExpiryNotificationTask {
  private readonly logger = new Logger(CircleMembershipExpiryNotificationTask.name);
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "circle_membership_expiry_notice_restore" })
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      try { await deliverCircleExpiryNotices(this.prisma); }
      catch { this.logger.warn("圈子到期记录通知写入失败，将在下次调度重试"); }
      try { await clearCircleExpiryCaches(this.prisma, this.redis); }
      catch { this.logger.warn("圈子到期缓存恢复读取失败，将在下次调度重试"); }
    } finally { this.running = false; }
  }
}
