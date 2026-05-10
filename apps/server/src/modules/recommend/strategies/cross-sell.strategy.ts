import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

/**
 * 关联销售策略 — 基于订单共现
 * "经常一起购买" / "学了此课的人也学了"
 */
@Injectable()
export class CrossSellStrategy extends BaseRecommendStrategy {
  name = "cross-sell";

  private supportedScenes = new Set([
    RecommendScene.COURSE_DETAIL,
    RecommendScene.PRODUCT_DETAIL,
    RecommendScene.PAIPAN_RESULT,
    RecommendScene.PAYMENT_SUCCESS,
  ]);

  constructor(private prisma: PrismaService) {
    super();
  }

  supports(scene: RecommendScene): boolean {
    return this.supportedScenes.has(scene);
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!ctx.contentId && !ctx.orderItemIds?.length) return [];

    const targetType = this.inferTargetType(ctx);
    const items: RecommendItem[] = [];

    // 基于 contentId 的共现推荐
    if (ctx.contentId) {
      const cooccurItems = await this.getCooccurrenceItems(ctx.contentId, targetType);
      items.push(...cooccurItems);
    }

    // 基于已购 orderItemIds 的交叉推荐
    if (ctx.orderItemIds?.length) {
      for (const oid of ctx.orderItemIds) {
        const related = await this.getCooccurrenceItems(oid, targetType);
        items.push(...related);
      }
    }

    return items.sort((a, b) => b.score - a.score).slice(0, ctx.pageSize * 2);
  }

  private async getCooccurrenceItems(
    targetId: string,
    targetType: string,
  ): Promise<RecommendItem[]> {
    // 查询购买了此内容的用户
    const orderUsers = await this.prisma.order.findMany({
      where: { targetId, type: targetType as any, status: { in: ["PAID", "COMPLETED"] } },
      select: { userId: true },
      take: 200,
    });

    const userIds = [...new Set(orderUsers.map((o) => o.userId))];
    if (userIds.length === 0) return [];

    // 查询这些用户还买了哪些同类型内容
    const relatedOrders = await this.prisma.order.findMany({
      where: {
        userId: { in: userIds },
        type: targetType as any,
        targetId: { not: targetId },
        status: { in: ["PAID", "COMPLETED"] },
      },
      select: { targetId: true },
    });

    // 按购买频次排序
    const freq = new Map<string, number>();
    relatedOrders.forEach((o) => freq.set(o.targetId, (freq.get(o.targetId) ?? 0) + 1));
    const topIds = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);

    if (topIds.length === 0) return [];

    // 查询详情
    const items: RecommendItem[] = [];
    const order = new Map(topIds.map((id, i) => [id, i]));

    if (targetType === "COURSE") {
      const courses = await this.prisma.course.findMany({
        where: { id: { in: topIds }, auditStatus: "APPROVED" },
        select: { id: true, title: true, cover: true, intro: true, tags: true, price: true, studentCount: true },
      });
      courses.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      items.push(...courses.map((c) => ({
        id: c.id, type: "COURSE" as const, title: c.title,
        cover: c.cover ?? undefined, excerpt: c.intro ?? undefined,
        tags: c.tags, score: 1000 - (order.get(c.id) ?? 0) * 100,
        reason: targetType === "COURSE" ? "学了此课的人也学了" : "经常一起购买",
        strategies: ["cross-sell"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      })));
    } else if (targetType === "PRODUCT") {
      const products = await this.prisma.product.findMany({
        where: { id: { in: topIds }, status: "ON_SALE" },
        select: { id: true, title: true, images: true, intro: true, tags: true, price: true, salesCount: true },
      });
      products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      items.push(...products.map((p) => ({
        id: p.id, type: "PRODUCT" as const, title: p.title,
        cover: p.images?.[0], excerpt: p.intro ?? undefined,
        tags: p.tags, score: 1000 - (order.get(p.id) ?? 0) * 100,
        reason: "经常一起购买",
        strategies: ["cross-sell"],
        metadata: { price: Number(p.price), salesCount: p.salesCount },
      })));
    }

    return items;
  }

  private inferTargetType(ctx: RecommendContext): string {
    switch (ctx.scene) {
      case RecommendScene.COURSE_DETAIL:
      case RecommendScene.COURSE_LEARN:
        return "COURSE";
      case RecommendScene.PRODUCT_DETAIL:
      case RecommendScene.PAYMENT_SUCCESS:
        return "PRODUCT";
      default:
        return "COURSE";
    }
  }
}
