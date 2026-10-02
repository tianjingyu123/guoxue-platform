import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberBenefitService } from "./member-benefit.service";

/**
 * 书院会员定时发放（C1 权益③/连续包年提醒 · 2026-07-03）
 *
 * - 每月 1 日 09:00：向全部有效会员发当月积分+优惠券（幂等：按 member_monthly_YYYYMM 流水判重）
 * - 每日北京 10:00 起：连续包年（memberAutoRenew）到期前 7 天/当天站内提醒按 ¥148 续费
 *   （微信 papay 代扣资质就绪前的诚实降级；就绪后升级为真自动扣费）
 */
@Injectable()
export class MemberGrantService {
  private readonly logger = new Logger(MemberGrantService.name);
  private reminding = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly benefit: MemberBenefitService,
  ) {}

  @Cron("0 0 9 1 * *")
  async monthlyGrantCron() {
    await this.redis.runExclusive("member-monthly-grant", 600, () => this.runMonthlyGrant(), { critical: true });
  }

  /** 月度权益发放主体（独立出来便于测试/手动补发） */
  async runMonthlyGrant(): Promise<{ granted: number; skipped: number }> {
    const now = new Date();
    let granted = 0;
    let skipped = 0;
    const batchSize = 200;
    let cursor: string | undefined;

    for (;;) {
      const members = await this.prisma.user.findMany({
        where: {
          memberLevel: { not: "NONE" },
          OR: [{ memberExpire: null }, { memberExpire: { gt: now } }],
        },
        select: { id: true, memberLevel: true },
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (members.length === 0) break;
      cursor = members[members.length - 1].id;

      for (const m of members) {
        try {
          const ok = await this.benefit.grantMonthlyBenefits(m.id, m.memberLevel);
          if (ok) {
            granted++;
          } else {
            skipped++;
          }
        } catch (err) {
          skipped++;
          this.logger.warn(`会员月度发放失败 userId=${m.id}`, err as Error);
        }
      }
      if (members.length < batchSize) break;
    }

    this.logger.log(`会员月度权益发放完成：发放 ${granted}，跳过 ${skipped}`);
    return { granted, skipped };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoRenewRemindCron() {
    if (this.reminding) return;
    this.reminding = true;
    try {
      await this.runAutoRenewRemind();
    } catch {
      // 用户当前到期日就是持久待办；失败不留认领标记，下次调度可继续尝试。
      this.logger.warn("会员续费站内提醒写入失败，将在下次调度重试");
    } finally {
      this.reminding = false;
    }
  }

  /** 北京自然日到期前 7 天及当天，10 点起补发；只建立站内通知，不触发扣费或外部推送。 */
  async runAutoRenewRemind(now = new Date()): Promise<number> {
    // 保留当前会员状态作为事实来源。共享锁使续期和本次通知写入有明确先后，
    // 数据库唯一键收敛双节点并发；没有 Redis 先认领后丢失的窗口。
    const inserted = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH clock AS (
        SELECT (${now}::timestamptz AT TIME ZONE 'UTC') AS utc_now,
          (${now}::timestamptz AT TIME ZONE 'Asia/Shanghai') AS local_now
      ), due AS (
        SELECT u.id, u."memberExpire", c.utc_now,
          (u."memberExpire" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date - c.local_now::date AS days_left,
          u.id || ':MEMBER_RENEW_REMIND:' ||
            to_char(u."memberExpire", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ':' ||
            ((u."memberExpire" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date - c.local_now::date)::text AS event_key
        FROM "User" u CROSS JOIN clock c
        WHERE u."memberAutoRenew" AND u."memberLevel" <> 'NONE'
          AND u."memberExpire" IS NOT NULL
          AND c.local_now::time >= time '10:00'
          AND (u."memberExpire" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date - c.local_now::date IN (0, 7)
          AND NOT EXISTS (
            SELECT 1 FROM "Notification" n WHERE n."idempotencyKey" =
              u.id || ':MEMBER_RENEW_REMIND:' || to_char(u."memberExpire", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ':' ||
              ((u."memberExpire" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date - c.local_now::date)::text
          )
          -- 滚动接收旧版当日已发送的无键提醒，防止升级当天再次打扰。
          AND NOT EXISTS (
            SELECT 1 FROM "Notification" n WHERE n."userId" = u.id AND n."idempotencyKey" IS NULL
              AND n.type = 'SYSTEM' AND n."targetType" = 'MEMBER'
              AND (n."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date = c.local_now::date
              AND n.title = CASE WHEN
                (u."memberExpire" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::date = c.local_now::date
                THEN '书院会员今日到期' ELSE '书院会员即将到期' END
          )
        ORDER BY u.id
        LIMIT 200
        FOR SHARE OF u SKIP LOCKED
      )
      INSERT INTO "Notification"
        (id, "userId", "idempotencyKey", type, title, content, "targetType", "targetId", "isRead", "createdAt")
      SELECT gen_random_uuid()::text, id, event_key, 'SYSTEM',
        CASE WHEN days_left = 0 THEN '书院会员今日到期' ELSE '书院会员即将到期' END,
        CASE WHEN days_left = 0
          THEN '你的书院会员今天到期。作为连续包年用户，现在续费仍享 ¥148/年 优惠价，AI 伴读不间断。'
          ELSE '你的书院会员将于 7 天后到期。作为连续包年用户，续费仍享 ¥148/年 优惠价。' END,
        'MEMBER', id, false, utc_now
      FROM due
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `;
    if (inserted.length > 0) this.logger.log(`连续包年到期提醒已发送 ${inserted.length} 条`);
    return inserted.length;
  }
}
