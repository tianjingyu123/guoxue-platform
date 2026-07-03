import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { Prisma, MemberLevel, Order } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 订单缓存 TTL */
const ORDER_CACHE_TTL = 300;
/** 订单列表缓存 TTL */
const ORDER_LIST_CACHE_TTL = 60;
/** 缓存前缀 */
const CACHE_PREFIX = "shop:";
import { CommissionService } from "../commission/commission.service";
import { AuditService } from "../audit/audit.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { PaymentProviderFactory } from "./payment-factory";
import { HuifuService } from "../huifu/huifu.service";
import { CoinService } from "../coin/coin.service";
import { WebhookService } from "../webhook/webhook.service";
import { COIN_TO_RMB, RMB_TO_FEN } from "../../common/constants";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";

@Injectable()
export class ShopService {
  /** 虚拟商品类型 — 无需库存恢复，新增类型追加此集合 */
  private static readonly NO_INVENTORY_TYPES = new Set(["MEMBER"]);
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private wechatPay: WechatPayService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private paymentFactory: PaymentProviderFactory,
    private webhook: WebhookService,
    private audit: AuditService,
    @Optional() private huifu?: HuifuService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {}

  // ═══════════════════ 商品管理 ═══════════════════

  async createProduct(userId: string, dto: CreateProductDto) {
    // 内容审核：商品标题+简介+详情（违规抛异常，写库前拦截）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.intro, dto.detail].filter(Boolean).join(" "),
      { scene: "PRODUCT", userId },
    );
    const { skus, ...rest } = dto;
    const data: Prisma.ProductCreateInput = {
      title: rest.title,
      price: rest.price,
      stock: rest.stock ?? 0,
      detail: rest.detail ?? "",
      userId,
    };
    if (rest.circleId) data.circle = { connect: { id: rest.circleId } };
    if (rest.categoryId) data.categoryId = rest.categoryId;
    if (rest.intro) data.intro = rest.intro;
    if (rest.images) data.images = rest.images;
    if (rest.videoUrl) data.videoUrl = rest.videoUrl;
    if (rest.stationId) data.station = { connect: { id: rest.stationId } };
    if (skus) {
      data.skus = { create: skus.map(s => ({ specs: s.specs, price: s.price, stock: s.stock ?? 0, skuCode: s.skuCode ?? null })) };
    }

    return this.prisma.product.create({
      data,
      include: { skus: true },
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的商品");

    // 内容审核：改动的标题+简介+详情（违规抛异常，写库前拦截）
    await this.audit.moderateTextOrThrow(
      [dto.title, dto.intro, dto.detail].filter(Boolean).join(" "),
      { scene: "PRODUCT_EDIT", userId, dataId: productId },
    );

    const data: Prisma.ProductUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.intro !== undefined) data.intro = dto.intro;
    if (dto.detail !== undefined) data.detail = dto.detail;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data,
      include: { skus: true },
    });
    // 清除商品缓存
    await this.redis.del(`${CACHE_PREFIX}product:${productId}`);
    return updated;
  }

  async deleteProduct(userId: string, productId: string, isAdmin = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (!isAdmin && product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的商品");
    await this.prisma.product.delete({ where: { id: productId } });
    await this.redis.del(`${CACHE_PREFIX}product:${productId}`);
    return { success: true };
  }

  /** 更新商品状态 */
  async updateProductStatus(productId: string, status: string) {
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const updated = await this.prisma.product.update({ where: { id: productId }, data: { status } });
    await this.redis.del(`${CACHE_PREFIX}product:${productId}`);
    return updated;
  }

  /**
   * 商品品控巡检（事后抽查）
   * - takedown：违规下架（status → OFF_SHELF）
   * - restore：恢复上架（status → ON_SALE）
   * - warn：警告，不改变上架状态，仅由调用方记审计
   * 违规原因通过审计日志持久化（无需新增 Product 列），返回结果供前端反馈。
   */
  async moderateProduct(productId: string, action: string, reason?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");

    let status = product.status;
    if (action === "takedown") status = "OFF_SHELF";
    else if (action === "restore") status = "ON_SALE";
    else if (action !== "warn") throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的操作类型");

    if (status !== product.status) {
      await this.prisma.product.update({ where: { id: productId }, data: { status } });
      await this.redis.del(`${CACHE_PREFIX}product:${productId}`);
    }

    return {
      id: productId,
      action,
      reason: reason ?? null,
      prevStatus: product.status,
      status,
    };
  }

  async getProduct(productId: string, scene?: string, pageId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        circle: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");

    // 统一价格计算
    const pricing = await this.unifiedPricing.calculateEffectivePrice(productId, undefined, undefined, { pageId, scene });

    // 商家公开信息（用于详情页「进店」入口）。商品经创建者 userId 归属商家（Product.userId = Merchant.userId）；
    // 自营商品（创建者非商家）或商家未开通 ACTIVE 则为 null，前端据此诚实降级隐藏入口。
    let merchant: { id: string; shopName: string; shopLogo: string | null } | null = null;
    if (product.userId) {
      merchant = await this.prisma.merchant.findFirst({
        where: { userId: product.userId, status: "ACTIVE" },
        select: { id: true, shopName: true, shopLogo: true },
      });
    }

    return {
      ...product,
      merchant,
      price: Number(product.price),
      originalPrice: Number(product.price),
      baseListPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      effectivePrice: pricing.effectivePrice,
      activePromotions: pricing.activePromotions,
      appliedPromotion: pricing.appliedPromotion,
      hasPromotion: pricing.hasPromotion,
      promotionTag: pricing.promotionTag,
    };
  }

  async listProducts(dto: ProductListQueryDto) {
    const { page = 1, pageSize = 20, categoryId, status, stationId, keyword, categoryLevel1, priceMin, priceMax, sort } = dto;

    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (stationId) where.stationId = stationId;
    if (keyword) where.title = { contains: keyword, mode: "insensitive" };
    if (categoryLevel1) where.categoryLevel1 = categoryLevel1;
    if (priceMin != null || priceMax != null) {
      where.price = {};
      if (priceMin != null) where.price.gte = priceMin;
      if (priceMax != null) where.price.lte = priceMax;
    }

    // 排序下沉：销量/价格升降/最新；default 同最新
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "sales" ? { salesCount: "desc" }
      : sort === "price_asc" ? { price: "asc" }
      : sort === "price_desc" ? { price: "desc" }
      : { createdAt: "desc" };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { skus: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 批量计算统一价格
    const pricingResults = await this.unifiedPricing.batchCalculateEffectivePrice(
      products.map(p => ({ productId: p.id })),
      undefined,
      { pageId: (dto as any).pageId, scene: "list" },
    );
    const priceMap = new Map(pricingResults.map(r => [r.productId, r]));

    const enriched = products.map(p => {
      const up = priceMap.get(p.id);
      return {
        ...p,
        price: Number(p.price),
        originalPrice: Number(p.price),
        effectivePrice: up?.effectivePrice ?? Number(p.price),
        hasPromotion: up?.hasPromotion ?? false,
        promotionTag: up?.promotionTag,
      };
    });

    return { products: enriched, total, page, pageSize };
  }

  /** 商品一级品类聚合(供商城分类页 tab：分页后无法从单页商品聚合出完整分类) */
  async listProductCategoryL1() {
    const grouped = await this.prisma.product.groupBy({
      by: ["categoryLevel1"],
      where: { categoryLevel1: { not: null } },
      _count: { _all: true },
    });
    return grouped
      .filter(g => g.categoryLevel1)
      .map(g => ({ name: g.categoryLevel1 as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  /** C 端店铺主页 — 商家公开信息 + 在售商品列表（仅已开通 ACTIVE 商家可见） */
  async getStore(merchantId: string, page = 1, pageSize = 20) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, status: "ACTIVE" },
      select: {
        id: true, userId: true, shopName: true, shopLogo: true, shopIntro: true,
        rating: true, totalSales: true, totalOrders: true, openedAt: true,
      },
    });
    if (!merchant) throw new BusinessException(ErrorCode.NOT_FOUND, "店铺不存在或未开通");

    // 商品经创建者 userId 归属商家（Product 无 merchantId 列，用 userId 关联在售商品）
    const where: Prisma.ProductWhereInput = { userId: merchant.userId, status: "ON_SALE" };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { skus: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    const enriched = products.map((p) => ({
      ...p,
      price: Number(p.price),
      originalPrice: Number(p.price),
    }));

    return {
      merchant: {
        id: merchant.id,
        shopName: merchant.shopName,
        shopLogo: merchant.shopLogo,
        shopIntro: merchant.shopIntro,
        rating: Number(merchant.rating),
        totalSales: Number(merchant.totalSales),
        totalOrders: merchant.totalOrders,
        openedAt: merchant.openedAt,
        productCount: total,
      },
      products: enriched,
      total,
      page,
      pageSize,
    };
  }

  // ═══════════════════ SKU 管理 ═══════════════════

  async addSku(userId: string, productId: string, dto: { name?: string; specs?: Record<string, string>; price: number; stock?: number; skuCode?: string }, isAdmin = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (!isAdmin && product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能给自己的商品添加SKU");
    let specs = dto.specs || {};
    if (!dto.specs && dto.name) {
      const parts = dto.name.split(":");
      if (parts.length >= 2) {
        specs = { [parts[0].trim()]: parts.slice(1).join(":").trim() };
      } else {
        specs = { name: dto.name };
      }
    }
    return this.prisma.productSku.create({
      data: {
        productId,
        specs,
        price: dto.price,
        stock: dto.stock ?? 0,
        skuCode: dto.skuCode,
      },
    });
  }

  async deleteSku(userId: string, skuId: string, isAdmin = false) {
    const sku = await this.prisma.productSku.findUnique({ where: { id: skuId }, include: { product: true } });
    if (!sku) throw new BusinessException(ErrorCode.NOT_FOUND, "SKU不存在");
    if (!isAdmin && sku.product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己商品的SKU");
    await this.prisma.productSku.delete({ where: { id: skuId } });
    return { success: true };
  }

  // ═══════════════════ 订单管理 ═══════════════════

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 服务端计算实际金额，无视前端传入的 amount（防篡改）
    let actualAmount = 0;
    let promotionType: string | undefined;
    let promotionId: string | undefined;
    let supplierUserId: string | undefined;
    let supplierType: string | undefined;

    // 购买数量（仅实物 PRODUCT 生效；其他类型恒为 1，保持原行为不受影响）
    const qty = dto.type === "PRODUCT" ? Math.max(1, Math.floor(Number(dto.amount) || 1)) : 1;

    // 会员订单：从 MemberConfig 查询实际价格
    if (dto.type === "MEMBER") {
      const plan = await this.prisma.memberConfig.findUnique({ where: { id: dto.targetId } });
      if (!plan) throw new BusinessException(ErrorCode.BAD_REQUEST, "会员方案不存在");
      if (!plan.isActive) throw new BusinessException(ErrorCode.BAD_REQUEST, "该会员方案已停售");
      actualAmount = Number(plan.price);
    } else {
      const productId = dto.targetId;
      if (dto.skuId) {
        const sku = await this.prisma.productSku.findUnique({
          where: { id: dto.skuId },
          select: { price: true, product: { select: { id: true, status: true, supplierType: true, userId: true } } },
        });
        if (!sku || sku.product.status !== "ON_SALE") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        supplierType = sku.product.supplierType;
        supplierUserId = sku.product.userId ?? undefined;
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, price: true, status: true, supplierType: true, userId: true },
        });
        if (!product || product.status !== "ON_SALE") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        supplierType = product.supplierType;
        supplierUserId = product.userId ?? undefined;
      }

      // 使用统一价格引擎计算活动价
      const pricing = await this.unifiedPricing.calculateEffectivePrice(
        productId, dto.skuId, userId, { pageId: (dto as any).pageId, scene: "checkout" },
      );
      // 金额 = 活动单价 × 数量（钱货严谨：多件按件计价，不可只算单件）
      actualAmount = Math.round(pricing.effectivePrice * qty * 100) / 100;
      if (pricing.appliedPromotion) {
        promotionType = pricing.appliedPromotion.type;
        promotionId = pricing.appliedPromotion.id;
      }
    }

    // 商家商品：查找商家ID
    let merchantId: string | undefined;
    if (supplierType === "CERTIFIED_MERCHANT" && supplierUserId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId: supplierUserId },
        select: { id: true },
      });
      merchantId = merchant?.id;
    }

    // 收货地址校验与快照（实物订单）：校验归属当前用户，存下单时快照（地址表可改可删，订单存快照最可靠）
    let shippingInfo: Record<string, string> | undefined;
    if (dto.addressId) {
      const addr = await this.prisma.shippingAddress.findFirst({
        where: { id: dto.addressId, userId },
        select: { name: true, phone: true, province: true, city: true, district: true, detail: true },
      });
      if (!addr) throw new BusinessException(ErrorCode.BAD_REQUEST, "收货地址不存在或不属于当前用户");
      shippingInfo = {
        name: addr.name, phone: addr.phone, province: addr.province,
        city: addr.city, district: addr.district, detail: addr.detail,
      };
    }

    // ── 推荐归因（2026-07-02 拍板）──
    // 全平台单一分享链接（ref=分享者用户ID或分站推广码）：最近分享者=临时推荐人（前端7天窗口传入），
    // 优先于永久归属分站；永久归属由服务端从 ReferralRelation 回填，不信任前端传入的 referrerId。
    const tempReferrerId = await this.resolveReferrerUserId(dto.tempReferrerId, userId);
    let permanentReferrerId: string | null = null;
    try {
      const relation = await this.prisma.referralRelation.findFirst({
        where: { userId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { referrerId: true },
      });
      permanentReferrerId = relation?.referrerId ?? null;
    } catch {
      /* 归属查询失败不阻塞下单，按无永久归属处理 */
    }
    const effectiveReferrerId = tempReferrerId || permanentReferrerId;

    // 站长自购立减（2026-07-02 拍板）：站长本人购买（无推荐人或推荐人为本人）直接按佣金比例立减成交，
    // 不产生佣金；退款按实付价退。杜绝自购返佣/刷单套利。
    let selfPurchaseRate = 0;
    if (this.commissionSvc && (!effectiveReferrerId || effectiveReferrerId === userId)) {
      try {
        const ownStation = await this.prisma.station.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true },
        });
        if (ownStation) selfPurchaseRate = (await this.commissionSvc.getStationRate(dto.type)) ?? 0;
      } catch (e) {
        this.logger.warn("站长自购立减查询失败，按原价下单", e);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 优惠券校验与折扣计算（服务端计算，防篡改）
      if (dto.couponId) {
        const userCoupon = await tx.userCoupon.findFirst({
          where: { id: dto.couponId, userId, used: false },
          include: { coupon: true },
        });
        if (!userCoupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在或已被使用");

        const coupon = userCoupon.coupon;
        if (coupon.status !== "ACTIVE") throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已失效");
        const now = new Date();
        if (now < coupon.validStart) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券尚未生效");
        if (now > coupon.validEnd) throw new BusinessException(ErrorCode.COUPON_EXPIRED, "优惠券已过期");
        if (coupon.scope === "PRODUCT" && coupon.scopeId && coupon.scopeId !== dto.targetId) {
          throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不适用于该商品");
        }
        if (coupon.minAmount && actualAmount < Number(coupon.minAmount)) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, `不满足优惠券最低消费 ¥${Number(coupon.minAmount).toFixed(2)}`);
        }

        // 服务端计算优惠后金额
        if (coupon.type === "FULL_REDUCE" || coupon.type === "NO_THRESHOLD") {
          actualAmount = Math.max(0.01, actualAmount - Number(coupon.discountAmount || coupon.value || 0));
        } else if (coupon.type === "DISCOUNT") {
          const rate = Number(coupon.discountRate || (coupon.value ? Number(coupon.value) / 100 : 1));
          actualAmount = Math.max(0.01, actualAmount * rate);
        }
        actualAmount = Math.round(actualAmount * 100) / 100;

        await tx.userCoupon.update({
          where: { id: dto.couponId },
          data: { used: true, usedAt: new Date() },
        });
      }

      // 站长自购立减：在券后价基础上按佣金比例立减，并清空推荐关系（佣金天然不产生）
      let selfDiscount = 0;
      if (selfPurchaseRate > 0) {
        selfDiscount = Math.round(actualAmount * selfPurchaseRate * 100) / 100;
        actualAmount = Math.max(0.01, Math.round((actualAmount - selfDiscount) * 100) / 100);
      }

      const order = await tx.order.create({
        data: {
          userId,
          type: dto.type as any,
          targetId: dto.targetId,
          skuId: dto.skuId,
          quantity: qty,
          amount: actualAmount,
          couponId: dto.couponId,
          promotionType,
          promotionId,
          merchantId,
          addressId: dto.addressId,
          shippingInfo: shippingInfo as any,
          referrerId: selfDiscount > 0 ? null : permanentReferrerId,
          tempReferrerId: selfDiscount > 0 ? null : tempReferrerId,
          selfDiscount: selfDiscount > 0 ? selfDiscount : null,
          status: "PENDING",
        },
      });

      // 扣减库存（非会员订单），带库存 >= 数量 约束防止超卖（按 qty 扣减，钱货严谨）
      if (dto.type !== "MEMBER") {
        if (dto.skuId) {
          const skuResult = await tx.productSku.updateMany({
            where: { id: dto.skuId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (skuResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "SKU库存不足");
        } else {
          const productResult = await tx.product.updateMany({
            where: { id: dto.targetId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (productResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "商品库存不足");
        }
      }

      return order;
    });
  }

  /**
   * 创建拼团订单（付费拼团：用拼团价 groupPrice 下单，标记 promotionType=GROUP_BUY + groupId，扣库存）。
   * 由 marketing.joinGroupBuy 委托调用；支付成功后由 settleGroupBuyIfNeeded 创建参与者并判定成团。
   */
  async createGroupBuyOrder(userId: string, params: {
    groupBuyId: string; productId: string; skuId?: string; groupPrice: number; groupId: string;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: params.productId },
      select: { id: true, status: true, supplierType: true, userId: true },
    });
    if (!product || product.status !== "ON_SALE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
    }
    let merchantId: string | undefined;
    if (product.supplierType === "CERTIFIED_MERCHANT" && product.userId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId: product.userId }, select: { id: true },
      });
      merchantId = merchant?.id;
    }
    const amount = Math.round(Number(params.groupPrice) * 100) / 100;
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId, type: "PRODUCT", targetId: params.productId, skuId: params.skuId,
          amount, promotionType: "GROUP_BUY", promotionId: params.groupBuyId,
          groupId: params.groupId, merchantId, status: "PENDING",
        },
      });
      if (params.skuId) {
        const r = await tx.productSku.updateMany({ where: { id: params.skuId, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
        if (r.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "SKU库存不足");
      } else {
        const r = await tx.product.updateMany({ where: { id: params.productId, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
        if (r.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "商品库存不足");
      }
      return order;
    });
  }

  /**
   * 拼团订单支付成功后结算：创建参与者(已付) + 判定成团（同团已付人数 ≥ minMembers → 全组 SUCCESS）。
   * 幂等（按 orderId 防重复创建）；并发安全（不同订单的参与者创建互不冲突，成团 updateMany 幂等）。
   */
  async settleGroupBuyIfNeeded(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.promotionType !== "GROUP_BUY" || !order.promotionId || !order.groupId) return;
    const exist = await this.prisma.groupBuyParticipant.findFirst({ where: { orderId } });
    if (exist) return; // 幂等：该订单已创建参与者
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: order.promotionId } });
    if (!gb) return;
    const cnt = await this.prisma.groupBuyParticipant.count({ where: { groupId: order.groupId } });
    await this.prisma.groupBuyParticipant.create({
      data: {
        groupBuyId: order.promotionId, userId: order.userId, groupId: order.groupId,
        isLeader: cnt === 0, orderId: order.id, status: "WAITING",
      },
    });
    const paidCount = await this.prisma.groupBuyParticipant.count({
      where: { groupId: order.groupId, status: { in: ["WAITING", "SUCCESS"] } },
    });
    if (paidCount >= gb.minMembers) {
      await this.prisma.groupBuyParticipant.updateMany({
        where: { groupId: order.groupId, status: "WAITING" }, data: { status: "SUCCESS" },
      });
      this.logger.log(`拼团成团 groupId=${order.groupId} 人数=${paidCount}/${gb.minMembers}`);
    }
  }

  /**
   * 扫描并退款超时未成团的拼团（管理员/定时触发）：
   * WAITING 参与者，其订单已付且超过 groupBuy.expireMinutes 仍未成团 → 退款 + 置 REFUNDED。
   * 注：refundOrder 走真实支付渠道退款，本地无商户证书会失败（仅生产可全通）。
   */
  async refundExpiredGroupBuys(): Promise<{ scanned: number; refunded: number }> {
    const waiting = await this.prisma.groupBuyParticipant.findMany({
      where: { status: "WAITING", orderId: { not: null } },
      include: { groupBuy: true },
    });
    let refunded = 0;
    const now = Date.now();
    for (const p of waiting) {
      const expireMs = (p.groupBuy.expireMinutes || 1440) * 60000;
      const order = await this.prisma.order.findUnique({ where: { id: p.orderId! } });
      if (!order?.paidAt) continue;
      if (now - new Date(order.paidAt).getTime() < expireMs) continue;
      try {
        await this.refundOrder(order.id, "拼团超时未成团，自动退款");
        await this.prisma.groupBuyParticipant.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
        refunded++;
      } catch (e) {
        this.logger.error(`拼团超时退款失败 participant=${p.id}`, e);
      }
    }
    return { scanned: waiting.length, refunded };
  }

  async getOrder(orderId: string, userId?: string, isAdmin = false) {
    const cacheKey = `${CACHE_PREFIX}order:${orderId}`;
    let order = await this.redis.getJson<any>(cacheKey);
    if (!order) {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, nickname: true } },
        },
      });
      if (!order) throw new BusinessException(ErrorCode.NOT_FOUND, "订单不存在");
      await this.redis.setJson(cacheKey, order, ORDER_CACHE_TTL);
    }
    if (!isAdmin && userId && order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的订单");

    const [enriched] = await this.enrichOrders([order]);
    return enriched;
  }

  private readonly VALID_ORDER_STATUSES = new Set(["PENDING", "PAID", "SHIPPED", "COMPLETED", "REFUNDED", "CANCELLED"]);

  async listOrders(dto: OrderListQueryDto) {
    const { page = 1, pageSize = 20, orderNo, type, status, userId, startDate, endDate } = dto;
    const filterHash = createHash("sha1")
      .update(`${orderNo || ""}|${type || ""}|${status || ""}|${userId || ""}|${startDate || ""}|${endDate || ""}`)
      .digest("hex");
    const cacheKey = `${CACHE_PREFIX}orders:${page}:${pageSize}:${filterHash}`;

    // 简单查询走缓存
    const cached = !orderNo && !startDate && !endDate ? await this.redis.getJson<any>(cacheKey) : null;
    if (cached) return cached;

    const where: Prisma.OrderWhereInput = {};
    if (orderNo) where.id = { contains: orderNo };
    if (type) where.type = type as any;
    if (status && this.VALID_ORDER_STATUSES.has(status)) where.status = status as any;
    if (userId) where.userId = userId;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate + "T00:00:00+08:00"),
        lte: new Date(endDate + "T23:59:59+08:00"),
      };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = { orders, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, ORDER_LIST_CACHE_TTL);
    return data;
  }

  async getUserOrders(userId: string, page = 1, pageSize = 20, status?: string) {
    const safeStatus = status && this.VALID_ORDER_STATUSES.has(status) ? status : undefined;
    const cacheKey = `${CACHE_PREFIX}userOrders:${userId}:${page}:${pageSize}:${safeStatus || "all"}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.OrderWhereInput = { userId };
    if (safeStatus) where.status = safeStatus as any;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.order.count({ where }),
    ]);
    const data = { orders: await this.enrichOrders(orders), total, page, pageSize };
    await this.redis.setJson(cacheKey, data, ORDER_LIST_CACHE_TTL);
    return data;
  }

  /**
   * 批量补全订单的商品/SKU 信息，供 C 端订单列表与详情渲染。
   * 原 Order 行仅含 targetId/skuId，无商品名/封面/规格，前端无法展示。
   * 按 targetId join Product、skuId join ProductSku，附加 product/sku 字段（原字段全部透传，内部调用方不受影响）。
   */
  private async enrichOrders<T extends { targetId: string; skuId: string | null }>(orders: T[]) {
    if (orders.length === 0) return [] as (T & { product: any; sku: any })[];

    const productIds = [...new Set(orders.map(o => o.targetId).filter(Boolean))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, images: true, price: true },
        })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    const skuIds = orders.map(o => o.skuId).filter((s): s is string => !!s);
    const skus = skuIds.length
      ? await this.prisma.productSku.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, specs: true, price: true },
        })
      : [];
    const skuMap = new Map(skus.map(s => [s.id, s]));

    return orders.map(o => {
      const p = o.targetId ? productMap.get(o.targetId) : null;
      const sku = o.skuId ? skuMap.get(o.skuId) : null;
      const skuName = sku?.specs && typeof sku.specs === "object" && !Array.isArray(sku.specs)
        ? Object.values(sku.specs as Record<string, unknown>).filter(Boolean).join(" ") || null
        : null;
      return {
        ...o,
        product: p ? { id: p.id, title: p.title, cover: p.images?.[0] || null, price: Number(p.price) } : null,
        sku: sku ? { id: sku.id, skuName, price: Number(sku.price) } : null,
      };
    });
  }

  /** 创建微信支付JSAPI订单（小程序内支付） */
  async createJsapiPayment(
    userId: string,
    openid: string,
    orderId: string,
    notifyUrl?: string,
  ) {
    const order = await this.getOrder(orderId);
    if (!order || order.userId !== userId) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");

    const outTradeNo = `GX${Date.now()}${orderId.slice(0, 8)}`;
    const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);

    const result = await this.wechatPay.createJsapiOrder({
      outTradeNo,
      description: `国学平台订单-${orderId.slice(0, 8)}`,
      amount: { total: totalFen },
      payer: { openid },
      attach: orderId,
      notifyUrl,
    });

    // 更新订单支付交易号
    await this.prisma.order.update({
      where: { id: orderId },
      data: { payTransactionId: outTradeNo },
    });

    return result.paySign;
  }

  /** 创建Native扫码支付 */
  async createNativePayment(orderId: string, userId: string, notifyUrl?: string) {
    const order = await this.getOrder(orderId);
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");

    const outTradeNo = `GX${Date.now()}${orderId.slice(0, 8)}`;
    const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);

    const result = await this.wechatPay.createNativeOrder({
      outTradeNo,
      description: `国学平台订单-${orderId.slice(0, 8)}`,
      amount: { total: totalFen },
      attach: orderId,
      notifyUrl,
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { payTransactionId: outTradeNo },
    });

    return result;
  }

  /** 创建虚拟币充值支付订单 */
  async createRechargePayment(
    userId: string,
    openid: string,
    amountCoin: number,
    notifyUrl?: string,
  ) {
    const amountRmb = amountCoin / COIN_TO_RMB;
    const totalFen = Math.round(amountRmb * RMB_TO_FEN);

    const orderNo = `RC${Date.now()}${userId.slice(0, 6)}`;
    const result = await this.wechatPay.createJsapiOrder({
      outTradeNo: orderNo,
      description: `${amountCoin}国学币充值`,
      amount: { total: totalFen },
      payer: { openid },
      attach: JSON.stringify({ type: "COIN_RECHARGE", userId, amountCoin }),
      notifyUrl,
    });

    return result.paySign;
  }

  /**
   * 国学币充值 —— 微信小程序 JSAPI 下单。
   * openid 从用户的微信授权记录（Auth provider=WECHAT）查取，避免前端处理 openid。
   * 未绑定微信（如仅手机号登录）时诚实报错，前端据此降级为演示/引导。
   * 到账由支付回调 handlePaymentNotify → CoinService.handleRechargeCallback 完成（幂等），此处不预扣不加币。
   */
  async createCoinRechargeJsapi(userId: string, amountCoin: number) {
    if (!amountCoin || amountCoin <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值金额必须大于0");
    }
    const wechatAuth = await this.prisma.auth.findFirst({
      where: { userId, provider: "WECHAT" },
      select: { openId: true },
    });
    if (!wechatAuth?.openId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "未绑定微信，请在微信小程序内使用微信登录后再充值");
    }
    const payParams = await this.createRechargePayment(userId, wechatAuth.openId, amountCoin);
    return { payParams };
  }

  /** 验签+解密支付回调 */
  async verifyAndDecryptNotify(
    signature: string, rawBody: string, timestamp: string, nonce: string, serialNo: string,
  ): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    // 防重放攻击
    if (!WechatPayService.isTimestampValid(timestamp)) {
      return { valid: false, error: "时间戳已过期" };
    }
    // 组装为 wechat-pay 期望的签名头格式
    const signHeader = `timestamp="${timestamp}",nonce_str="${nonce}",signature="${signature}",serial_no="${serialNo}"`;
    return this.wechatPay.verifyAndDecryptNotify(signHeader, rawBody) as Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }>;
  }

  /** 处理微信支付回调（统一入口） */
  async handlePaymentNotify(body: Record<string, unknown>) {
    const outTradeNo = body.out_trade_no as string;
    const lockKey = `pay:lock:${outTradeNo}`;

    // 分布式锁防并发重复处理
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`支付回调重复处理被拦截: ${outTradeNo}`);
      return;
    }

    try {
      const transactionId = body.transaction_id as string;

      // 解析 attach 判断业务类型
      let attach: Record<string, unknown> = {};
      try {
        attach = typeof body.attach === "string" ? JSON.parse(body.attach) : body.attach || {};
      } catch (err) {
        this.logger.warn(`支付回调 attach 解析失败`, err);
        attach = {};
      }

      // 虚拟币充值回调 → 转发给 CoinService
      if (attach.type === "COIN_RECHARGE" && this.coinSvc) {
        await this.coinSvc.handleRechargeCallback(body);
        return;
      }

      if (body.trade_state !== "SUCCESS") {
        this.logger.log(`支付未成功: ${outTradeNo}, 状态: ${body.trade_state}`);
        return;
      }

      // 商城订单回调 — 避免双重查询
      const attachOrderId = typeof body.attach === "string" ? body.attach : "";
      let orderId: string | undefined = attachOrderId;
      let order: Order | null = null;
      if (!orderId) {
        order = await this.prisma.order.findFirst({
          where: { payTransactionId: outTradeNo },
        });
        orderId = order?.id;
      }

      if (!orderId) {
        this.logger.error(`找不到对应的订单: ${outTradeNo}`);
        return;
      }

      // 只有 attach 提供了 orderId 才需要另外查询（已通过 payTransactionId 查到的直接复用）
      if (!order) {
        order = await this.prisma.order.findUnique({ where: { id: orderId } });
      }
      if (!order || order.status !== "PENDING") return;

      const orderLockKey = await this.acquireOrderLock(orderId);
      if (!orderLockKey) return;

      try {
        await this.processPaidOrder(order, "WECHAT", transactionId);
      } catch (e: unknown) {
        if (e instanceof BusinessException && e.message === "订单状态已变更") return;
        if (isUniqueConstraintError(e)) {
          this.logger.warn(`支付回调重复处理(DB约束拦截): ${outTradeNo}, transactionId: ${transactionId}`);
          return;
        }
        throw e;
      } finally {
        await this.redis.del(orderLockKey);
      }
      await this.recordOrderCommissionAndFee({ ...order, id: orderId });

      this.logger.log(`订单 ${orderId} 支付成功, 微信交易号: ${transactionId}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 支付宝回调验签 */
  async verifyAlipayNotify(params: Record<string, unknown>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.alipay.verifyNotify(params);
  }

  /** 处理支付宝回调 */
  async handleAlipayNotify(data: Record<string, unknown>) {
    const outTradeNo = data.outTradeNo as string;
    await this.completePayment(outTradeNo, "ALIPAY", data.tradeNo as string, data.tradeStatus === "TRADE_SUCCESS");
  }

  /** 银联回调验签 */
  async verifyUnionpayNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.unionpay.verifyNotify(params) as Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }>;
  }

  /** 处理银联回调 */
  async handleUnionpayNotify(data: Record<string, unknown>) {
    if (data.respCode !== "00") return;
    const outTradeNo = data.outTradeNo as string;
    await this.completePayment(outTradeNo, "UNIONPAY", data.tradeNo as string, true);
  }

  /**
   * 解析归因 ref 值（分享者用户ID 或 分站推广码）→ 推荐人 userId。
   * 无效值静默丢弃（按无临时推荐人处理）；ref=买家本人时保留（供自购立减判定）。
   */
  private async resolveReferrerUserId(ref: string | undefined | null, buyerId: string): Promise<string | null> {
    if (!ref) return null;
    if (ref === buyerId) return buyerId;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: ref }, select: { id: true } });
      if (user) return user.id;
      const station = await this.prisma.station.findUnique({ where: { code: ref }, select: { userId: true, status: true } });
      if (station?.status === "ACTIVE") return station.userId;
    } catch {
      /* 解析失败按无推荐人处理 */
    }
    return null;
  }

  /** 统一支付完成处理（支付宝/银联） */
  /**
   * 订单支付成功后统一记账：分佣 + 平台费。
   * 微信/汇付回调已记，此 helper 供支付宝/银联/线下确认(adminPayOrder)复用，避免账目漏记。
   * 事务外执行，失败仅记日志不影响订单状态。
   */
  private async recordOrderCommissionAndFee(order: { id: string; type: string; amount: unknown; userId?: string | null; referrerId?: string | null; tempReferrerId?: string | null }) {
    if (!this.commissionSvc) return;
    try {
      await this.commissionSvc.calculateAndRecord(
        order.id, order.type, Number(order.amount),
        order.referrerId || undefined, order.tempReferrerId || undefined,
        undefined, order.userId || undefined,
      );
    } catch (e) {
      this.logger.error("分佣计算失败", e);
    }
    try {
      const fee = await this.commissionSvc.calculatePlatformFee(order.type, Number(order.amount));
      if (fee) {
        await this.commissionSvc.recordPlatformFee({
          type: order.type, sourceId: order.id, sourceAmount: Number(order.amount),
          platformRate: fee.platformRate, platformFee: fee.platformFee,
        });
      }
    } catch (e) {
      this.logger.error("平台费记录失败", e);
    }
  }

  private async completePayment(outTradeNo: string, payMethod: string, tradeNo: string, success: boolean) {
    if (!success) {
      this.logger.log(`支付未成功: ${outTradeNo}, 方式: ${payMethod}`);
      return;
    }

    // 防重入锁（支付渠道侧）
    const payLockKey = `pay:lock:${outTradeNo}`;
    const payLocked = await this.redis.setNX(payLockKey, "1", 30);
    if (!payLocked) {
      this.logger.warn(`支付回调重复处理被拦截: ${outTradeNo}`);
      return;
    }

    try {
      const order = await this.prisma.order.findFirst({
        where: { payTransactionId: outTradeNo },
      });
      if (!order) {
        this.logger.error(`找不到对应的订单: ${outTradeNo}`);
        return;
      }
      if (order.status !== "PENDING") return;

      const orderLockKey = await this.acquireOrderLock(order.id);
      if (!orderLockKey) return;

      try {
        await this.processPaidOrder(order, payMethod, tradeNo);
      } catch (e: unknown) {
        if (e instanceof BusinessException && e.message === "订单状态已变更") return;
        if (isUniqueConstraintError(e)) {
          this.logger.warn(`支付回调重复处理(DB约束拦截): ${outTradeNo}, payMethod: ${payMethod}`);
          return;
        }
        throw e;
      } finally {
        await this.redis.del(orderLockKey);
      }

      // 分佣 + 平台费（事务外，失败可重试不影响订单状态；此前支付宝/银联漏记平台费）
      await this.recordOrderCommissionAndFee(order);

      // 触发 Webhook（fire-and-forget，不阻塞主流程）
      this.webhook.fire("ORDER_PAID", {
        orderId: order.id,
        outTradeNo,
        payMethod,
        tradeNo,
        amount: Number(order.amount),
        userId: order.userId,
      }).catch((err) => this.logger.warn("Webhook ORDER_PAID 发送失败", err));

      this.logger.log(`订单 ${order.id} 支付成功, ${payMethod}交易号: ${tradeNo}`);
    } finally {
      await this.redis.del(payLockKey);
    }
  }

  /** 获取订单互斥锁，失败时重试一次，返回 lockKey 或 null */
  private async acquireOrderLock(orderId: string): Promise<string | null> {
    const key = `order:lock:${orderId}`;
    const locked = await this.redis.setNX(key, "1", 10);
    if (locked) return key;

    this.logger.warn(`订单锁冲突(可能正在取消): ${orderId}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const ret = await this.redis.setNX(key, "1", 10);
    if (ret) return key;

    this.logger.error(`订单锁重试失败: ${orderId}`);
    return null;
  }

  /** 订单类型 × 支付后处理器 — 新增类型在此注册 */
  private readonly paidPostProcessors: Record<string, (order: Order, tx: any) => Promise<void>> = {
    MEMBER: (order, tx) => this.processMemberPaid(order, tx),
  };

  /** 事务内更新订单状态为 PAID + 按类型触发后处理 */
  private async processPaidOrder(order: { id: string; type: string; userId: string; amount: any; targetId?: string | null; referrerId?: string | null }, payMethod: string, tradeNo: string) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "PAID",
          payMethod,
          paidAt: new Date(),
          payTransactionId: tradeNo,
        },
      });
      if (result.count === 0) {
        this.logger.warn(`订单 ${order.id} 状态已变更(可能已被取消)，跳过支付处理`);
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更");
      }

      const processor = this.paidPostProcessors[order.type];
      if (processor) await processor(order as Order, tx);
    });
    // 拼团订单：支付成功后结算成团（事务外独立处理，失败不影响支付主流程）
    await this.settleGroupBuyIfNeeded(order.id).catch((e) => this.logger.error(`拼团成团结算失败 order=${order.id}`, e));
  }

  /** MEMBER 支付后处理 — 按订单套餐（targetId=MemberConfig.id）定档开通 + 记录购买 */
  private async processMemberPaid(order: Order, tx: any) {
    // 定档真源=下单时选择的套餐；仅历史订单缺套餐时按金额兜底（阈值对齐 2026-07 定价）
    let memberLevel: string | null = null;
    if (order.targetId) {
      const plan = await tx.memberConfig.findUnique({ where: { id: order.targetId } });
      if (plan) memberLevel = plan.level;
    }
    if (!memberLevel) memberLevel = this.resolveMemberLevel(Number(order.amount));
    const expiresAt = this.calcMemberExpiry(memberLevel);
    await tx.user.update({
      where: { id: order.userId },
      data: { memberLevel: memberLevel as MemberLevel, memberExpire: expiresAt },
    });
    await tx.memberPurchase.create({
      data: {
        userId: order.userId,
        memberType: memberLevel as any,
        amount: order.amount,
        referrerId: order.referrerId,
        paidAt: new Date(),
        expireAt: expiresAt,
      },
    });
  }

  /** 支付宝订单查询 */
  async alipayQuery(outTradeNo: string) {
    return this.alipay.query(outTradeNo);
  }

  /** 支付宝退款（金额单位：元）*/
  async alipayRefund(params: { outTradeNo: string; refundAmount: number; outRefundNo: string; reason?: string }) {
    const order = await this.assertRefundAmountValid(params.outTradeNo, params.refundAmount);
    const result = await this.alipay.refund(params);
    // 网关退款成功后统一记账（此前遗漏→退款后订单仍 PAID、佣金不冲正、仍被结算给商家）
    await this.applyRefundedBookkeeping(order.id, Number(order.amount), params.reason);
    return result;
  }

  /** 银联订单查询 */
  async unionpayQuery(outTradeNo: string) {
    return this.unionpay.query(outTradeNo);
  }

  /** 银联退款（金额单位：分）*/
  async unionpayRefund(params: { outTradeNo: string; outRefundNo: string; amount: number; origQryId?: string }) {
    const order = await this.assertRefundAmountValid(params.outTradeNo, params.amount / RMB_TO_FEN);
    const result = await this.unionpay.refund(params);
    await this.applyRefundedBookkeeping(order.id, Number(order.amount));
    return result;
  }

  /**
   * 校验退款金额：必须 > 0 且不超过订单实付金额。
   * 同时检查订单未被全额退款过。
   * outTradeNo 即创建支付时写入的 order.payTransactionId（唯一）。
   */
  private async assertRefundAmountValid(outTradeNo: string, refundRmb: number) {
    if (!(refundRmb > 0)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "退款金额必须大于0");
    }
    const order = await this.prisma.order.findUnique({ where: { payTransactionId: outTradeNo } });
    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "未找到对应订单，无法退款");
    }
    if (order.status === "REFUNDED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已全额退款，不可重复退款");
    }
    const paid = Number(order.payAmount ?? order.amount);
    if (refundRmb > paid + 1e-6) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `退款金额不可超过订单实付金额（${paid.toFixed(2)} 元）`);
    }
    return order;
  }

  /**
   * 退款成功后的统一记账（幂等）：CAS 置 REFUNDED → 失缓存 → 冲正分佣 → webhook。
   * 供 refundOrder / alipayRefund / unionpayRefund 复用，避免"退款后订单仍 PAID、
   * 佣金不冲正、仍被结算给商家"的重复出账。CAS 保证并发/重投下只冲正一次。
   */
  private async applyRefundedBookkeeping(orderId: string, amount: number, reason?: string) {
    const res = await this.prisma.order.updateMany({
      where: { id: orderId, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });
    if (res.count === 0) return; // 已退款/状态不符 → 幂等跳过，不重复冲正
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    if (this.commissionSvc) {
      this.commissionSvc.reverseCommission(orderId).catch((e) =>
        this.logger.error(`分佣冲正失败, 订单: ${orderId}`, e),
      );
    }
    this.webhook.fire("ORDER_REFUNDED", { orderId, amount, reason: reason || "用户申请退款" })
      .catch((err) => this.logger.warn("Webhook ORDER_REFUNDED 发送失败", err));
  }

  // ═══════════════════ 汇付天下支付 ═══════════════════

  /** 创建汇付天下支付 */
  async createHuifuPayment(userId: string, orderId: string, openid?: string, payType?: string) {
    if (!this.huifu) throw new BusinessException(ErrorCode.PAY_FAILED, "汇付支付未配置");
    return this.huifu.createPayment(userId, { orderId, payType, openid });
  }

  /** 处理汇付天下支付回调 */
  async handleHuifuNotify(body: Record<string, unknown>) {
    if (!this.huifu) {
      this.logger.error("汇付支付回调但服务未配置");
      return;
    }

    const outTradeNo = body.out_trade_no as string;
    if (!outTradeNo) return;

    const lockKey = `huifu:cb:shop:${outTradeNo}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) return;

    try {
      const tradeStatus = body.trade_status || body.status;
      if (tradeStatus !== "SUCCESS" && tradeStatus !== "TRADE_SUCCESS") return;

      const order = await this.prisma.order.findFirst({
        where: { payTransactionId: outTradeNo },
      });
      if (!order || order.status !== "PENDING") return;

      const transactionId = (body.huifu_order_id || body.transaction_id) as string;

      const orderLockKey = await this.acquireOrderLock(order.id);
      if (!orderLockKey) return;

      try {
        await this.processPaidOrder(order, "HUIFU", outTradeNo);
      } catch (e: unknown) {
        if (e instanceof BusinessException && e.message === "订单状态已变更") return;
        if (isUniqueConstraintError(e)) {
          this.logger.warn(`汇付支付回调重复处理(DB约束拦截): ${outTradeNo}`);
          return;
        }
        throw e;
      } finally {
        await this.redis.del(orderLockKey);
      }

      // 分佣计算（事务外，失败可重试不影响订单状态）
      if (this.commissionSvc) {
        try {
          await this.commissionSvc.calculateAndRecord(
            order.id, order.type, Number(order.amount),
            order.referrerId || undefined, order.tempReferrerId || undefined,
            undefined, order.userId || undefined,
          );
        } catch (e) {
          this.logger.error("汇付支付分佣计算失败", e);
        }
        // 平台费记录
        try {
          const fee = await this.commissionSvc.calculatePlatformFee(order.type, Number(order.amount));
          if (fee) {
            await this.commissionSvc.recordPlatformFee({
              type: order.type, sourceId: order.id, sourceAmount: Number(order.amount),
              platformRate: fee.platformRate, platformFee: fee.platformFee,
            });
          }
        } catch (e) {
          this.logger.error("汇付支付平台费记录失败", e);
        }
      }

      // 触发 Webhook（fire-and-forget，不阻塞主流程）
      this.webhook.fire("ORDER_PAID", {
        orderId: order.id, outTradeNo, payMethod: "HUIFU", tradeNo: transactionId,
        amount: Number(order.amount), userId: order.userId,
      }).catch((err) => this.logger.warn("Webhook ORDER_PAID 发送失败", err));

      this.logger.log(`汇付订单 ${order.id} 支付成功, 交易号: ${transactionId}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 查询订单支付状态 */
  async queryPaymentStatus(orderId: string, userId?: string) {
    const order = await this.getOrder(orderId, userId);
    if (!order?.payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单无支付记录");

    const result = await this.wechatPay.queryOrder(order.payTransactionId);
    return { tradeState: result.trade_state, raw: result };
  }

  /** 申请退款（根据支付渠道自动路由，含分佣回收） */
  async refundOrder(orderId: string, reason?: string) {
    // 分布式锁防并发重复退款
    const lockKey = `refund:lock:${orderId}`;
    const locked = await this.redis.setNX(lockKey, "1", 120); // 覆盖网关退款可能的较长耗时
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "退款正在处理中，请勿重复操作");
    }

    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order || !["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) {
        throw new BusinessException(ErrorCode.ORDER_REFUND_DENIED, "订单不可退款");
      }

      const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);
      // 稳定退款单号(按订单)：并发/重试时网关据 outRefundNo 幂等去重，防锁超时后二次退款到账
      const outRefundNo = `RF${orderId}`;

      // 通过支付工厂统一路由退款（新增渠道无需修改此处）
      const payMethod = order.payMethod || "WECHAT";
      const outTradeNo = order.payTransactionId || outRefundNo;

      // 支付网关未配置（如管理员线下确认支付的订单、或本环境未接入网关）时无法调用网关退款，
      // 降级为「线下退款」：标记 REFUNDED + 冲正分佣，由财务线下打款。
      // 否则会因缺密钥抛「No key provided to sign」导致退款 500 崩溃。
      let result: { status: string };
      if (!this.paymentFactory.isConfigured(payMethod)) {
        this.logger.warn(`支付渠道 ${payMethod} 未配置，订单 ${orderId} 降级为线下退款（标记 REFUNDED，需财务线下打款）`);
        result = { status: "SUCCESS" };
      } else {
        result = await this.paymentFactory.refund(payMethod, {
          outTradeNo,
          outRefundNo,
          totalYuan: Number(order.amount),
          totalFen,
          reason: reason || "用户申请退款",
        });
      }

      if (result.status === "SUCCESS" || result.status === "PROCESSING") {
        await this.applyRefundedBookkeeping(orderId, Number(order.amount), reason);
      }

      return result;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 处理微信退款回调通知 */
  async handleRefundNotify(body: Record<string, unknown>) {
    const outRefundNo = body.out_refund_no as string;
    const lockKey = `refund:cb:${outRefundNo}`;

    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`退款回调重复处理被拦截: ${outRefundNo}`);
      return;
    }

    try {
      const refundStatus = body.refund_status as string;
      const outTradeNo = body.out_trade_no as string;

      if (refundStatus === "SUCCESS") {
        // 查找关联订单用于分佣冲正
        const refundedOrder = await this.prisma.order.findFirst({
          where: { payTransactionId: outTradeNo },
          select: { id: true },
        });

        await this.prisma.order.updateMany({
          where: { payTransactionId: outTradeNo, status: { not: "REFUNDED" } },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });

        // 异步冲正分佣
        if (refundedOrder && this.commissionSvc) {
          this.commissionSvc.reverseCommission(refundedOrder.id).catch((e) =>
            this.logger.error(`退款回调分佣冲正失败, 订单: ${refundedOrder.id}`, e)
          );
        }

        const refundAmount = (body.amount as Record<string, unknown>)?.refund ?? body.refund_amount;
        this.webhook.fire("ORDER_REFUNDED", {
          outTradeNo,
          outRefundNo,
          refundAmount,
        }).catch((err) => this.logger.warn("Webhook ORDER_REFUNDED 发送失败", err));
        this.logger.log(`退款回调: ${outRefundNo} 成功, 订单: ${outTradeNo}`);
      } else if (refundStatus === "FAIL" || refundStatus === "CLOSED") {
        this.logger.warn(`退款回调: ${outRefundNo} 失败/关闭, 状态: ${refundStatus}, 订单: ${outTradeNo}`);
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async shipOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PAID") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单不可发货");

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    return updated;
  }

  /** 管理员手动确认支付（需提供实际支付流水号，防止伪造支付确认） */
  async adminPayOrder(orderId: string, payTransactionId: string, operatorId: string) {
    if (!payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供支付流水号");
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅待支付订单可确认支付");

    // CAS 状态翻转防并发重复确认
    const flipped = await this.prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), payTransactionId },
    });
    if (flipped.count === 0) throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更");
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    // 线下确认收款同样记分佣 + 平台费（与网关支付路径一致，避免账目漏记）
    await this.recordOrderCommissionAndFee(order);
    // 拼团订单：管理员确认支付后同样触发成团结算（本地无微信证书时用此路径验证闭环）
    await this.settleGroupBuyIfNeeded(orderId).catch((e) => this.logger.error(`拼团成团结算失败 order=${orderId}`, e));
    this.logger.log(`管理员 ${operatorId} 手动确认支付: ${orderId}, 流水号: ${payTransactionId}`);
    return { success: true, orderId, payTransactionId };
  }

  async completeOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { status: true, userId: true, type: true, targetId: true } });
    if (!order || order.status !== "SHIPPED") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅已发货订单可确认完成");
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    // 异步记录购买行为
    if (order) {
      this.prisma.userBehavior.create({ data: { userId: order.userId, targetType: order.type, targetId: order.targetId, behavior: "PURCHASE", weight: 5 } }).catch((e) => this.logger.warn("用户购买行为记录失败", e));
    }
    return updated;
  }

  /** 用户确认收货：校验订单归属后复用 completeOrder（completeOrder 仅放行 SHIPPED 订单，无分账副作用）。 */
  async confirmOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能确认自己的订单");
    const result = await this.completeOrder(orderId);
    await this.redis.del(`${CACHE_PREFIX}userOrders:${userId}:1:20`);
    return result;
  }

  async cancelOrder(orderId: string, userId: string) {
    // 分布式锁防并发（与支付回调共享锁 key）
    const lockKey = `order:lock:${orderId}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单正在处理中，请稍后重试");

    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权取消");
      if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅待付款订单可取消");

      await this.prisma.$transaction(async (tx) => {
        // 乐观锁：仅当状态仍为 PENDING 时取消
        const result = await tx.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (result.count === 0) throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更，无法取消");

        // 恢复库存（虚拟商品如 MEMBER 无需恢复）
        if (!ShopService.NO_INVENTORY_TYPES.has(order.type)) {
          if (order.skuId) {
            await tx.productSku.updateMany({
              where: { id: order.skuId },
              data: { stock: { increment: order.quantity } },
            });
          } else if (order.targetId) {
            await tx.product.updateMany({
              where: { id: order.targetId },
              data: { stock: { increment: order.quantity } },
            });
          }
        }

        // 释放优惠券
        if (order.couponId) {
          await tx.userCoupon.updateMany({
            where: { id: order.couponId, used: true },
            data: { used: false, usedAt: null },
          });
        }
      });

      return { id: orderId, status: "CANCELLED" };
    } finally {
      await this.redis.del(lockKey);
      await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
      await this.redis.del(`${CACHE_PREFIX}userOrders:${userId}:1:20`);
    }
  }

  // ───────── 超时未支付自动取消 ─────────

  /**
   * 每5分钟扫描一次，自动取消超过30分钟的 PENDING 订单。
   * 先批量获取分布式锁，再单事务批量更新（库存/优惠券聚合合并），
   * 避免逐单 transaction 产生的 N+1 问题。
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: "autoCancelExpiredOrders" })
  async autoCancelExpiredOrders() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: { id: true, type: true, skuId: true, targetId: true, couponId: true },
      take: 100,
    });

    if (expiredOrders.length === 0) return;

    // Phase 1：批量获取分布式锁（并发安全）
    const lockedIds: string[] = [];
    for (const order of expiredOrders) {
      const lockKey = `order:lock:${order.id}`;
      const locked = await this.redis.setNX(lockKey, "1", 30);
      if (locked) lockedIds.push(order.id);
    }

    if (lockedIds.length === 0) return;

    try {
      // Phase 2：单事务批量更新（库存/优惠券按 skuId/productId/couponId 聚合）
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: { id: { in: lockedIds }, status: "PENDING" },
          data: { status: "CANCELLED" },
        });

        if (result.count === 0) return;

        // 聚合 SKU 库存恢复
        const skuCounts = new Map<string, number>();
        for (const o of expiredOrders) {
          if (lockedIds.includes(o.id) && o.type !== "MEMBER" && o.skuId) {
            skuCounts.set(o.skuId, (skuCounts.get(o.skuId) || 0) + 1);
          }
        }
        for (const [skuId, count] of skuCounts) {
          await tx.productSku.updateMany({
            where: { id: skuId },
            data: { stock: { increment: count } },
          });
        }

        // 聚合商品库存恢复
        const productCounts = new Map<string, number>();
        for (const o of expiredOrders) {
          if (lockedIds.includes(o.id) && o.type !== "MEMBER" && !o.skuId && o.targetId) {
            productCounts.set(o.targetId, (productCounts.get(o.targetId) || 0) + 1);
          }
        }
        for (const [targetId, count] of productCounts) {
          await tx.product.updateMany({
            where: { id: targetId },
            data: { stock: { increment: count } },
          });
        }

        // 批量释放优惠券
        const couponIds = expiredOrders
          .filter(o => lockedIds.includes(o.id) && o.couponId)
          .map(o => o.couponId!);
        if (couponIds.length > 0) {
          await tx.userCoupon.updateMany({
            where: { id: { in: couponIds }, used: true },
            data: { used: false, usedAt: null },
          });
        }

        this.logger.log(`自动取消超时订单: ${result.count} 单`);
      });
    } catch (err) {
      this.logger.warn(`自动取消超时订单失败: ${(err as Error).message}`);
    } finally {
      // Phase 3：释放所有锁
      for (const id of lockedIds) {
        await this.redis.del(`order:lock:${id}`).catch(() => {});
      }
    }
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
  async listShopReviews(page = 1, pageSize = 20) {
    const where = { status: "PUBLISHED" as const };
    const [rawReviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip: (page - 1) * pageSize,
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

  async getFreightTemplates(page = 1, pageSize = 20) {
    const where = { isActive: true };
    const [items, total] = await Promise.all([
      this.prisma.freightTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
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

  // ═══════════════════ 会员辅助 ═══════════════════

  /** 金额→等级兜底（仅历史无套餐订单用；阈值对齐 2026-07 定价：月199/年999/终身3949） */
  private resolveMemberLevel(amount: number): string {
    if (amount >= 3000) return "LIFETIME";
    if (amount >= 900) return "YEARLY";
    return "MONTHLY";
  }

  private calcMemberExpiry(level: string): Date | null {
    if (level === "LIFETIME") return null;
    const now = new Date();
    if (level === "YEARLY") {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now;
  }
}
