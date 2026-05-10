import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { RecommendItem } from "../strategies/base.strategy";

@Injectable()
export class ColdStartService {
  private readonly logger = new Logger(ColdStartService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 检测用户是否为冷启动用户（行为 < 3 条、无兴趣标签） */
  async isColdStart(userId: string): Promise<boolean> {
    const cacheKey = `recommend:coldstart:${userId}`;
    const cached = await this.redis.getJson<boolean>(cacheKey);
    if (cached !== null) return cached;

    const [behaviorCount, interestCount] = await Promise.all([
      this.prisma.userBehavior.count({ where: { userId } }),
      this.prisma.userInterest.count({ where: { userId } }),
    ]);

    const isCold = behaviorCount < 3 && interestCount === 0;
    await this.redis.setJson(cacheKey, isCold, 1800);
    return isCold;
  }

  /** 获取冷启动推荐：平台精选入门内容 */
  async getStarterPack(type?: string): Promise<RecommendItem[]> {
    const cacheKey = `recommend:starter:${type ?? "all"}:v1`;
    const cached = await this.redis.getJson<RecommendItem[]>(cacheKey);
    if (cached) return cached;

    const startTags = ["入门", "基础", "新手", "必学", "精选"];
    const items: RecommendItem[] = [];

    if (!type || type === "COURSE") {
      const courses = await this.prisma.course.findMany({
        where: { tags: { hasSome: startTags }, auditStatus: "APPROVED" },
        select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
        take: 6,
        orderBy: { studentCount: "desc" },
      });
      items.push(...courses.map((c) => ({
        id: c.id, type: "COURSE" as const,
        title: c.title, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags,
        score: (c.studentCount ?? 0) + 5000,
        reason: "入门精选", strategies: ["cold-start", "starter-pack"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      })));
    }

    if (!type || type === "CIRCLE") {
      const circles = await this.prisma.circle.findMany({
        where: { tags: { hasSome: [...startTags, "热门"] }, status: "ACTIVE" },
        select: { id: true, name: true, cover: true, intro: true, tags: true, memberCount: true },
        take: 4,
        orderBy: { memberCount: "desc" },
      });
      items.push(...circles.map((c) => ({
        id: c.id, type: "CIRCLE" as const,
        title: c.name, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags,
        score: (c.memberCount ?? 0) + 3000,
        reason: "热门圈子", strategies: ["cold-start", "starter-pack"],
        metadata: { memberCount: c.memberCount },
      })));
    }

    if (!type || type === "ARTICLE") {
      const articles = await this.prisma.article.findMany({
        where: { tags: { hasSome: startTags }, auditStatus: "APPROVED" },
        select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
        take: 6,
        orderBy: { viewCount: "desc" },
      });
      items.push(...articles.map((a) => ({
        id: a.id, type: "ARTICLE" as const,
        title: a.title, cover: a.cover ?? undefined,
        excerpt: a.excerpt ?? undefined, tags: a.tags,
        score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2 + 2000,
        reason: "精选文章", strategies: ["cold-start", "starter-pack"],
        metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
      })));
    }

    items.sort((a, b) => b.score - a.score);
    await this.redis.setJson(cacheKey, items, 600);
    return items;
  }

  /** 清除用户冷启动缓存 */
  async clearCache(userId: string) {
    await this.redis.del(`recommend:coldstart:${userId}`);
  }

  /** 获取默认兴趣标签（新用户引导页用） */
  async getDefaultInterestTags(): Promise<{ tag: string; label: string; icon: string }[]> {
    const cached = await this.redis.getJson<any[]>("recommend:interest-tags:v1");
    if (cached) return cached;

    const tags = [
      { tag: "八字", label: "八字命理", icon: "bazi" },
      { tag: "紫微斗数", label: "紫微斗数", icon: "ziwei" },
      { tag: "风水", label: "风水堪舆", icon: "fengshui" },
      { tag: "易经", label: "易经易经", icon: "yijing" },
      { tag: "中医", label: "中医养生", icon: "zhongyi" },
      { tag: "取名", label: "姓名学", icon: "name" },
      { tag: "面相", label: "相术面相", icon: "face" },
      { tag: "择日", label: "择日择吉", icon: "date" },
      { tag: "六爻", label: "六爻占卜", icon: "liuyao" },
      { tag: "奇门", label: "奇门遁甲", icon: "qimen" },
      { tag: "道德经", label: "道家经典", icon: "tao" },
      { tag: "论语", label: "儒家经典", icon: "confucius" },
    ];
    await this.redis.setJson("recommend:interest-tags:v1", tags, 86400);
    return tags;
  }

  /** 保存用户兴趣标签，并刷新冷启动状态 */
  async saveUserInterests(userId: string, tags: string[]) {
    await Promise.all(tags.map((tag) =>
      this.prisma.userInterest.upsert({
        where: { userId_tag: { userId, tag } },
        create: { userId, tag, score: 1.0, source: "ONBOARDING" },
        update: { score: { increment: 0.5 } },
      }).catch((err) => this.logger.warn("缓存写入失败", err))
    ));

    // 记录行为
    await this.prisma.userBehavior.createMany({
      data: tags.map((tag) => ({
        userId,
        targetType: "INTEREST_TAG",
        targetId: tag,
        behavior: "SEARCH",
      })),
    }).catch((err) => this.logger.warn("推荐日志写入失败", err));

    // 清除冷启动缓存
    await this.clearCache(userId);
  }

  /** 按用户兴趣标签获取个性化入门推荐 */
  async getPersonalizedStarterPack(userId: string): Promise<RecommendItem[]> {
    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
      select: { tag: true },
      orderBy: { score: "desc" },
      take: 3,
    });
    if (interests.length === 0) return this.getStarterPack();

    const tags = interests.map((i) => i.tag);
    const cacheKey = `recommend:starter:personalized:${tags.sort().join(",")}:v1`;
    const cached = await this.redis.getJson<RecommendItem[]>(cacheKey);
    if (cached) return cached;

    const items: RecommendItem[] = [];

    const courses = await this.prisma.course.findMany({
      where: { tags: { hasSome: tags }, auditStatus: "APPROVED" },
      select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
      take: 6,
      orderBy: { studentCount: "desc" },
    });
    items.push(...courses.map((c) => ({
      id: c.id, type: "COURSE" as const,
      title: c.title, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: c.tags,
      score: (c.studentCount ?? 0) + 5000,
      reason: "根据你的兴趣推荐", strategies: ["cold-start", "personalized"],
      metadata: { price: Number(c.price), studentCount: c.studentCount },
    })));

    const articles = await this.prisma.article.findMany({
      where: { tags: { hasSome: tags }, auditStatus: "APPROVED" },
      select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
      take: 6,
      orderBy: { viewCount: "desc" },
    });
    items.push(...articles.map((a) => ({
      id: a.id, type: "ARTICLE" as const,
      title: a.title, cover: a.cover ?? undefined,
      excerpt: a.excerpt ?? undefined, tags: a.tags,
      score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2 + 3000,
      reason: "兴趣匹配文章", strategies: ["cold-start", "personalized"],
      metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
    })));

    // 不足时兜底
    if (items.length < 6) {
      const fallback = await this.getStarterPack();
      items.push(...fallback.slice(0, 6 - items.length));
    }

    items.sort((a, b) => b.score - a.score);
    await this.redis.setJson(cacheKey, items, 600);
    return items;
  }
}
