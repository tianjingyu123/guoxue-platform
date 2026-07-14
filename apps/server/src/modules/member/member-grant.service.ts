import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberBenefitService } from "./member-benefit.service";

/**
 * 书院会员定时发放（C1 权益③/连续包年提醒 · 2026-07-03）
 *
 * - 每月 1 日 09:00：向全部有效会员发当月积分+优惠券（幂等：按 member_monthly_YYYYMM 流水判重）
 * - 每日 10:00：连续包年（memberAutoRenew）到期前 7 天/当天站内提醒按 ¥148 续费
 *   （微信 papay 代扣资质就绪前的诚实降级；就绪后升级为真自动扣费）
 */
@Injectable()
export class MemberGrantService {
  private readonly logger = new Logger(MemberGrantService.name);

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
          ok ? granted++ : skipped++;
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

  @Cron("0 0 10 * * *")
  async autoRenewRemindCron() {
    await this.redis.runExclusive("member-renew-remind", 300, () => this.runAutoRenewRemind());
  }

  /** 连续包年到期提醒：到期前 7 天与当天各提醒一次（redis 判重防重复打扰） */
  async runAutoRenewRemind(): Promise<number> {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400000);
    const users = await this.prisma.user.findMany({
      where: {
        memberAutoRenew: true,
        memberLevel: { not: "NONE" },
        memberExpire: { not: null, lte: in7d },
      },
      select: { id: true, memberExpire: true },
    });

    let sent = 0;
    for (const u of users) {
      const daysLeft = Math.max(0, Math.ceil(((u.memberExpire as Date).getTime() - now.getTime()) / 86400000));
      if (daysLeft !== 7 && daysLeft !== 0) continue;
      const dedupKey = `member:renew-remind:${u.id}:${daysLeft}:${(u.memberExpire as Date).toISOString().slice(0, 10)}`;
      const first = await this.redis.setNX(dedupKey, "1", 8 * 86400);
      if (!first) continue;
      await this.prisma.notification.create({
        data: {
          userId: u.id,
          type: "SYSTEM",
          title: daysLeft === 0 ? "书院会员今日到期" : "书院会员即将到期",
          content:
            daysLeft === 0
              // 🔴 2026-07-14 撤掉"电子书畅读"：板块 07-08 已下线，兑现不了；
              //    这条是发给**真付费会员**的到期召回文案，不能拿下线功能招揽续费。
              ? "你的书院会员今天到期。作为连续包年用户，现在续费仍享 ¥148/年 优惠价，AI 伴读不间断。"
              : `你的书院会员将于 ${daysLeft} 天后到期。作为连续包年用户，续费仍享 ¥148/年 优惠价。`,
          targetType: "MEMBER",
          targetId: u.id,
        },
      }).catch((err) => this.logger.warn(`会员续费提醒发送失败 userId=${u.id}`, err));
      sent++;
    }
    if (sent > 0) this.logger.log(`连续包年到期提醒已发送 ${sent} 条`);
    return sent;
  }
}
