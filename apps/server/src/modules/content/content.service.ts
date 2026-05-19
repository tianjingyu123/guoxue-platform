import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WebhookService } from "../webhook/webhook.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { Content, Prisma } from "@prisma/client";

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
      },
    });

    this.webhook.fire("CONTENT_PUBLISHED", {
      contentId: content.id,
      title: content.title,
      type: content.type,
      stationId: dto.stationId,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));

    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return content;
  }

  async list(q: ContentListQueryDto): Promise<{ data: Content[]; total: number; page: number; pageSize: number }> {
    const page = +(q.page || 1);
    const pageSize = +(q.pageSize || 20);

    // 无关键词搜索时尝试缓存（第一页缓存30秒）
    if (!q.keyword && page === 1) {
      const cacheKey = `content:list:${q.type || "all"}:${q.status || "all"}:${q.stationId || "all"}`;
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached as { data: Content[]; total: number; page: number; pageSize: number };

      const result = await this.fetchList(q, page, pageSize);
      this.redis.setJson(cacheKey, result, 120).catch((err) => this.logger.warn("缓存写入失败", err));
      return result;
    }

    return this.fetchList(q, page, pageSize);
  }

  private async fetchList(q: ContentListQueryDto, page: number, pageSize: number) {
    const where: Prisma.ContentWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.stationId) where.stationId = q.stationId;
    if (q.keyword) {
      where.OR = [
        { title: { contains: q.keyword } },
        { author: { contains: q.keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async detail(id: string): Promise<Content> {
    const cacheKey = `content:detail:${id}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((err) => this.logger.warn("浏览计数更新失败", err));
      return cached as Content;
    }

    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");

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
    if (cached) return JSON.parse(cached);

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
      await this.redis.set(cacheKey, JSON.stringify(poem), 86400).catch(() => {});
    }
    return poem;
  }

  async getPoemAppreciation(id: string) {
    const cacheKey = `poem:appreciation:${id}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

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

    await this.redis.set(cacheKey, JSON.stringify(result), 3600).catch(() => {});
    return result;
  }
}
