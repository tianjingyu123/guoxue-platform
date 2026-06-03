import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import {
  UnifiedPriceResult,
  TargetPriceResult,
  ActivePromotion,
  BatchPricingInput,
  PricingContext,
  PricingTargetType,
  PromotionPriority,
} from "./unified-pricing.types";

@Injectable()
export class UnifiedPricingService {
  private readonly logger = new Logger(UnifiedPricingService.name);
  private readonly CACHE_TTL = 300; // 5分钟
  private readonly CACHE_PREFIX = "unified:price:";

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ───────── 核心计算 ─────────

  async calculateEffectivePrice(
    productId: string,
    skuId?: string,
    userId?: string,
    context?: PricingContext,
  ): Promise<UnifiedPriceResult> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}:${skuId || "_"}`;
    const cached = await this.redis.getJson<UnifiedPriceResult>(cacheKey);
    if (cached) return cached;

    const now = new Date();

    // 1. 获取商品基础价格
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, originalPrice: true, title: true },
    });
    if (!product) {
      return {
        productId,
        skuId,
        effectivePrice: 0,
        originalPrice: 0,
        appliedPromotion: null,
        activePromotions: [],
        hasPromotion: false,
      };
    }

    const basePrice = Number(product.price);
    const baseListPrice = product.originalPrice ? Number(product.originalPrice) : undefined;

    // 2. 收集所有活动并计算价格
    const activePromotions: ActivePromotion[] = [];

    // 2a. 秒杀（优先级最高）
    const flashItems = await this.prisma.flashSaleItem.findMany({
      where: {
        productId,
        skuId: skuId || null,
        flashSale: {
          status: "ACTIVE",
          startTime: { lte: now },
          endTime: { gte: now },
          OR: [
            { scope: "GLOBAL" },
            ...(context?.pageId
              ? [{ scope: "PAGE_ONLY", scopePageId: context.pageId }]
              : []),
          ],
        },
      },
      include: { flashSale: true },
      orderBy: { flashPrice: "asc" },
    });

    for (const item of flashItems) {
      if (item.stock > item.sold) {
        activePromotions.push({
          type: "FLASH_SALE",
          id: item.flashSale.id,
          name: item.flashSale.name || "秒杀",
          priority: PromotionPriority.FLASH_SALE,
          price: Number(item.flashPrice),
          extra: { limitCount: item.limitCount, remainingStock: item.stock - item.sold },
        });
      }
    }

    // 2b. 拼团
    const groupBuys = await this.prisma.groupBuy.findMany({
      where: {
        productId,
        skuId: skuId || null,
        status: "ACTIVE",
        OR: [
          { scope: "GLOBAL" },
          ...(context?.pageId
            ? [{ scope: "PAGE_ONLY", scopePageId: context.pageId }]
            : []),
        ],
      },
      orderBy: { groupPrice: "asc" },
    });

    for (const gb of groupBuys) {
      activePromotions.push({
        type: "GROUP_BUY",
        id: gb.id,
        name: "拼团",
        priority: PromotionPriority.GROUP_BUY,
        price: Number(gb.groupPrice),
        extra: { minMembers: gb.minMembers, expireMinutes: gb.expireMinutes },
      });
    }

    // 2c. 限时折扣
    const discounts = await this.prisma.discountActivity.findMany({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gte: now },
        OR: [
          { productIds: { has: productId } },
          { productIds: { isEmpty: true } },
        ],
        AND: [
          {
            OR: [
              { scope: "GLOBAL" },
              ...(context?.pageId
                ? [{ scope: "PAGE_ONLY", scopePageId: context.pageId }]
                : []),
            ],
          },
        ],
      },
      orderBy: { discountPct: "desc" },
    });

    for (const d of discounts) {
      if (d.productIds.length === 0 || d.productIds.includes(productId)) {
        const discountedPrice = Math.round(basePrice * (d.discountPct / 100) * 100) / 100;
        activePromotions.push({
          type: "DISCOUNT",
          id: d.id,
          name: d.name,
          priority: PromotionPriority.DISCOUNT,
          price: discountedPrice,
          extra: { discountPct: d.discountPct },
        });
      }
    }

    // 2d. 满减送（不改变单品价格，仅结算时计算）
    // 满减送活动在此不计算，保留给购物车/结算阶段

    // 3. 选择最高优先级 + 同优先级最低价的活动
    activePromotions.sort((a, b) => b.priority - a.priority || a.price - b.price);
    const appliedPromotion = activePromotions.length > 0 ? activePromotions[0] : null;
    const effectivePrice = appliedPromotion ? appliedPromotion.price : basePrice;

    const result: UnifiedPriceResult = {
      productId,
      skuId,
      effectivePrice,
      originalPrice: basePrice,
      baseListPrice,
      appliedPromotion,
      activePromotions,
      hasPromotion: activePromotions.length > 0,
      promotionTag: appliedPromotion ? this.getPromotionTag(appliedPromotion.type) : undefined,
    };

    // 4. 缓存
    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // ───────── 批量计算 ─────────

  async batchCalculateEffectivePrice(
    items: BatchPricingInput[],
    userId?: string,
    context?: PricingContext,
  ): Promise<UnifiedPriceResult[]> {
    const results: UnifiedPriceResult[] = [];
    for (const item of items) {
      const result = await this.calculateEffectivePrice(
        item.productId,
        item.skuId,
        userId,
        context,
      );
      results.push(result);
    }
    return results;
  }

  // ───────── 满减送计算（购物车/结算专用） ─────────

  async calculateFullReduction(
    productIds: string[],
    totalAmount: number,
    context?: PricingContext,
  ): Promise<{ reducedAmount: number; reduction: number; giftProductId?: string; ruleName?: string }> {
    const now = new Date();
    const rules = await this.prisma.fullReductionRule.findMany({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gte: now },
        threshold: { lte: totalAmount },
        OR: [
          { scope: "GLOBAL" },
          ...(context?.pageId
            ? [{ scope: "PAGE_ONLY", scopePageId: context.pageId }]
            : []),
        ],
      },
      orderBy: { reduction: "desc" },
    });

    let bestRule: typeof rules[0] | null = null;
    for (const rule of rules) {
      // 检查商品适用范围
      if (rule.productIds.length > 0) {
        const hasMatch = rule.productIds.some((pid) => productIds.includes(pid));
        if (!hasMatch) continue;
      }
      if (!bestRule || Number(rule.reduction) > Number(bestRule.reduction)) {
        bestRule = rule;
      }
    }

    if (bestRule) {
      const reduction = Number(bestRule.reduction);
      return {
        reducedAmount: Math.max(0, totalAmount - reduction),
        reduction,
        giftProductId: bestRule.giftProductId || undefined,
        ruleName: bestRule.name,
      };
    }

    return { reducedAmount: totalAmount, reduction: 0 };
  }

  // ───────── 课程/圈子价格计算 ─────────

  /** 计算课程有效价格（仅限时折扣，不支持秒杀/拼团） */
  async calculateTargetPrice(
    targetId: string,
    targetType: PricingTargetType,
    userId?: string,
    context?: PricingContext,
  ): Promise<TargetPriceResult> {
    if (targetType === "PRODUCT") {
      const r = await this.calculateEffectivePrice(targetId, undefined, userId, context);
      return {
        targetId: r.productId,
        targetType: "PRODUCT",
        effectivePrice: r.effectivePrice,
        originalPrice: r.originalPrice,
        baseListPrice: r.baseListPrice,
        appliedPromotion: r.appliedPromotion,
        activePromotions: r.activePromotions,
        hasPromotion: r.hasPromotion,
        promotionTag: r.promotionTag,
      };
    }

    const cacheKey = `${this.CACHE_PREFIX}${targetType.toLowerCase()}:${targetId}`;
    const cached = await this.redis.getJson<TargetPriceResult>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    let basePrice = 0;
    let baseListPrice: number | undefined;

    if (targetType === "COURSE") {
      const course = await this.prisma.course.findUnique({
        where: { id: targetId },
        select: { price: true, originalPrice: true },
      });
      if (!course) return this.emptyTargetResult(targetId, targetType);
      basePrice = Number(course.price);
      baseListPrice = course.originalPrice ? Number(course.originalPrice) : undefined;
    } else if (targetType === "CIRCLE") {
      const circle = await this.prisma.circle.findUnique({
        where: { id: targetId },
        select: { price: true, originalPrice: true },
      });
      if (!circle) return this.emptyTargetResult(targetId, targetType);
      basePrice = Number(circle.price);
      baseListPrice = circle.originalPrice ? Number(circle.originalPrice) : undefined;
    }

    // 仅检查限时折扣
    const idField = targetType === "COURSE" ? "courseIds" : "circleIds";
    const discounts = await this.prisma.discountActivity.findMany({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gte: now },
        [idField]: { has: targetId },
        OR: [
          { scope: "GLOBAL" },
          ...(context?.pageId
            ? [{ scope: "PAGE_ONLY", scopePageId: context.pageId }]
            : []),
        ],
      },
      orderBy: { discountPct: "desc" },
    });

    const activePromotions: ActivePromotion[] = [];
    for (const d of discounts) {
      const discountedPrice = Math.round(basePrice * (d.discountPct / 100) * 100) / 100;
      activePromotions.push({
        type: "DISCOUNT",
        id: d.id,
        name: d.name,
        priority: PromotionPriority.DISCOUNT,
        price: discountedPrice,
        extra: { discountPct: d.discountPct },
      });
    }

    activePromotions.sort((a, b) => a.price - b.price);
    const appliedPromotion = activePromotions.length > 0 ? activePromotions[0] : null;
    const effectivePrice = appliedPromotion ? appliedPromotion.price : basePrice;

    const result: TargetPriceResult = {
      targetId,
      targetType,
      effectivePrice,
      originalPrice: basePrice,
      baseListPrice,
      appliedPromotion,
      activePromotions,
      hasPromotion: activePromotions.length > 0,
      promotionTag: appliedPromotion ? this.getPromotionTag(appliedPromotion.type) : undefined,
    };

    await this.redis.setJson(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  private emptyTargetResult(targetId: string, targetType: PricingTargetType): TargetPriceResult {
    return {
      targetId,
      targetType,
      effectivePrice: 0,
      originalPrice: 0,
      appliedPromotion: null,
      activePromotions: [],
      hasPromotion: false,
    };
  }

  /** 使课程/圈子价格缓存失效 */
  async invalidateTargetCache(targetId: string, targetType: PricingTargetType): Promise<void> {
    const key = `${this.CACHE_PREFIX}${targetType.toLowerCase()}:${targetId}`;
    await this.redis.del(key);
  }

  // ───────── 缓存失效 ─────────

  async invalidateCache(productId: string, skuId?: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${productId}:${skuId || "_"}`;
    await this.redis.del(key);
  }

  async invalidateCacheByProduct(productId: string): Promise<void> {
    await this.redis.delByPattern(`${this.CACHE_PREFIX}${productId}:*`);
  }

  // ───────── 辅助 ─────────

  private getPromotionTag(type: string): string {
    switch (type) {
      case "FLASH_SALE": return "秒杀";
      case "GROUP_BUY": return "拼团";
      case "DISCOUNT": return "折扣";
      default: return "活动";
    }
  }
}
