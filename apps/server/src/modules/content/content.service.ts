import { Injectable, NotFoundException, Logger } from "@nestjs/common";
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
    if (!content) throw new NotFoundException("内容不存在");

    // 异步增加浏览数
    this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => this.logger.warn(`内容 ${id} 浏览计数失败`, e));

    // 缓存60秒
    this.redis.setJson(cacheKey, content, 300).catch((err) => this.logger.warn("缓存写入失败", err));
    return content;
  }

  async update(id: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException("内容不存在");

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
    if (!content) throw new NotFoundException("内容不存在");

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
}
