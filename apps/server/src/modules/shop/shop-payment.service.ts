import { Injectable, Inject, Logger, Optional, HttpStatus } from "@nestjs/common";
import { randomUUID } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { MemberLevel, Order } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { WechatPayApiError, WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { HuifuService } from "../huifu/huifu.service";
import { CoinService } from "../coin/coin.service";
import { WebhookService } from "../webhook/webhook.service";
import { MemberBenefitService } from "../member/member-benefit.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { ShopOrderService } from "./shop-order.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { RMB_TO_FEN } from "../../common/constants";
import { serverConfig } from "../../config/server-config";

/** 运营商档位高低序（用于开通/续期时「只升不降」判定；对齐 schema enum OperatorLevel） */
const OPERATOR_LEVEL_RANK: Record<string, number> = {
  SILVER: 1,
  GOLD: 2,
  DIAMOND: 3,
  BLACK_GOLD: 4,
};

const MAX_COIN_RECHARGE = 500_000;
const COIN_RECHARGE_INTENT_TTL = 2 * 60 * 60;

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
    private entitlement: EntitlementService,
    private attribution: ShopAttributionService,
    private orderSvc: ShopOrderService,
    @Optional() private huifu?: HuifuService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
    @Inject(CoinService) private coinSvc?: CoinService,
  ) {
    this.huifu?.registerPaymentNotifyHandler((payload) => this.handleHuifuNotify(payload));
  }

  /** 同一本地订单的微信 JSAPI / Native / H5 初始化必须串行，避免跨入口生成多笔可支付渠道单。 */
  private async withWechatPaymentInit<T>(orderId: string, busyMessage: string, task: () => Promise<T>): Promise<T> {
    const lockKey = "pay:init:wechat:" + orderId;
    const locked = await this.redis.setNX(lockKey, "1", 60);
    if (!locked) throw new BusinessException(ErrorCode.BAD_REQUEST, busyMessage);
    try {
      return await task();
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 旧渠道单无法明确关停时绝不创建第二笔；若已支付则主动补入账并阻止重复付款。 */
  private async closePreviousWechatPayment(orderId: string, outTradeNo: string): Promise<void> {
    try {
      await this.wechatPay.closeOrder(outTradeNo);
    } catch (closeError) {
      const missingFromCurrentMerchantOnClose =
        closeError instanceof WechatPayApiError && closeError.wechatCode === "ORDER_NOT_EXIST";
      try {
        const queried = await this.wechatPay.queryOrder(outTradeNo);
        if (queried.trade_state === "SUCCESS") {
          const handled = await this.handlePaymentNotify({
            ...queried,
            out_trade_no: outTradeNo,
            trade_state: "SUCCESS",
            attach: orderId,
          });
          if (handled) throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单已支付，请勿重复付款");
        }
      } catch (queryError) {
        if (queryError instanceof BusinessException && queryError.message.includes("订单已支付")) throw queryError;
        if (
          missingFromCurrentMerchantOnClose &&
          queryError instanceof WechatPayApiError &&
          queryError.wechatCode === "ORDER_NOT_EXIST"
        ) {
          this.logger.warn(
            "旧付款单在当前微信商户下不存在，按商户切换遗留流水恢复 order=" + orderId,
          );
          return;
        }
        this.logger.warn("旧付款单查单失败 order=" + orderId + ": " + (queryError as Error).message);
      }
      this.logger.warn("旧付款单关单失败 order=" + orderId + ": " + (closeError as Error).message);
      throw new BusinessException(ErrorCode.BAD_REQUEST, "原付款正在处理中，请稍后重试");
    }
  }

  private buildWechatOutTradeNo(orderId: string, replacingPrevious: boolean): string {
    const normalizedOrderId = String(orderId).replace(/[^A-Za-z0-9]/g, "");
    return replacingPrevious
      ? "GX" + Date.now() + normalizedOrderId.slice(0, 17)
      : "GX" + normalizedOrderId.slice(0, 30);
  }

  /**
   * 渠道下单后用旧交易号 + PENDING 做 CAS 落库。若订单状态已变，立即关闭刚创建的渠道单，
   * 避免“本地没记录、微信仍可付款”的孤儿支付单。
   */
  private async persistWechatPaymentIntent(order: Order, outTradeNo: string): Promise<void> {
    try {
      const updated = await this.prisma.order.updateMany({
        where: { id: order.id, status: "PENDING", payTransactionId: order.payTransactionId || null },
        data: { payTransactionId: outTradeNo },
      });
      if (updated.count !== 1) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态已变更，请刷新后重试");
      }
    } catch (error) {
      try {
        await this.wechatPay.closeOrder(outTradeNo);
      } catch (closeError) {
        this.logger.error(
          "【资金对账·孤儿支付单】本地支付意图落库失败且新微信单关单失败: order=" +
            order.id + ", outTradeNo=" + outTradeNo + ", error=" + (closeError as Error).message,
        );
      }
      if (error instanceof BusinessException) throw error;
      this.logger.error("支付意图落库失败 order=" + order.id + ": " + (error as Error).message);
      throw new BusinessException(ErrorCode.PAY_FAILED, "支付初始化未完成，请稍后重试");
    }
    await this.redis.del("shop:order:" + order.id);
  }

  private async clearWechatPaymentResultCaches(orderId: string): Promise<void> {
    await Promise.all([
      this.redis.del("shop:pay:native:" + orderId),
      this.redis.del("shop:pay:h5:" + orderId),
      this.redis.del("shop:pay:jsapi:MINI:" + orderId),
      this.redis.del("shop:pay:jsapi:OFFICIAL:" + orderId),
    ]);
  }

  /** 创建微信支付JSAPI订单（channel 缺省/MINI=小程序内支付；OFFICIAL=公众号内H5支付） */
  async createJsapiPayment(
    userId: string,
    openid: string | undefined,
    orderId: string,
    channel?: "MINI" | "OFFICIAL",
  ) {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order || order.userId !== userId) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
    if (!this.wechatPay.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "微信支付未配置（缺商户证书/密钥），请联系平台或稍后再试");
    }

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

    const paymentChannel = channel || "MINI";
    const cacheKey = "shop:pay:jsapi:" + paymentChannel + ":" + orderId;
    return this.withWechatPaymentInit(orderId, "支付正在初始化，请稍后重试", async () => {
      const freshOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!freshOrder || freshOrder.userId !== userId) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      }
      if (freshOrder.status !== "PENDING") {
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
      }

      const cached = await this.redis.getJson<{
        outTradeNo: string;
        paySign: Awaited<ReturnType<WechatPayService["createJsapiOrder"]>>["paySign"];
      }>(cacheKey);
      if (cached?.paySign && cached.outTradeNo === freshOrder.payTransactionId) return cached.paySign;

      const previousOutTradeNo = freshOrder.payTransactionId || "";
      if (previousOutTradeNo) await this.closePreviousWechatPayment(orderId, previousOutTradeNo);
      await this.clearWechatPaymentResultCaches(orderId);

      const outTradeNo = this.buildWechatOutTradeNo(orderId, !!previousOutTradeNo);
      const totalFen = Math.round(Number(freshOrder.amount) * RMB_TO_FEN);
      const result = await this.wechatPay.createJsapiOrder({
        outTradeNo,
        description: "国学平台订单-" + orderId.slice(0, 8),
        amount: { total: totalFen },
        payer: { openid: payerOpenid },
        attach: orderId,
        appId: officialAppId,
      });

      await this.persistWechatPaymentIntent(freshOrder, outTradeNo);
      await this.redis.setJson(cacheKey, { outTradeNo, paySign: result.paySign }, 110 * 60);
      return result.paySign;
    });
  }

  /**
   * 创建 Native 扫码支付。
   * 同一本地订单在付款码有效期内复用同一码；缓存失效后必须先关掉旧微信订单，
   * 防止用户重进页面生成多张都能扣款的二维码。
   */
  async createNativePayment(orderId: string, userId: string) {
    const order = await this.orderSvc.getOrder(orderId);
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
    if (!this.wechatPay.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "微信支付未配置（缺商户证书/密钥），请联系平台或稍后再试");
    }

    const cacheKey = "shop:pay:native:" + orderId;
    return this.withWechatPaymentInit(orderId, "付款码正在生成，请稍后重试", async () => {
      const freshOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!freshOrder) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (freshOrder.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
      if (freshOrder.status !== "PENDING") {
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付");
      }

      const cached = await this.redis.getJson<{
        outTradeNo: string;
        result: Awaited<ReturnType<WechatPayService["createNativeOrder"]>>;
      }>(cacheKey);
      if (cached?.result?.codeUrl && cached.outTradeNo === freshOrder.payTransactionId) return cached.result;

      const previousOutTradeNo = freshOrder.payTransactionId || "";
      if (previousOutTradeNo) await this.closePreviousWechatPayment(orderId, previousOutTradeNo);
      await this.clearWechatPaymentResultCaches(orderId);

      const outTradeNo = this.buildWechatOutTradeNo(orderId, !!previousOutTradeNo);
      const totalFen = Math.round(Number(freshOrder.amount) * RMB_TO_FEN);
      const result = await this.wechatPay.createNativeOrder({
        outTradeNo,
        description: "国学平台订单-" + orderId.slice(0, 8),
        amount: { total: totalFen },
        attach: orderId,
      });

      await this.persistWechatPaymentIntent(freshOrder, outTradeNo);
      await this.redis.setJson(cacheKey, { outTradeNo, result }, 110 * 60);
      return result;
    });
  }

  /**
   * 创建微信 H5 支付（外部浏览器·mweb_url 跳转收银台）。
   * 校验与 JSAPI/Native 同口径：归属（只能付自己的单·403）+ 状态（PENDING 才可发起·400）；
   * 未配置商户证书时返回结构化 400（非 500 裸奔）。微信内置浏览器不支持 H5 支付，前端分流走 JSAPI。
   */
  async createH5Payment(orderId: string, userId: string, clientIp: string) {
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

    const cacheKey = "shop:pay:h5:" + orderId;
    return this.withWechatPaymentInit(orderId, "支付正在初始化，请稍后重试", async () => {
      const freshOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!freshOrder) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (freshOrder.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能支付自己的订单");
      if (freshOrder.status !== "PENDING") {
        throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单状态不可支付", HttpStatus.BAD_REQUEST);
      }

      const cached = await this.redis.getJson<{ outTradeNo: string; mwebUrl: string }>(cacheKey);
      if (cached?.mwebUrl && cached.outTradeNo === freshOrder.payTransactionId) return cached;

      const previousOutTradeNo = freshOrder.payTransactionId || "";
      if (previousOutTradeNo) await this.closePreviousWechatPayment(orderId, previousOutTradeNo);
      await this.clearWechatPaymentResultCaches(orderId);

      const outTradeNo = this.buildWechatOutTradeNo(orderId, !!previousOutTradeNo);
      const totalFen = Math.round(Number(freshOrder.amount) * RMB_TO_FEN);
      const result = await this.wechatPay.createH5Order({
        outTradeNo,
        description: "国学平台订单-" + orderId.slice(0, 8),
        amount: { total: totalFen },
        sceneInfo: {
          payerClientIp: clientIp || "127.0.0.1",
          h5Info: {
            type: "Wap",
            appName: "热卜国学",
            appUrl: serverConfig.publicH5BaseUrl,
          },
        },
        attach: orderId,
      });

      await this.persistWechatPaymentIntent(freshOrder, outTradeNo);
      const response = { mwebUrl: result.h5Url, outTradeNo };
      await this.redis.setJson(cacheKey, response, 110 * 60);
      return response;
    });
  }
  private validateCoinRechargeAmount(amountCoin: number) {
    if (!Number.isInteger(amountCoin) || amountCoin <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值金额必须为正整数");
    }
    if (amountCoin > MAX_COIN_RECHARGE) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "单次充值金额超过上限");
    }
    if (!this.wechatPay.isConfigured) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "微信支付未配置（缺商户证书/密钥），请联系平台或稍后再试");
    }
  }

  private async resolveCoinRechargeAmount(amountCoin: number) {
    if (!this.coinSvc) {
      throw new BusinessException(ErrorCode.PAY_FAILED, "国学币服务暂不可用，请稍后再试");
    }
    // 精确命中后台充值档位时，档位金额是收款真源（可支持特价档）；自定义币数才按全局汇率换算。
    const tiers = await this.coinSvc.getRechargeTiers();
    const tier = Array.isArray(tiers)
      ? tiers.find((item: { amountCoin?: number }) => Number(item?.amountCoin) === amountCoin)
      : undefined;
    const rechargeTier = tier as { amountRmb?: number; bonus?: number } | undefined;
    const tierAmount = Number(rechargeTier?.amountRmb);
    let amountRmb: number;
    let bonusCoin = 0;
    if (Number.isFinite(tierAmount) && tierAmount > 0) {
      amountRmb = tierAmount;
      const configuredBonus = Number(rechargeTier?.bonus);
      bonusCoin = Number.isInteger(configuredBonus) && configuredBonus > 0 ? configuredBonus : 0;
    } else {
      const coinRate = await this.coinSvc.getCoinRate();
      if (!Number.isFinite(coinRate) || coinRate <= 0) {
        throw new BusinessException(ErrorCode.PAY_FAILED, "国学币汇率配置异常，请联系平台");
      }
      amountRmb = amountCoin / coinRate;
    }
    const totalFen = Math.round(amountRmb * RMB_TO_FEN);
    if (totalFen <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值金额低于支付渠道最小金额");
    }
    return { amountRmb: totalFen / RMB_TO_FEN, totalFen, bonusCoin };
  }

  private createCoinRechargeOrderNo() {
    return `RC${Date.now()}${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  /** 支付意图仅供回跳轮询；缓存失败不得阻断已经创建的真实微信订单。 */
  private async rememberCoinRechargeIntent(orderNo: string, userId: string) {
    try {
      await this.redis.set(`recharge:intent:${orderNo}`, userId, COIN_RECHARGE_INTENT_TTL);
    } catch (err) {
      this.logger.warn(`充值支付意图缓存失败（不阻断真实支付）: ${orderNo}`, err);
    }
  }

  /** 创建国学币充值微信 JSAPI 订单（小程序/公众号共用）。 */
  async createRechargePayment(
    userId: string,
    openid: string,
    amountCoin: number,
    appId?: string,
  ) {
    this.validateCoinRechargeAmount(amountCoin);
    const { amountRmb, totalFen, bonusCoin } = await this.resolveCoinRechargeAmount(amountCoin);
    const orderNo = this.createCoinRechargeOrderNo();
    const result = await this.wechatPay.createJsapiOrder({
      outTradeNo: orderNo,
      description: `${amountCoin}国学币充值`,
      amount: { total: totalFen },
      payer: { openid },
      attach: JSON.stringify({ type: "COIN_RECHARGE", userId, amountCoin, amountFen: totalFen, bonusCoin }),
      appId,
    });
    await this.rememberCoinRechargeIntent(orderNo, userId);
    return { payParams: result.paySign, orderNo, amountRmb };
  }

  /** 国学币充值 —— 微信外部浏览器 H5 下单。 */
  async createCoinRechargeH5(userId: string, amountCoin: number, clientIp: string) {
    this.validateCoinRechargeAmount(amountCoin);
    const { amountRmb, totalFen, bonusCoin } = await this.resolveCoinRechargeAmount(amountCoin);
    const orderNo = this.createCoinRechargeOrderNo();
    const result = await this.wechatPay.createH5Order({
      outTradeNo: orderNo,
      description: `${amountCoin}国学币充值`,
      amount: { total: totalFen },
      sceneInfo: {
        payerClientIp: clientIp || "127.0.0.1",
        h5Info: {
          type: "Wap",
          appName: "热卜国学",
          appUrl: serverConfig.publicH5BaseUrl,
        },
      },
      attach: JSON.stringify({ type: "COIN_RECHARGE", userId, amountCoin, amountFen: totalFen, bonusCoin }),
    });
    await this.rememberCoinRechargeIntent(orderNo, userId);
    return { mwebUrl: result.h5Url, orderNo, amountRmb };
  }

  /** 查询本人充值状态；缓存失效但回调未到时保持 PENDING，避免误报失败。 */
  async queryCoinRechargeStatus(userId: string, orderNo: string) {
    if (!orderNo || !/^RC[A-Za-z0-9_-]{8,40}$/.test(orderNo)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值订单号无效");
    }
    const recharge = await this.prisma.virtualCoinRecharge.findUnique({ where: { orderNo } });
    if (recharge) {
      if (recharge.userId !== userId) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "充值订单不存在");
      }
      return {
        orderNo,
        status: recharge.status,
        amountCoin: recharge.amountCoin,
        amountRmb: Number(recharge.amountRmb),
        paidAt: recharge.paidAt,
      };
    }
    let intentOwner: string | null = null;
    try {
      intentOwner = await this.redis.get(`recharge:intent:${orderNo}`);
    } catch (err) {
      this.logger.warn(`充值支付意图读取失败（按待确认降级）: ${orderNo}`, err);
    }
    if (intentOwner && intentOwner !== userId) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "充值订单不存在");
    }
    return { orderNo, status: "PENDING", amountCoin: null, amountRmb: null, paidAt: null };
  }

  /**
   * 国学币充值 —— 微信 JSAPI 下单。
   * MINI：openid 可省略并从小程序授权记录读取；OFFICIAL：必须传公众号网页授权 openid。
   * 到账由支付回调 handlePaymentNotify → CoinService.handleRechargeCallback 完成（幂等），此处不预扣不加币。
   */
  async createCoinRechargeJsapi(
    userId: string,
    amountCoin: number,
    openid?: string,
    channel?: "MINI" | "OFFICIAL",
  ) {
    this.validateCoinRechargeAmount(amountCoin);
    let payerOpenid = openid;
    let appId: string | undefined;
    if (channel === "OFFICIAL") {
      appId = process.env.WECHAT_OFFICIAL_APPID || process.env.WECHAT_APP_ID || "";
      if (!appId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "公众号支付未配置，请在后台「微信公众号」卡片配置后重试");
      }
      if (!payerOpenid) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少微信授权，请刷新页面完成微信授权后重试");
      }
    } else if (!payerOpenid) {
      const wechatAuth = await this.prisma.auth.findFirst({
        where: { userId, provider: "WECHAT" },
        select: { openId: true },
      });
      if (!wechatAuth?.openId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "未绑定微信，请在微信小程序内使用微信登录后再充值");
      }
      payerOpenid = wechatAuth.openId;
    }
    return this.createRechargePayment(userId, payerOpenid, amountCoin, appId);
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
    const outTradeNo = String(body.out_trade_no || "");
    if (!outTradeNo) {
      this.logger.error("【资金对账·商户单号缺失】微信支付回调缺少 out_trade_no");
      return false;
    }
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

      if (body.trade_state !== "SUCCESS") {
        this.logger.log(`支付未成功: ${outTradeNo}, 状态: ${body.trade_state}`);
        return true; // 非成功态无需处理，也无需渠道重试
      }
      if (!transactionId) {
        this.logger.error(`【资金对账·流水缺失】微信支付成功回调缺少 transaction_id: ${outTradeNo}`);
        return false;
      }

      // 虚拟币充值回调 → 转发给 CoinService（其内部幂等）
      if (attach.type === "COIN_RECHARGE") {
        if (!this.coinSvc) {
          this.logger.error(`国学币充值处理器未就绪，拒绝确认微信回调: ${outTradeNo}`);
          return false;
        }
        return this.coinSvc.handleRechargeCallback(body);
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
        this.logger.error(`【资金对账】收到支付成功回调但找不到订单: ${outTradeNo}, transactionId: ${transactionId}`);
        return false;
      }

      // 只有 attach 提供了 orderId 才需要另外查询（已通过 payTransactionId 查到的直接复用）
      if (!order) {
        order = await this.prisma.order.findUnique({ where: { id: orderId } });
      }
      if (!order) {
        this.logger.error(`【资金对账】回调订单不存在: ${orderId}, outTradeNo: ${outTradeNo}`);
        return false;
      }
      if (order.status === "CANCELLED") {
        // 关键：订单已被超时 cron 取消却又收到支付成功——钱货两空风险，落错误台账人工/自动退款
        this.logger.error(
          "【资金对账·需退款】已取消订单收到支付成功回调: order=" + orderId +
            ", outTradeNo=" + outTradeNo + ", transactionId=" + transactionId,
        );
        return false;
      }
      if (order.status !== "PENDING") {
        // processPaidOrder 会把 payTransactionId 原子替换为微信 transaction_id。
        // 只有同一渠道流水的重投才是幂等；不同流水意味着同一本地订单被重复扣款，必须让渠道重试并进入对账。
        if (order.payMethod === "WECHAT" && order.payTransactionId === transactionId) {
          // 订单已入账但首次外发箱落库失败时，渠道重投必须补建事件；唯一键会拦截正常重复通知。
          await this.emitOrderPaidEvent(order, outTradeNo, "WECHAT", transactionId);
          return true;
        }
        this.logger.error(
          "【资金对账·疑似重复扣款】终态订单收到另一笔微信成功流水: order=" + orderId +
            ", status=" + order.status + ", stored=" + (order.payTransactionId || "") +
            ", incoming=" + transactionId + ", outTradeNo=" + outTradeNo,
        );
        return false;
      }
      if (!order.payTransactionId || order.payTransactionId !== outTradeNo) {
        // attach 只能定位业务订单，不能替代商户单号校验；否则历史付款码/孤儿渠道单也能给当前订单入账。
        this.logger.error(
          "【资金对账·商户单号不符】微信成功回调与当前支付意图不一致: order=" + orderId +
            ", expected=" + (order.payTransactionId || "") + ", incoming=" + outTradeNo +
            ", transactionId=" + transactionId,
        );
        return false;
      }

      const wxTotal = Number((body.amount as Record<string, unknown> | undefined)?.total);
      if (!Number.isFinite(wxTotal) || wxTotal <= 0) {
        this.logger.error(`【资金对账·金额缺失】微信支付成功回调未携带合法金额: order=${orderId}, outTradeNo=${outTradeNo}`);
        return false;
      }
      if (Math.abs(wxTotal / 100 - Number(order.amount)) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】微信回调金额与订单金额不一致，拒绝入账: order=${orderId}, outTradeNo=${outTradeNo}, 回调金额=${wxTotal / 100}, 订单金额=${Number(order.amount)}`,
        );
        return false;
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
      await this.emitOrderPaidEvent(order, outTradeNo, "WECHAT", transactionId);

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
    return this.completePayment(
      outTradeNo, "ALIPAY", data.tradeNo as string,
      ["TRADE_SUCCESS", "TRADE_FINISHED"].includes(String(data.tradeStatus)),
      Number(data.totalAmount), // 元
    );
  }

  /** 银联回调验签 */
  async verifyUnionpayNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.unionpay.verifyNotify(params) as Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }>;
  }

  /** 处理银联回调 */
  async handleUnionpayNotify(data: Record<string, unknown>) {
    if (data.respCode !== "00") return true;
    const outTradeNo = data.outTradeNo as string;
    return this.completePayment(
      outTradeNo, "UNIONPAY", data.tradeNo as string, true,
      Number(data.amount) / 100, // 银联回调金额单位为分
    );
  }

  private async completePayment(
    outTradeNo: string,
    payMethod: string,
    tradeNo: string,
    success: boolean,
    callbackAmount?: number,
  ): Promise<boolean> {
    if (!success) {
      this.logger.log(`支付未成功: ${outTradeNo}, 方式: ${payMethod}`);
      return true;
    }
    if (!outTradeNo || !tradeNo) {
      this.logger.error(`【资金对账·流水缺失】${payMethod} 支付成功回调缺少商户单号或渠道流水`);
      return false;
    }

    const payLockKey = `pay:lock:${outTradeNo}`;
    const payLocked = await this.redis.setNX(payLockKey, "1", 30);
    if (!payLocked) {
      this.logger.warn(`支付回调重复处理被拦截: ${outTradeNo}`);
      return false;
    }

    try {
      // 首次回调按商户单号定位；成功后 payTransactionId 会改存渠道流水，
      // 后续重投再按渠道流水定位，确保进程重启/缓存失效后仍能幂等应答。
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { payTransactionId: outTradeNo },
            ...(tradeNo ? [{ payMethod, payTransactionId: tradeNo }] : []),
          ],
        },
      });
      if (!order) {
        this.logger.error(`找不到对应的订单: ${outTradeNo}`);
        return false;
      }
      if (order.status !== "PENDING") {
        // 只有同一渠道、同一渠道流水的终态重投才可幂等确认；已取消订单或第二笔扣款必须进入对账。
        if (order.payMethod === payMethod && order.payTransactionId === tradeNo) {
          await this.emitOrderPaidEvent(order, outTradeNo, payMethod, tradeNo);
          return true;
        }
        const riskLabel = order.status === "CANCELLED" ? "已取消订单收到成功扣款" : "终态订单收到另一笔成功流水";
        this.logger.error(
          "【资金对账·" + riskLabel + "】order=" + order.id +
            ", status=" + order.status + ", payMethod=" + payMethod +
            ", storedMethod=" + (order.payMethod || "") +
            ", storedTradeNo=" + (order.payTransactionId || "") +
            ", incomingTradeNo=" + tradeNo + ", outTradeNo=" + outTradeNo,
        );
        return false;
      }

      if (!Number.isFinite(callbackAmount) || Number(callbackAmount) <= 0) {
        this.logger.error(
          `【资金对账·金额缺失】支付成功回调未携带合法金额，拒绝入账: order=${order.id}, outTradeNo=${outTradeNo}, 渠道=${payMethod}`,
        );
        return false;
      }
      if (Math.abs(Number(callbackAmount) - Number(order.amount)) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】回调金额与订单金额不一致，拒绝入账: order=${order.id}, outTradeNo=${outTradeNo}, 渠道=${payMethod}, 回调金额=${callbackAmount}, 订单金额=${Number(order.amount)}`,
        );
        return false;
      }

      const orderLockKey = await this.acquireOrderLock(order.id);
      if (!orderLockKey) return false;

      try {
        await this.processPaidOrder(order, payMethod, tradeNo, Number(callbackAmount));
      } catch (e: unknown) {
        if (e instanceof BusinessException && e.message === "订单状态已变更") return true;
        if (isUniqueConstraintError(e)) {
          this.logger.warn(`支付回调重复处理(DB约束拦截): ${outTradeNo}, payMethod: ${payMethod}`);
          return true;
        }
        throw e;
      } finally {
        await this.redis.del(orderLockKey);
      }

      await this.attribution.recordOrderCommissionAndFee(order);
      await this.emitOrderPaidEvent(order, outTradeNo, payMethod, tradeNo);

      this.logger.log(`订单 ${order.id} 支付成功, ${payMethod}交易号: ${tradeNo}`);
      return true;
    } finally {
      await this.redis.del(payLockKey);
    }
  }

  /**
   * 统一发送支付成功事件。
   * 网关回调与管理员线下确认收款都必须走这里，避免微信/人工确认路径漏掉下游发货、CRM 与数据通知。
   * 事件投递失败不回滚已完成的资金事务；WebhookService 负责单订阅重试。
   */
  emitOrderPaidEvent(
    order: Pick<Order, "id" | "amount" | "userId">,
    outTradeNo: string,
    payMethod: string,
    tradeNo: string,
  ): Promise<void> {
    return this.webhook.fire("ORDER_PAID", {
      orderId: order.id,
      outTradeNo,
      payMethod,
      tradeNo,
      amount: Number(order.amount),
      userId: order.userId,
    }).catch((err) => {
      // 外发箱都未能落库时必须让支付渠道重投，不能吞掉这类本地持久化故障。
      this.logger.error("Webhook ORDER_PAID 外发箱写入失败", err);
      throw err;
    });
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
    COURSE: (order, tx) => this.processAccessPaid(order, tx),
    BUNDLE: (order, tx) => this.processAccessPaid(order, tx),
    BOT_SERVICE: (order, tx) => this.processAccessPaid(order, tx),
    PAIPAN: (order, tx) => this.processAccessPaid(order, tx),
    LIVESTREAM: (order, tx) => this.processAccessPaid(order, tx),
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
  private async processPaidOrder(
    order: { id: string; type: string; userId: string; amount: any; targetId?: string | null; referrerId?: string | null },
    payMethod: string,
    tradeNo: string,
    paidAmount = Number(order.amount),
  ) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: {
          status: "PAID",
          payMethod,
          payAmount: paidAmount,
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
        orderId: order.id,
        memberType: memberLevel as any,
        amount: order.amount,
        referrerId: order.referrerId,
        paidAt: new Date(),
        expireAt: expiresAt,
      },
    });
    // 权益③首月发放（同事务原子；月度 cron 按 member_monthly_YYYYMM 幂等，本月不会重复发）
    await this.memberBenefit.grantMonthlyBenefits(order.userId, planLevel, tx);
    await this.entitlement.grantWithTx(tx, {
      userId: order.userId,
      entitlementKey: "membership.school",
      kind: "MEMBERSHIP",
      resourceType: "MEMBER_PLAN",
      unlimited: true,
      validUntil: expiresAt,
      sourceType: "ORDER",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:membership.school`,
      metadata: { planLevel, memberLevel: finalLevel, autoRenew: isAutoRenew },
    });
  }

  /** 数字内容订单统一登记为全平台访问权益；原业务表继续兼容，权益中心负责跨端汇总。 */
  private async processAccessPaid(order: Order, tx: any) {
    let validUntil: Date | null = null;
    if (order.type === "COURSE") {
      const course = await tx.course.findUnique({ where: { id: order.targetId }, select: { validityDays: true } });
      if (course?.validityDays > 0) {
        validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + course.validityDays);
      }
    }
    await this.entitlement.grantWithTx(tx, {
      userId: order.userId,
      entitlementKey: `${order.type.toLowerCase()}.access`,
      kind: "ACCESS",
      resourceType: order.type,
      resourceId: order.targetId,
      quantity: 1,
      validUntil,
      sourceType: "ORDER",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:${order.type.toLowerCase()}.access`,
      metadata: { orderType: order.type },
    });
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
        // 管理端 DISABLED 是治理状态，已发起支付的竞态回调只能顺延权益，绝不能替站长解除停用。
        status: station.status === "DISABLED" ? "DISABLED" : "ACTIVE",
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
      select: { id: true, level: true, containQuota: true, expireAt: true, status: true },
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
        // EXPIRED 是正常到期态，续费后恢复；DISABLED 是平台治理态，竞态回调不得替用户解封。
        status: existing.status === "DISABLED" ? "DISABLED" : "ACTIVE",
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

  /** 处理已由 HuifuService 验签、解析的汇付支付回调，并进入统一订单履约主链。 */
  async handleHuifuNotify(body: Record<string, unknown>) {
    const outTradeNo = String(body.req_seq_id || body.out_trade_no || "");
    if (!outTradeNo) throw new BusinessException(ErrorCode.BAD_REQUEST, "汇付支付回调缺少商户订单号");
    const tradeStatus = String(body.trans_stat || body.trade_status || body.status || "");
    if (!["S", "SUCCESS", "TRADE_SUCCESS"].includes(tradeStatus)) {
      this.logger.log("汇付支付未成功: " + outTradeNo + ", trans_stat=" + (tradeStatus || "UNKNOWN"));
      return;
    }
    const callbackAmount = Number(body.trans_amt);
    const transactionId = String(body.hf_seq_id || body.huifu_order_id || "");
    const handled = await this.completePayment(
      outTradeNo,
      "HUIFU",
      transactionId,
      true,
      Number.isFinite(callbackAmount) ? callbackAmount : undefined,
    );
    if (!handled) throw new BusinessException(ErrorCode.PAY_FAILED, "汇付支付回调尚未完成本地入账");
    await this.prisma.huifuSplitRecord.updateMany({
      where: { outTradeNo },
      data: { huifuOrderId: transactionId || undefined, rawResponse: body as any },
    });
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
    await this.entitlement.grantWithTx(tx, {
      userId: order.userId,
      entitlementKey: "membership.practitioner",
      kind: "MEMBERSHIP",
      resourceType: "PRACTITIONER_PRO",
      unlimited: true,
      validUntil: expire,
      sourceType: "ORDER",
      sourceId: order.id,
      idempotencyKey: `order:${order.id}:membership.practitioner`,
    });
    this.logger.log(`从业者会员开通/续期 user=${order.userId} 到期=${expire.toISOString()}`);
  }
}
