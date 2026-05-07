import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CommissionService } from "../commission/commission.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CommissionService)) private commissionSvc?: CommissionService,
  ) {}

  // ═══════════════════ 商品管理 ═══════════════════

  async createProduct(userId: string, dto: CreateProductDto) {
    const { skus, ...rest } = dto;
    const data: any = {
      title: rest.title,
      price: rest.price,
      stock: rest.stock ?? 0,
      userId,
    };
    if (rest.circleId) data.circleId = rest.circleId;
    if (rest.categoryId) data.categoryId = rest.categoryId;
    if (rest.intro) data.intro = rest.intro;
    if (rest.detail) data.detail = rest.detail;
    if (rest.images) data.images = rest.images;
    if (rest.videoUrl) data.videoUrl = rest.videoUrl;
    if (skus) {
      data.skus = { create: skus.map(s => ({ specs: s.specs, price: s.price, stock: s.stock ?? 0, skuCode: s.skuCode ?? null })) };
    }

    return this.prisma.product.create({
      data,
      include: { skus: true },
    });
  }

  async updateProduct(productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("商品不存在");

    return this.prisma.product.update({
      where: { id: productId },
      data: dto as any,
      include: { skus: true },
    });
  }

  async deleteProduct(productId: string) {
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        circle: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundException("商品不存在");
    return product;
  }

  async listProducts(dto: ProductListQueryDto) {
    const { page = 1, pageSize = 20, categoryId, status } = dto;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

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

    return { products, total, page, pageSize };
  }

  // ═══════════════════ SKU 管理 ═══════════════════

  async addSku(productId: string, dto: { specs: Record<string, string>; price: number; stock?: number; skuCode?: string }) {
    return this.prisma.productSku.create({
      data: {
        productId,
        specs: dto.specs,
        price: dto.price,
        stock: dto.stock ?? 0,
        skuCode: dto.skuCode,
      },
    });
  }

  async deleteSku(skuId: string) {
    await this.prisma.productSku.delete({ where: { id: skuId } });
    return { success: true };
  }

  // ═══════════════════ 订单管理 ═══════════════════

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 非会员订单需验证商品
    if (dto.type !== "MEMBER") {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.targetId },
        select: { id: true, price: true, status: true },
      });
      if (!product || product.status !== "ON_SALE") {
        throw new BadRequestException("商品不可购买");
      }
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        type: dto.type as any,
        targetId: dto.targetId,
        skuId: dto.skuId,
        amount: dto.amount,
        couponId: dto.couponId,
        referrerId: dto.referrerId,
        tempReferrerId: dto.tempReferrerId,
        status: "PENDING",
      },
    });

    // 如果用了优惠券，标记已用
    if (dto.couponId) {
      await this.prisma.userCoupon.update({
        where: { id: dto.couponId },
        data: { used: true, usedAt: new Date() },
      });
    }

    return order;
  }

  async getOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });
  }

  async listOrders(dto: OrderListQueryDto) {
    const { page = 1, pageSize = 20, type, status } = dto;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

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

    return { orders, total, page, pageSize };
  }

  async getUserOrders(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, total, page, pageSize };
  }

  async payOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.status !== "PENDING") throw new BadRequestException("订单状态不可支付");

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        payMethod: "WECHAT",
        paidAt: new Date(),
        payTransactionId: `MOCK_${Date.now()}`,
      },
    });

    // 支付成功后计算分佣
    if (this.commissionSvc) {
      try {
        await this.commissionSvc.calculateAndRecord(
          orderId,
          order.type,
          Number(order.amount),
          order.referrerId || undefined,
          order.tempReferrerId || undefined,
        );
      } catch (e) {
        console.error("分佣计算失败:", e);
      }
    }

    // 会员订单：激活会员等级
    if (order.type === "MEMBER") {
      const memberLevel = this.resolveMemberLevel(Number(order.amount));
      const expiresAt = this.calcMemberExpiry(memberLevel);
      await this.prisma.user.update({
        where: { id: order.userId },
        data: { memberLevel: memberLevel as any, memberExpire: expiresAt },
      });
      await this.prisma.memberPurchase.create({
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

    return updated;
  }

  async shipOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PAID") throw new BadRequestException("订单不可发货");

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
  }

  async completeOrder(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  async refundOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !["PAID", "SHIPPED"].includes(order.status)) {
      throw new BadRequestException("订单不可退款");
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });
  }

  // ═══════════════════ 优惠券管理 ═══════════════════

  async createCoupon(dto: CreateCouponV2Dto) {
    const { type } = dto;
    // 根据类型自动填充 discountAmount/discountRate
    let value = dto.value;
    let discountAmount = dto.discountAmount;
    let discountRate = dto.discountRate;

    if (type === "FULL_REDUCE" || type === "NO_THRESHOLD") {
      value = value ?? discountAmount ?? 0;
      discountAmount = discountAmount ?? value;
    } else if (type === "DISCOUNT") {
      discountRate = discountRate ?? (value ? value / 100 : undefined);
      value = value ?? (discountRate ? discountRate * 100 : 0);
    }

    return this.prisma.coupon.create({
      data: {
        type: type as any,
        name: dto.name,
        value: value ?? 0,
        discountAmount,
        discountRate,
        minAmount: dto.minAmount,
        scope: dto.scope || "ALL",
        scopeId: dto.scopeId,
        totalCount: dto.totalCount ?? -1,
        status: dto.status || "ACTIVE",
        validStart: new Date(dto.validStart),
        validEnd: new Date(dto.validEnd),
      },
    });
  }

  async listCoupons(page = 1, pageSize = 20, admin = false) {
    const now = new Date();
    // 管理员查看全部，普通用户只看有效优惠券
    const where = admin ? {} : { status: "ACTIVE", validEnd: { gte: now } };
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return { coupons, total, page, pageSize };
  }

  /** 更新优惠券（管理员） */
  async updateCoupon(id: string, dto: CreateCouponV2Dto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("优惠券不存在");

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type as any;
    if (dto.discountAmount !== undefined) updateData.discountAmount = dto.discountAmount;
    if (dto.discountRate !== undefined) updateData.discountRate = dto.discountRate;
    if (dto.value !== undefined) updateData.value = dto.value;
    if (dto.minAmount !== undefined) updateData.minAmount = dto.minAmount;
    if (dto.scope !== undefined) updateData.scope = dto.scope;
    if (dto.scopeId !== undefined) updateData.scopeId = dto.scopeId;
    if (dto.totalCount !== undefined) updateData.totalCount = dto.totalCount;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.validStart !== undefined) updateData.validStart = new Date(dto.validStart);
    if (dto.validEnd !== undefined) updateData.validEnd = new Date(dto.validEnd);

    return this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  }

  /** 用户领取优惠券 */
  async claimCoupon(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException("优惠券不存在");
    if (coupon.status !== "ACTIVE") throw new BadRequestException("优惠券已失效");
    if (new Date() > coupon.validEnd) throw new BadRequestException("优惠券已过期");
    if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
      throw new BadRequestException("优惠券已被领完");
    }

    // 检查是否已领过
    const existing = await this.prisma.userCoupon.findFirst({
      where: { userId, couponId, used: false },
    });
    if (existing) throw new BadRequestException("已领取过该优惠券");

    // 领取（增加使用计数）
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });

    return this.prisma.userCoupon.create({
      data: { userId, couponId },
    });
  }

  async grantCoupon(couponId: string, userId: string) {
    return this.prisma.userCoupon.create({
      data: { userId, couponId },
    });
  }

  async getUserCoupons(userId: string) {
    const now = new Date();
    return this.prisma.userCoupon.findMany({
      where: { userId, used: false },
      include: { coupon: true },
    });
  }

  // ═══════════════════ 商品评价 ═══════════════════

  /** 创建商品评价 */
  async createReview(userId: string, productId: string, dto: CreateReviewDto) {
    // 验证商品存在
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("商品不存在");

    // 验证评分范围
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("评分范围为 1-5 星");
    }

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
  async listReviews(productId: string, page = 1, pageSize = 20) {
    const where = { productId, status: "PUBLISHED" };
    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return { reviews, total, page, pageSize };
  }

  // ═══════════════════ 物流追踪 ═══════════════════

  /** 获取物流信息 */
  async getLogistics(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");

    const logistics = await this.prisma.orderLogistics.findUnique({
      where: { orderId },
    });
    return { order, logistics: logistics || null };
  }

  /** 管理员更新物流信息 */
  async updateLogistics(orderId: string, dto: UpdateLogisticsDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.status !== "PAID" && order.status !== "SHIPPED") {
      throw new BadRequestException("当前订单状态不可设置物流");
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

  // ═══════════════════ 会员辅助 ═══════════════════

  private resolveMemberLevel(amount: number): string {
    if (amount >= 9999) return "LIFETIME";
    if (amount >= 365) return "YEARLY";
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
