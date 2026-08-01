import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { NotificationService } from "../notification/notification.service";

@Injectable()
export class CourseSchedulerService {
  private readonly logger = new Logger(CourseSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private notification?: NotificationService,
  ) {}

  /** 每分钟检查定时发布的课程（分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledCourses() {
    await this.redis.runExclusive("course_publish_scheduled_courses", 600, () =>
      this._publishScheduledCourses(),
    );
  }

  /** 每分钟检查定时上架/下架的课程（后台课程编辑器·2026-07-11·分布式锁防多实例重复） */
  @Cron(CronExpression.EVERY_MINUTE)
  async flipScheduledOnOff() {
    await this.redis.runExclusive("course_flip_scheduled_on_off", 600, () =>
      this._flipScheduledOnOff(),
    );
  }

  private async _flipScheduledOnOff() {
    try {
      const now = new Date();
      // 先下架后上架：同一门课两者同时到点时以最终写入（上架）为准的歧义交给运营，正常场景不并存
      const offDue = await this.prisma.course.findMany({
        where: { scheduledOffAt: { lte: now } },
        select: { id: true },
      });
      if (offDue.length > 0) {
        await this.prisma.course.updateMany({
          where: { id: { in: offDue.map((c) => c.id) } },
          data: { auditStatus: "DRAFT", scheduledOffAt: null },
        });
        this.logger.log(`定时下架: ${offDue.length} 门课程 → DRAFT`);
      }
      const onDue = await this.prisma.course.findMany({
        where: { scheduledOnAt: { lte: now } },
        select: { id: true },
      });
      if (onDue.length > 0) {
        await this.prisma.course.updateMany({
          where: { id: { in: onDue.map((c) => c.id) } },
          data: { auditStatus: "APPROVED", scheduledOnAt: null },
        });
        this.logger.log(`定时上架: ${onDue.length} 门课程 → APPROVED`);
      }
      if (offDue.length > 0 || onDue.length > 0) {
        await this.redis.delByPattern("courses:list:*");
        await Promise.all(
          [...offDue, ...onDue].map((c) => this.redis.del(`courses:detail:${c.id}`)),
        );
      }
    } catch (err) {
      this.logger.error("定时上下架翻转失败", err);
    }
  }

  private async _publishScheduledCourses() {
    try {
      const now = new Date();
      const result = await this.prisma.course.updateMany({
        where: {
          scheduledAt: { lte: now },
          auditStatus: "DRAFT",
        },
        data: {
          auditStatus: "PENDING",
          createdAt: now,
        },
      });
      if (result.count > 0) {
        this.logger.log(`定时发布: ${result.count} 门课程已提交审核`);
      }
    } catch (err) {
      this.logger.error("定时发布课程失败", err);
    }
  }

  /** 每天9点检查即将到期的课程，发送提醒（分布式锁防多实例重复） */
  @Cron("0 9 * * *")
  async checkExpiringCourses() {
    if (!this.notification) return;
    await this.redis.runExclusive("course_check_expiring_courses", 600, () =>
      this._checkExpiringCourses(),
    );
  }

  private async _checkExpiringCourses() {
    if (!this.notification) return;
    try {
      // 获取所有有效期课程
      const courses = await this.prisma.course.findMany({
        where: { validityDays: { gt: 0 }, auditStatus: "APPROVED" },
        select: { id: true, title: true, validityDays: true },
      });

      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) return;

      // 批量查询所有相关订单（避免 N+1）
      const allOrders = await this.prisma.order.findMany({
        where: {
          type: "COURSE",
          targetId: { in: courseIds },
          status: { in: ["PAID", "COMPLETED"] },
          paidAt: { not: null },
        },
        select: { targetId: true, userId: true, paidAt: true },
      });

      // 按课程分组
      const ordersByCourse = new Map<string, { userId: string; paidAt: Date }[]>();
      for (const o of allOrders) {
        const list = ordersByCourse.get(o.targetId) || [];
        list.push({ userId: o.userId, paidAt: o.paidAt! });
        ordersByCourse.set(o.targetId, list);
      }

      const now = Date.now();
      let notified = 0;

      for (const course of courses) {
        const orders = ordersByCourse.get(course.id) || [];
        const userIdsToNotify: string[] = [];

        for (const order of orders) {
          const expiresAt = order.paidAt.getTime() + course.validityDays * 86400000;
          const remainingDays = Math.ceil((expiresAt - now) / 86400000);
          if (remainingDays > 0 && remainingDays <= 3) {
            userIdsToNotify.push(order.userId);
          }
        }

        if (userIdsToNotify.length > 0) {
          await this.notification.batchSend({
            userIds: userIdsToNotify,
            type: "SYSTEM",
            title: "课程即将到期",
            content: `您购买的课程《${course.title}》即将在3天内到期，请尽快完成学习`,
            targetType: "COURSE",
            targetId: course.id,
          });
          notified += userIdsToNotify.length;
        }
      }

      if (notified > 0) {
        this.logger.log(`到期提醒: 向 ${notified} 名用户发送了课程到期通知`);
      }
    } catch (err) {
      this.logger.error("到期提醒检查失败", err);
    }
  }

  /** 每天凌晨2点巡检已过期课程（统计+日志，实际拦截在 checkAccess 中执行·分布式锁防多实例重复） */
  @Cron("0 2 * * *")
  async handleExpiredCourses() {
    await this.redis.runExclusive("course_handle_expired_courses", 600, () =>
      this._handleExpiredCourses(),
    );
  }

  private async _handleExpiredCourses() {
    try {
      const courses = await this.prisma.course.findMany({
        where: { validityDays: { gt: 0 }, auditStatus: "APPROVED" },
        select: { id: true, validityDays: true },
      });

      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) return;

      // 批量查询所有相关订单（避免 N+1）
      const orders = await this.prisma.order.findMany({
        where: {
          type: "COURSE",
          targetId: { in: courseIds },
          status: { in: ["PAID", "COMPLETED"] },
          paidAt: { not: null },
        },
        select: { targetId: true, userId: true, paidAt: true },
      });

      const validityMap = new Map(courses.map((c) => [c.id, c.validityDays]));
      const now = Date.now();
      let expiredCount = 0;

      for (const order of orders) {
        const validityDays = validityMap.get(order.targetId) || 0;
        if (!order.paidAt) continue;
        const expiresAt = order.paidAt.getTime() + validityDays * 86400000;
        if (expiresAt <= now) expiredCount++;
      }

      if (expiredCount > 0) {
        this.logger.log(`过期巡检: ${expiredCount} 条学习记录已过期（共 ${orders.length} 条有效订单，${courses.length} 门有效期课程）`);
      }
    } catch (err) {
      this.logger.error("过期课程巡检失败", err);
    }
  }
}
