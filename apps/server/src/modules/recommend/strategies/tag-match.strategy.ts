import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

@Injectable()
export class TagMatchStrategy extends BaseRecommendStrategy {
  name = "tag-match";
  private readonly logger = new Logger(TagMatchStrategy.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  supports(_scene: RecommendScene): boolean {
    return true; // 标签匹配是通用策略，所有场景可用
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    const tags = ctx.targetTags ?? [];
    if (tags.length === 0 && !ctx.contentId) return [];

    // 如果有 contentId，先查内容标签
    let matchTags = tags;
    if (matchTags.length === 0 && ctx.contentId) {
      matchTags = await this.resolveTags(ctx);
    }
    if (matchTags.length === 0) return [];

    const items: RecommendItem[] = [];

    // 并行查询各类型标签匹配内容
    const [courses, products, circles, articles] = await Promise.all([
      this.prisma.course.findMany({
        where: { tags: { hasSome: matchTags }, auditStatus: "APPROVED", visibility: "PLATFORM", ...(ctx.contentId ? { id: { not: ctx.contentId } } : {}) },
        select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
        take: 6, orderBy: { studentCount: "desc" },
      }),
      this.prisma.product.findMany({
        where: { tags: { hasSome: matchTags }, status: "ON_SALE", ...(ctx.contentId ? { id: { not: ctx.contentId } } : {}) },
        select: { id: true, title: true, images: true, intro: true, tags: true, price: true, salesCount: true },
        take: 6, orderBy: { salesCount: "desc" },
      }),
      this.prisma.circle.findMany({
        where: { tags: { hasSome: matchTags }, status: "ACTIVE" },
        select: { id: true, name: true, cover: true, intro: true, tags: true, memberCount: true },
        take: 4, orderBy: { memberCount: "desc" },
      }),
      this.prisma.article.findMany({
        where: { tags: { hasSome: matchTags }, auditStatus: "APPROVED", visibility: "PLATFORM", ...(ctx.contentId ? { id: { not: ctx.contentId } } : {}) },
        select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
        take: 6, orderBy: { viewCount: "desc" },
      }),
    ]);

    for (const c of courses) {
      items.push({
        id: c.id, type: "COURSE", title: c.title,
        cover: c.cover ?? undefined, excerpt: c.intro ?? undefined,
        tags: c.tags, score: (c.studentCount ?? 0) * 0.5,
        reason: "标签匹配推荐", strategies: ["tag-match"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      });
    }
    for (const p of products) {
      items.push({
        id: p.id, type: "PRODUCT", title: p.title,
        cover: p.images?.[0], excerpt: p.intro ?? undefined,
        tags: p.tags, score: (p.salesCount ?? 0) * 0.5,
        reason: "标签匹配推荐", strategies: ["tag-match"],
        metadata: { price: Number(p.price), salesCount: p.salesCount },
      });
    }
    for (const c of circles) {
      items.push({
        id: c.id, type: "CIRCLE", title: c.name,
        cover: c.cover ?? undefined, excerpt: c.intro ?? undefined,
        tags: c.tags, score: (c.memberCount ?? 0) * 0.3,
        reason: "标签匹配推荐", strategies: ["tag-match"],
        metadata: { memberCount: c.memberCount },
      });
    }
    for (const a of articles) {
      items.push({
        id: a.id, type: "ARTICLE", title: a.title,
        cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined,
        tags: a.tags, score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2,
        reason: "标签匹配推荐", strategies: ["tag-match"],
        metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
      });
    }

    return items.sort((a, b) => b.score - a.score).slice(0, ctx.pageSize * 2);
  }

  private async resolveTags(ctx: RecommendContext): Promise<string[]> {
    // 尝试从 article/course/product 中解析标签
    const [article, course, product] = await Promise.all([
      this.prisma.article.findUnique({ where: { id: ctx.contentId }, select: { tags: true } }).catch((err: Error) => { this.logger.warn("获取文章标签失败", err.message); return null; }),
      this.prisma.course.findUnique({ where: { id: ctx.contentId }, select: { tags: true } }).catch((err: Error) => { this.logger.warn("获取课程标签失败", err.message); return null; }),
      this.prisma.product.findUnique({ where: { id: ctx.contentId }, select: { tags: true } }).catch((err: Error) => { this.logger.warn("获取商品标签失败", err.message); return null; }),
    ]);
    return article?.tags ?? course?.tags ?? product?.tags ?? [];
  }
}
