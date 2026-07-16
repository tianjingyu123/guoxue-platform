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
          transactionId,
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
}
