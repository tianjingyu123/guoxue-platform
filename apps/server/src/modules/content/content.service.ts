import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WebhookService } from "../webhook/webhook.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { Content, Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private webhook: WebhookService,
  ) {}

  async create(dto: CreateContentDto) {
    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        type: dto.type,
        author: dto.author,
        dynasty: dto.dynasty,
        excerpt: dto.excerpt,
        body: dto.body,
        cover: dto.cover,
        tags: dto.tags ?? [],
        stationId: dto.stationId || undefined,
        // 新建必须明确选择发布；不能依赖数据库的历史 PUBLISHED 默认值。
        status: dto.status ?? "DRAFT",
      },
    });

    if (content.status === "PUBLISHED") {
      await this.webhook.fire("CONTENT_PUBLISHED", {
        contentId: content.id,
        title: content.title,
        type: content.type,
        stationId: dto.stationId,
      }).catch((err) => this.logger.warn("Webhook 发送失败", err));
    }

    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return content;
  }

  async list(q: ContentListQueryDto): Promise<{ data: Content[]; total: number; page: number; pageSize: number }> {
    const page = +(q.page || 1);
    const pageSize = +(q.pageSize || 20);

    // 无关键词搜索时尝试缓存（第一页缓存30秒）
    if (!q.keyword && page === 1) {
      const cacheKey = `content:list:${q.type || "all"}:${q.status || "all"}:${q.stationId || "all"}:${q.categoryLevel1 || "all"}:${q.categoryLevel2 || "all"}`;
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached as { data: Content[]; total: number; page: number; pageSize: number };

      const result = await this.fetchList(q, page, pageSize);
      this.redis.setJson(cacheKey, result, 120).catch((err) => this.logger.warn("缓存写入失败", err));
      return result;
    }

    return this.fetchList(q, page, pageSize);
  }

  private async fetchList(q: ContentListQueryDto, rawPage: number, rawPageSize: number) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.ContentWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.status) {
      // status 支持逗号分隔多值（前端"已通过"tab 需 APPROVED+PUBLISHED 并存）；单值时保持等值查询，向后兼容
      const statuses = q.status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 1) where.status = { in: statuses };
      else if (statuses.length === 1) where.status = statuses[0];
    }
    if (q.stationId) where.stationId = q.stationId;
    if (q.categoryLevel1) where.categoryLevel1 = q.categoryLevel1;
    if (q.categoryLevel2) where.categoryLevel2 = q.categoryLevel2;
    if (q.keyword) {
      where.OR = [
        { title: { contains: q.keyword } },
        { author: { contains: q.keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async detail(id: string, includeUnpublished = false): Promise<Content> {
    const cacheKey = `content:detail:${id}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      if (!includeUnpublished && (cached as Content).status !== "PUBLISHED") {
        throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");
      }
      this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((err) => this.logger.warn("浏览计数更新失败", err));
      return cached as Content;
    }

    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content || (!includeUnpublished && content.status !== "PUBLISHED")) {
      throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");
    }

    // 异步增加浏览数
    this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => this.logger.warn(`内容 ${id} 浏览计数失败`, e));

    // 缓存60秒
    this.redis.setJson(cacheKey, content, 300).catch((err) => this.logger.warn("缓存写入失败", err));
    return content;
  }

  async update(id: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");

    const updated = await this.prisma.content.update({
      where: { id },
      data: dto as Prisma.ContentUpdateInput,
    });

    // 更新后失效缓存
    this.redis.del(`content:detail:${id}`).catch((err) => this.logger.warn("缓存删除失败", err));
    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return updated;
  }

  /**
   * 专用审核方法（区别于全量编辑 update）：
   * 只允许改 status(APPROVED/REJECTED) + auditReason，审核员不具备内容编辑权。
   */
  async audit(id: string, status: "APPROVED" | "REJECTED", reason?: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");

    const updated = await this.prisma.content.update({
      where: { id },
      data: {
        status,
        // 通过时清空历史驳回原因；驳回时记录原因
        auditReason: status === "REJECTED" ? (reason ?? null) : null,
      },
    });

    this.redis.del(`content:detail:${id}`).catch((err) => this.logger.warn("缓存删除失败", err));
    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return updated;
  }

  async remove(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");

    await this.prisma.content.delete({ where: { id } });
    this.redis.del(`content:detail:${id}`).catch((err) => this.logger.warn("缓存删除失败", err));
    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return { success: true };
  }

  async batchUpdateStatus(ids: string[], status: string) {
    await this.prisma.content.updateMany({ where: { id: { in: ids } }, data: { status } });
    // 失效缓存
    ids.forEach(id => this.redis.del(`content:detail:${id}`).catch((err) => this.logger.warn("缓存删除失败", err)));
    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return { success: true, count: ids.length };
  }

  async getStats() {
    const [byType, byStatus, totalViews] = await Promise.all([
      this.prisma.content.groupBy({ by: ["type"], _count: true }),
      this.prisma.content.groupBy({ by: ["status"], _count: true }),
      this.prisma.content.aggregate({ _sum: { viewCount: true } }),
    ]);
    return {
      totalViews: totalViews._sum.viewCount || 0,
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
    };
  }

  async getFeatured(type?: string) {
    const where: Prisma.ContentWhereInput = { status: "PUBLISHED" };
    if (type) where.type = type;
    return this.prisma.content.findMany({
      where,
      orderBy: { viewCount: "desc" },
      take: 20,
      select: { id: true, title: true, type: true, author: true, cover: true, excerpt: true, viewCount: true },
    });
  }

  // ───────── 诗词专属 ─────────

  async getRandomPoem() {
    const count = await this.prisma.content.count({ where: { type: "POEM", status: "PUBLISHED" } });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const poems = await this.prisma.content.findMany({
      where: { type: "POEM", status: "PUBLISHED" },
      skip,
      take: 1,
      select: { id: true, title: true, author: true, dynasty: true, excerpt: true, body: true, tags: true, viewCount: true, likeCount: true },
    });
    return poems[0] ?? null;
  }

  async getDailyPoem() {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `poem:daily:${today}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { this.logger.warn("每日诗词缓存解析失败，回源数据库"); }
    }

    const count = await this.prisma.content.count({ where: { type: "POEM", status: "PUBLISHED" } });
    if (count === 0) return null;

    const dayNum = parseInt(today.replace(/-/g, ""), 10);
    const skip = dayNum % count;
    const poems = await this.prisma.content.findMany({
      where: { type: "POEM", status: "PUBLISHED" },
      skip,
      take: 1,
      select: { id: true, title: true, author: true, dynasty: true, excerpt: true, body: true, tags: true, viewCount: true, likeCount: true },
    });
    const poem = poems[0] ?? null;
    if (poem) {
      await this.redis.set(cacheKey, JSON.stringify(poem), 86400).catch((err) => this.logger.warn("每日诗词缓存写入失败", err));
    }
    return poem;
  }

  async getPoemAppreciation(id: string) {
    const cacheKey = `poem:appreciation:${id}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached); }
      catch { this.logger.warn("诗词鉴赏缓存解析失败，回源数据库"); }
    }

    const poem = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, title: true, author: true, dynasty: true, body: true, type: true },
    });
    if (!poem) throw new BusinessException(ErrorCode.NOT_FOUND, "诗词不存在");
    if (poem.type !== "POEM") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅支持诗词类型");

    const result = {
      id: poem.id,
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      originalText: poem.body,
      annotation: null as string | null,
      translation: null as string | null,
      appreciation: null as string | null,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600).catch((err) => this.logger.warn("诗词鉴赏缓存写入失败", err));
    return result;
  }
}
