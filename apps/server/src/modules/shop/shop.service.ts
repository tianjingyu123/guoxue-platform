import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { Prisma, MemberLevel, Order } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

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
import { MemberBenefitService } from "../member/member-benefit.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopProductService } from "./shop-product.service";
import { ShopOrderService } from "./shop-order.service";
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service";
import { COIN_TO_RMB, RMB_TO_FEN } from "../../common/constants";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";

@Injectable()
export class ShopService {
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
    private memberBenefit: MemberBenefitService,
    private attribution: ShopAttributionService,
    private product: ShopProductService,
    private orderSvc: ShopOrderService,
    private orderLifecycleSvc: ShopOrderLifecycleService,
    @Optional() private huifu?: HuifuService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {}

  // ═══════════════════ 商品管理（委托 ShopProductService） ═══════════════════

  createProduct(userId: string, dto: CreateProductDto) {
    return this.product.createProduct(userId, dto);
  }

  updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    return this.product.updateProduct(userId, productId, dto);
  }

  deleteProduct(userId: string, productId: string, isAdmin = false) {
    return this.product.deleteProduct(userId, productId, isAdmin);
  }

  updateProductStatus(productId: string, status: string) {
    return this.product.updateProductStatus(productId, status);
  }

  setProductCommissionRate(productId: string, rate: number | null) {
    return this.product.setProductCommissionRate(productId, rate);
  }

  moderateProduct(productId: string, action: string, reason?: string) {
    return this.product.moderateProduct(productId, action, reason);
  }

  getProduct(productId: string, scene?: string, pageId?: string) {
    return this.product.getProduct(productId, scene, pageId);
  }

  listProducts(dto: ProductListQueryDto) {
    return this.product.listProducts(dto);
  }

  listProductCategoryL1() {
    return this.product.listProductCategoryL1();
  }

  listProductsByScene(tag: string, limit = 6) {
    return this.product.listProductsByScene(tag, limit);
  }

  getStore(merchantId: string, page = 1, pageSize = 20) {
    return this.product.getStore(merchantId, page, pageSize);
  }

  addSku(userId: string, productId: string, dto: { name?: string; specs?: Record<string, string>; price: number; stock?: number; skuCode?: string }, isAdmin = false) {
    return this.product.addSku(userId, productId, dto, isAdmin);
  }

  deleteSku(userId: string, skuId: string, isAdmin = false) {
    return this.product.deleteSku(userId, skuId, isAdmin);
  }

  // ═══════════════════ 订单管理 ═══════════════════

  createOrder(userId: string, dto: CreateOrderDto) {
    return this.orderSvc.createOrder(userId, dto);
  }

  createGroupBuyOrder(userId: string, params: {
    groupBuyId: string; productId: string; skuId?: string; groupPrice: number; groupId: string;
  }) {
    return this.orderSvc.createGroupBuyOrder(userId, params);
  }

  settleGroupBuyIfNeeded(orderId: string) {
    return this.orderSvc.settleGroupBuyIfNeeded(orderId);
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

  getOrder(orderId: string, userId?: string, isAdmin = false) {
    return this.orderSvc.getOrder(orderId, userId, isAdmin);
  }

  listOrders(dto: OrderListQueryDto) {
    return this.orderSvc.listOrders(dto);
  }

  getUserOrders(userId: string, page = 1, pageSize = 20, status?: string) {
    return this.orderSvc.getUserOrders(userId, page, pageSize, status);
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

  /**
   * 处理微信支付回调（统一入口）。
   * 返回 true=已确凿处理(向渠道回 SUCCESS 停止重试)；false=未能处理(回 FAIL 让渠道重试)。
   * 铁律：只有在"确定不需要再处理"时才返回 true——锁竞争/加锁失败返回 false 让渠道重试，
   * 避免"渠道已收款但本地未入账却回 SUCCESS"导致订单卡死。
   */
  async handlePaymentNotify(body: Record<string, unknown>): Promise<boolean> {
    const outTradeNo = body.out_trade_no as string;
    const lockKey = `pay:lock:${outTradeNo}`;

    // 分布式锁防并发重复处理：抢不到=另一处理中，让渠道稍后重试（勿谎报成功）
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`支付回调并发处理中，交给渠道重试: ${outTradeNo}`);
      return false;
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

      // 虚拟币充值回调 → 转发给 CoinService（其内部幂等）
      if (attach.type === "COIN_RECHARGE" && this.coinSvc) {
        await this.coinSvc.handleRechargeCallback(body);
        return true;
      }

      if (body.trade_state !== "SUCCESS") {
        this.logger.log(`支付未成功: ${outTradeNo}, 状态: ${body.trade_state}`);
        return true; // 非成功态无需处理，也无需渠道重试
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
        // 收到款但找不到订单：重试无益，落错误台账人工对账
        this.logger.error(`【资金对账】收到支付成功回调但找不到订单: ${outTradeNo}, transactionId: ${transactionId}`);
        return true;
      }

      // 只有 attach 提供了 orderId 才需要另外查询（已通过 payTransactionId 查到的直接复用）
      if (!order) {
        order = await this.prisma.order.findUnique({ where: { id: orderId } });
      }
      if (!order) {
        this.logger.error(`【资金对账】回调订单不存在: ${orderId}, outTradeNo: ${outTradeNo}`);
        return true;
      }
      if (order.status === "CANCELLED") {
        // 关键：订单已被超时 cron 取消却又收到支付成功——钱货两空风险，落错误台账人工/自动退款
        this.logger.error(
          `【资金对账·需退款】已取消订单收到支付成功回调: order=${orderId}, outTradeNo=${outTradeNo}, transactionId=${transactionId}`,
        );
        return true;
      }
      if (order.status !== "PENDING") return true; // 已支付等终态，幂等返回

      // M2 金额比对：微信 V3 解密报文 amount.total 单位为分；不符=确定性差异，重试无益，落错误台账人工对账
      const wxTotal = (body.amount as Record<string, unknown> | undefined)?.total;
      if (typeof wxTotal === "number" && Math.abs(wxTotal / 100 - Number(order.amount)) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】微信回调金额与订单金额不一致，拒绝入账: order=${orderId}, outTradeNo=${outTradeNo}, 回调金额=${wxTotal / 100}, 订单金额=${Number(order.amount)}`,
        );
        return true;
      }

      const orderLockKey = await this.acquireOrderLock(orderId);
      if (!orderLockKey) return false; // 订单锁抢不到，让渠道重试

      try {
        await this.processPaidOrder(order, "WECHAT", transactionId);
      } catch (e: unknown) {
        if (e instanceof BusinessException && e.message === "订单状态已变更") return true;
        if (isUniqueConstraintError(e)) {
          this.logger.warn(`支付回调重复处理(DB约束拦截): ${outTradeNo}, transactionId: ${transactionId}`);
          return true;
        }
        throw e;
      } finally {
        await this.redis.del(orderLockKey);
      }
      await this.attribution.recordOrderCommissionAndFee({ ...order, id: orderId });

      this.logger.log(`订单 ${orderId} 支付成功, 微信交易号: ${transactionId}`);
      return true;
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
    await this.completePayment(
      outTradeNo, "ALIPAY", data.tradeNo as string,
      data.tradeStatus === "TRADE_SUCCESS",
      Number(data.totalAmount), // 元
    );
  }

  /** 银联回调验签 */
  async verifyUnionpayNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.unionpay.verifyNotify(params) as Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }>;
  }

  /** 处理银联回调 */
  async handleUnionpayNotify(data: Record<string, unknown>) {
    if (data.respCode !== "00") return;
    const outTradeNo = data.outTradeNo as string;
    await this.completePayment(
      outTradeNo, "UNIONPAY", data.tradeNo as string, true,
      Number(data.amount) / 100, // 银联回调金额单位为分
    );
  }

  private async completePayment(outTradeNo: string, payMethod: string, tradeNo: string, success: boolean, callbackAmount?: number) {
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

      // M2 金额比对：验签只证明报文来自渠道，不证明买家付的是本单应付额（篡改下单金额/换单攻击面）
      if (callbackAmount !== undefined && Math.abs(callbackAmount - Number(order.amount)) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】回调金额与订单金额不一致，拒绝入账: order=${order.id}, outTradeNo=${outTradeNo}, 渠道=${payMethod}, 回调金额=${callbackAmount}, 订单金额=${Number(order.amount)}`,
        );
        return;
      }

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
      await this.attribution.recordOrderCommissionAndFee(order);

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

  /** MEMBER 支付后处理 — 按订单套餐（targetId=MemberConfig.id）定档开通 + 记录购买 + 发首月权益 */
  private async processMemberPaid(order: Order, tx: any) {
    // 定档真源=下单时选择的套餐；仅历史订单缺套餐时按金额兜底（阈值对齐 2026-07 定价）
    let planLevel: string | null = null;
    if (order.targetId) {
      const plan = await tx.memberConfig.findUnique({ where: { id: order.targetId } });
      if (plan) planLevel = plan.level;
    }
    if (!planLevel) planLevel = this.resolveMemberLevel(Number(order.amount));
    // 连续包年是 YEARLY 的计费变体：用户等级记 YEARLY + 打 autoRenew 标记
    const isAutoRenew = planLevel === "YEARLY_AUTO";
    const memberLevel = isAutoRenew ? "YEARLY" : planLevel;

    // 有效期内复购不吞剩余天数：从「当前未到期到期日」起算叠加（已过期/终身除外）；
    // 等级只升不降：已是终身则保持终身，避免高档买低档被覆盖降档。
    const current = await tx.user.findUnique({
      where: { id: order.userId },
      select: { memberLevel: true, memberExpire: true },
    });
    const now = new Date();
    const base = current?.memberExpire && current.memberExpire > now ? current.memberExpire : now;
    let expiresAt = this.calcMemberExpiry(planLevel, base);
    let finalLevel = memberLevel;
    if (current?.memberLevel === "LIFETIME") {
      finalLevel = "LIFETIME";
      expiresAt = null; // 终身不可被降级为有期限
    }
    await tx.user.update({
      where: { id: order.userId },
      data: {
        memberLevel: finalLevel as MemberLevel,
        memberExpire: expiresAt,
        ...(isAutoRenew ? { memberAutoRenew: true } : {}),
      },
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
    // 权益③首月发放（同事务原子；月度 cron 按 member_monthly_YYYYMM 幂等，本月不会重复发）
    await this.memberBenefit.grantMonthlyBenefits(order.userId, planLevel, tx);
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

  shipOrder(orderId: string) {
    return this.orderLifecycleSvc.shipOrder(orderId);
  }

  adminPayOrder(orderId: string, payTransactionId: string, operatorId: string) {
    return this.orderLifecycleSvc.adminPayOrder(orderId, payTransactionId, operatorId);
  }

  completeOrder(orderId: string) {
    return this.orderLifecycleSvc.completeOrder(orderId);
  }

  confirmOrder(orderId: string, userId: string) {
    return this.orderLifecycleSvc.confirmOrder(orderId, userId);
  }

  cancelOrder(orderId: string, userId: string) {
    return this.orderLifecycleSvc.cancelOrder(orderId, userId);
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
    // 仅历史无 targetId 订单兜底：≥3000 旧终身 / ≥900 旧年卡 / ≥148 新年卡(含连续包年) / ≥49 季卡 / 其余月卡
    if (amount >= 3000) return "LIFETIME";
    if (amount >= 900) return "YEARLY";
    if (amount >= 148) return "YEARLY";
    if (amount >= 49) return "QUARTERLY";
    return "MONTHLY";
  }

  private calcMemberExpiry(level: string, from?: Date): Date | null {
    if (level === "LIFETIME") return null;
    const base = new Date(from ?? new Date()); // 从 from 起算叠加（复购续期不吞剩余天数）
    if (level === "YEARLY" || level === "YEARLY_AUTO") {
      base.setFullYear(base.getFullYear() + 1);
    } else if (level === "QUARTERLY") {
      base.setMonth(base.getMonth() + 3);
    } else {
      base.setMonth(base.getMonth() + 1);
    }
    return base;
  }
}
