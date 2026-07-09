import {
  Injectable,
  Logger,
} from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RecommendService } from "../recommend/recommend.service";
import { AuditService } from "../audit/audit.service";
import { safePagination, paginated } from "../../common/pagination";

import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private recommend: RecommendService,
    private audit: AuditService,
  ) {}

  async create(circleId: string, userId: string, dto: CreateArticleDto, isAdmin = false) {
    // 验证是圈主或管理员
    await this.ensureCircleAdmin(circleId, userId);

    // 内容审核（标题+正文+摘要）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.content, dto.excerpt].filter(Boolean).join(" "),
      { scene: "ARTICLE", userId },
    );

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
        stationId: dto.stationId || undefined,
        // 平台管理员发文免审直接可见（对齐课程/商品的 admin 自动过审）
        ...(isAdmin ? { auditStatus: "APPROVED" } : {}),
      },
    });

    // 文章列表缓存失效
    await this.redis.delByPattern("articles:list:*");
    return article;
  }

  async update(articleId: string, userId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的文章");

    // 内容审核（标题+正文+摘要）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.content, dto.excerpt].filter(Boolean).join(" "),
      { scene: "ARTICLE_EDIT", userId, dataId: articleId },
    );

    const updated = await this.prisma.article.update({
      where: { id: articleId },
      data: dto as Prisma.ArticleUpdateInput,
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
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
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

  async getStats() {
    const [total, published, pending, pushHome] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.article.count({ where: { auditStatus: "APPROVED" } }),
      this.prisma.article.count({ where: { auditStatus: "PENDING" } }),
      this.prisma.article.count({ where: { isPushHome: true } }),
    ]);
    return { total, published, pending, pushHome };
  }

  async getDetail(articleId: string) {
    const cacheKey = `articles:detail:${articleId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) {
      // 不阻塞：异步增加浏览数，不等待完成
      this.prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }).catch((err) => this.logger.warn("缓存清理失败", err));
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
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");

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
    stationId?: string;
  }) {
    const { circleId, tag, isPushHome, auditStatus, stationId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const filterHash = `${circleId ?? ""}:${tag ?? ""}:${isPushHome ?? ""}:${auditStatus ?? ""}`;
    const cacheKey = `articles:list:${page}:${pageSize}:${filterHash}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.ArticleWhereInput = {};

    if (circleId) where.circleId = circleId;
    if (tag) where.tags = { has: tag };
    if (isPushHome !== undefined) where.isPushHome = isPushHome;
    if (auditStatus) where.auditStatus = auditStatus;
    else where.auditStatus = "APPROVED"; // 默认只返回审核通过的
    if (stationId) where.stationId = stationId;

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
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.article.count({ where }),
    ]);

    const data = paginated(articles, total, page, pageSize);
    await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  // ───────── 首页信息流 ─────────

  async getHomeFeed(params: { page: number; pageSize: number; userId?: string }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: Prisma.ArticleWhereInput = { isPushHome: true, auditStatus: "APPROVED" };

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
        skip,
        take: pageSize,
        orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return paginated(articles, total, page, pageSize);
  }

  async getRelated(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { circleId: true, tags: true },
    });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");

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
    const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
    if (!VALID_STATUSES.includes(auditStatus)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的审核状态");
    }
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");

    return this.prisma.article.update({
      where: { id: articleId },
      data: { auditStatus },
    });
  }

  // ───────── 推荐卡片 ─────────

  async addRecommend(articleId: string, userId: string, dto: AddRecommendDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的文章");

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
    if (!rec) throw new BusinessException(ErrorCode.NOT_FOUND, "推荐卡片不存在");
    if (rec.article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "权限不足");

    await this.prisma.articleRecommend.delete({ where: { id: recommendId } });
    return { success: true };
  }

  // ───────── 草稿管理 ─────────

  async getMyDrafts(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ArticleWhereInput = { userId, auditStatus: "DRAFT" };
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: { id: true, title: true, cover: true, excerpt: true, updatedAt: true },
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async saveDraft(userId: string, dto: CreateArticleDto) {
    // 内容审核（标题+正文+摘要）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.content, dto.excerpt].filter(Boolean).join(" "),
      { scene: "ARTICLE_DRAFT", userId },
    );

    return this.prisma.article.create({
      data: {
        userId,
        circleId: dto.circleId || "",
        title: dto.title || "未命名草稿",
        content: dto.content,
        cover: dto.cover,
        excerpt: dto.excerpt,
        tags: dto.tags,
        auditStatus: "DRAFT",
      },
    });
  }

  async updateDraft(id: string, userId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "草稿不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的草稿");

    // 内容审核（标题+正文+摘要）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.content, dto.excerpt].filter(Boolean).join(" "),
      { scene: "ARTICLE_DRAFT_EDIT", userId, dataId: id },
    );

    return this.prisma.article.update({ where: { id }, data: dto as Prisma.ArticleUpdateInput });
  }

  async deleteDraft(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "草稿不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的草稿");
    await this.prisma.article.delete({ where: { id } });
    return { success: true };
  }

  async publishDraft(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "草稿不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能发布自己的草稿");
    if (article.auditStatus !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "该文章不是草稿");
    const updated = await this.prisma.article.update({
      where: { id },
      data: { auditStatus: "PENDING", createdAt: new Date() },
    });
    await this.redis.delByPattern("articles:list:*");
    return updated;
  }

  // ───────── 私有 ─────────

  private async ensureCircleAdmin(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !["OWNER", "PARTNER", "ADMIN"].includes(member.role)) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "仅圈主/合伙人/管理员可发布文章");
    }
  }

  // ═══════════════════════════════════════════
  // 管理端草稿管理
  // ═══════════════════════════════════════════

  /** 管理端-列出所有草稿 */
  async listAllDrafts(params: { page?: number; pageSize?: number; circleId?: string }) {
    const { circleId } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: Prisma.ArticleWhereInput = { auditStatus: "DRAFT" };
    if (circleId) where.circleId = circleId;
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
          circle: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 管理端-删除任意草稿 */
  async adminDeleteDraft(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "草稿不存在");
    await this.prisma.article.delete({ where: { id } });
    return { success: true };
  }

  /** 管理端-发布任意草稿 */
  async adminPublishDraft(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "草稿不存在");
    if (article.auditStatus !== "DRAFT") throw new BusinessException(ErrorCode.BAD_REQUEST, "该文章不是草稿");
    const updated = await this.prisma.article.update({
      where: { id },
      data: { auditStatus: "PENDING", createdAt: new Date() },
    });
    await this.redis.delByPattern("articles:list:*");
    return updated;
  }
}
