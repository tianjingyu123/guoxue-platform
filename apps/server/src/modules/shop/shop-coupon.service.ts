import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCouponV2Dto } from "./shop.dto";

@Injectable()
export class ShopCouponService {
  private readonly logger = new Logger(ShopCouponService.name);
  constructor(private prisma: PrismaService) {}

  // ═══════════════════ 优惠券管理 ═══════════════════

  async createCoupon(dto: CreateCouponV2Dto) {
    const { type } = dto;
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

  async updateCoupon(id: string, dto: CreateCouponV2Dto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");

    const updateData: Prisma.CouponUpdateInput = {};
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

    return this.prisma.coupon.update({ where: { id }, data: updateData });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  async getCouponById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
    return coupon;
  }

  async updateCouponStatus(id: string, status: string) {
    await this.prisma.coupon.findUniqueOrThrow({ where: { id } });
    return this.prisma.coupon.update({ where: { id }, data: { status } });
  }

  async claimCoupon(userId: string, couponId: string) {
    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
      if (coupon.status !== "ACTIVE") throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已失效");
      if (new Date() > coupon.validEnd) throw new BusinessException(ErrorCode.COUPON_EXPIRED, "优惠券已过期");
      if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
        throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已被领完");
      }

      const existing = await tx.userCoupon.findFirst({
        where: { userId, couponId, used: false },
      });
      if (existing) throw new BusinessException(ErrorCode.COUPON_INVALID, "已领取过该优惠券");

      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });

      return tx.userCoupon.create({ data: { userId, couponId } });
    });
  }

  async grantCoupon(couponId: string, userId: string) {
    return this.prisma.userCoupon.create({ data: { userId, couponId } });
  }

  async getUserCoupons(userId: string) {
    return this.prisma.userCoupon.findMany({
      where: { userId, used: false },
      include: { coupon: true },
    });
  }

  // ═══════════════════ 售后管理 ═══════════════════

  async applyAfterSale(userId: string, orderId: string, type: string, reason: string, amount?: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能对自己的订单申请售后");
    if (!["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "当前订单状态不可申请售后");
    }
    return this.prisma.afterSale.create({
      data: { orderId, userId, type, reason, amount: amount || Number(order.amount), status: "PENDING" },
    });
  }

  async getUserAfterSales(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.afterSale.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.afterSale.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getAfterSale(id: string, userId: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "售后记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的售后记录");
    return record;
  }

  async cancelAfterSale(id: string, userId: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "售后记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能取消自己的售后申请");
    if (record.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待处理状态可取消");
    return this.prisma.afterSale.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  async listAfterSales(page = 1, pageSize = 20, status?: string) {
    const where: Prisma.AfterSaleWhereInput = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.afterSale.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.afterSale.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async processAfterSale(id: string, action: string, remark?: string) {
    const status = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "PROCESSING";
    const data: any = { status };
    if (remark) data.logistics = remark;
    return this.prisma.afterSale.update({ where: { id }, data });
  }
}
