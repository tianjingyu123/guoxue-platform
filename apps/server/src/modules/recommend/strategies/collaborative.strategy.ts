import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

@Injectable()
export class CollaborativeStrategy extends BaseRecommendStrategy {
  name = "collaborative";
  // 协同过滤适用于所有含 contentId 的场景
  private supportedScenes = new Set([
    RecommendScene.COURSE_DETAIL,
    RecommendScene.PRODUCT_DETAIL,
    RecommendScene.PAIPAN_RESULT,
    RecommendScene.GUESS_LIKE,
    RecommendScene.COURSE_LEARN,
  ]);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  supports(scene: RecommendScene): boolean {
    return this.supportedScenes.has(scene);
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!ctx.contentId) return [];

    // 从当前 contentId 推断 itemType（优先使用上下文推断）
    const itemType = this.inferType(ctx);

    // 读 Redis 相似度矩阵
    const redisKey = `recommend:collab:sim:${itemType}:${ctx.contentId}:v1`;
    const similar = await this.redis.getJson<
      { simItemId: string; simItemType: string; score: number }[]
    >(redisKey);

    if (!similar || similar.length === 0) return [];

    // 按类型分组查询详情
    const byType = new Map<string, string[]>();
    for (const s of similar) {
      if (!byType.has(s.simItemType)) byType.set(s.simItemType, []);
      byType.get(s.simItemType)!.push(s.simItemId);
    }

    const items: RecommendItem[] = [];

    for (const [type, ids] of byType) {
      const scoreMap = new Map(
        similar.filter((s) => s.simItemType === type).map((s) => [s.simItemId, s.score]),
      );

      if (type === "COURSE") {
        const courses = await this.prisma.course.findMany({
          where: { id: { in: ids }, auditStatus: "APPROVED" },
          select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
        });
        for (const c of courses) {
          items.push({
            id: c.id,
            type: "COURSE",
            title: c.title,
            cover: c.cover ?? undefined,
            excerpt: c.intro ?? undefined,
            tags: c.tags,
            score: (scoreMap.get(c.id) ?? 0.1) * 1000,
            reason: "喜欢此内容的人也喜欢",
            strategies: ["collaborative"],
            metadata: { price: Number(c.price), studentCount: c.studentCount },
          });
        }
      } else if (type === "PRODUCT") {
        const products = await this.prisma.product.findMany({
          where: { id: { in: ids }, status: "ON_SALE" },
          select: { id: true, title: true, images: true, intro: true, tags: true, price: true, salesCount: true },
        });
        for (const p of products) {
          items.push({
            id: p.id,
            type: "PRODUCT",
            title: p.title,
            cover: p.images?.[0],
            excerpt: p.intro ?? undefined,
            tags: p.tags,
            score: (scoreMap.get(p.id) ?? 0.1) * 1000,
            reason: "喜欢此内容的人也喜欢",
            strategies: ["collaborative"],
            metadata: { price: Number(p.price), salesCount: p.salesCount },
          });
        }
      }
    }

    // 按相似度排序
    return items.sort((a, b) => b.score - a.score).slice(0, ctx.pageSize * 2);
  }

  private inferType(ctx: RecommendContext): string {
    switch (ctx.scene) {
      case RecommendScene.COURSE_DETAIL:
      case RecommendScene.COURSE_LEARN:
        return "COURSE";
      case RecommendScene.PRODUCT_DETAIL:
        return "PRODUCT";
      case RecommendScene.ARTICLE_DETAIL:
        return "ARTICLE";
      default:
        return ctx.targetTags?.[0] ?? "COURSE";
    }
  }
}
