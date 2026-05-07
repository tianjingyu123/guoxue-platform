import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RecommendService } from "../recommend/recommend.service";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";

@Injectable()
export class ArticleService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private recommend: RecommendService,
  ) {}

  async create(circleId: string, userId: string, dto: CreateArticleDto) {
    // 验证是圈主或管理员
    await this.ensureCircleAdmin(circleId, userId);

    const article = await this.prisma.article.create({
      data: {
        circleId,
        userId,
        title: dto.title,
        content: dto.content,
        cover: dto.cover,
        excerpt: dto.excerpt,
        tags: dto.tags,
        isPushHome: dto.isPushHome ?? false,
      },
    });

    // 文章列表缓存失效
    await this.redis.delByPattern("articles:list:*");
    return article;
  }

  async update(articleId: string, userId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");
    if (article.userId !== userId) throw new ForbiddenException("只能编辑自己的文章");

    const updated = await this.prisma.article.update({
      where: { id: articleId },
      data: dto as any,
    });

    // 列表缓存 + 详情缓存失效
    await Promise.all([
      this.redis.delByPattern("articles:list:*"),
      this.redis.del(`articles:detail:${articleId}`),
    ]);
    return updated;
  }

  async delete(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");
    if (article.userId !== userId) {
      await this.ensureCircleAdmin(article.circleId, userId);
    }

    await this.prisma.article.delete({ where: { id: articleId } });

    // 列表缓存 + 详情缓存失效
    await Promise.all([
      this.redis.delByPattern("articles:list:*"),
      this.redis.del(`articles:detail:${articleId}`),
    ]);
    return { success: true };
  }

  async getDetail(articleId: string) {
    const cacheKey = `articles:detail:${articleId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      // 不阻塞：异步增加浏览数，不等待完成
      this.prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {});
      return cached;
    }

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true, cover: true, memberCount: true } },
        recommends: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!article) throw new NotFoundException("文章不存在");

    // 并发放大浏览数与获取相关推荐
    const [, related] = await Promise.all([
      this.prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
      this.recommend.related(articleId),
    ]);

    const data = { ...article, related };
    await this.redis.setJson(cacheKey, data, 600);
    return data;
  }

  async listArticles(params: {
    page: number;
    pageSize: number;
    circleId?: string;
    tag?: string;
    isPushHome?: boolean;
    auditStatus?: string;
  }) {
    const { page, pageSize, circleId, tag, isPushHome, auditStatus } = params;
    const filterHash = `${circleId ?? ""}:${tag ?? ""}:${isPushHome ?? ""}:${auditStatus ?? ""}`;
    const cacheKey = `articles:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};

    if (circleId) where.circleId = circleId;
    if (tag) where.tags = { has: tag };
    if (isPushHome !== undefined) where.isPushHome = isPushHome;
    if (auditStatus) where.auditStatus = auditStatus;
    else where.auditStatus = "APPROVED"; // 默认只返回审核通过的

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: {
          id: true, title: true, cover: true, excerpt: true, tags: true,
          viewCount: true, likeCount: true, collectCount: true,
          createdAt: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.article.count({ where }),
    ]);

    const data = { articles, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  // ───────── 首页信息流 ─────────

  async getHomeFeed(params: { page: number; pageSize: number; userId?: string }) {
    const { page, pageSize } = params;
    const where: any = { isPushHome: true, auditStatus: "APPROVED" };

    // 热度加权：浏览量×1 + 点赞×2 + 收藏×3
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: {
          id: true, title: true, cover: true, excerpt: true, tags: true,
          viewCount: true, likeCount: true, collectCount: true,
          createdAt: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return { articles, total, page, pageSize };
  }

  async getRelated(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { circleId: true, tags: true },
    });
    if (!article) throw new NotFoundException("文章不存在");

    return this.prisma.article.findMany({
      where: {
        id: { not: articleId },
        auditStatus: "APPROVED",
        OR: [
          { circleId: article.circleId },
          ...(article.tags?.length ? [{ tags: { hasSome: article.tags } }] : []),
        ],
      },
      select: {
        id: true, title: true, cover: true, excerpt: true,
        viewCount: true, likeCount: true, createdAt: true,
        circle: { select: { id: true, name: true } },
      },
      take: 5,
      orderBy: { viewCount: "desc" },
    });
  }

  // ───────── 审核管理 ─────────

  async auditArticle(articleId: string, auditStatus: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");

    return this.prisma.article.update({
      where: { id: articleId },
      data: { auditStatus },
    });
  }

  // ───────── 推荐卡片 ─────────

  async addRecommend(articleId: string, userId: string, dto: AddRecommendDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");
    if (article.userId !== userId) throw new ForbiddenException("只能编辑自己的文章");

    return this.prisma.articleRecommend.create({
      data: {
        articleId,
        recommendType: dto.recommendType,
        targetId: dto.targetId,
        title: dto.title,
        cover: dto.cover,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeRecommend(recommendId: string, userId: string) {
    const rec = await this.prisma.articleRecommend.findUnique({
      where: { id: recommendId },
      include: { article: { select: { userId: true } } },
    });
    if (!rec) throw new NotFoundException("推荐卡片不存在");
    if (rec.article.userId !== userId) throw new ForbiddenException("权限不足");

    await this.prisma.articleRecommend.delete({ where: { id: recommendId } });
    return { success: true };
  }

  // ───────── 私有 ─────────

  private async ensureCircleAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("仅圈主/合伙人/管理员可发布文章");
    }
  }
}
