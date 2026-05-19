import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ContentGenerationService } from "../content-generation/content-generation.service";

@Injectable()
export class OperationEngineService {
  private readonly logger = new Logger(OperationEngineService.name);
  private rotating = false;
  private detecting = false;
  private marking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGeneration: ContentGenerationService,
  ) {}

  // ═══════════════════ 内容轮换推荐 ═══════════════════

  /** 每日凌晨2点：轮换首页推荐内容 */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async rotateHomepageContent() {
    if (this.rotating) { this.logger.warn("首页轮换正在执行中，跳过"); return; }
    this.rotating = true;
    try {
    this.logger.log("开始轮换首页推荐内容");

    // 找到最近3天内的优质内容，随机选择推首页
    const recentContent = await this.prisma.content.findMany({
      where: {
        status: "PUBLISHED",
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        viewCount: { gte: 10 },
      },
      select: { id: true, title: true, likeCount: true, viewCount: true },
      orderBy: { likeCount: "desc" },
      take: 50,
    });

    // 随机选取20条作为今日推荐
    const shuffled = recentContent.sort(() => Math.random() - 0.5);
    const todayPicks = shuffled.slice(0, 20).map((c) => c.id);

    // 存入 config_system
    const todayStr = new Date().toISOString().slice(0, 10);
    const recValue = JSON.stringify({ date: todayStr, contentIds: todayPicks });
    await this.prisma.configSystem.upsert({
      where: { configKey: "homepage_recommendations" },
      create: { configKey: "homepage_recommendations", configValue: recValue },
      update: { configValue: recValue },
    });

    this.logger.log(`首页推荐轮换完成: ${todayPicks.length} 条`);
    } finally { this.rotating = false; }
  }

  // ═══════════════════ 空板块检测 ═══════════════════

  /** 每6小时检测空板块 */
  @Cron(CronExpression.EVERY_6_HOURS)
  async detectEmptyCategories() {
    if (this.detecting) { this.logger.warn("空板块检测正在执行中，跳过"); return; }
    this.detecting = true;
    try {
    const emptyCategories: Array<{ level1: string; level2: string; count: number }> = [];

    // 按品类分组统计
    const results = await this.prisma.$queryRawUnsafe<
      Array<{ level1: string; level2: string; count: bigint }>
    >(
      `SELECT "categoryLevel1" as level1, "categoryLevel2" as level2, COUNT(*) as count
       FROM "Content"
       WHERE status = 'PUBLISHED'
       GROUP BY "categoryLevel1", "categoryLevel2"`,
    );

    for (const row of results) {
      if (Number(row.count) < 3) {
        emptyCategories.push({
          level1: row.level1,
          level2: row.level2,
          count: Number(row.count),
        });
      }
    }

    if (emptyCategories.length > 0) {
      const alertValue = JSON.stringify({ updatedAt: new Date().toISOString(), categories: emptyCategories });
      await this.prisma.configSystem.upsert({
        where: { configKey: "empty_category_alerts" },
        create: { configKey: "empty_category_alerts", configValue: alertValue },
        update: { configValue: alertValue },
      });

      this.logger.warn(`检测到 ${emptyCategories.length} 个内容不足的品类`);
    }
    } finally { this.detecting = false; }
  }

  /** 对内容不足的品类自动填充AI生成内容 */
  async fillEmptyCategories() {
    this.logger.log("开始自动填充空品类内容");
    await this.contentGeneration.autoFillEmptyCategories();
    this.logger.log("空品类填充完成");
    return { message: "空品类内容填充已触发" };
  }

  // ═══════════════════ 热门内容自动标记 ═══════════════════

  /** 每小时：根据互动数据标记热门内容 */
  @Cron(CronExpression.EVERY_HOUR)
  async markHotContent() {
    if (this.marking) { this.logger.warn("热门标记正在执行中，跳过"); return; }
    this.marking = true;
    try {
    // 综合评分：点赞*3 + 浏览*0.1
    const hotThreshold = 30;

    const contents = await this.prisma.content.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, likeCount: true, viewCount: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const hotIds: string[] = [];
    for (const c of contents) {
      const score = c.likeCount * 3 + c.viewCount * 0.1;
      if (score >= hotThreshold) {
        hotIds.push(c.id);
      }
    }

    // 存入热门推荐池
    const hotPoolValue = JSON.stringify({ updatedAt: new Date().toISOString(), contentIds: hotIds });
    await this.prisma.configSystem.upsert({
      where: { configKey: "hot_content_pool" },
      create: { configKey: "hot_content_pool", configValue: hotPoolValue },
      update: { configValue: hotPoolValue },
    });

    if (hotIds.length > 0) {
      this.logger.log(`热门内容标记完成: ${hotIds.length} 条`);
    }
    return { hotContentCount: hotIds.length, contentIds: hotIds };
    } finally { this.marking = false; }
  }

  // ═══════════════════ 关联推荐算法 ═══════════════════

  /** 根据品类获取关联推荐 */
  async getRelatedRecommendations(categoryLevel1: string, categoryLevel2?: string, limit = 6) {
    // 同品类内容
    const sameCategory = await this.prisma.content.findMany({
      where: {
        status: "PUBLISHED",
        categoryLevel1,
        ...(categoryLevel2 ? { categoryLevel2 } : {}),
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        cover: true,
        categoryLevel1: true,
        categoryLevel2: true,
        viewCount: true,
        likeCount: true,
      },
      orderBy: { viewCount: "desc" },
      take: limit,
    });

    return {
      category: categoryLevel1,
      subcategory: categoryLevel2,
      recommendations: sameCategory,
      total: sameCategory.length,
    };
  }

  /** 批量获取用户个性化推荐 */
  async getPersonalizedRecommendations(userId: string, limit = 10) {
    // 获取用户兴趣品类
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { interestCategories: true },
    });

    const interests = (user?.interestCategories || []).slice(0, 3);
    if (interests.length === 0) return { userId, interests: [], results: [] };

    const perCategory = Math.ceil(limit / interests.length);
    const allItems = await this.prisma.content.findMany({
      where: { status: "PUBLISHED", categoryLevel1: { in: interests } },
      select: { id: true, title: true, excerpt: true, cover: true, categoryLevel1: true, viewCount: true, likeCount: true },
      orderBy: { likeCount: "desc" },
      take: limit * 2,
    });

    const grouped = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const cat = item.categoryLevel1!;
      if (!grouped.has(cat)) grouped.set(cat, []);
      if (grouped.get(cat)!.length < perCategory) grouped.get(cat)!.push(item);
    }

    const results = interests
      .filter((cat) => grouped.has(cat))
      .map((cat) => ({ category: cat, items: grouped.get(cat)! }));

    return { userId, interests, results };
  }

  // ═══════════════════ 运营简报生成 ═══════════════════

  /** 每周一生成运营简报 */
  @Cron("0 9 * * 1")
  async generateWeeklyBrief() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

    const [newContent, newUsers, totalInteractions] = await Promise.all([
      this.prisma.content.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.content.aggregate({
        _sum: { likeCount: true, viewCount: true },
        where: { createdAt: { gte: weekAgo } },
      }),
    ]);

    const brief = {
      period: `${fmtDate(weekAgo)} ~ ${fmtDate(now)}`,
      newContent,
      newUsers,
      totalLikes: totalInteractions._sum.likeCount || 0,
      totalViews: totalInteractions._sum.viewCount || 0,
      generatedAt: now.toISOString(),
    };

    await this.prisma.configSystem.upsert({
      where: { configKey: "weekly_operation_brief" },
      create: { configKey: "weekly_operation_brief", configValue: JSON.stringify(brief) },
      update: { configValue: JSON.stringify(brief) },
    });

    this.logger.log(`运营周报已生成: ${JSON.stringify(brief)}`);
    return brief;
  }

  // ═══════════════════ API ═══════════════════

  /** 获取运营概览 */
  async getOverview() {
    const [totalContent, totalUsers, totalCircles, recentContent] = await Promise.all([
      this.prisma.content.count({ where: { status: "PUBLISHED" } }),
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.circle.count({ where: { status: "ACTIVE" } }),
      this.prisma.content.count({
        where: { status: "PUBLISHED", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    return { totalContent, totalUsers, totalCircles, recentContent };
  }
}
