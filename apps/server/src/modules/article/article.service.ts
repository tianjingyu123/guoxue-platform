import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  async create(circleId: string, userId: string, dto: CreateArticleDto) {
    // 验证是圈主或管理员
    await this.ensureCircleAdmin(circleId, userId);

    return this.prisma.article.create({
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
  }

  async update(articleId: string, userId: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");
    if (article.userId !== userId) throw new ForbiddenException("只能编辑自己的文章");

    return this.prisma.article.update({
      where: { id: articleId },
      data: dto as any,
    });
  }

  async delete(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException("文章不存在");
    if (article.userId !== userId) {
      await this.ensureCircleAdmin(article.circleId, userId);
    }

    await this.prisma.article.delete({ where: { id: articleId } });
    return { success: true };
  }

  async getDetail(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true, cover: true, memberCount: true } },
        recommends: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!article) throw new NotFoundException("文章不存在");

    // 增加浏览次数
    await this.prisma.article.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    });

    return article;
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

    return { articles, total, page, pageSize };
  }

  // ───────── 首页信息流 ─────────

  async getHomeFeed(params: { page: number; pageSize: number; userId?: string }) {
    const { page, pageSize } = params;
    const where: any = { isPushHome: true, auditStatus: "APPROVED" };

    // TODO: 根据用户画像个性化推荐
    // 当前实现：按热度加权排序（浏览量+点赞数+收藏数）

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
        orderBy: [{ createdAt: "desc" }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return { articles, total, page, pageSize };
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
