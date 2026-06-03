// ─────────────────────────────────────────────────
// 统一价格引擎 — 类型定义
// ─────────────────────────────────────────────────

export enum PromotionPriority {
  FLASH_SALE = 100,
  GROUP_BUY = 90,
  DISCOUNT = 80,
  PRICING_RULE = 50,
  BASE_PRICE = 0,
}

export interface PricingContext {
  /** 当前所在的微页面路由 */
  pageId?: string;
  /** 场景标记: detail | list | cart | checkout */
  scene?: string;
}

export interface ActivePromotion {
  /** 活动类型: FLASH_SALE / GROUP_BUY / DISCOUNT */
  type: string;
  /** 活动ID */
  id: string;
  /** 活动名称 */
  name: string;
  /** 活动优先级 */
  priority: PromotionPriority;
  /** 活动价格 */
  price: number;
  /** 活动附加信息 */
  extra?: Record<string, unknown>;
}

export interface UnifiedPriceResult {
  /** 商品ID */
  productId: string;
  /** SKU ID（如有） */
  skuId?: string;
  /** 生效价格（活动价或基础价） */
  effectivePrice: number;
  /** 原价（product.price，划线展示用） */
  originalPrice: number;
  /** 原始标价（product.originalPrice，永不变化） */
  baseListPrice?: number;
  /** 当前生效的促销活动（null = 无活动） */
  appliedPromotion: ActivePromotion | null;
  /** 该商品参与的所有进行中活动列表 */
  activePromotions: ActivePromotion[];
  /** 是否有任何活动 */
  hasPromotion: boolean;
  /** 前端展示标签 */
  promotionTag?: string;
}

export type PricingTargetType = "PRODUCT" | "COURSE" | "CIRCLE";

export interface BatchPricingInput {
  productId: string;
  skuId?: string;
}

export interface BatchPriceResult {
  items: UnifiedPriceResult[];
}

/** 课程/圈子价格计算结果 */
export interface TargetPriceResult {
  targetId: string;
  targetType: PricingTargetType;
  effectivePrice: number;
  originalPrice: number;
  baseListPrice?: number;
  appliedPromotion: ActivePromotion | null;
  activePromotions: ActivePromotion[];
  hasPromotion: boolean;
  promotionTag?: string;
}
