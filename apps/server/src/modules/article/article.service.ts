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
import { publicQuarantinedIds } from "../../common/public-content-quarantine";

import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";
import { Prisma } from "@prisma/client";

/** 文章专区列表只取前三张展示图：封面优先，其次为正文富文本图片。 */
export function extractArticleListImages(cover?: string | null, content = ""): string[] {
  const images: string[] = [];
  const append = (value?: string | null) => {
    const image = String(value ?? "")
      .trim()
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'");
    if (image && !images.includes(image)) images.push(image);
  };

  append(cover);
  const imagePattern = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while (images.length < 3 && (match = imagePattern.exec(content))) {
    append(match[1] || match[2] || match[3]);
  }
  return images.slice(0, 3);
}

function assertArticleCover(cover?: string | null) {
  if (!String(cover ?? "").trim()) {
    throw new BusinessException(ErrorCode.BAD_REQUEST, "文章必须上传首图后才能发布");
  }
}

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
    assertArticleCover(dto.cover);

    // 内容审核（标题+正文+摘要）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.content, dto.excerpt].filter(Boolean).join(" "),
      { scene: "ARTICLE", userId },
    );

    // 开放范围分流：CIRCLE_ONLY 圈内直生效；PLATFORM 须平台审核（管理员/官方圈自动过审）
    const { visibility, auditStatus } = await this.audit.resolveContentVisibility({
      visibility: dto.visibility,
      circleId,
      isAdmin,
    });

    const article = await this.prisma.article.create({
      data: {
        circleId,
        userId,
        title: dto.title,
        content: dto.content,
        cover: dto.cover,
        excerpt: dto.excerpt,
        layout: dto.layout ?? "AUTO",
        tags: dto.tags,
        isPushHome: dto.isPushHome ?? false,
        stationId: dto.stationId || undefined,
        visibility,
        auditStatus,
      },
    });

    if (auditStatus === "PENDING") {
      await this.audit.openContentAudit({ contentType: "ARTICLE", contentId: article.id, circleId, submitterId: userId });
    }

    // 文章列表缓存失效
    await this.redis.delByPattern("articles:list:*");
    return article;
  }

  async update(articleId: string, userId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
    if (article.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能编辑自己的文章");
    if (dto.cover !== undefined && article.auditStatus !== "DRAFT") assertArticleCover(dto.cover);

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
    keyword?: string;
    stationId?: string;
    isAdmin?: boolean;
  }) {
    const { circleId, tag, isPushHome, auditStatus, keyword, stationId, isAdmin } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const filterHash = `${circleId ?? ""}:${tag ?? ""}:${isPushHome ?? ""}:${auditStatus ?? ""}`;
    const cacheKey = `articles:list:v3:${page}:${pageSize}:${filterHash}`;

    // 管理端（isAdmin）不走缓存：审核工作台需实时数据，且避免与 C 端共享缓存键互相污染
    if (!isAdmin) {
      const cached = await this.redis.getJson<any>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ArticleWhereInput = {};

    if (circleId) where.circleId = circleId;
    if (tag) where.tags = { has: tag };
    if (isPushHome !== undefined) where.isPushHome = isPushHome;
    if (isAdmin) {
      // 管理角色：不强制 APPROVED、不强制 PLATFORM——审核闭环可见全量（含待审/驳回·排除草稿）
      if (auditStatus) where.auditStatus = auditStatus;
      else where.auditStatus = { not: "DRAFT" };
      if (keyword) where.title = { contains: keyword, mode: "insensitive" };
    } else {
      where.id = { notIn: publicQuarantinedIds("article") };
      where.auditStatus = "APPROVED"; // 默认只返回审核通过的
      where.cover = { not: "" }; // 公共文章必须有首图；旧无图数据不再外显
      // 平台公共池（未按圈子过滤）只出「全平台开放」内容；圈内列表（带 circleId）圈内内容全可见
      if (!circleId) where.visibility = "PLATFORM";
    }
    if (stationId) where.stationId = stationId;

    const select = {
      id: true, title: true, cover: true, content: true, excerpt: true, layout: true, tags: true,
      viewCount: true, likeCount: true, collectCount: true,
      createdAt: true,
      user: { select: { id: true, nickname: true, avatar: true } },
      circle: { select: { id: true, name: true } },
      // 管理端补审核状态与开放范围（C 端 select 保持原样不变）
      ...(isAdmin ? { auditStatus: true, visibility: true, isPushHome: true } : {}),
    } satisfies Prisma.ArticleSelect;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.article.count({ where }),
    ]);

    const listItems = articles.map(({ content, ...article }) => ({
      ...article,
      images: extractArticleListImages(article.cover, content),
    }));
    const data = paginated(listItems, total, page, pageSize);
    if (!isAdmin) await this.redis.setJson(cacheKey, data, 300);
    return data;
  }

  // ───────── 首页信息流 ─────────

  async getHomeFeed(params: { page: number; pageSize: number; userId?: string }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    // 首页信息流=平台公共池：只出「全平台开放」且审核通过的内容
    const where: Prisma.ArticleWhereInput = {
      id: { notIn: publicQuarantinedIds("article") },
      isPushHome: true,
      auditStatus: "APPROVED",
      visibility: "PLATFORM",
      cover: { not: "" },
    };

    // 热度加权：浏览量×1 + 点赞×2 + 收藏×3
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: {
          id: true, title: true, cover: true, excerpt: true, layout: true, tags: true,
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
        id: { not: articleId, notIn: publicQuarantinedIds("article") },
        auditStatus: "APPROVED",
        cover: { not: "" },
        OR: [
          { circleId: article.circleId }, // 本圈相关：圈内内容全可见
          // 跨圈按标签相关：只出「全平台开放」内容（不外泄他圈封闭内容）
          ...(article.tags?.length ? [{ tags: { hasSome: article.tags }, visibility: "PLATFORM" }] : []),
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

  async auditArticle(articleId: string, auditStatus: string, opts?: { operatorId?: string; reason?: string }) {
    const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
    if (!VALID_STATUSES.includes(auditStatus)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的审核状态");
    }
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new BusinessException(ErrorCode.ARTICLE_NOT_FOUND, "文章不存在");
    if (auditStatus === "APPROVED") assertArticleCover(article.cover);

    const updated = await this.prisma.article.update({
      where: { id: articleId },
      data: { auditStatus },
    });

    // 留痕：Article 无驳回理由字段（只读核实 schema），审核动作+理由统一记 AuditLog（可回滚数据带原状态）
    await this.audit.log({
      userId: opts?.operatorId,
      action: auditStatus === "APPROVED" ? "ARTICLE_AUDIT_APPROVE" : auditStatus === "REJECTED" ? "ARTICLE_AUDIT_REJECT" : "ARTICLE_AUDIT_PENDING",
      targetType: "ARTICLE",
      targetId: articleId,
      detail: JSON.stringify({ from: article.auditStatus, to: auditStatus, reason: opts?.reason || undefined }),
      rollbackData: { auditStatus: article.auditStatus },
    });

    // 审核状态变更影响 C 端可见性 → 列表/详情缓存失效（原实现漏了此步·顺带修复）
    await Promise.all([
      this.redis.delByPattern("articles:list:*"),
      this.redis.del(`articles:detail:${articleId}`),
    ]);
    return updated;
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
        select: { id: true, title: true, cover: true, excerpt: true, layout: true, updatedAt: true },
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
        layout: dto.layout ?? "AUTO",
        tags: dto.tags,
        visibility: dto.visibility ?? "CIRCLE_ONLY",
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
    assertArticleCover(article.cover);
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
    assertArticleCover(article.cover);
    const updated = await this.prisma.article.update({
      where: { id },
      data: { auditStatus: "PENDING", createdAt: new Date() },
    });
    await this.redis.delByPattern("articles:list:*");
    return updated;
  }
}
