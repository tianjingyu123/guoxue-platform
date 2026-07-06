import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { safePagination } from "../../common/pagination";
import { ShopProductService } from "./shop-product.service";
import { ShopOrderService } from "./shop-order.service";
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopRefundService } from "./shop-refund.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";

/** 缓存前缀 */
const CACHE_PREFIX = "shop:";

/**
 * 商城 facade（拆分后·纯委托层）。
 * 商品/订单/支付/退款/归因五域已拆至独立 service；本类保留统一入口(controller/marketing 零改动)，
 * 并直接承载评价/物流/运费/购物车等目录-履约辅助方法。
 */
@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private audit: AuditService,
    private product: ShopProductService,
    private orderSvc: ShopOrderService,
    private orderLifecycleSvc: ShopOrderLifecycleService,
    private paymentSvc: ShopPaymentService,
    private refundSvc: ShopRefundService,
  ) {}

  // ═══════════════════ 商品管理（委托 ShopProductService） ═══════════════════

  createProduct(userId: string, dto: CreateProductDto) {
    return this.product.createProduct(userId, dto);
  }

  updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    return this.product.updateProduct(userId, productId, dto);
  }

  deleteProduct(userId: string, productId: string, isAdmin = false) {
    return this.product.deleteProduct(userId, productId, isAdmin);
  }

  updateProductStatus(productId: string, status: string) {
    return this.product.updateProductStatus(productId, status);
  }

  setProductCommissionRate(productId: string, rate: number | null) {
    return this.product.setProductCommissionRate(productId, rate);
  }

  moderateProduct(productId: string, action: string, reason?: string) {
    return this.product.moderateProduct(productId, action, reason);
  }

  getProduct(productId: string, scene?: string, pageId?: string) {
    return this.product.getProduct(productId, scene, pageId);
  }

  listProducts(dto: ProductListQueryDto) {
    return this.product.listProducts(dto);
  }

  listProductCategoryL1() {
    return this.product.listProductCategoryL1();
  }

  listProductsByScene(tag: string, limit = 6) {
    return this.product.listProductsByScene(tag, limit);
  }

  getStore(merchantId: string, page = 1, pageSize = 20) {
    return this.product.getStore(merchantId, page, pageSize);
  }

  addSku(userId: string, productId: string, dto: { name?: string; specs?: Record<string, string>; price: number; stock?: number; skuCode?: string }, isAdmin = false) {
    return this.product.addSku(userId, productId, dto, isAdmin);
  }

  deleteSku(userId: string, skuId: string, isAdmin = false) {
    return this.product.deleteSku(userId, skuId, isAdmin);
  }

  // ═══════════════════ 订单管理 ═══════════════════

  createOrder(userId: string, dto: CreateOrderDto) {
    return this.orderSvc.createOrder(userId, dto);
  }

  createGroupBuyOrder(userId: string, params: {
    groupBuyId: string; productId: string; skuId?: string; groupPrice: number; groupId: string;
  }) {
    return this.orderSvc.createGroupBuyOrder(userId, params);
  }

  settleGroupBuyIfNeeded(orderId: string) {
    return this.orderSvc.settleGroupBuyIfNeeded(orderId);
  }

  refundExpiredGroupBuys() {
    return this.refundSvc.refundExpiredGroupBuys();
  }

  getOrder(orderId: string, userId?: string, isAdmin = false) {
    return this.orderSvc.getOrder(orderId, userId, isAdmin);
  }

  listOrders(dto: OrderListQueryDto) {
    return this.orderSvc.listOrders(dto);
  }

  getUserOrders(userId: string, page = 1, pageSize = 20, status?: string) {
    return this.orderSvc.getUserOrders(userId, page, pageSize, status);
  }

  createJsapiPayment(userId: string, openid: string | undefined, orderId: string, notifyUrl?: string) {
    return this.paymentSvc.createJsapiPayment(userId, openid, orderId, notifyUrl);
  }

  createNativePayment(orderId: string, userId: string, notifyUrl?: string) {
    return this.paymentSvc.createNativePayment(orderId, userId, notifyUrl);
  }

  createRechargePayment(userId: string, openid: string, amountCoin: number, notifyUrl?: string) {
    return this.paymentSvc.createRechargePayment(userId, openid, amountCoin, notifyUrl);
  }

  createCoinRechargeJsapi(userId: string, amountCoin: number) {
    return this.paymentSvc.createCoinRechargeJsapi(userId, amountCoin);
  }

  verifyAndDecryptNotify(signature: string, rawBody: string, timestamp: string, nonce: string, serialNo: string) {
    return this.paymentSvc.verifyAndDecryptNotify(signature, rawBody, timestamp, nonce, serialNo);
  }

  handlePaymentNotify(body: Record<string, unknown>) {
    return this.paymentSvc.handlePaymentNotify(body);
  }

  verifyAlipayNotify(params: Record<string, unknown>) {
    return this.paymentSvc.verifyAlipayNotify(params);
  }

  handleAlipayNotify(data: Record<string, unknown>) {
    return this.paymentSvc.handleAlipayNotify(data);
  }

  verifyUnionpayNotify(params: Record<string, string>) {
    return this.paymentSvc.verifyUnionpayNotify(params);
  }

  handleUnionpayNotify(data: Record<string, unknown>) {
    return this.paymentSvc.handleUnionpayNotify(data);
  }

  alipayQuery(outTradeNo: string) {
    return this.refundSvc.alipayQuery(outTradeNo);
  }

  alipayRefund(params: { outTradeNo: string; refundAmount: number; outRefundNo: string; reason?: string }) {
    return this.refundSvc.alipayRefund(params);
  }

  unionpayQuery(outTradeNo: string) {
    return this.refundSvc.unionpayQuery(outTradeNo);
  }

  unionpayRefund(params: { outTradeNo: string; outRefundNo: string; amount: number; origQryId?: string }) {
    return this.refundSvc.unionpayRefund(params);
  }

  createHuifuPayment(userId: string, orderId: string, openid?: string, payType?: string) {
    return this.paymentSvc.createHuifuPayment(userId, orderId, openid, payType);
  }

  handleHuifuNotify(body: Record<string, unknown>) {
    return this.paymentSvc.handleHuifuNotify(body);
  }

  queryPaymentStatus(orderId: string, userId?: string) {
    return this.paymentSvc.queryPaymentStatus(orderId, userId);
  }

  refundOrder(orderId: string, reason?: string) {
    return this.refundSvc.refundOrder(orderId, reason);
  }

  handleRefundNotify(body: Record<string, unknown>) {
    return this.refundSvc.handleRefundNotify(body);
  }

  shipOrder(orderId: string) {
    return this.orderLifecycleSvc.shipOrder(orderId);
  }

  adminPayOrder(orderId: string, payTransactionId: string, operatorId: string) {
    return this.orderLifecycleSvc.adminPayOrder(orderId, payTransactionId, operatorId);
  }

  completeOrder(orderId: string) {
    return this.orderLifecycleSvc.completeOrder(orderId);
  }

  confirmOrder(orderId: string, userId: string) {
    return this.orderLifecycleSvc.confirmOrder(orderId, userId);
  }

  cancelOrder(orderId: string, userId: string) {
    return this.orderLifecycleSvc.cancelOrder(orderId, userId);
  }

  // ═══════════════════ 商品评价 ═══════════════════

  /** 创建商品评价 */
  async createReview(userId: string, productId: string, dto: CreateReviewDto) {
    // 验证商品存在
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");

    // 验证评分范围
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "评分范围为 1-5 星");
    }

    // 内容审核：评价正文（违规抛异常，写库前拦截）
    await this.audit.moderateTextOrThrow(dto.content, {
      scene: "PRODUCT_REVIEW",
      userId,
      dataId: productId,
    });
    // 图片审核：评价配图（晒图，先审后发）
    await this.audit.moderateImageOrThrow(dto.images, { scene: "PRODUCT_REVIEW", userId, dataId: productId });

    return this.prisma.productReview.create({
      data: {
        productId,
        userId,
        rating: dto.rating,
        content: dto.content,
        images: dto.images || [],
      },
      include: {
        product: { select: { id: true, title: true } },
      },
    });
  }

  /** 获取商品评价列表 */
  /** 给评价列表补全用户(昵称/头像)与商品信息 —— ProductReview 无 user 关系，单独批量查 */
  private async enrichReviews(reviews: any[], includeProduct = false) {
    if (reviews.length === 0) return reviews;
    const userIds = [...new Set(reviews.map(r => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    let productMap = new Map<string, any>();
    if (includeProduct) {
      const productIds = [...new Set(reviews.map(r => r.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, images: true },
      });
      productMap = new Map(products.map(p => [p.id, { id: p.id, title: p.title, image: p.images?.[0] || null }]));
    }

    return reviews.map(r => {
      const u = userMap.get(r.userId);
      return {
        ...r,
        user: u ? { id: u.id, nickname: u.nickname, avatar: u.avatar } : null,
        ...(includeProduct ? { product: productMap.get(r.productId) || null } : {}),
      };
    });
  }

  /** 商品评价统计：平均分 + 各星级分布 + 总数 */
  private async getReviewStats(where: Prisma.ProductReviewWhereInput) {
    const [grouped, withImages] = await Promise.all([
      this.prisma.productReview.groupBy({
        by: ["rating"],
        where,
        _count: { rating: true },
      }),
      // 全量「有图」数量（供前端「有图」筛选 tab 计数，分页后无法从当页聚合）
      this.prisma.productReview.count({ where: { ...where, images: { isEmpty: false } } }),
    ]);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0, count = 0;
    for (const g of grouped) {
      const n = g._count.rating;
      distribution[g.rating] = n;
      sum += g.rating * n;
      count += n;
    }
    return { average: count > 0 ? Number((sum / count).toFixed(1)) : 0, count, distribution, withImages };
  }

  async listReviews(productId: string, page = 1, pageSize = 20, sort?: string, filter?: string) {
    const where: Prisma.ProductReviewWhereInput = { productId, status: "PUBLISHED" };
    // rating/有图 多维过滤仅作用于列表查询；stats 始终按全量算，保证筛选 tab 计数准确（好评/中评/差评/有图）
    const listWhere: Prisma.ProductReviewWhereInput = { ...where };
    if (filter === "good") listWhere.rating = { gte: 4 };
    else if (filter === "medium") listWhere.rating = 3;
    else if (filter === "bad") listWhere.rating = { lte: 2 };
    else if (filter === "images") listWhere.images = { isEmpty: false };
    const skip = (page - 1) * pageSize;
    // withImages「有图优先」需按数组长度排序，Prisma orderBy 不支持 → 原生 SQL（与 rating 过滤互斥，当前 UI 不同时使用）；其余按时间倒序
    const reviewsQuery =
      sort === "withImages" && !filter
        ? this.prisma.$queryRaw<any[]>`
            SELECT * FROM "ProductReview"
            WHERE "productId" = ${productId} AND status = 'PUBLISHED'
            ORDER BY (COALESCE(array_length(images, 1), 0) > 0) DESC, "createdAt" DESC
            LIMIT ${pageSize} OFFSET ${skip}`
        : this.prisma.productReview.findMany({ where: listWhere, skip, take: pageSize, orderBy: { createdAt: "desc" } });
    const [rawReviews, total, stats] = await Promise.all([
      reviewsQuery,
      this.prisma.productReview.count({ where: listWhere }),
      this.getReviewStats(where),
    ]);
    const reviews = await this.enrichReviews(rawReviews);
    return { reviews, total, page, pageSize, stats };
  }

  /** 管理员回复评价 */
  async replyProductReview(reviewId: string, reply: string) {
    const review = await this.prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new BusinessException(ErrorCode.NOT_FOUND, "评价不存在");

    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { reply, repliedAt: new Date() },
    });
  }

  /** 管理员删除评价 */
  async deleteProductReview(reviewId: string) {
    await this.prisma.productReview.findUniqueOrThrow({ where: { id: reviewId } });
    await this.prisma.productReview.delete({ where: { id: reviewId } });
    return { success: true };
  }

  /** 获取店铺级评价列表（聚合所有商品评价） */
  async listShopReviews(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { status: "PUBLISHED" as const };
    const [rawReviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    const reviews = await this.enrichReviews(rawReviews, true);
    return { reviews, total, page, pageSize };
  }

  // ═══════════════════ 物流追踪 ═══════════════════

  /** 获取物流信息 */
  async getLogistics(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权查看他人订单物流");

    const logistics = await this.prisma.orderLogistics.findUnique({
      where: { orderId },
    });
    return { order, logistics: logistics || null };
  }

  /** 管理员更新物流信息 */
  async updateLogistics(orderId: string, dto: UpdateLogisticsDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.status !== "PAID" && order.status !== "SHIPPED") {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "当前订单状态不可设置物流");
    }

    // upsert: 存在则更新，不存在则创建
    const logistics = await this.prisma.orderLogistics.upsert({
      where: { orderId },
      create: { orderId, ...dto },
      update: dto,
    });

    // 如果有物流单号且订单目前是 PAID，自动改为 SHIPPED
    if (dto.logisticsNo && order.status === "PAID") {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED", shippedAt: new Date() },
      });
    }

    return logistics;
  }

  // ═══════════════════ 运费模板 ═══════════════════

  async createFreightTemplate(dto: CreateFreightTemplateDto) {
    const data: Prisma.FreightTemplateCreateInput = {
      name: dto.name,
      type: dto.type ?? "FIXED",
      defaultFee: dto.defaultFee ?? 0,
      isActive: dto.isActive ?? true,
    };
    if (dto.conditionFree !== undefined) data.conditionFree = dto.conditionFree as Prisma.InputJsonValue;
    if (dto.regions !== undefined) data.regions = dto.regions as Prisma.InputJsonValue;

    return this.prisma.freightTemplate.create({ data });
  }

  async updateFreightTemplate(id: string, dto: UpdateFreightTemplateDto) {
    const existing = await this.prisma.freightTemplate.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "运费模板不存在");

    const data: Prisma.FreightTemplateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.defaultFee !== undefined) data.defaultFee = dto.defaultFee;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.conditionFree !== undefined) data.conditionFree = dto.conditionFree as Prisma.InputJsonValue;
    if (dto.regions !== undefined) data.regions = dto.regions as Prisma.InputJsonValue;

    return this.prisma.freightTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteFreightTemplate(id: string) {
    await this.prisma.freightTemplate.findUniqueOrThrow({ where: { id } });
    await this.prisma.freightTemplate.delete({ where: { id } });
    return { success: true };
  }

  async getFreightTemplates(rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { isActive: true };
    const [items, total] = await Promise.all([
      this.prisma.freightTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.freightTemplate.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getFreightTemplate(id: string) {
    const template = await this.prisma.freightTemplate.findUnique({ where: { id } });
    if (!template) throw new BusinessException(ErrorCode.NOT_FOUND, "运费模板不存在");
    return template;
  }

  // ═══════════════════ 购物车（Redis） ═══════════════════

  private cartKey(userId: string) { return `shop:cart:${userId}`; }

  async getCart(userId: string) {
    const key = this.cartKey(userId);
    const items: any[] = await this.redis.getJson<any[]>(key) || [];
    if (items.length === 0) return { items: [], totalCount: 0, totalAmount: 0 };

    // 补全商品信息
    const productIds = [...new Set(items.map(i => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: "ON_SALE" },
      select: { id: true, title: true, price: true, images: true, stock: true, status: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // 补全SKU信息
    const skuIds = items.filter(i => i.skuId).map(i => i.skuId!);
    const skus = skuIds.length > 0 ? await this.prisma.productSku.findMany({
      where: { id: { in: skuIds } },
      select: { id: true, specs: true, price: true, stock: true, skuCode: true },
    }) : [];
    const skuMap = new Map(skus.map(s => [s.id, s]));

    // 批量计算统一活动价格
    const pricingInputs = items.map(i => ({ productId: i.productId, skuId: i.skuId || undefined }));
    const pricingResults = await this.unifiedPricing.batchCalculateEffectivePrice(
      pricingInputs, userId, { scene: "cart" },
    );
    const priceMap = new Map(pricingResults.map(r => [`${r.productId}:${r.skuId || "_"}`, r]));

    const enriched = items.map(item => {
      const product = productMap.get(item.productId);
      const sku = item.skuId ? skuMap.get(item.skuId) : null;
      const baseUnitPrice = sku ? Number(sku.price) : (product ? Number(product.price) : 0);
      const upKey = `${item.productId}:${item.skuId || "_"}`;
      const up = priceMap.get(upKey);
      const unitPrice = up?.effectivePrice ?? baseUnitPrice;
      // 可用库存：有 SKU 取 SKU 库存，否则取商品库存；商品需 ON_SALE 才有效
      const stock = sku ? sku.stock : (product ? product.stock : 0);
      const isValid = !!product && stock > 0;
      return {
        id: item.id,
        productId: item.productId,
        skuId: item.skuId || null,
        product: product ? { id: product.id, title: product.title, image: product.images?.[0] || null, status: product.status } : null,
        sku: sku ? { id: sku.id, specs: sku.specs, price: Number(sku.price), stock: sku.stock } : null,
        quantity: item.quantity || 1,
        stock,
        isValid,
        invalidReason: isValid ? null : (!product ? "商品已下架" : "库存不足"),
        unitPrice,
        originalPrice: baseUnitPrice,
        totalPrice: unitPrice * (item.quantity || 1),
        hasPromotion: up?.hasPromotion ?? false,
        promotionTag: up?.promotionTag,
        addedAt: item.addedAt,
      };
    });

    const totalAmount = enriched.reduce((sum, i) => sum + i.totalPrice, 0);
    return { items: enriched, totalCount: enriched.length, totalAmount: Number(totalAmount.toFixed(2)) };
  }

  async addToCart(userId: string, productId: string, skuId?: string, quantity = 1) {
    // 校验商品存在且上架
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, stock: true },
    });
    if (!product || product.status !== "ON_SALE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不存在或已下架");
    }

    const key = this.cartKey(userId);
    const items: any[] = await this.redis.getJson<any[]>(key) || [];

    const existingIdx = items.findIndex(
      i => i.productId === productId && (i.skuId || null) === (skuId || null),
    );
    if (existingIdx >= 0) {
      items[existingIdx].quantity += quantity;
    } else {
      items.push({
        id: `${productId}_${skuId || "default"}`,
        productId,
        skuId: skuId || null,
        quantity,
        addedAt: new Date().toISOString(),
      });
    }
    await this.redis.setJson(key, items, 7 * 86400); // 7天过期
    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const key = this.cartKey(userId);
    const items: any[] = await this.redis.getJson<any[]>(key) || [];
    const idx = items.findIndex(i => i.id === itemId);
    if (idx < 0) throw new BusinessException(ErrorCode.NOT_FOUND, "购物车商品不存在");
    if (quantity <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx].quantity = quantity;
    }
    await this.redis.setJson(key, items, 7 * 86400);
    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    return this.updateCartItem(userId, itemId, 0);
  }

  async clearCart(userId: string) {
    await this.redis.del(this.cartKey(userId));
    return { success: true };
  }

}
