import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

@Injectable()
export class UserInterestTask {
  private readonly logger = new Logger(UserInterestTask.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async updateUserInterests() {
    await this.redis.runExclusive("recommend_user_interest", 1800, () => this._updateUserInterests());
  }

  private async _updateUserInterests() {
    this.logger.log("开始更新用户兴趣标签...");

    // 从 UserBehavior 聚合近 90 天用户行为，按标签加权计算兴趣分数
    const recent = new Date();
    recent.setDate(recent.getDate() - 90);

    // 查询有标签的内容被哪些用户互动过
    const [articleInteractions, courseInteractions, productInteractions, circleInteractions] = await Promise.all([
      // 文章互动 — 通过 like/collect 关联
      this.prisma.userBehavior.findMany({
        where: { targetType: "ARTICLE", createdAt: { gte: recent } },
        select: { userId: true, targetId: true, weight: true },
      }),
      this.prisma.userBehavior.findMany({
        where: { targetType: "COURSE", createdAt: { gte: recent } },
        select: { userId: true, targetId: true, weight: true },
      }),
      this.prisma.userBehavior.findMany({
        where: { targetType: "PRODUCT", createdAt: { gte: recent } },
        select: { userId: true, targetId: true, weight: true },
      }),
      this.prisma.userBehavior.findMany({
        where: { targetType: "CIRCLE", createdAt: { gte: recent } },
        select: { userId: true, targetId: true, weight: true },
      }),
    ]);

    // 聚合 (userId, tag) → score
    const scoreMap = new Map<string, number>();

    // 用文章标签映射
    if (articleInteractions.length > 0) {
      const articleIds = [...new Set(articleInteractions.map((i) => i.targetId))];
      const articles = await this.prisma.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, tags: true },
      });
      const tagIndex = new Map<string, string[]>();
      articles.forEach((a) => tagIndex.set(a.id, a.tags ?? []));

      for (const interaction of articleInteractions) {
        const tags = tagIndex.get(interaction.targetId) ?? [];
        for (const tag of tags) {
          const key = `${interaction.userId}:${tag}`;
          scoreMap.set(key, (scoreMap.get(key) ?? 0) + interaction.weight);
        }
      }
    }

    // 用课程标签映射
    if (courseInteractions.length > 0) {
      const courseIds = [...new Set(courseInteractions.map((i) => i.targetId))];
      const courses = await this.prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, tags: true },
      });
      const tagIndex = new Map<string, string[]>();
      courses.forEach((c) => tagIndex.set(c.id, c.tags ?? []));

      for (const interaction of courseInteractions) {
        const tags = tagIndex.get(interaction.targetId) ?? [];
        for (const tag of tags) {
          const key = `${interaction.userId}:${tag}`;
          scoreMap.set(key, (scoreMap.get(key) ?? 0) + interaction.weight);
        }
      }
    }

    // 用商品标签映射
    if (productInteractions.length > 0) {
      const productIds = [...new Set(productInteractions.map((i) => i.targetId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, tags: true },
      });
      const tagIndex = new Map<string, string[]>();
      products.forEach((p) => tagIndex.set(p.id, p.tags ?? []));

      for (const interaction of productInteractions) {
        const tags = tagIndex.get(interaction.targetId) ?? [];
        for (const tag of tags) {
          const key = `${interaction.userId}:${tag}`;
          scoreMap.set(key, (scoreMap.get(key) ?? 0) + interaction.weight);
        }
      }
    }

    // 用圈子标签映射
    if (circleInteractions.length > 0) {
      const circleIds = [...new Set(circleInteractions.map((i) => i.targetId))];
      const circles = await this.prisma.circle.findMany({
        where: { id: { in: circleIds } },
        select: { id: true, tags: true },
      });
      const tagIndex = new Map<string, string[]>();
      circles.forEach((c) => tagIndex.set(c.id, c.tags ?? []));

      for (const interaction of circleInteractions) {
        const tags = tagIndex.get(interaction.targetId) ?? [];
        for (const tag of tags) {
          const key = `${interaction.userId}:${tag}`;
          scoreMap.set(key, (scoreMap.get(key) ?? 0) + interaction.weight);
        }
      }
    }

    // 批量 Upsert UserInterest（事务包裹）
    const upserts = Array.from(scoreMap.entries()).map(([key, score]) => {
      const [userId, tag] = key.split(":", 2);
      return this.prisma.userInterest.upsert({
        where: { userId_tag: { userId, tag } },
        update: { score, updatedAt: new Date() },
        create: { userId, tag, score, source: "BEHAVIOR" },
      });
    });
    await this.prisma.$transaction(upserts);
    const upsertCount = upserts.length;

    // 清理缓存
    const userIds = new Set<string>();
    for (const key of scoreMap.keys()) {
      userIds.add(key.split(":", 1)[0]);
    }
    for (const uid of userIds) {
      await this.redis.delByPattern(`recommend:*:${uid}:*`).catch((err) => this.logger.warn("UserInterest 失败", err));
    }

    this.logger.log(`用户兴趣标签更新完成: ${upsertCount} 条记录`);
  }
}
