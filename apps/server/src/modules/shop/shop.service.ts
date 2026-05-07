import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CommissionService } from "../commission/commission.service";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto, CreateCouponDto,
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
    // 验证商品存在
    const product = await this.prisma.product.findUnique({
      where: { id: dto.targetId },
      select: { id: true, price: true, status: true },
    });
    if (!product || product.status !== "ON_SALE") {
      throw new BadRequestException("商品不可购买");
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

  async createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        type: dto.type as any,
        value: dto.value,
        minAmount: dto.minAmount,
        scope: dto.scope || "ALL",
        scopeId: dto.scopeId,
        totalCount: dto.totalCount,
        validStart: new Date(dto.validStart),
        validEnd: new Date(dto.validEnd),
      },
    });
  }

  async listCoupons(page = 1, pageSize = 20) {
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.coupon.count(),
    ]);
    return { coupons, total, page, pageSize };
  }

  async grantCoupon(couponId: string, userId: string) {
    return this.prisma.userCoupon.create({
      data: { userId, couponId },
    });
  }

  async getUserCoupons(userId: string) {
    return this.prisma.userCoupon.findMany({
      where: { userId, used: false },
      include: { coupon: true },
    });
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
