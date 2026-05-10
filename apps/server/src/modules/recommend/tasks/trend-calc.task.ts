import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

@Injectable()
export class TrendCalcTask {
  private readonly logger = new Logger(TrendCalcTask.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Cron("*/5 * * * *")
  async calcPlatformTrending() {
    this.logger.log("刷新全平台热度排行...");

    const [articles, courses, products, circles] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED" }, select: { id: true, viewCount: true, likeCount: true }, take: 20, orderBy: { viewCount: "desc" } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: { id: true, studentCount: true }, take: 20, orderBy: { studentCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: { id: true, salesCount: true }, take: 20, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE" }, select: { id: true, memberCount: true }, take: 20, orderBy: { memberCount: "desc" } }),
    ]);

    const trending = {
      articleIds: articles.map((a) => a.id),
      courseIds: courses.map((c) => c.id),
      productIds: products.map((p) => p.id),
      circleIds: circles.map((c) => c.id),
      updatedAt: new Date().toISOString(),
    };

    await this.redis.setJson("recommend:stats:platform_trending:v1", trending, 180);
    this.logger.log("全平台热度排行已刷新");
  }
}
