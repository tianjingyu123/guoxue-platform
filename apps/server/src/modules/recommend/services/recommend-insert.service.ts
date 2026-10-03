import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendContext, RecommendScene } from "../recommend.dto";
import { RecommendItem } from "../strategies/base.strategy";
import { RecommendSelectService } from "./recommend-select.service";

/**
 * 推荐-运营插入域（从 recommend.service 拆出·纯搬家不改逻辑）。
 * 职责：分区强插规则的增删（insertContent/removeInsertedContent）、
 * 推荐流应用强插（applyInsertRules）、站长精选注入（applyStationPicks）、
 * 强插内容项构造（fetchContentItemForInsert）。
 */
@Injectable()
export class RecommendInsertService {
  constructor(
    private prisma: PrismaService,
    private selectSvc: RecommendSelectService,
  ) {}

  // ═══════════════════════════════════════════
  // 分区强插管理
  // ═══════════════════════════════════════════

  async insertContent(position: number, contentId: string, contentType: string) {
    // 验证要插入的内容是否存在
    const item = await this.fetchContentItemForInsert(contentType, contentId);
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "要强插的内容不存在");

    // 若该位置已有强插规则则更新，否则新建
    const existing = await this.prisma.recommendRule.findFirst({
      where: { ruleType: "INSERT", position },
    });

    if (existing) {
      return this.prisma.recommendRule.update({
        where: { id: existing.id },
        data: { targetId: contentId, targetType: contentType, scene: "ALL" },
      });
    }

    return this.prisma.recommendRule.create({
      data: {
        scene: "ALL",
        targetType: contentType,
        targetId: contentId,
        ruleType: "INSERT",
        position,
        priority: 100,
        createdBy: "admin",
      },
    });
  }

  async removeInsertedContent(position: number) {
    const existing = await this.prisma.recommendRule.findFirst({
      where: { ruleType: "INSERT", position },
    });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "该位置没有强插规则");

    await this.prisma.recommendRule.delete({ where: { id: existing.id } });
    return { success: true };
  }

  /** 在推荐结果中应用分区强插规则 */
  async applyInsertRules(scene: RecommendScene, items: RecommendItem[]): Promise<RecommendItem[]> {
    const rules = await this.prisma.recommendRule.findMany({
      where: {
        ruleType: "INSERT",
        position: { not: null },
        OR: [{ scene }, { scene: "ALL" }],
      },
      orderBy: { position: "asc" },
    });

    if (rules.length === 0) return items;

    const result = [...items];
    for (const rule of rules) {
      const insertItem = await this.fetchContentItemForInsert(rule.targetType, rule.targetId);
      if (!insertItem) continue;

      const pos = Math.min(rule.position!, result.length);
      result.splice(pos, 0, insertItem);
    }

    return result;
  }

  /**
   * 站长精选注入 — 在推荐流中按分站配置的固定位置插入站长精选内容
   */
  async applyStationPicks(ctx: RecommendContext, items: RecommendItem[]): Promise<RecommendItem[]> {
    if (!ctx.stationId) return items;

    const station = await this.prisma.station.findUnique({
      where: { id: ctx.stationId },
      select: { templateConfig: true, status: true },
    });
    if (!station || station.status !== "ACTIVE") return items;
    const config = (station.templateConfig as Record<string, unknown>) ?? {};
    if (config.stationZoneEnabled === false) return items;

    const board = this.stationBoardForScene(ctx.scene);
    const positions = [0, 2, 4, 6, 8, 10];
    const pinned = await this.prisma.stationPinnedContent.findMany({
      where: { stationId: ctx.stationId, board, isActive: true },
      orderBy: { slotIndex: "asc" },
      take: positions.length,
    });
    if (!pinned.length) return items;

    const existing = new Set(items.map((item) => `${item.type}:${item.id}`));
    const selected: RecommendItem[] = [];
    for (const record of pinned) {
      const type = this.toRecommendType(record.contentType);
      if (!type || existing.has(`${type}:${record.contentId}`)) continue;
      const item = await this.fetchContentItemForInsert(type, record.contentId, true);
      if (!item) continue;
      item.reason = "站长主推";
      item.strategies = ["station-pinned"];
      selected.push(item);
      existing.add(`${type}:${record.contentId}`);
    }

    const result = [...items];
    selected.forEach((item, index) => {
      result.splice(Math.min(positions[index], result.length), 0, item);
    });
    return result;
  }

  private stationBoardForScene(scene: RecommendScene): string {
    if (scene === RecommendScene.PRODUCT_DETAIL) return "mall";
    if (scene === RecommendScene.COURSE_DETAIL || scene === RecommendScene.COURSE_LEARN) return "course";
    if (scene === RecommendScene.ARTICLE_DETAIL) return "article";
    return "home";
  }

  private toRecommendType(contentType: string): "ARTICLE" | "COURSE" | "PRODUCT" | "CIRCLE" | "VIDEO" | null {
    const mapped: Record<string, "ARTICLE" | "COURSE" | "PRODUCT" | "CIRCLE" | "VIDEO"> = {
      article: "ARTICLE",
      course: "COURSE",
      product: "PRODUCT",
      circle: "CIRCLE",
      video: "VIDEO",
    };
    return mapped[contentType.toLowerCase()] ?? null;
  }

  /** 根据类型和ID查询内容，构造强插用的 RecommendItem */
  private async fetchContentItemForInsert(contentType: string, contentId: string, publicOnly = false): Promise<RecommendItem | null> {
    switch (contentType) {
      case "ARTICLE": {
        const a = publicOnly
          ? await this.prisma.article.findFirst({
              where: { id: contentId, auditStatus: "APPROVED", deletedAt: null },
              select: this.selectSvc.articleSelect(),
            })
          : await this.prisma.article.findUnique({ where: { id: contentId }, select: this.selectSvc.articleSelect() });
        if (!a) return null;
        return {
          id: a.id, type: "ARTICLE", title: a.title, cover: a.cover ?? undefined,
          excerpt: a.excerpt ?? undefined, tags: a.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
        };
      }
      case "COURSE": {
        const c = publicOnly
          ? await this.prisma.course.findFirst({
              where: { id: contentId, auditStatus: "APPROVED", deletedAt: null },
              select: this.selectSvc.courseSelect(),
            })
          : await this.prisma.course.findUnique({ where: { id: contentId }, select: this.selectSvc.courseSelect() });
        if (!c) return null;
        return {
          id: c.id, type: "COURSE", title: c.title, cover: c.cover ?? undefined,
          excerpt: c.intro ?? undefined, tags: c.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { price: Number(c.price), studentCount: c.studentCount },
        };
      }
      case "PRODUCT": {
        const p = publicOnly
          ? await this.prisma.product.findFirst({
              where: { id: contentId, status: "ON_SALE", deletedAt: null },
              select: this.selectSvc.productSelect(),
            })
          : await this.prisma.product.findUnique({ where: { id: contentId }, select: this.selectSvc.productSelect() });
        if (!p) return null;
        return {
          id: p.id, type: "PRODUCT", title: p.title, cover: p.images?.[0],
          excerpt: p.intro ?? undefined, tags: p.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { price: Number(p.price), salesCount: p.salesCount },
        };
      }
      case "CIRCLE": {
        const ci = publicOnly
          ? await this.prisma.circle.findFirst({
              where: { id: contentId, status: "ACTIVE", deletedAt: null },
              select: this.selectSvc.circleSelect(),
            })
          : await this.prisma.circle.findUnique({ where: { id: contentId }, select: this.selectSvc.circleSelect() });
        if (!ci) return null;
        return {
          id: ci.id, type: "CIRCLE", title: ci.name, cover: ci.cover ?? undefined,
          excerpt: ci.intro ?? undefined, tags: ci.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { memberCount: ci.memberCount },
        };
      }
      case "VIDEO": {
        const v = publicOnly
          ? await this.prisma.video.findFirst({
              where: { id: contentId, auditStatus: "APPROVED", status: "PUBLISHED", isPrivate: false },
              select: this.selectSvc.videoSelect(),
            })
          : await this.prisma.video.findUnique({ where: { id: contentId }, select: this.selectSvc.videoSelect() });
        if (!v) return null;
        return {
          id: v.id, type: "VIDEO", title: v.title ?? "", cover: v.coverUrl ?? undefined,
          tags: v.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { viewCount: v.viewCount, likeCount: v.likeCount },
        };
      }
      default:
        return null;
    }
  }
}
