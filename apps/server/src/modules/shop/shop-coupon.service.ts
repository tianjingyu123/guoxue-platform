import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";
import { CreateCouponV2Dto } from "./shop.dto";
import { ShopRefundService } from "./shop-refund.service";
import {
  isImmediateRefundType,
  isRefundAfterSaleType,
  isReturnRefundType,
  isSupportedAfterSaleType,
  normalizeAfterSaleType,
  parseAfterSaleLogistics,
  stringifyAfterSaleLogistics,
} from "./after-sale-type";

@Injectable()
export class ShopCouponService {
  constructor(
    private prisma: PrismaService,
    private refundSvc: ShopRefundService,
  ) {}

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

  async listCoupons(rawPage = 1, rawPageSize = 20, admin = false) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const now = new Date();
    const where = admin ? {} : { status: "ACTIVE", validEnd: { gte: now } };
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
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
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
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
      await this.lockCouponIssuance(tx, couponId);
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
      this.assertCouponIssuable(coupon);

      const existing = await tx.userCoupon.findFirst({
        where: { userId, couponId, used: false },
      });
      if (existing) throw new BusinessException(ErrorCode.COUPON_INVALID, "已领取过该优惠券");

      await this.incrementIssuedCount(tx, couponId, 1);
      return tx.userCoupon.create({ data: { userId, couponId } });
    });
  }

  /** 管理员/召回单发：与用户领取共用库存、状态和事务锁；已持有未用券时幂等返回。 */
  async grantCoupon(couponId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockCouponIssuance(tx, couponId);
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
      this.assertCouponIssuable(coupon);

      const existing = await tx.userCoupon.findFirst({ where: { userId, couponId, used: false } });
      if (existing) return existing;

      await this.incrementIssuedCount(tx, couponId, 1);
      return tx.userCoupon.create({ data: { userId, couponId } });
    });
  }

  /**
   * 批量发放优惠券（券体系统一后 admin 唯一批量发放口，替代 marketing 模板 batch-grant）。
   * 每人一张；已持有未使用的用户跳过；库存不足整批失败，不做部分发放。
   */
  async batchGrantCoupon(couponId: string, userIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockCouponIssuance(tx, couponId);
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在");
      this.assertCouponIssuable(coupon);

      const unique = [...new Set(userIds)];
      const holders = await tx.userCoupon.findMany({
        where: { couponId, used: false, userId: { in: unique } },
        select: { userId: true },
      });
      const holderSet = new Set(holders.map((holder) => holder.userId));
      const targets = unique.filter((id) => !holderSet.has(id));
      if (coupon.totalCount !== -1 && targets.length > coupon.totalCount - coupon.usedCount) {
        throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券库存不足，批量发放已取消");
      }
      if (targets.length) {
        await this.incrementIssuedCount(tx, couponId, targets.length);
        await tx.userCoupon.createMany({ data: targets.map((userId) => ({ userId, couponId })) });
      }
      return { granted: targets.length, skipped: unique.length - targets.length };
    });
  }

  private async lockCouponIssuance(tx: Prisma.TransactionClient, couponId: string) {
    await tx.$queryRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      `coupon-issue:${couponId}`,
    );
  }

  private assertCouponIssuable(coupon: {
    status: string;
    validStart: Date;
    validEnd: Date;
    totalCount: number;
    usedCount: number;
  }) {
    const now = new Date();
    if (coupon.status !== "ACTIVE") throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已失效");
    if (coupon.validStart && now < coupon.validStart) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券尚未生效");
    if (now > coupon.validEnd) throw new BusinessException(ErrorCode.COUPON_EXPIRED, "优惠券已过期");
    if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
      throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已被领完");
    }
  }

  private async incrementIssuedCount(tx: Prisma.TransactionClient, couponId: string, count: number) {
    await tx.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: count } },
    });
  }

  async getUserCoupons(userId: string) {
    return this.prisma.userCoupon.findMany({
      where: { userId, used: false },
      include: { coupon: true },
    });
  }

  // ═══════════════════ 售后管理 ═══════════════════

  async applyAfterSale(userId: string, orderId: string, type: string, reason: string, amount?: number, images?: string[]) {
    const canonicalType = normalizeAfterSaleType(type);
    if (!isSupportedAfterSaleType(canonicalType)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的售后类型");
    }
    // 凭证图（前端已上传 COS 的真实 URL）：AfterSale 无独立 images 列，服务端并入 reason 存档。
    const fullReason = images?.length ? `${reason}\n[凭证图片] ${images.slice(0, 5).join(" ")}` : reason;

    return this.prisma.$transaction(async (tx) => {
      // 同一订单串行申请，避免双击/双端并发创建两张可退款售后单。
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `after-sale:${orderId}`);
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能对自己的订单申请售后");
      if (!["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "当前订单状态不可申请售后");
      }
      const active = await tx.afterSale.findFirst({
        where: { orderId, status: { in: ["PENDING", "PROCESSING", "APPROVED"] } },
        select: { id: true },
      });
      if (active) throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已有处理中售后，请勿重复申请");

      let refundAmount: number | null = null;
      if (isRefundAfterSaleType(canonicalType)) {
        const paidAmount = Number(order.payAmount ?? order.amount);
        if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "订单实付金额异常，暂无法申请退款");
        }
        // 统一退款底座目前是整单退款与整单分佣冲正；禁止前端显示部分退款、后端却整单退。
        if (amount != null && Math.abs(Number(amount) - paidAmount) > 0.009) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "当前仅支持整单全额退款，请按订单实付金额提交");
        }
        refundAmount = paidAmount;
      }

      return tx.afterSale.create({
        data: { orderId, userId, type: canonicalType, reason: fullReason, amount: refundAmount, status: "PENDING" },
      });
    });
  }

  async getUserAfterSales(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.afterSale.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.afterSale.count({ where }),
    ]);
    return { items: await this.enrichAfterSales(items), total, page, pageSize };
  }

  async getAfterSale(id: string, userId: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "售后记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的售后记录");
    const [enriched] = await this.enrichAfterSales([record]);
    return enriched;
  }

  /**
   * 批量补全售后记录的订单/商品信息，供 C 端售后(退款/纠纷)页渲染。
   * 原 AfterSale 行仅含 orderId，无商品名/封面/订单号，前端无法展示。
   * 按 orderId join Order，再按 Order.targetId join Product；timeline 由前端按真实 status 派生。
   */
  private async enrichAfterSales<T extends { orderId: string }>(records: T[]) {
    if (records.length === 0) return [] as (T & { order: any; product: any })[];

    const orderIds = [...new Set(records.map(r => r.orderId).filter(Boolean))];
    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, targetId: true, status: true, amount: true, createdAt: true },
        })
      : [];
    const orderMap = new Map(orders.map(o => [o.id, o]));

    const productIds = [...new Set(orders.map(o => o.targetId).filter(Boolean))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, images: true, price: true },
        })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    return records.map(r => {
      const order = orderMap.get(r.orderId);
      const product = order?.targetId ? productMap.get(order.targetId) : null;
      return {
        ...r,
        order: order
          ? { id: order.id, status: order.status, amount: Number(order.amount), createdAt: order.createdAt }
          : null,
        product: product
          ? { id: product.id, title: product.title, cover: product.images?.[0] || null, price: Number(product.price) }
          : null,
      };
    });
  }

  async cancelAfterSale(id: string, userId: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "售后记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能取消自己的售后申请");
    if (record.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待处理状态可取消");
    return this.prisma.afterSale.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  async submitReturnLogistics(id: string, userId: string, company: string, logisticsNo: string) {
    const record = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "售后记录不存在");
    if (record.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能登记自己的退货运单");
    if (!isReturnRefundType(record.type)) throw new BusinessException(ErrorCode.BAD_REQUEST, "该售后无需登记退货运单");
    if (record.status !== "APPROVED") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅审核通过且待退货的售后可登记运单");
    const normalizedCompany = company.trim();
    const normalizedLogisticsNo = logisticsNo.trim();
    if (!normalizedCompany || normalizedLogisticsNo.length < 4) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写有效的快递公司和退货运单号");
    }
    const current = parseAfterSaleLogistics(record.logistics);
    const returnAddress = current.returnAddress || current.legacyText;
    if (!returnAddress) throw new BusinessException(ErrorCode.BAD_REQUEST, "商家尚未提供退货地址，请先联系客服");
    if (current.inspection) throw new BusinessException(ErrorCode.BAD_REQUEST, "退货已验收，不能修改运单");
    const changed = await this.prisma.afterSale.updateMany({
      where: { id, userId, status: "APPROVED" },
      data: {
        logistics: stringifyAfterSaleLogistics({
          ...current,
          legacyText: undefined,
          returnAddress,
          company: normalizedCompany,
          logisticsNo: normalizedLogisticsNo,
        }),
      },
    });
    if (changed.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
    return this.prisma.afterSale.findUnique({ where: { id } });
  }

  async listAfterSales(rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.AfterSaleWhereInput = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.afterSale.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.afterSale.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * 平台售后状态机：
   * - 仅退款：同意后立即走统一全额退款，渠道处理中保持 PROCESSING，成功后 COMPLETED。
   * - 退货退款：先同意并下发退货地址；登记运单且验收入库后才触发真实退款。
   * - 换货/争议：只流转售后状态，不触碰资金。
   */
  async processAfterSale(id: string, action: string, remark?: string, allowRefundActions = true) {
    const existing = await this.prisma.afterSale.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "售后单不存在");
    if (!allowRefundActions && isRefundAfterSaleType(existing.type) && action !== "reject") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "退款审批需要运营或财务权限");
    }

    if (action === "reject") {
      if (existing.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待处理售后可拒绝");
      const changed = await this.prisma.afterSale.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "REJECTED", ...(remark?.trim() ? { logistics: remark.trim() } : {}) },
      });
      if (changed.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id } });
    }

    if (action === "approve") {
      if (existing.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅待处理售后可同意");
      if (isReturnRefundType(existing.type)) {
        const returnAddress = remark?.trim();
        if (!returnAddress) throw new BusinessException(ErrorCode.BAD_REQUEST, "同意退货退款时必须填写退货地址");
        const changed = await this.prisma.afterSale.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "APPROVED", logistics: stringifyAfterSaleLogistics({ returnAddress }) },
        });
        if (changed.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
        return this.prisma.afterSale.findUnique({ where: { id } });
      }
      if (!isImmediateRefundType(existing.type)) {
        const changed = await this.prisma.afterSale.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "APPROVED", ...(remark?.trim() ? { logistics: remark.trim() } : {}) },
        });
        if (changed.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
        return this.prisma.afterSale.findUnique({ where: { id } });
      }
      return this.executeFullRefund(existing, "PENDING");
    }

    if (action === "complete") {
      if (existing.status !== "APPROVED") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已同意售后可确认完成");
      if (isReturnRefundType(existing.type)) {
        const logistics = parseAfterSaleLogistics(existing.logistics);
        if (!logistics.company || !logistics.logisticsNo || logistics.inspection !== "ACCEPTED") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "退货必须登记运单并验收入库后才能退款");
        }
        return this.executeFullRefund(existing, "APPROVED");
      }
      if (isImmediateRefundType(existing.type)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "仅退款在审核通过时已自动完成退款");
      }
      const changed = await this.prisma.afterSale.updateMany({
        where: { id, status: "APPROVED" },
        data: { status: "COMPLETED", ...(remark?.trim() ? { logistics: remark.trim() } : {}) },
      });
      if (changed.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
      return this.prisma.afterSale.findUnique({ where: { id } });
    }

    throw new BusinessException(ErrorCode.BAD_REQUEST, "无效售后操作");
  }

  private async executeFullRefund(
    existing: { id: string; orderId: string; reason: string; status: string },
    expectedStatus: string,
  ) {
    const reserved = await this.prisma.afterSale.updateMany({
      where: { id: existing.id, status: expectedStatus },
      data: { status: "PROCESSING" },
    });
    if (reserved.count !== 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "售后状态已变化，请刷新后重试");
    try {
      const order = await this.prisma.order.findUnique({ where: { id: existing.orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "售后关联订单不存在，无法退款");
      if (order.status !== "REFUNDED") {
        const result = await this.refundSvc.refundOrder(existing.orderId, existing.reason || "售后退款");
        if (result.status === "PROCESSING") {
          return this.prisma.afterSale.findUnique({ where: { id: existing.id } });
        }
      }
      const finalized = await this.prisma.afterSale.updateMany({
        where: { id: existing.id, status: "PROCESSING" },
        data: { status: "COMPLETED" },
      });
      if (finalized.count !== 1) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款已完成，但售后状态同步失败");
      return this.prisma.afterSale.findUnique({ where: { id: existing.id } });
    } catch (error) {
      const order = await this.prisma.order.findUnique({ where: { id: existing.orderId }, select: { status: true } });
      if (order?.status === "REFUNDED") {
        return this.prisma.afterSale.update({ where: { id: existing.id }, data: { status: "COMPLETED" } });
      }
      await this.prisma.afterSale.updateMany({
        where: { id: existing.id, status: "PROCESSING" },
        data: { status: expectedStatus },
      });
      throw error;
    }
  }
}
