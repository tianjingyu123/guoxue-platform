import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class CirclePostRewardNotificationTask {
  private readonly logger = new Logger(CirclePostRewardNotificationTask.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.deliverPending();
    } catch {
      this.logger.warn("圈帖打赏站内通知写入失败，将在下次调度重试");
    } finally {
      this.running = false;
    }
  }

  async deliverPending(): Promise<number> {
    // 新事实、扣款、作者分成必须共同提交；恢复任务只写通知，不调用扣币、Redis或外部推送。
    // 验证当前帖子归属及完整分账，不把一条收益流水当作打赏成功依据。
    const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH due AS (
        SELECT r."recipientId", r."circleId", r.message, d.id, d."refId",
          (-d."amountCoin" / 2) AS share
        FROM "CirclePostRewardNotice" r
        JOIN "VirtualCoinTransaction" d ON d.id = r."debitId"
        JOIN "Post" p ON p.id = d."refId" AND p."userId" = r."recipientId" AND p."circleId" = r."circleId"
        JOIN "User" u ON u.id = r."recipientId"
        CROSS JOIN LATERAL (
          SELECT count(*) AS count, count(*) FILTER (
            WHERE c."userId" = r."recipientId" AND c.type = 'REFUND' AND c.scene = 'REFUND'
              AND c."amountCoin" = (-d."amountCoin" / 2)
          ) AS valid
          FROM (SELECT c.* FROM "VirtualCoinTransaction" c WHERE c."refId" = d.id FOR SHARE OF c SKIP LOCKED) c
        ) credits
        WHERE d.type = 'SPEND' AND d.scene = 'POST_REWARD'
          AND d.id ~ '^post-reward:[0-9a-f]{64}$' AND d."amountCoin" BETWEEN -10000 AND -1
          AND d."userId" <> r."recipientId"
          AND ((d."amountCoin" = -1 AND NOT EXISTS (SELECT 1 FROM "VirtualCoinTransaction" c WHERE c."refId" = d.id))
            OR (d."amountCoin" < -1 AND credits.count = 1 AND credits.valid = 1
              AND (SELECT count(*) FROM "VirtualCoinTransaction" c WHERE c."refId" = d.id) = 1))
          AND NOT EXISTS (SELECT 1 FROM "Notification" n WHERE n."idempotencyKey" = r."recipientId" || ':POST_REWARD:' || d.id)
        ORDER BY r."createdAt", r."debitId" LIMIT 100
        FOR SHARE OF r, d, p SKIP LOCKED
      )
      INSERT INTO "Notification"
        (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", category, "circleId", "isRead", "createdAt")
      SELECT gen_random_uuid()::text, "recipientId", "recipientId" || ':POST_REWARD:' || id,
        'POST_REWARD', '收到打赏', '有人打赏了你的帖子，入账 ' || share::text || ' 币（已扣除平台服务费）'
          || CASE WHEN message IS NULL OR message = '' THEN '' ELSE '：' || message END,
        'POST', "refId", 'TRADE', "circleId", false, (NOW() AT TIME ZONE 'UTC') FROM due
      ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING id
    `;
    return inserted.length;
  }
}
