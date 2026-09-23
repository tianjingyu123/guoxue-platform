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

  private publicWhere(): Prisma.ContentWhereInput {
    return { status: "PUBLISHED", deletedAt: null, stationId: null,
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] };
  }

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

    await this.webhook.fire("CONTENT_PUBLISHED", {
      contentId: content.id,
      title: content.title,
      type: content.type,
      stationId: dto.stationId,
    }).catch((err) => this.logger.warn("Webhook 发送失败", err));

    this.redis.delByPattern("content:list:*").catch((err) => this.logger.warn("缓存清理失败", err));
    return content;
  }

  async list(q: ContentListQueryDto, allowUnpublished = false): Promise<{ data: Content[]; total: number; page: number; pageSize: number }> {
    const page = +(q.page || 1);
    const pageSize = +(q.pageSize || 20);

    // 公开列表不读旧缓存：旧键没有区分后台/匿名，也可能保留已撤回正文。
    return this.fetchList(q, page, pageSize, allowUnpublished);
  }

  private async fetchList(q: ContentListQueryDto, rawPage: number, rawPageSize: number, allowUnpublished: boolean) {
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
    if (!allowUnpublished) {
      where.status = "PUBLISHED";
      where.stationId = null;
      where.deletedAt = null;
      where.AND = [{ OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] }];
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

  async detail(id: string, allowUnpublished = false): Promise<Content> {
    // 公开详情每次按事实表校验，避免旧缓存泄漏撤回/下架后的正文。
    // 后台审核员可看草稿；普通用户仅可看平台总目录中的已发布内容。
    const content = allowUnpublished
      ? await this.prisma.content.findUnique({ where: { id } })
      : await this.prisma.content.findFirst({ where: { id, ...this.publicWhere() } });
    if (!content) throw new BusinessException(ErrorCode.CONTENT_NOT_FOUND, "内容不存在");

    // 异步增加浏览数
    this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => this.logger.warn(`内容 ${id} 浏览计数失败`, e));

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
    const where: Prisma.ContentWhereInput = this.publicWhere();
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
    const where: Prisma.ContentWhereInput = { ...this.publicWhere(), type: "POEM" };
    const count = await this.prisma.content.count({ where });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const poems = await this.prisma.content.findMany({
      where,
      skip,
      take: 1,
      select: { id: true, title: true, author: true, dynasty: true, excerpt: true, body: true, tags: true, viewCount: true, likeCount: true },
    });
    return poems[0] ?? null;
  }

  async getDailyPoem() {
    const today = new Date().toISOString().slice(0, 10);
    const where: Prisma.ContentWhereInput = { ...this.publicWhere(), type: "POEM" };
    const count = await this.prisma.content.count({ where });
    if (count === 0) return null;

    const dayNum = parseInt(today.replace(/-/g, ""), 10);
    const skip = dayNum % count;
    const poems = await this.prisma.content.findMany({
      where,
      skip,
      take: 1,
      select: { id: true, title: true, author: true, dynasty: true, excerpt: true, body: true, tags: true, viewCount: true, likeCount: true },
    });
    return poems[0] ?? null;
  }

  async getPoemAppreciation(id: string) {
    const poem = await this.prisma.content.findFirst({
      where: { id, type: "POEM", ...this.publicWhere() },
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

    return result;
  }
}
