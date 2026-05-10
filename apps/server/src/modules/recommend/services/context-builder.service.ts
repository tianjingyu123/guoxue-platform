import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { RecommendContext, RecommendScene } from "../recommend.dto";

/**
 * 推荐上下文构建服务
 * 从请求参数中聚合跨模块数据，丰富 RecommendContext
 */
@Injectable()
export class ContextBuilderService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * 根据 contentId 和场景自动解析目标标签
   */
  async resolveTags(contentId?: string, scene?: RecommendScene): Promise<string[]> {
    if (!contentId) return [];

    const cacheKey = `recommend:ctx:tags:${contentId}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return cached;

    let tags: string[] = [];

    if (!scene || scene === RecommendScene.ARTICLE_DETAIL) {
      const article = await this.prisma.article.findUnique({
        where: { id: contentId },
        select: { tags: true },
      });
      if (article) tags = article.tags ?? [];
    }

    if (tags.length === 0 && (!scene || scene === RecommendScene.COURSE_DETAIL || scene === RecommendScene.COURSE_LEARN)) {
      const course = await this.prisma.course.findUnique({
        where: { id: contentId },
        select: { tags: true },
      });
      if (course) tags = course.tags ?? [];
    }

    if (tags.length === 0 && (!scene || scene === RecommendScene.PRODUCT_DETAIL)) {
      const product = await this.prisma.product.findUnique({
        where: { id: contentId },
        select: { tags: true },
      });
      if (product) tags = product.tags ?? [];
    }

    await this.redis.setJson(cacheKey, tags, 600);
    return tags;
  }

  /**
   * 构建完整的 RecommendContext
   */
  async build(params: {
    scene: RecommendScene;
    userId?: string;
    stationId?: string;
    contentId?: string;
    paipanType?: string;
    listType?: string;
    orderItemIds?: string[];
    excludeIds?: string[];
    page: number;
    pageSize: number;
  }): Promise<RecommendContext> {
    const tags = await this.resolveTags(params.contentId, params.scene);

    return {
      scene: params.scene,
      userId: params.userId,
      stationId: params.stationId,
      contentId: params.contentId,
      targetTags: tags,
      paipanType: params.paipanType,
      listType: params.listType,
      orderItemIds: params.orderItemIds,
      excludeIds: params.excludeIds,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
