import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { AuditService } from "../audit/audit.service";
import { safePagination } from "../../common/pagination";
import {
  CreateProductDto, UpdateProductDto, ProductListQueryDto,
  PRODUCT_SCENE_TAGS,
} from "./shop.dto";

/** 缓存前缀（与 shop.service 一致） */
const CACHE_PREFIX = "shop:";

/**
 * 商城商品域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：商品 CRUD、品控巡检、逐品佣金率、商品详情/列表/场景取货、店铺主页、SKU 管理。
 */
@Injectable()
export class ShopProductService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private audit: AuditService,
  ) {}

  // ═══════════════════ 商品管理 ═══════════════════

  async createProduct(userId: string, dto: CreateProductDto, autoPublish = false) {
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
      // 管理员/运营创建的商品直接上架（跳过审核 PENDING），避免"保存后列表看不到"
      ...(autoPublish ? { status: "ON_SALE" } : {}),
    };
    if (rest.circleId) data.circle = { connect: { id: rest.circleId } };
    if (rest.categoryId) data.categoryId = rest.categoryId;
    if (rest.intro) data.intro = rest.intro;
    if (rest.images) data.images = rest.images;
    if (rest.videoUrl) data.videoUrl = rest.videoUrl;
    if (rest.sceneTags) data.sceneTags = rest.sceneTags;
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
    if (dto.sceneTags !== undefined) data.sceneTags = dto.sceneTags; // 场景打标即生效（白名单已在 DTO 校验）

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

  /** 设置商品站长推广佣金率（佣-V2-P1·admin-only 由 controller 守卫·null=清除逐品配置回落类目默认 rateA） */
  async setProductCommissionRate(productId: string, rate: number | null) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { commissionRate: rate },
      select: { id: true, title: true, commissionRate: true },
    });
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

  /** 官方旗舰店 owner 的 userId（"官方自营"角标判定：商品 userId===官方店 owner）。无配置则 null。 */
  private async getOfficialOwnerId(): Promise<string | null> {
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "official_merchant_id" } });
    if (!cfg?.configValue) return null;
    const m = await this.prisma.merchant.findUnique({ where: { id: cfg.configValue }, select: { userId: true } });
    return m?.userId ?? null;
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
    let merchant: { id: string; shopName: string; shopLogo: string | null; creditGrade: string } | null = null;
    if (product.userId) {
      merchant = await this.prisma.merchant.findFirst({
        where: { userId: product.userId, status: "ACTIVE" },
        select: { id: true, shopName: true, shopLogo: true, creditGrade: true },
      });
    }

    const officialOwnerId = await this.getOfficialOwnerId();

    return {
      ...product,
      merchant,
      // 严选标（履-P2 权益挂钩）：商家信用 A 级即严选，前端商品详情展示「严选」标识
      isSelected: merchant?.creditGrade === "A",
      // 官方自营标：商品归属官方旗舰店（走商家标准链路，仅展示层加标）
      isOfficialSelfOwned: !!product.userId && product.userId === officialOwnerId,
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
    const { categoryId, status, stationId, keyword, categoryLevel1, priceMin, priceMax, sort } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize);

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
    // TODO(履-P2·流量加权)：设计§三 A 级商家商品应在推荐/默认排序中加权。Prisma orderBy 无法按
    // 「商家(经 Product.userId 关联 Merchant.creditGrade)」跨表加权，需 $queryRaw JOIN 或引入推荐层
    // 排序服务，且须叠加「观察期新商家(<30 天)不参与加权」条件——接线复杂，留 P3/推荐课题单独做。
    // 本批已交付①严选标(isSelected)与②结算周期，A 级权益先以显性标识生效。
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "sales" ? { salesCount: "desc" }
      : sort === "price_asc" ? { price: "asc" }
      : sort === "price_desc" ? { price: "desc" }
      : { createdAt: "desc" };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { skus: true },
        skip,
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

    // 严选标（履-P2 权益挂钩）：批量查本页商品供应商中信用 A 级的 ACTIVE 商家（经 Product.userId 归属），
    // 商品卡附 isSelected；自营/无商家归属的商品不带标（诚实 false）
    const ownerIds = [...new Set(products.map(p => p.userId).filter((v): v is string => !!v))];
    const selectedOwners = ownerIds.length
      ? new Set(
          (await this.prisma.merchant.findMany({
            where: { userId: { in: ownerIds }, status: "ACTIVE", creditGrade: "A" },
            select: { userId: true },
          })).map(m => m.userId),
        )
      : new Set<string>();

    const officialOwnerId = await this.getOfficialOwnerId();

    const enriched = products.map(p => {
      const up = priceMap.get(p.id);
      return {
        ...p,
        price: Number(p.price),
        originalPrice: Number(p.price),
        effectivePrice: up?.effectivePrice ?? Number(p.price),
        hasPromotion: up?.hasPromotion ?? false,
        promotionTag: up?.promotionTag,
        isSelected: !!p.userId && selectedOwners.has(p.userId),
        // 官方自营标：商品归属官方旗舰店
        isOfficialSelfOwned: !!p.userId && p.userId === officialOwnerId,
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

  /**
   * 场景取货（供-P1·无痕商业化触点接线口）：
   * 在售 + 含指定场景标签的商品，销量优先、上架时间兜底，默认取 6 个。
   * tag 必须命中白名单七值（非法标签直接 400·防任意标签探测）；无结果返回空数组（诚实空态）。
   */
  async listProductsByScene(tag: string, limit = 6) {
    if (!(PRODUCT_SCENE_TAGS as readonly string[]).includes(tag)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `非法场景标签，可选：${PRODUCT_SCENE_TAGS.join("/")}`);
    }
    // limit 归一化：非法/NaN 回落默认 6，夹取 1..50（公开端点防大页拖库）
    const take = Math.min(Math.max(Math.trunc(limit) || 6, 1), 50);
    const products = await this.prisma.product.findMany({
      where: { status: "ON_SALE", deletedAt: null, sceneTags: { has: tag } },
      select: {
        id: true, title: true, intro: true, images: true,
        price: true, originalPrice: true, salesCount: true, sceneTags: true, createdAt: true,
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      take,
    });
    return products.map(p => ({
      ...p,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : Number(p.price),
    }));
  }

  /** C 端店铺主页 — 商家公开信息 + 在售商品列表（仅已开通 ACTIVE 商家可见） */
  async getStore(merchantId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, status: "ACTIVE" },
      select: {
        id: true, userId: true, shopName: true, shopLogo: true, shopIntro: true,
        rating: true, totalSales: true, totalOrders: true, openedAt: true, creditGrade: true,
      },
    });
    if (!merchant) throw new BusinessException(ErrorCode.NOT_FOUND, "店铺不存在或未开通");

    // 商品经创建者 userId 归属商家（Product 无 merchantId 列，用 userId 关联在售商品）
    const where: Prisma.ProductWhereInput = { userId: merchant.userId, status: "ON_SALE" };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { skus: true },
        skip,
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
        // 严选标（履-P2 权益挂钩）：A 级店铺主页展示「严选」信任背书
        isSelected: merchant.creditGrade === "A",
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
}
