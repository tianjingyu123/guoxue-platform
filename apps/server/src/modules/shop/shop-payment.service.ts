import { Injectable, Inject, Logger, Optional, HttpStatus } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { MemberLevel, Order } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { HuifuService } from "../huifu/huifu.service";
import { CoinService } from "../coin/coin.service";
import { WebhookService } from "../webhook/webhook.service";
import { MemberBenefitService } from "../member/member-benefit.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopOrderService } from "./shop-order.service";
import { COIN_TO_RMB, RMB_TO_FEN } from "../../common/constants";

/** 运营商档位高低序（用于开通/续期时「只升不降」判定；对齐 schema enum OperatorLevel） */
const OPERATOR_LEVEL_RANK: Record<string, number> = {
  SILVER: 1,
  GOLD: 2,
  DIAMOND: 3,
  BLACK_GOLD: 4,
};

/**
 * 商城支付域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：微信JSAPI/Native下单、国学币充值下单、微信/支付宝/银联/汇付支付回调处理、
 * 支付完成统一记账(订单状态CAS+分佣+webhook)、会员订单开通、订单支付状态查询。
 * 归因委托 ShopAttributionService；订单查询/成团结算委托 ShopOrderService；退款见 ShopRefundService。
 */
@Injectable()
export class ShopPaymentService {
  private readonly logger = new Logger(ShopPaymentService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private wechatPay: WechatPayService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private webhook: WebhookService,
    private memberBenefit: MemberBenefitService,
    private attribution: ShopAttributionService,
    private orderSvc: ShopOrderService,
    @Optional() private huifu?: HuifuService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {}

  /** 创建微信支付JSAPI订单（channel 缺省/MINI=小程序内支付；OFFICIAL=公众号内H5支付） */
  async createJsapiPayment(
    userId: string,
    openid: string | undefined,
    orderId: string,
    notifyUrl?: string,
    channel?: "MINI" | "OFFICIAL",
  ) {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order || order.userId !== userId) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");

    // 公众号内 H5（OFFICIAL）：openid 必须来自公众号网页授权（微信要求 openid 与下单 appid 同应用），
    // 不回退查 Auth 表——表里存的是小程序 openid，拿去公众号 appid 下单微信必拒
    let officialAppId: string | undefined;
    if (channel === "OFFICIAL") {
      officialAppId = process.env.WECHAT_OFFICIAL_APPID || process.env.WECHAT_APP_ID || "";
      if (!officialAppId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "公众号支付未配置，请在后台「微信公众号」卡片配置后重试");
      }
      if (!openid) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少微信授权，请刷新页面完成微信授权后重试");
      }
    }

    // openid 未显式传入时（小程序端不便获取），从用户已绑定的微信授权记录中查取，与充值 JSAPI 保持一致
    let payerOpenid = openid;
    if (!payerOpenid) {
      const wechatAuth = await this.prisma.auth.findFirst({
        where: { userId, provider: "WECHAT" },
        select: { openId: true },
      });
      if (!wechatAuth?.openId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "未绑定微信，请在微信小程序内使用微信登录后再支付");
      }
      payerOpenid = wechatAuth.openId;
    }

    const outTradeNo = `GX${Date.now()}${orderId.slice(0, 8)}`;
    const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);

    const result = await this.wechatPay.createJsapiOrder({
      outTradeNo,
      description: `国学平台订单-${orderId.slice(0, 8)}`,
      amount: { total: totalFen },
      payer: { openid: payerOpenid },
      attach: orderId,
      notifyUrl,
      appId: officialAppId,
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
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
    // 无商户证书/密钥时 crypto 签名会抛裸 500 → 前置检查返回结构化 400
    if (!this.wechatPay.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "微信支付未配置（缺商户证书/密钥），请联系平台或稍后再试");
    }

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

  /**
   * 创建微信 H5 支付（外部浏览器·mweb_url 跳转收银台）。
   * 校验与 JSAPI/Native 同口径：归属（只能付自己的单·403）+ 状态（PENDING 才可发起·400）；
   * 未配置商户证书时返回结构化 400（非 500 裸奔）。微信内置浏览器不支持 H5 支付，前端分流走 JSAPI。
   */
  async createH5Payment(orderId: string, userId: string, clientIp: string, notifyUrl?: string) {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
    if (order.status !== "PENDING") {
      // 显式 400：已支付/已取消等状态非权限问题（ORDER_STATUS_INVALID 默认映射 403，此处覆写）
      throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付", HttpStatus.BAD_REQUEST);
    }
    if (!this.wechatPay.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "微信支付未配置（缺商户证书/密钥），请联系平台或稍后再试");
    }

    const outTradeNo = `GX${Date.now()}${orderId.slice(0, 8)}`;
    const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);

    const result = await this.wechatPay.createH5Order({
      outTradeNo,
      description: `国学平台订单-${orderId.slice(0, 8)}`,
      amount: { total: totalFen },
      sceneInfo: {
        payerClientIp: clientIp || "127.0.0.1",
        h5Info: { type: "Wap", appName: "热卜国学", appUrl: process.env.H5_BASE_URL || "https://api.rebugx.cn" },
      },
      attach: orderId,
      notifyUrl,
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { payTransactionId: outTradeNo },
    });

    return { mwebUrl: result.h5Url, outTradeNo };
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
    // 单次充值上限（币）：前端标称 5 万元=50 万币，服务端必须强制，防刷单/误操作/洗钱通道
    if (amountCoin > 500_000) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "单次充值金额超过上限");
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
    STATION_MASTER: (order, tx) => this.processStationMasterPaid(order, tx),
    OPERATOR: (order, tx) => this.processOperatorPaid(order, tx),
    PRACTITIONER_PRO: (order, tx) => this.processPractitionerProPaid(order, tx),
  };

  /**
   * 按订单类型跑支付后处理器（会员开通 / 分站激活 / 运营商建号）。
   * 供非网关支付路径复用——管理员线下确认收款（ShopOrderLifecycleService.adminPayOrder）必须调它，
   * 否则订单变 PAID 但开通逻辑不跑 = 钱收了货不发（B 端加盟费的线下转账正是主要付款路径）。
   * 必须在翻状态的同一事务内调用，保证「订单 PAID」与「权益开通」原子。
   */
  async runPaidPostProcessors(order: Order, tx: any) {
    const processor = this.paidPostProcessors[order.type];
    if (processor) await processor(order, tx);
  }

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
    // 入账成功后立即清订单缓存：否则 getOrder 命中旧 PENDING 缓存(TTL 300s)，
    // 导致支付页轮询 getOrderPayState 永远读到未支付(不跳转)、订单详情显示「待付款」。
    await this.orderSvc.invalidateOrderCache(order.id, order.userId).catch((e) => this.logger.warn(`订单缓存清除失败 order=${order.id}`, e));
    // 拼团订单：支付成功后结算成团（事务外独立处理，失败不影响支付主流程）
    await this.orderSvc.settleGroupBuyIfNeeded(order.id).catch((e) => this.logger.error(`拼团成团结算失败 order=${order.id}`, e));
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

  /** 加盟费计费周期（月）— 真源 ConfigSystem，缺省 12（按年） */
  private async resolveBillingMonths(tx: any): Promise<number> {
    const cfg = await tx.configSystem.findUnique({ where: { configKey: "station.billing_period_months" } });
    const months = Number(cfg?.configValue ?? 12);
    return Number.isFinite(months) && months > 0 ? Math.floor(months) : 12;
  }

  /** 到期日叠加：续期不吞剩余天数（未到期则从原到期日起算，已过期则从当下起算）— 同会员口径 */
  private calcRenewedExpiry(current: Date | null | undefined, months: number): Date {
    const now = new Date();
    const base = new Date(current && current > now ? current : now);
    base.setMonth(base.getMonth() + months);
    return base;
  }

  /**
   * STATION_MASTER 支付后处理 — 分站年租缴纳/续期。
   * targetId = stationId（下单时已校验存在且归属付款人）。
   * 付款即激活：已上线协议文案明示「开通分站无准入门槛」，故不再等待管理员审核；
   * 管理员保留后置停用能力（status 可改）。
   */
  private async processStationMasterPaid(order: Order, tx: any) {
    if (!order.targetId) {
      this.logger.error(`STATION_MASTER 订单缺 targetId: ${order.id}`);
      return;
    }
    const station = await tx.station.findUnique({
      where: { id: order.targetId },
      select: { id: true, expireAt: true, status: true },
    });
    if (!station) {
      this.logger.error(`STATION_MASTER 订单指向的分站不存在: order=${order.id} station=${order.targetId}`);
      return;
    }
    const months = await this.resolveBillingMonths(tx);
    await tx.station.update({
      where: { id: station.id },
      data: {
        status: "ACTIVE",
        expireAt: this.calcRenewedExpiry(station.expireAt, months),
      },
    });
  }

  /**
   * OPERATOR 支付后处理 — 运营商开通/续期/升档。
   * targetId = 档位（SILVER/GOLD/DIAMOND/BLACK_GOLD，下单时已校验）。
   * 名额取 CommissionConfig.operator_<level>.rateB；档位只升不降（同会员「等级只升不降」）。
   * ⚠️ mgmtRate 一律留空 → 走 channelType 默认（ONLINE 0.10 / OFFLINE 0.20）。
   *    seed 里的 rateC（旧分级管理奖）已废止，禁止读取，否则会与现行口径打架。
   */
  private async processOperatorPaid(order: Order, tx: any) {
    const level = String(order.targetId || "").toUpperCase();
    if (!OPERATOR_LEVEL_RANK[level]) {
      this.logger.error(`OPERATOR 订单档位非法: order=${order.id} level=${order.targetId}`);
      return;
    }
    const cfg = await tx.commissionConfig.findUnique({ where: { configKey: `operator_${level}` } });
    const quota = Math.max(0, Math.floor(Number(cfg?.rateB ?? 0)));
    const months = await this.resolveBillingMonths(tx);

    const existing = await tx.operator.findUnique({
      where: { userId: order.userId },
      select: { id: true, level: true, containQuota: true, expireAt: true },
    });

    if (!existing) {
      await tx.operator.create({
        data: {
          userId: order.userId,
          level: level as any,
          containQuota: quota,
          channelType: "ONLINE",
          status: "ACTIVE",
          expireAt: this.calcRenewedExpiry(null, months),
        },
      });
      return;
    }

    // 只升不降：买低档不覆盖已有高档（名额同理取大者）
    const keepLevel =
      OPERATOR_LEVEL_RANK[existing.level] >= OPERATOR_LEVEL_RANK[level] ? existing.level : level;
    await tx.operator.update({
      where: { id: existing.id },
      data: {
        level: keepLevel as any,
        containQuota: Math.max(existing.containQuota ?? 0, quota),
        status: "ACTIVE",
        expireAt: this.calcRenewedExpiry(existing.expireAt, months),
      },
    });
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
    const order = await this.orderSvc.getOrder(orderId, userId);
    if (!order?.payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单无支付记录");

    const result = await this.wechatPay.queryOrder(order.payTransactionId);
    return { tradeState: result.trade_state, raw: result };
  }

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

  /**
   * PRACTITIONER_PRO 支付后处理 —— 从业者会员（¥98/月）开通/续期。
   *
   * 🔴 与书院会员（MEMBER）完全隔离：只写 PractitionerProfile.proExpireAt，
   * 绝不碰 user.memberLevel/memberExpire——两者是两个产品，一个是 C 端书院权益（电子书/积分/AI 伴读），
   * 一个是 B 端执业工具权益（报告导出/案例库/品牌落款）。用户可以同时是两者。
   *
   * 续期不吞剩余天数：未到期则从「当前到期日」起算叠加，已过期则从当下起算。
   */
  private async processPractitionerProPaid(order: Order, tx: any) {
    const now = new Date();
    const existing = await tx.practitionerProfile.findUnique({
      where: { userId: order.userId },
      select: { id: true, proExpireAt: true, proFirstAt: true },
    });
    const base = existing?.proExpireAt && existing.proExpireAt > now ? existing.proExpireAt : now;
    const expire = new Date(base);
    expire.setMonth(expire.getMonth() + 1); // 月付

    if (existing) {
      await tx.practitionerProfile.update({
        where: { userId: order.userId },
        data: { proExpireAt: expire, proFirstAt: existing.proFirstAt ?? now },
      });
    } else {
      await tx.practitionerProfile.create({
        data: { userId: order.userId, proExpireAt: expire, proFirstAt: now },
      });
    }
    this.logger.log(`从业者会员开通/续期 user=${order.userId} 到期=${expire.toISOString()}`);
  }
}
