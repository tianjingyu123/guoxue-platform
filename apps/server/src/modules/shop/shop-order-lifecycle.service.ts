import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopOrderService } from "./shop-order.service";
import { ShopPaymentService } from "./shop-payment.service";
import { isStocklessOrderType } from "./shop-order-types.constants";

/**
 * 商城订单-履约与取消域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：发货、管理员确认支付、完成、确认收货、取消(库存/券/秒杀回补)、超时未支付自动取消 cron。
 * 分佣记账委托 ShopAttributionService；成团结算委托 ShopOrderService.settleGroupBuyIfNeeded。
 */
@Injectable()
export class ShopOrderLifecycleService {
  private readonly logger = new Logger(ShopOrderLifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private attribution: ShopAttributionService,
    private orderSvc: ShopOrderService,
    private paymentSvc: ShopPaymentService,
  ) {}

  async shipOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PAID") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单不可发货");

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
    await this.orderSvc.invalidateOrderCache(orderId, order.userId);
    return updated;
  }

  /** 管理员手动确认支付（需提供实际支付流水号，防止伪造支付确认） */
  async adminPayOrder(orderId: string, payTransactionId: string, operatorId: string) {
    if (!payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供支付流水号");
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅待支付订单可确认支付");

    // CAS 状态翻转防并发重复确认 + 同事务跑支付后处理器。
    // ⚠️ 后处理器不可省：它负责会员开通/分站激活/运营商建号。此前本方法绕过了它，
    //    导致线下确认收款的订单「变 PAID 但权益不开通」（钱收了货不发）。与网关回调路径同口径。
    await this.prisma.$transaction(async (tx) => {
      const flipped = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date(), payTransactionId },
      });
      if (flipped.count === 0) throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更");
      await this.paymentSvc.runPaidPostProcessors(order, tx);
    });
    await this.orderSvc.invalidateOrderCache(orderId, order.userId);
    // 线下确认收款同样记分佣 + 平台费（与网关支付路径一致，避免账目漏记）
    await this.attribution.recordOrderCommissionAndFee(order);
    // 拼团订单：管理员确认支付后同样触发成团结算（本地无微信证书时用此路径验证闭环）
    await this.orderSvc.settleGroupBuyIfNeeded(orderId).catch((e) => this.logger.error(`拼团成团结算失败 order=${orderId}`, e));
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
    await this.orderSvc.invalidateOrderCache(orderId, order.userId);
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
    // 缓存已由 completeOrder → invalidateOrderCache(该订单 userId=本人) 清净，无需重复清
    const result = await this.completeOrder(orderId);
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

        // 恢复库存（虚拟商品如会员/分站/运营商无需恢复·单一真源见 shop-order-types.constants）
        if (!isStocklessOrderType(order.type)) {
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

        // 秒杀订单：同步回补秒杀条目已售量（防负数：sold ≥ quantity 才 decrement，不足则归零兜底）
        if (order.promotionType === "FLASH_SALE" && order.promotionId && order.targetId) {
          await this.restoreFlashSaleSold(tx, order.promotionId, order.targetId, order.quantity);
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
      await this.orderSvc.invalidateOrderCache(orderId, userId);
    }
  }

  /**
   * 回补秒杀条目已售量（订单取消/超时取消时与 Product.stock 回补对称执行）。
   * 防负数：sold ≥ qty 才 decrement；不足时归零兜底（不允许出现负已售）。
   */
  private async restoreFlashSaleSold(
    tx: Prisma.TransactionClient,
    flashSaleId: string,
    productId: string,
    qty: number,
  ) {
    const dec = await tx.flashSaleItem.updateMany({
      where: { flashSaleId, productId, sold: { gte: qty } },
      data: { sold: { decrement: qty } },
    });
    if (dec.count === 0) {
      // sold 不足 qty（理论上不应发生）：归零兜底，避免负数
      await tx.flashSaleItem.updateMany({
        where: { flashSaleId, productId, sold: { gt: 0 } },
        data: { sold: 0 },
      });
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
    // H3 批级互斥：多实例下只一个实例扫描（订单级 setNX 锁仍在，双保险）
    await this.redis.runExclusive("shop_auto_cancel_expired", 240, () => this._autoCancelExpiredOrders());
  }

  private async _autoCancelExpiredOrders() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: { id: true, type: true, skuId: true, targetId: true, couponId: true, quantity: true, promotionType: true, promotionId: true },
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
        // 关键：回补必须只针对「本次实际被取消的订单」，而非「锁到的订单」——
        // findMany 与本事务之间的间隙里若有订单完成支付（status→PAID），它仍在 lockedIds 中，
        // 但不会被 updateMany(status:PENDING) 翻转；若按 lockedIds 回补会把已付款订单的库存/券也回补
        // （超卖+已用券复活）。故先在事务内锁定「仍 PENDING」的确定名单，只对该名单翻转与回补。
        const toCancel = await tx.order.findMany({
          where: { id: { in: lockedIds }, status: "PENDING" },
          select: { id: true, type: true, skuId: true, targetId: true, couponId: true, quantity: true, promotionType: true, promotionId: true },
        });
        if (toCancel.length === 0) return;
        const cancelIds = toCancel.map((o) => o.id);

        const result = await tx.order.updateMany({
          where: { id: { in: cancelIds }, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (result.count === 0) return;

        // 聚合 SKU 库存恢复（按下单数量 quantity 回补，与 createOrder 扣减对称）
        const skuCounts = new Map<string, number>();
        for (const o of toCancel) {
          if (!isStocklessOrderType(o.type) && o.skuId) {
            skuCounts.set(o.skuId, (skuCounts.get(o.skuId) || 0) + o.quantity);
          }
        }
        for (const [skuId, count] of skuCounts) {
          await tx.productSku.updateMany({
            where: { id: skuId },
            data: { stock: { increment: count } },
          });
        }

        // 聚合商品库存恢复（按下单数量 quantity 回补，与 createOrder 扣减对称）
        const productCounts = new Map<string, number>();
        for (const o of toCancel) {
          if (!isStocklessOrderType(o.type) && !o.skuId && o.targetId) {
            productCounts.set(o.targetId, (productCounts.get(o.targetId) || 0) + o.quantity);
          }
        }
        for (const [targetId, count] of productCounts) {
          await tx.product.updateMany({
            where: { id: targetId },
            data: { stock: { increment: count } },
          });
        }

        // 聚合秒杀条目已售量回补（与取消单量对称·防负数见 restoreFlashSaleSold）
        const flashCounts = new Map<string, { flashSaleId: string; productId: string; qty: number }>();
        for (const o of toCancel) {
          if (o.promotionType === "FLASH_SALE" && o.promotionId && o.targetId) {
            const key = `${o.promotionId}:${o.targetId}`;
            const prev = flashCounts.get(key);
            flashCounts.set(key, {
              flashSaleId: o.promotionId,
              productId: o.targetId,
              qty: (prev?.qty || 0) + o.quantity,
            });
          }
        }
        for (const { flashSaleId, productId, qty } of flashCounts.values()) {
          await this.restoreFlashSaleSold(tx, flashSaleId, productId, qty);
        }

        // 批量释放优惠券（仅本次取消订单持有的）
        const couponIds = toCancel.filter((o) => o.couponId).map((o) => o.couponId!);
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
}
