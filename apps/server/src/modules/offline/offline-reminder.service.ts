import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

/** 单轮扫描发送上限，防雪崩 */
const REMINDER_BATCH_LIMIT = 500;
/** Redis 防重 TTL：48h（覆盖 24h 档提醒到开课的全程） */
const REMINDER_DEDUP_TTL = 48 * 3600;
/** 扫描窗口宽度：与 cron 周期一致的 10 分钟，保证不重不漏 */
const WINDOW_MS = 10 * 60 * 1000;

interface CourseBrief {
  id: string;
  title: string;
  startTime: Date;
  location: string;
}

/**
 * 线下课通知触点（T8 驿站 OMO P0）
 * - 报名成功/取消报名 即时站内通知（失败吞掉，不影响主流程）
 * - 开课提醒 cron：每 10 分钟扫 [now+24h, +10m) 与 [now+2h, +10m) 的 REGISTERED 报名
 *   Redis setNX 防重（key offline:reminder:{registrationId}:{h24|h2}）
 */
@Injectable()
export class OfflineReminderService {
  private readonly logger = new Logger(OfflineReminderService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notification: NotificationService,
  ) {}

  /** 格式化开课时间：×月×日 ×时 */
  private formatStart(t: Date): string {
    const d = new Date(t);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}时`;
  }

  /** 报名成功即时通知（通知失败 catch 吞掉，不影响报名主流程） */
  async notifyRegistered(userId: string, course: CourseBrief): Promise<void> {
    try {
      await this.notification.send(userId, {
        type: "OFFLINE_COURSE",
        title: "报名成功",
        content: `报名成功：《${course.title}》${this.formatStart(course.startTime)} @${course.location}，开课前我们会提醒你`,
        targetType: "OFFLINE_COURSE",
        targetId: course.id,
      });
    } catch (e) {
      this.logger.warn(`报名成功通知发送失败（不影响报名主流程）: ${(e as Error).message}`);
    }
  }

  /** 取消报名确认通知（失败吞掉） */
  async notifyCancelled(userId: string, course: CourseBrief): Promise<void> {
    try {
      await this.notification.send(userId, {
        type: "OFFLINE_COURSE",
        title: "取消报名成功",
        content: `你已取消报名：《${course.title}》${this.formatStart(course.startTime)} @${course.location}`,
        targetType: "OFFLINE_COURSE",
        targetId: course.id,
      });
    } catch (e) {
      this.logger.warn(`取消报名通知发送失败: ${(e as Error).message}`);
    }
  }

  /** 开课提醒扫描：每 10 分钟一轮，两档窗口（24h/2h），单轮总量 ≤500 */
  @Cron("*/10 * * * *")
  async scanAndRemind(): Promise<number> {
    const now = Date.now();
    const tiers = [
      { key: "h24", offsetMs: 24 * 3600 * 1000, title: "明天开课提醒", label: "明天" },
      { key: "h2", offsetMs: 2 * 3600 * 1000, title: "开课提醒", label: "2小时后" },
    ] as const;

    let budget = REMINDER_BATCH_LIMIT;
    let sent = 0;
    for (const tier of tiers) {
      if (budget <= 0) break;
      const gte = new Date(now + tier.offsetMs);
      const lt = new Date(now + tier.offsetMs + WINDOW_MS);

      let regs: { id: string; userId: string; course: CourseBrief }[];
      try {
        regs = await this.prisma.offlineCourseRegistration.findMany({
          where: { status: "REGISTERED", course: { startTime: { gte, lt } } },
          include: { course: { select: { id: true, title: true, startTime: true, location: true } } },
          take: budget,
        });
      } catch (e) {
        this.logger.error(`开课提醒扫描失败[${tier.key}]: ${(e as Error).message}`);
        continue;
      }

      for (const reg of regs) {
        budget--;
        const dedupKey = `offline:reminder:${reg.id}:${tier.key}`;
        try {
          const first = await this.redis.setNX(dedupKey, "1", REMINDER_DEDUP_TTL);
          if (!first) continue; // 已提醒过，防重跳过
          await this.notification.send(reg.userId, {
            type: "OFFLINE_COURSE",
            title: tier.title,
            content: `《${reg.course.title}》${tier.label}开课：${this.formatStart(reg.course.startTime)} @${reg.course.location}，请准时到场`,
            targetType: "OFFLINE_COURSE",
            targetId: reg.course.id,
          });
          sent++;
        } catch (e) {
          this.logger.warn(`开课提醒发送失败 reg=${reg.id}: ${(e as Error).message}`);
        }
      }
    }
    if (sent > 0) this.logger.log(`开课提醒本轮发送 ${sent} 条`);
    return sent;
  }
}
