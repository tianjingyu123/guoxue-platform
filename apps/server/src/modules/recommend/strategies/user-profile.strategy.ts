import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

@Injectable()
export class UserProfileStrategy extends BaseRecommendStrategy {
  name = "user-profile";

  private supportedScenes = new Set([
    RecommendScene.PAYMENT_SUCCESS,
    RecommendScene.GUESS_LIKE,
    RecommendScene.PAIPAN_RESULT,
    RecommendScene.COURSE_LEARN,
  ]);

  constructor(private prisma: PrismaService) {
    super();
  }

  supports(scene: RecommendScene): boolean {
    return this.supportedScenes.has(scene);
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!ctx.userId) return [];

    // 获取用户兴趣标签 Top-5
    const interests = await this.prisma.userInterest.findMany({
      where: { userId: ctx.userId },
      orderBy: { score: "desc" },
      take: 5,
      select: { tag: true, score: true },
    });

    if (interests.length === 0) return [];

    const topTags = interests.map((i) => i.tag);
    const tagWeight = new Map(interests.map((i) => [i.tag, i.score]));

    const items: RecommendItem[] = [];

    // 按兴趣标签并行查询各类型内容
    const [courses, products, circles, articles] = await Promise.all([
      this.prisma.course.findMany({
        where: { tags: { hasSome: topTags }, auditStatus: "APPROVED", visibility: "PLATFORM" },
        select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
        take: 6,
        orderBy: { studentCount: "desc" },
      }),
      this.prisma.product.findMany({
        where: { tags: { hasSome: topTags }, status: "ON_SALE" },
        select: { id: true, title: true, images: true, intro: true, tags: true, price: true, salesCount: true },
        take: 6,
        orderBy: { salesCount: "desc" },
      }),
      this.prisma.circle.findMany({
        where: { tags: { hasSome: topTags }, status: "ACTIVE" },
        select: { id: true, name: true, cover: true, intro: true, tags: true, memberCount: true },
        take: 4,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.article.findMany({
        where: { tags: { hasSome: topTags }, auditStatus: "APPROVED", visibility: "PLATFORM" },
        select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
        take: 4,
        orderBy: { viewCount: "desc" },
      }),
    ]);

    // 计算加权评分 = 兴趣标签得分 × 内容热度
    const calcTagScore = (tags: string[]): number => {
      let s = 0;
      for (const t of tags) s += tagWeight.get(t) ?? 0;
      return s;
    };

    for (const c of courses) {
      const tagScore = calcTagScore(c.tags ?? []);
      items.push({
        id: c.id, type: "COURSE",
        title: c.title, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags,
        score: tagScore * 10 + (c.studentCount ?? 0),
        reason: "根据你的兴趣推荐", strategies: ["user-profile"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      });
    }

    for (const p of products) {
      const tagScore = calcTagScore(p.tags ?? []);
      items.push({
        id: p.id, type: "PRODUCT",
        title: p.title, cover: p.images?.[0],
        excerpt: p.intro ?? undefined, tags: p.tags,
        score: tagScore * 10 + (p.salesCount ?? 0),
        reason: "根据你的兴趣推荐", strategies: ["user-profile"],
        metadata: { price: Number(p.price), salesCount: p.salesCount },
      });
    }

    for (const c of circles) {
      const tagScore = calcTagScore(c.tags ?? []);
      items.push({
        id: c.id, type: "CIRCLE",
        title: c.name, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags,
        score: tagScore * 5 + (c.memberCount ?? 0),
        reason: "根据你的兴趣推荐", strategies: ["user-profile"],
        metadata: { memberCount: c.memberCount },
      });
    }

    for (const a of articles) {
      const tagScore = calcTagScore(a.tags ?? []);
      items.push({
        id: a.id, type: "ARTICLE",
        title: a.title, cover: a.cover ?? undefined,
        excerpt: a.excerpt ?? undefined, tags: a.tags,
        score: tagScore * 5 + (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2,
        reason: "根据你的兴趣推荐", strategies: ["user-profile"],
        metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
      });
    }

    return items.sort((a, b) => b.score - a.score);
  }
}
