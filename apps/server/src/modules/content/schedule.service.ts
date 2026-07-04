import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 每分钟检查到期内容并自动发布（Redis分布式锁防多实例重叠） */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduled() {
    await this.redis.runExclusive("content_publish_scheduled", 600, () => this._publishScheduled());
  }

  private async _publishScheduled() {
    try {
      const now = new Date();
      const published: string[] = [];

      // 内容表
      const contents = await this.prisma.content.updateMany({
        where: { scheduledAt: { lte: now }, status: "DRAFT" },
        data: { status: "PUBLISHED", scheduledAt: null },
      });
      if (contents.count > 0) published.push(`Content:${contents.count}`);

      // 文章
      const articles = await this.prisma.article.updateMany({
        where: { scheduledAt: { lte: now }, auditStatus: "PENDING" },
        data: { auditStatus: "APPROVED", scheduledAt: null },
      });
      if (articles.count > 0) published.push(`Article:${articles.count}`);

      // 帖子
      const posts = await this.prisma.post.updateMany({
        where: { scheduledAt: { lte: now }, status: "DRAFT" },
        data: { status: "PUBLISHED", scheduledAt: null },
      });
      if (posts.count > 0) published.push(`Post:${posts.count}`);

      // 课程
      const courses = await this.prisma.course.updateMany({
        where: { scheduledAt: { lte: now }, auditStatus: "PENDING" },
        data: { auditStatus: "APPROVED", scheduledAt: null },
      });
      if (courses.count > 0) published.push(`Course:${courses.count}`);

      if (published.length > 0) {
        this.logger.log(`定时发布完成: ${published.join(", ")}`);
      }
    } catch (err: any) {
      this.logger.error(`定时发布失败: ${err.message}`);
    }
  }
}
