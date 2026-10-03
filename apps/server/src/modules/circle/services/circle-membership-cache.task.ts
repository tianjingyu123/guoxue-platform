import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

/** 与实际成员变更同事务保存缓存待办；不保存联系方式，不变更权益或资金。 */
export async function enqueueCircleMembershipCache(
  tx: Prisma.TransactionClient,
  circleId: string,
  userId: string,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "CircleMembershipCacheInvalidation" (id, "circleId", "userId", "createdAt")
    VALUES (${randomUUID()}, ${circleId}, ${userId}, (NOW() AT TIME ZONE 'UTC'))
  `;
}

export async function clearCircleMembershipCaches(
  prisma: PrismaService,
  redis: RedisService,
  target?: { circleId: string; userId: string },
): Promise<number> {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; circleId: string; userId: string }>
  >(Prisma.sql`
    SELECT id, "circleId", "userId" FROM "CircleMembershipCacheInvalidation"
    WHERE "clearedAt" IS NULL
      ${target ? Prisma.sql`AND "circleId"=${target.circleId} AND "userId"=${target.userId}` : Prisma.empty}
    ORDER BY "createdAt", id LIMIT 100
  `);
  if (!rows.length) return 0;
  await redis.clearCircleMembershipShared(rows);
  let cleared = 0;
  for (const row of rows) {
    try {
      // 必须清理共享 Redis；降级到内存、DEL/SCAN 失败都不能确认完成。

      cleared += await prisma.$executeRaw`
        UPDATE "CircleMembershipCacheInvalidation" SET "clearedAt"=(NOW() AT TIME ZONE 'UTC')
        WHERE id=${row.id} AND "clearedAt" IS NULL
      `;
    } catch {
      // 同一行可安全重复清理。故障保持待办，不阻断已提交的成员事务。
    }
  }
  return cleared;
}

@Injectable()
export class CircleMembershipCacheTask {
  private readonly logger = new Logger(CircleMembershipCacheTask.name);
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: "circle_membership_cache_restore" })
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await clearCircleMembershipCaches(this.prisma, this.redis);
    } catch {
      this.logger.warn("圈子成员缓存待办读取失败，将在下次调度重试");
    } finally {
      this.running = false;
    }
  }
}
