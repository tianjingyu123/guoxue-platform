import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

/** 单轮扫描发送上限，防雪崩（课程+活动共享预算） */
const REMINDER_BATCH_LIMIT = 500;
/** Redis 防重 TTL：48h（覆盖 24h 档提醒到开课/开场的全程） */
const REMINDER_DEDUP_TTL = 48 * 3600;
/** 扫描窗口宽度：与 cron 周期一致的 10 分钟，保证不重不漏 */
const WINDOW_MS = 10 * 60 * 1000;

interface CourseBrief {
  id: string;
  title: string;
  startTime: Date;
  location: string;
}

/** 活动摘要（与课程同构：id/标题/开场时间/地点） */
interface EventBrief {
  id: string;
  title: string;
  startTime: Date;
  location: string;
}

/**
 * 线下课+驿站活动通知触点（T8 驿站 OMO P0 课程 / P1a 活动）
 * - 报名成功/取消报名 即时站内通知（失败吞掉，不影响主流程）
 * - 开课/开场提醒 cron：每 10 分钟扫 [now+24h, +10m) 与 [now+2h, +10m) 的 REGISTERED 报名
 *   Redis setNX 防重（课程 key offline:reminder:{registrationId}:{h24|h2}，
 *   活动 key offline:event-reminder:{registrationId}:{h24|h2}）
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

  // ───────── 驿站活动即时通知（T8 OMO P1a·与课程同构） ─────────

  /** 活动报名成功即时通知（失败吞掉，不影响报名主流程） */
  async notifyEventRegistered(userId: string, event: EventBrief): Promise<void> {
    try {
      await this.notification.send(userId, {
        type: "STATION_EVENT",
        title: "活动报名成功",
        content: `报名成功：「${event.title}」${this.formatStart(event.startTime)} @${event.location}，开场前我们会提醒你`,
        targetType: "STATION_EVENT",
        targetId: event.id,
      });
    } catch (e) {
      this.logger.warn(`活动报名成功通知发送失败（不影响报名主流程）: ${(e as Error).message}`);
    }
  }

  /** 用户取消活动报名确认通知（失败吞掉） */
  async notifyEventCancelled(userId: string, event: EventBrief): Promise<void> {
    try {
      await this.notification.send(userId, {
        type: "STATION_EVENT",
        title: "取消报名成功",
        content: `你已取消报名：「${event.title}」${this.formatStart(event.startTime)} @${event.location}`,
        targetType: "STATION_EVENT",
        targetId: event.id,
      });
    } catch (e) {
      this.logger.warn(`活动取消报名通知发送失败: ${(e as Error).message}`);
    }
  }

  /** 驿站取消活动 → 群发通知全部 REGISTERED 报名者（单条失败不阻断其余） */
  async notifyEventCancelledByStation(userIds: string[], event: EventBrief): Promise<number> {
    let sent = 0;
    for (const userId of userIds) {
      try {
        await this.notification.send(userId, {
          type: "STATION_EVENT",
          title: "活动已取消",
          content: `很抱歉，「${event.title}」（原定 ${this.formatStart(event.startTime)} @${event.location}）已被主办方取消，报名已自动失效`,
          targetType: "STATION_EVENT",
          targetId: event.id,
        });
        sent++;
      } catch (e) {
        this.logger.warn(`活动取消群发通知失败 user=${userId}: ${(e as Error).message}`);
      }
    }
    return sent;
  }

  /** 开课/开场提醒扫描：每 10 分钟一轮，两档窗口（24h/2h），课程+活动共享单轮总量 ≤500 */
  @Cron("*/10 * * * *")
  async scanAndRemind(): Promise<number> {
    const now = Date.now();
    const tiers = [
      { key: "h24", offsetMs: 24 * 3600 * 1000, title: "明天开课提醒", eventTitle: "明天活动提醒", label: "明天" },
      { key: "h2", offsetMs: 2 * 3600 * 1000, title: "开课提醒", eventTitle: "活动开场提醒", label: "2小时后" },
    ] as const;

    let budget = REMINDER_BATCH_LIMIT;
    let sent = 0;
    for (const tier of tiers) {
      if (budget <= 0) break;
      const gte = new Date(now + tier.offsetMs);
      const lt = new Date(now + tier.offsetMs + WINDOW_MS);

      // ── 课程报名扫描 ──
      let regs: { id: string; userId: string; course: CourseBrief }[];
      try {
        regs = await this.prisma.offlineCourseRegistration.findMany({
          where: { status: "REGISTERED", course: { startTime: { gte, lt } } },
          include: { course: { select: { id: true, title: true, startTime: true, location: true } } },
          take: budget,
        });
      } catch (e) {
        this.logger.error(`开课提醒扫描失败[${tier.key}]: ${(e as Error).message}`);
        regs = [];
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

      if (budget <= 0) break;

      // ── 活动报名扫描（T8 OMO P1a·仅已发布活动） ──
      let eventRegs: { id: string; userId: string; event: EventBrief }[];
      try {
        eventRegs = await this.prisma.stationEventRegistration.findMany({
          where: { status: "REGISTERED", event: { status: "PUBLISHED", startTime: { gte, lt } } },
          include: { event: { select: { id: true, title: true, startTime: true, location: true } } },
          take: budget,
        });
      } catch (e) {
        this.logger.error(`活动提醒扫描失败[${tier.key}]: ${(e as Error).message}`);
        eventRegs = [];
      }

      for (const reg of eventRegs) {
        budget--;
        const dedupKey = `offline:event-reminder:${reg.id}:${tier.key}`;
        try {
          const first = await this.redis.setNX(dedupKey, "1", REMINDER_DEDUP_TTL);
          if (!first) continue; // 已提醒过，防重跳过
          await this.notification.send(reg.userId, {
            type: "STATION_EVENT",
            title: tier.eventTitle,
            content: `「${reg.event.title}」${tier.label}开场：${this.formatStart(reg.event.startTime)} @${reg.event.location}，请准时到场`,
            targetType: "STATION_EVENT",
            targetId: reg.event.id,
          });
          sent++;
        } catch (e) {
          this.logger.warn(`活动提醒发送失败 reg=${reg.id}: ${(e as Error).message}`);
        }
      }
    }
    if (sent > 0) this.logger.log(`开课/活动提醒本轮发送 ${sent} 条`);
    return sent;
  }
}
