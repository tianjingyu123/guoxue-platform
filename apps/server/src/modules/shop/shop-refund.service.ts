import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { AlipayService } from "./alipay.service";
import { WechatPayService } from "./wechat-pay.service";
import { UnionpayService } from "./unionpay.service";
import { PaymentProviderFactory } from "./payment-factory";
import { WebhookService } from "../webhook/webhook.service";
import { isReturnRefundType } from "./after-sale-type";
import { RMB_TO_FEN } from "../../common/constants";
import { isStocklessOrderType } from "./shop-order-types.constants";
import { HuifuService } from "../huifu/huifu.service";

/** 缓存前缀 */
const CACHE_PREFIX = "shop:";
const REFUND_AFTER_SALE_TYPES = ["refund", "return", "refund_only", "refund_with_return"];

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
    private wechatPay: WechatPayService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private huifu: HuifuService,
    private paymentFactory: PaymentProviderFactory,
    private webhook: WebhookService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
  ) {
    this.huifu.registerRefundNotifyHandler((payload) => this.handleHuifuRefundNotify(payload));
  }

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
        // 异步回调可能已先把订单收敛为 REFUNDED；此时只补齐参与者终态，不重复请求渠道。
        if (order.status === "REFUNDED") {
          await this.prisma.groupBuyParticipant.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
          refunded++;
          continue;
        }
        const result = await this.refundOrder(order.id, "拼团超时未成团，自动退款");
        // PROCESSING 仅代表渠道受理，钱尚未确认退回；绝不能提前把参与者显示成已退款。
        if (result.status === "SUCCESS") {
          await this.prisma.groupBuyParticipant.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
          refunded++;
        }
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

  /** 支付宝退款（金额单位：元）；管理员直退也统一进入带锁、持久锚点与补偿任务的主链。 */
  async alipayRefund(params: { outTradeNo: string; refundAmount: number; outRefundNo: string; reason?: string }) {
    const order = await this.assertRefundAmountValid(params.outTradeNo, params.refundAmount);
    if (String(order.payMethod || "").toUpperCase() !== "ALIPAY") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "订单原支付渠道不是支付宝");
    }
    return this.refundOrder(order.id, params.reason);
  }

  /** 银联订单查询 */
  async unionpayQuery(outTradeNo: string) {
    return this.unionpay.query(outTradeNo);
  }

  /** 银联退款（金额单位：分）；管理员直退也统一进入退款主链。 */
  async unionpayRefund(params: { outTradeNo: string; outRefundNo: string; amount: number; origQryId?: string }) {
    const order = await this.assertRefundAmountValid(params.outTradeNo, params.amount / RMB_TO_FEN);
    if (String(order.payMethod || "").toUpperCase() !== "UNIONPAY") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "订单原支付渠道不是银联");
    }
    return this.refundOrder(order.id, "银联退款");
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
    if (Math.abs(refundRmb - paid) > 0.009) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前仅支持整单全额退款（${paid.toFixed(2)} 元）`);
    }
    return order;
  }

  /**
   * 退款成功后的统一记账（幂等）：CAS 置 REFUNDED → 失缓存 → 冲正分佣 → webhook。
   * 供 refundOrder / alipayRefund / unionpayRefund 复用，避免"退款后订单仍 PAID、
   * 佣金不冲正、仍被结算给商家"的重复出账。CAS 保证并发/重投下只冲正一次。
   */
  private async applyRefundedBookkeeping(orderId: string, amount: number, reason?: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return false;
    if (order.status === "REFUNDED") return true;
    if (!["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) return false;
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
    if (!changed) {
      const current = await this.prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
      return current?.status === "REFUNDED";
    }
    await this.redis.del(`${CACHE_PREFIX}order:${orderId}`);
    this.webhook.fire("ORDER_REFUNDED", { orderId, amount, reason: reason || "用户申请退款" })
      .catch((err) => this.logger.warn("Webhook ORDER_REFUNDED 发送失败", err));
    return true;
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

      const refundAmount = Number(order.payAmount ?? order.amount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单实付金额异常，暂无法退款");
      }
      const totalFen = Math.round(refundAmount * RMB_TO_FEN);
      // 稳定退款单号(按订单)：并发/重试时网关据 outRefundNo 幂等去重，防锁超时后二次退款到账
      const outRefundNo = `RF${orderId}`;

      // 通过支付工厂统一路由退款（新增渠道无需修改此处）
      const payMethod = String(order.payMethod || "").toUpperCase();
      if (!payMethod) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单缺少原支付渠道，无法自动退款");
      }
      // 支付完成后 payTransactionId 已统一保存渠道交易号：微信 transaction_id、支付宝 trade_no、银联 queryId。
      // 原商户单号会被覆盖，因此退款必须优先按渠道交易号，缺失时失败关闭，不能拿退款单号冒充原支付单号。
      const transactionId = order.payTransactionId || undefined;
      if (!transactionId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单缺少原支付渠道交易号，无法自动退款");
      }
      const outTradeNo = order.id;

      // 资金操作必须 fail-closed：通道未配置时绝不能只改成 REFUNDED 再要求财务线下补钱。
      if (!(await this.paymentFactory.isConfigured(payMethod))) {
        this.logger.error(`支付渠道 ${payMethod} 未配置，拒绝自动退款，订单: ${orderId}`);
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "原支付渠道暂不可退款，请联系平台处理");
      }

      // 先持久化 PROCESSING 再请求网关：即使渠道已受理后本机宕机，回调/对账任务仍有恢复锚点。
      const refundRequestedAt = await this.trackProcessingRefund(order, reason || "退款通道处理中");
      let result: { status: string };
      try {
        result = await this.paymentFactory.refund(payMethod, {
          orderId,
          outTradeNo,
          transactionId,
          outRefundNo,
          totalYuan: refundAmount,
          totalFen,
          refundRequestedAt,
          reason: reason || "用户申请退款",
        });
      } catch (err) {
        // 网络超时或响应验签失败时无法确认渠道是否已受理；对上统一返回 PROCESSING，防调用方 catch 后抹掉补偿锚点。
        this.logger.warn(`退款请求结果待确认 order=${orderId}, channel=${payMethod}`, (err as Error).message);
        return { status: "PROCESSING", pendingReason: "GATEWAY_RESULT_UNKNOWN" };
      }

      if (result.status === "SUCCESS") {
        // 渠道已退款但本地记账失败时仍返回 PROCESSING，避免上层误回退售后状态；补偿任务会继续收敛。
        try {
          await this.finalizeChannelRefund(orderId, reason || "支付渠道同步确认退款成功");
        } catch (err) {
          this.logger.error(`渠道退款成功但本地记账待补偿 order=${orderId}`, err);
          return { status: "PROCESSING", pendingReason: "LOCAL_BOOKKEEPING_PENDING" };
        }
      } else if (result.status === "PROCESSING") {
        // 已持久化，等待验签回调/对账查询。
      } else {
        await this.revertProcessingAfterSales(orderId, "退款通道未受理，请核对后重试");
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款通道未受理，请稍后重试");
      }
      // PROCESSING 仅表示渠道已受理：订单保持原状态，等待验签回调/对账查询后再记 REFUNDED。
      return result;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 所有异步退款都必须有持久售后记录；updatedAt 同时作为银联退款三要素中的稳定 txnTime。 */
  private async trackProcessingRefund(
    order: { id: string; userId: string; amount: unknown; payAmount?: unknown },
    reason: string,
  ): Promise<Date> {
    const active = await this.prisma.afterSale.findFirst({
      where: { orderId: order.id, type: { in: REFUND_AFTER_SALE_TYPES }, status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
      select: { id: true, status: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (active) {
      if (active.status === "PROCESSING") return active.updatedAt;
      const updated = await this.prisma.afterSale.update({
        where: { id: active.id },
        data: { status: "PROCESSING" },
        select: { updatedAt: true },
      });
      return updated.updatedAt;
    }
    const created = await this.prisma.afterSale.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        type: "refund_only",
        reason,
        status: "PROCESSING",
        amount: Number(order.payAmount ?? order.amount),
      },
      select: { updatedAt: true },
    });
    return created.updatedAt;
  }

  private async finalizeChannelRefund(orderId: string, reason: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "退款回调关联订单不存在");
    const finalized = await this.applyRefundedBookkeeping(order.id, Number(order.payAmount ?? order.amount), reason);
    if (!finalized) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "退款渠道已确认，但本地订单状态尚未收敛");
    }
    // 订单退款、旧分佣、运营商管理奖及统一总账必须一起收敛；失败时保留 PROCESSING 供定时补偿。
    if (this.commissionSvc) await this.commissionSvc.reverseCommission(order.id);
    await this.prisma.afterSale.updateMany({
      where: { orderId: order.id, type: { in: REFUND_AFTER_SALE_TYPES }, status: "PROCESSING" },
      data: { status: "COMPLETED" },
    });
  }

  private async revertProcessingAfterSales(orderId: string, message: string): Promise<void> {
    const records = await this.prisma.afterSale.findMany({
      where: { orderId, type: { in: REFUND_AFTER_SALE_TYPES }, status: "PROCESSING" },
      select: { id: true, type: true },
    });
    for (const record of records) {
      const returnRefund = isReturnRefundType(record.type);
      await this.prisma.afterSale.updateMany({
        where: { id: record.id, status: "PROCESSING" },
        data: returnRefund ? { status: "APPROVED" } : { status: "PENDING", logistics: message },
      });
    }
  }

  /** 支付宝无退款异步通知：定时用稳定 out_request_no 查询，成功后再做本地资金记账。 */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileProcessingRefundsCron(): Promise<void> {
    await this.redis.runExclusive("shop_reconcile_processing_refunds", 300, async () => {
      const records = await this.prisma.afterSale.findMany({
        where: { status: "PROCESSING", type: { in: REFUND_AFTER_SALE_TYPES } },
        select: { orderId: true, updatedAt: true },
        take: 100,
      });
      const refundAnchors = new Map<string, Date>();
      for (const record of records) {
        const current = refundAnchors.get(record.orderId);
        if (!current || record.updatedAt < current) refundAnchors.set(record.orderId, record.updatedAt);
      }
      const orderIds = [...refundAnchors.keys()];
      for (const orderId of orderIds) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) continue;
        if (order.status === "REFUNDED") {
          try {
            await this.finalizeChannelRefund(order.id, "退款订单补齐佣金与总账冲正");
          } catch (err) {
            this.logger.warn(`退款后资金副作用暂未收敛 order=${orderId}`, (err as Error).message);
          }
          continue;
        }
        try {
          if (order.payMethod === "WECHAT") {
            const result = await this.wechatPay.queryRefund(`RF${order.id}`);
            const status = String((result as Record<string, unknown>).status || "");
            if (status === "SUCCESS") await this.finalizeChannelRefund(order.id, "微信退款查询确认成功");
            else if (["CLOSED", "ABNORMAL"].includes(status)) await this.revertProcessingAfterSales(order.id, `微信退款${status === "CLOSED" ? "已关闭" : "异常"}，请核对后重试`);
          } else if (order.payMethod === "ALIPAY" && order.payTransactionId) {
            const result = await this.alipay.queryRefund({
              outTradeNo: order.id,
              tradeNo: order.payTransactionId,
              outRefundNo: `RF${order.id}`,
            });
            if (result.status === "SUCCESS") await this.finalizeChannelRefund(order.id, "支付宝退款查询确认成功");
          } else if (order.payMethod === "UNIONPAY" && order.payTransactionId) {
            const refundAmount = Number(order.payAmount ?? order.amount);
            const result = await this.paymentFactory.refund("UNIONPAY", {
              orderId: order.id,
              outTradeNo: order.id,
              transactionId: order.payTransactionId,
              outRefundNo: `RF${order.id}`,
              totalYuan: refundAmount,
              totalFen: Math.round(refundAmount * RMB_TO_FEN),
              refundRequestedAt: refundAnchors.get(order.id)!,
              reason: "银联退款幂等对账",
            });
            if (result.status !== "PROCESSING" && result.status !== "SUCCESS") {
              await this.revertProcessingAfterSales(order.id, "银联退款未受理，请核对后重试");
            }
          } else if (order.payMethod === "HUIFU") {
            const result = await this.huifu.createRefund({
              orderId: order.id,
              amount: Number(order.payAmount ?? order.amount),
              reason: "汇付退款幂等对账",
            });
            if (result.refundStatus === "SUCCESS") await this.finalizeChannelRefund(order.id, "汇付退款查询确认成功");
            else if (result.refundStatus === "FAILED") await this.revertProcessingAfterSales(order.id, "汇付退款失败，请核对后重试");
          }
        } catch (err) {
          this.logger.warn(`异步退款对账暂未收敛 order=${orderId}`, (err as Error).message);
        }
      }
    });
  }

  /** 银联后台通知：respCode=00 且验签通过后，按 reqReserved 中的平台订单 ID 结账。 */
  async handleUnionpayRefundNotify(data: Record<string, unknown>): Promise<void> {
    const orderId = String(data.merchantOrderId || "");
    if (!orderId) throw new BusinessException(ErrorCode.BAD_REQUEST, "银联退款回调缺少平台订单号");
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "银联退款回调关联订单不存在");
    const expectedRefundNo = `RF${order.id}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 40);
    const callbackRefundNo = String(data.outTradeNo || "");
    const callbackOrigQryId = String(data.origQryId || "");
    if (
      order.payMethod !== "UNIONPAY" ||
      callbackRefundNo !== expectedRefundNo ||
      !order.payTransactionId ||
      callbackOrigQryId !== order.payTransactionId
    ) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "银联退款回调交易标识与订单不一致");
    }
    if (data.respCode !== "00") {
      await this.revertProcessingAfterSales(orderId, `银联退款失败(${String(data.respCode || "UNKNOWN")})`);
      return;
    }
    const callbackFen = Number(data.amount);
    const expectedFen = Math.round(Number(order.payAmount ?? order.amount) * RMB_TO_FEN);
    if (!Number.isFinite(callbackFen) || callbackFen <= 0 || callbackFen !== expectedFen) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "银联退款回调金额与订单实付金额不一致");
    }
    await this.finalizeChannelRefund(orderId, "银联退款回调确认成功");
  }

  /** 汇付退款通知已在 HuifuService 验签；按原支付流水找到平台订单并收敛资金状态。 */
  async handleHuifuRefundNotify(payload: Record<string, unknown>): Promise<void> {
    const originalTradeNo = String(payload.org_req_seq_id || "");
    if (!originalTradeNo) throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付退款回调缺少原交易号");
    const splitRecord = await this.prisma.huifuSplitRecord.findUnique({ where: { outTradeNo: originalTradeNo } });
    if (!splitRecord) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "汇付退款回调找不到支付记录");
    const expectedRefundNo = `RF${splitRecord.orderId.replace(/-/g, "")}`.slice(0, 32);
    if (String(payload.req_seq_id || "") !== expectedRefundNo) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付退款回调退款单号不匹配");
    }
    const transStat = String(payload.trans_stat || "");
    if (transStat === "F") {
      await this.revertProcessingAfterSales(splitRecord.orderId, "汇付退款失败，请核对后重试");
      return;
    }
    if (transStat !== "S") return;
    const callbackAmount = Number(payload.ord_amt ?? payload.trans_amt);
    const expectedAmount = Number(splitRecord.totalAmount);
    if (!Number.isFinite(callbackAmount) || callbackAmount <= 0 || Math.abs(callbackAmount - expectedAmount) >= 0.01) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付退款回调金额与订单实付金额不一致");
    }
    await this.finalizeChannelRefund(splitRecord.orderId, "汇付退款回调确认成功");
  }
  /** 处理已验签解密的微信退款通知：稳定退款号、渠道、交易号和全额金额必须同时一致。 */
  async handleRefundNotify(body: Record<string, unknown>): Promise<void> {
    const outRefundNo = String(body.out_refund_no || "");
    if (!outRefundNo.startsWith("RF") || outRefundNo.length <= 2) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信退款回调缺少合法商户退款单号");
    }
    const orderId = outRefundNo.slice(2);
    const refundStatus = String(body.refund_status || "");
    if (!refundStatus) throw new BusinessException(ErrorCode.BAD_REQUEST, "微信退款回调缺少退款状态");
    const lockKey = `refund:cb:${outRefundNo}`;

    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`退款回调正在处理中: ${outRefundNo}`);
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "退款回调正在处理中，请稍后重试");
    }

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, amount: true, payAmount: true, payMethod: true, payTransactionId: true },
      });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "微信退款回调关联订单不存在");
      const transactionId = String(body.transaction_id || "");
      if (String(order.payMethod || "").toUpperCase() !== "WECHAT" || !transactionId || transactionId !== order.payTransactionId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "微信退款回调交易标识与订单不一致");
      }

      if (refundStatus === "SUCCESS") {
        if (!body.refund_id) throw new BusinessException(ErrorCode.BAD_REQUEST, "微信退款成功回调缺少渠道退款单号");
        const amount = body.amount && typeof body.amount === "object"
          ? body.amount as Record<string, unknown>
          : {};
        const callbackRefundFen = Number(amount.refund);
        const callbackTotalFen = Number(amount.total);
        const expectedFen = Math.round(Number(order.payAmount ?? order.amount) * RMB_TO_FEN);
        if (
          !Number.isFinite(callbackRefundFen) || callbackRefundFen <= 0 || callbackRefundFen !== expectedFen ||
          !Number.isFinite(callbackTotalFen) || callbackTotalFen !== expectedFen
        ) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "微信退款回调金额与订单实付金额不一致");
        }
        await this.finalizeChannelRefund(order.id, "微信退款回调确认成功");
        this.logger.log(`退款回调: ${outRefundNo} 成功, 订单: ${order.id}`);
      } else if (["FAIL", "CLOSED", "ABNORMAL"].includes(refundStatus)) {
        const statusLabel = refundStatus === "CLOSED" ? "关闭" : refundStatus === "ABNORMAL" ? "异常" : "失败";
        await this.revertProcessingAfterSales(order.id, `退款通道${statusLabel}，请核对后重试`);
        this.logger.warn(`退款回调: ${outRefundNo} ${statusLabel}, 订单: ${order.id}`);
      } else {
        this.logger.log(`退款回调: ${outRefundNo} 状态=${refundStatus}，继续等待终态`);
      }
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
