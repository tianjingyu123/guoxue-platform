import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { PaymentProviderFactory } from "./payment-factory";
import { WebhookService } from "../webhook/webhook.service";
import { RMB_TO_FEN } from "../../common/constants";
import { isStocklessOrderType } from "./shop-order-types.constants";

/** 缓存前缀 */
const CACHE_PREFIX = "shop:";

/**
 * 商城退款域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：申请退款(渠道路由+分佣回收)、支付宝/银联退款与查询、退款金额校验、
 * 退款统一记账(CAS幂等)、微信退款回调、拼团超时自动退款扫描。
 */
@Injectable()
export class ShopRefundService {
  private readonly logger = new Logger(ShopRefundService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private paymentFactory: PaymentProviderFactory,
    private webhook: WebhookService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
  ) {}

  /**
   * 每 10 分钟自动退款超时未成团的拼团（分布式锁防多实例并发扫描）。
   * 修复(后端审计P1-3)：refundExpiredGroupBuys 原仅管理员手动端点触发，用户付款后拼团未达
   * minMembers 则订单恒 PAID、真金滞留，直到管理员记得手动点。此处补调度器兜底。
   * 退款逻辑未改动：沿用 refundOrder（自带 per-order refund:lock + 状态 CAS），participant→REFUNDED
   * 防重复扫描；本 cron 的 runExclusive 只防多实例同时扫描，与逐单退款锁正交。
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refundExpiredGroupBuysCron() {
    await this.redis.runExclusive("shop_refund_expired_groupbuys", 300, async () => {
      const res = await this.refundExpiredGroupBuys();
      if (res.refunded > 0) this.logger.log(`拼团超时自动退款: ${res.refunded}/${res.scanned} 笔`);
    });
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
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) return;
    const changed = await this.prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
      if (res.count === 0) return false;
      // 未发货退款自动回补；已发货/已完成必须等退货验收，避免货未回却虚增库存。
      if (order.status === "PAID" && order.merchantId && !isStocklessOrderType(order.type)) {
        let beforeStock: number | null = null;
        let productId = order.targetId;
        if (order.skuId) {
          const restored = await tx.productSku.updateMany({
            where: { id: order.skuId },
            data: { stock: { increment: order.quantity } },
          });
          if (restored.count === 1) {
            const skuAfter = await tx.productSku.findUnique({ where: { id: order.skuId }, select: { stock: true, productId: true } });
            if (skuAfter) {
              beforeStock = skuAfter.stock - order.quantity;
              productId = skuAfter.productId;
            }
          }
        } else if (order.targetId) {
          const restored = await tx.product.updateMany({
            where: { id: order.targetId },
            data: { stock: { increment: order.quantity } },
          });
          if (restored.count === 1) {
            const productAfter = await tx.product.findUnique({ where: { id: order.targetId }, select: { stock: true } });
            beforeStock = productAfter ? productAfter.stock - order.quantity : null;
          }
        }
        if (productId && beforeStock !== null) {
          await tx.inventoryMovement.create({ data: {
            merchantId: order.merchantId, productId, skuId: order.skuId,
            type: "REFUND_RETURN", quantity: order.quantity,
            beforeStock, afterStock: beforeStock + order.quantity,
            referenceType: "RETURN", referenceId: order.id,
            idempotencyKey: `order-refund:${order.id}`, operatorId: order.userId,
            reason: reason || "未发货订单退款自动回补库存",
            metadata: { refundStage: "BEFORE_SHIPMENT" },
          } });
        }
      }
      return true;
    });
    if (!changed) return;
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    if (this.commissionSvc) {
      this.commissionSvc.reverseCommission(orderId).catch((e) =>
        this.logger.error(`分佣冲正失败, 订单: ${orderId}`, e),
      );
    }
    this.webhook.fire("ORDER_REFUNDED", { orderId, amount, reason: reason || "用户申请退款" })
      .catch((err) => this.logger.warn("Webhook ORDER_REFUNDED 发送失败", err));
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
      // 修复(后端审计P1-2)：微信退款按 transaction_id 退（payTransactionId 存的就是微信 transaction_id，
      // 非商户 out_trade_no）。原先把它当 out_trade_no 传给微信 → 查无单退款失败。仅微信路径生效，
      // 支付宝/银联维持原 outTradeNo 行为不变。
      const transactionId = payMethod === "WECHAT" ? (order.payTransactionId || undefined) : undefined;

      // 资金操作必须 fail-closed：通道未配置时绝不能只改成 REFUNDED 再要求财务线下补钱。
      if (!this.paymentFactory.isConfigured(payMethod)) {
        this.logger.error(`支付渠道 ${payMethod} 未配置，拒绝自动退款，订单: ${orderId}`);
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "原支付渠道暂不可退款，请联系平台处理");
      }

      const result = await this.paymentFactory.refund(payMethod, {
        outTradeNo,
        transactionId,
        outRefundNo,
        totalYuan: Number(order.amount),
        totalFen,
        reason: reason || "用户申请退款",
      });

      if (result.status === "SUCCESS") {
        await this.applyRefundedBookkeeping(orderId, Number(order.amount), reason);
      } else if (result.status !== "PROCESSING") {
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款通道未受理，请稍后重试");
      }
      // PROCESSING 仅表示渠道已受理：订单保持原状态，等待退款回调后再记 REFUNDED。
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
        // refundOrder 使用稳定退款单号 RF{orderId}；微信回调的 out_trade_no 并非 transaction_id，
        // 不能再拿它匹配 payTransactionId，否则真实回调会找不到订单。
        const orderIdFromRefundNo = outRefundNo?.startsWith("RF") ? outRefundNo.slice(2) : "";
        const transactionId = body.transaction_id as string | undefined;
        const refundedOrder = await this.prisma.order.findFirst({
          where: orderIdFromRefundNo
            ? { id: orderIdFromRefundNo }
            : { OR: [{ payTransactionId: transactionId || outTradeNo }, { id: outTradeNo }] },
          select: { id: true, amount: true },
        });

        if (refundedOrder) {
          await this.applyRefundedBookkeeping(refundedOrder.id, Number(refundedOrder.amount), "支付渠道退款成功回调");
          await this.prisma.afterSale.updateMany({
            where: { orderId: refundedOrder.id, status: "PROCESSING", type: { contains: "refund", mode: "insensitive" } },
            data: { status: "APPROVED" },
          });
        }

        // applyRefundedBookkeeping 内部已做 CAS、分佣冲正与 webhook；找不到订单时只告警，不伪造退款完成事件。
        if (!refundedOrder) {
          this.logger.error(`退款回调无法定位订单: outRefundNo=${outRefundNo}, outTradeNo=${outTradeNo}`);
        }
        this.logger.log(`退款回调: ${outRefundNo} 成功, 订单: ${refundedOrder?.id || outTradeNo}`);
      } else if (refundStatus === "FAIL" || refundStatus === "CLOSED") {
        // 异步退款未完成时不动订单资金状态，只把本次占用的售后退回 PENDING 允许人工核对后重试。
        const orderIdFromRefundNo = outRefundNo?.startsWith("RF") ? outRefundNo.slice(2) : "";
        if (orderIdFromRefundNo) {
          await this.prisma.afterSale.updateMany({
            where: { orderId: orderIdFromRefundNo, status: "PROCESSING", type: { contains: "refund", mode: "insensitive" } },
            data: { status: "PENDING", logistics: `退款通道${refundStatus === "FAIL" ? "失败" : "关闭"}，请核对后重试` },
          });
        }
        this.logger.warn(`退款回调: ${outRefundNo} 失败/关闭, 状态: ${refundStatus}, 订单: ${outTradeNo}`);
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
