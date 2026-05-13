import { Injectable, forwardRef, Inject, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma, MemberLevel, Order } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CommissionService } from "../commission/commission.service";
import { WechatPayService } from "./wechat-pay.service";
import { AlipayService } from "./alipay.service";
import { UnionpayService } from "./unionpay.service";
import { CoinService } from "../coin/coin.service";
import { WebhookService } from "../webhook/webhook.service";
import { COIN_TO_RMB, RMB_TO_FEN } from "../../common/constants";
import {
  CreateProductDto, UpdateProductDto, CreateOrderDto,
  CreateCouponV2Dto, CreateReviewDto, UpdateLogisticsDto,
  CreateFreightTemplateDto, UpdateFreightTemplateDto,
  ProductListQueryDto, OrderListQueryDto,
} from "./shop.dto";

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private wechatPay: WechatPayService,
    private alipay: AlipayService,
    private unionpay: UnionpayService,
    private webhook: WebhookService,
    @Inject(forwardRef(() => CommissionService)) private commissionSvc?: CommissionService,
    @Inject(forwardRef(() => CoinService)) private coinSvc?: CoinService,
  ) {}

  // ═══════════════════ 商品管理 ═══════════════════

  async createProduct(userId: string, dto: CreateProductDto) {
    const { skus, ...rest } = dto;
    const data: Prisma.ProductCreateInput = {
      title: rest.title,
      price: rest.price,
      stock: rest.stock ?? 0,
      detail: rest.detail ?? "",
      userId,
    };
    if (rest.circleId) data.circle = { connect: { id: rest.circleId } };
    if (rest.categoryId) data.categoryId = rest.categoryId;
    if (rest.intro) data.intro = rest.intro;
    if (rest.images) data.images = rest.images;
    if (rest.videoUrl) data.videoUrl = rest.videoUrl;
    if (rest.stationId) data.station = { connect: { id: rest.stationId } };
    if (skus) {
      data.skus = { create: skus.map(s => ({ specs: s.specs, price: s.price, stock: s.stock ?? 0, skuCode: s.skuCode ?? null })) };
    }

    return this.prisma.product.create({
      data,
      include: { skus: true },
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的商品");

    const data: Prisma.ProductUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.intro !== undefined) data.intro = dto.intro;
    if (dto.detail !== undefined) data.detail = dto.detail;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: { skus: true },
    });
  }

  async deleteProduct(userId: string, productId: string, isAdmin = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (!isAdmin && product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的商品");
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  /** 更新商品状态 */
  async updateProductStatus(productId: string, status: string) {
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    return this.prisma.product.update({ where: { id: productId }, data: { status } });
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        circle: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    return product;
  }

  async listProducts(dto: ProductListQueryDto) {
    const { page = 1, pageSize = 20, categoryId, status, stationId } = dto;
    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (stationId) where.stationId = stationId;

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

  async addSku(userId: string, productId: string, dto: { specs: Record<string, string>; price: number; stock?: number; skuCode?: string }, isAdmin = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (!isAdmin && product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能给自己的商品添加SKU");
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

  async deleteSku(userId: string, skuId: string, isAdmin = false) {
    const sku = await this.prisma.productSku.findUnique({ where: { id: skuId }, include: { product: true } });
    if (!sku) throw new BusinessException(ErrorCode.NOT_FOUND, "SKU不存在");
    if (!isAdmin && sku.product.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己商品的SKU");
    await this.prisma.productSku.delete({ where: { id: skuId } });
    return { success: true };
  }

  // ═══════════════════ 订单管理 ═══════════════════

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 服务端计算实际金额，无视前端传入的 amount（防篡改）
    let actualAmount = 0;
    let supplierUserId: string | undefined;
    let supplierType: string | undefined;
    if (dto.type !== "MEMBER") {
      if (dto.skuId) {
        const sku = await this.prisma.productSku.findUnique({
          where: { id: dto.skuId },
          select: { price: true, product: { select: { id: true, status: true, supplierType: true, userId: true } } },
        });
        if (!sku || sku.product.status !== "ON_SALE") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        actualAmount = Number(sku.price);
        supplierType = sku.product.supplierType;
        supplierUserId = sku.product.userId ?? undefined;
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.targetId },
          select: { id: true, price: true, status: true, supplierType: true, userId: true },
        });
        if (!product || product.status !== "ON_SALE") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        actualAmount = Number(product.price);
        supplierType = product.supplierType;
        supplierUserId = product.userId ?? undefined;
      }
    }

    // 商家商品：查找商家ID
    let merchantId: string | undefined;
    if (supplierType === "CERTIFIED_MERCHANT" && supplierUserId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId: supplierUserId },
        select: { id: true },
      });
      merchantId = merchant?.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          type: dto.type as any,
          targetId: dto.targetId,
          skuId: dto.skuId,
          amount: actualAmount,
          couponId: dto.couponId,
          merchantId,
          referrerId: dto.referrerId,
          tempReferrerId: dto.tempReferrerId,
          status: "PENDING",
        },
      });

      // 扣减库存（非会员订单），带库存 > 0 约束防止超卖
      if (dto.type !== "MEMBER") {
        if (dto.skuId) {
          const skuResult = await tx.productSku.updateMany({
            where: { id: dto.skuId, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });
          if (skuResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "SKU库存不足");
        } else {
          const productResult = await tx.product.updateMany({
            where: { id: dto.targetId, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });
          if (productResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "商品库存不足");
        }
      }

      // 标记优惠券已使用
      if (dto.couponId) {
        await tx.userCoupon.update({
          where: { id: dto.couponId },
          data: { used: true, usedAt: new Date() },
        });
      }

      return order;
    });
  }

  async getOrder(orderId: string, userId?: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, nickname: true } },
      },
    });
    if (!order) throw new BusinessException(ErrorCode.NOT_FOUND, "订单不存在");
    if (!isAdmin && userId && order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的订单");
    return order;
  }

  async listOrders(dto: OrderListQueryDto) {
    const { page = 1, pageSize = 20, type, status, userId } = dto;
    const where: Prisma.OrderWhereInput = {};
    if (type) where.type = type as any;
    if (status) where.status = status as any;
    if (userId) where.userId = userId;

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

  /** 处理微信支付回调（统一入口） */
  async handlePaymentNotify(body: Record<string, unknown>) {
    const outTradeNo = body.out_trade_no as string;
    const lockKey = `pay:lock:${outTradeNo}`;

    // 分布式锁防并发重复处理
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`支付回调重复处理被拦截: ${outTradeNo}`);
      return;
    }

    try {
      const transactionId = body.transaction_id as string;

      // 解析 attach 判断业务类型
      let attach: Record<string, unknown> = {};
      try {
        attach = typeof body.attach === "string" ? JSON.parse(body.attach) : body.attach || {};
      } catch {
        attach = {};
      }

      // 虚拟币充值回调 → 转发给 CoinService
      if (attach.type === "COIN_RECHARGE" && this.coinSvc) {
        await this.coinSvc.handleRechargeCallback(body);
        return;
      }

      if (body.trade_state !== "SUCCESS") {
        this.logger.log(`支付未成功: ${outTradeNo}, 状态: ${body.trade_state}`);
        return;
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
        this.logger.error(`找不到对应的订单: ${outTradeNo}`);
        return;
      }

      // 只有 attach 提供了 orderId 才需要另外查询（已通过 payTransactionId 查到的直接复用）
      if (!order) {
        order = await this.prisma.order.findUnique({ where: { id: orderId } });
      }
      if (!order || order.status !== "PENDING") return;

      // 更新订单状态为已支付
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          payMethod: "WECHAT",
          paidAt: new Date(),
          payTransactionId: transactionId,
        },
      });

      // 分佣计算
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
          this.logger.error("分佣计算失败", e);
        }
      }

      // 会员订单处理
      if (order.type === "MEMBER") {
        const memberLevel = this.resolveMemberLevel(Number(order.amount));
        const expiresAt = this.calcMemberExpiry(memberLevel);
        await this.prisma.user.update({
          where: { id: order.userId },
          data: { memberLevel: memberLevel as MemberLevel, memberExpire: expiresAt },
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

      this.logger.log(`订单 ${orderId} 支付成功, 微信交易号: ${transactionId}`);
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
    await this.completePayment(outTradeNo, "ALIPAY", data.tradeNo as string, data.tradeStatus === "TRADE_SUCCESS");
  }

  /** 银联回调验签 */
  async verifyUnionpayNotify(params: Record<string, string>): Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }> {
    return this.unionpay.verifyNotify(params) as Promise<{ valid: boolean; data?: Record<string, unknown>; error?: string }>;
  }

  /** 处理银联回调 */
  async handleUnionpayNotify(data: Record<string, unknown>) {
    if (data.respCode !== "00") return;
    const outTradeNo = data.outTradeNo as string;
    await this.completePayment(outTradeNo, "UNIONPAY", data.tradeNo as string, true);
  }

  /** 统一支付完成处理（支付宝/银联） */
  private async completePayment(outTradeNo: string, payMethod: string, tradeNo: string, success: boolean) {
    if (!success) {
      this.logger.log(`支付未成功: ${outTradeNo}, 方式: ${payMethod}`);
      return;
    }

    const lockKey = `pay:lock:${outTradeNo}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
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

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          payMethod,
          paidAt: new Date(),
          payTransactionId: tradeNo,
        },
      });

      // 分佣
      if (this.commissionSvc) {
        try {
          await this.commissionSvc.calculateAndRecord(
            order.id, order.type, Number(order.amount),
            order.referrerId || undefined, order.tempReferrerId || undefined,
          );
        } catch (e) {
          this.logger.error("分佣计算失败", e);
        }
      }

      // 触发 Webhook
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
      await this.redis.del(lockKey);
    }
  }

  /** 支付宝订单查询 */
  async alipayQuery(outTradeNo: string) {
    return this.alipay.query(outTradeNo);
  }

  /** 支付宝退款 */
  async alipayRefund(params: { outTradeNo: string; refundAmount: number; outRefundNo: string; reason?: string }) {
    return this.alipay.refund(params);
  }

  /** 银联订单查询 */
  async unionpayQuery(outTradeNo: string) {
    return this.unionpay.query(outTradeNo);
  }

  /** 银联退款 */
  async unionpayRefund(params: { outTradeNo: string; outRefundNo: string; amount: number; origQryId?: string }) {
    return this.unionpay.refund(params);
  }

  /** 查询订单支付状态 */
  async queryPaymentStatus(orderId: string, userId?: string) {
    const order = await this.getOrder(orderId, userId);
    if (!order?.payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "订单无支付记录");

    const result = await this.wechatPay.queryOrder(order.payTransactionId);
    return { tradeState: result.trade_state, raw: result };
  }

  /** 申请退款 */
  async refundOrder(orderId: string, reason?: string) {
    // 分布式锁防并发重复退款
    const lockKey = `refund:lock:${orderId}`;
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "退款正在处理中，请勿重复操作");
    }

    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order || !["PAID", "SHIPPED", "COMPLETED"].includes(order.status)) {
        throw new BusinessException(ErrorCode.ORDER_REFUND_DENIED, "订单不可退款");
      }

      const totalFen = Math.round(Number(order.amount) * RMB_TO_FEN);
      const outRefundNo = `RF${Date.now()}${orderId.slice(0, 8)}`;

      const result = await this.wechatPay.refund({
        outTradeNo: order.payTransactionId || undefined,
        outRefundNo,
        amount: { refund: totalFen, total: totalFen },
        reason: reason || "用户申请退款",
      });

      if (result.status === "SUCCESS" || result.status === "PROCESSING") {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        this.webhook.fire("ORDER_REFUNDED", {
          orderId,
          amount: Number(order.amount),
          reason: reason || "用户申请退款",
        }).catch((err) => this.logger.warn("Webhook ORDER_REFUNDED 发送失败", err));
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
        await this.prisma.order.updateMany({
          where: { payTransactionId: outTradeNo, status: { not: "REFUNDED" } },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
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

  async shipOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PAID") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "订单不可发货");

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
  }

  /** 管理员手动确认支付（需提供实际支付流水号，防止伪造支付确认） */
  async adminPayOrder(orderId: string, payTransactionId: string, operatorId: string) {
    if (!payTransactionId) throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供支付流水号");
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅待支付订单可确认支付");

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), payTransactionId },
    });
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
    // 异步记录购买行为
    if (order) {
      this.prisma.userBehavior.create({ data: { userId: order.userId, targetType: order.type, targetId: order.targetId, behavior: "PURCHASE", weight: 5 } }).catch((e) => this.logger.warn("用户购买行为记录失败", e));
    }
    return updated;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    if (order.status !== "PENDING") throw new BusinessException(ErrorCode.ORDER_STATUS_INVALID, "仅待付款订单可取消");
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权取消");

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  }

  // ═══════════════════ 优惠券管理 ═══════════════════

  async createCoupon(dto: CreateCouponV2Dto) {
    const { type } = dto;
    // 根据类型自动填充 discountAmount/discountRate
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
    // 管理员查看全部，普通用户只看有效优惠券
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

  /** 更新优惠券（管理员） */
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

    return this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  }

  /** 删除优惠券（管理员） */
  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  /** 更新优惠券状态 */
  async updateCouponStatus(id: string, status: string) {
    await this.prisma.coupon.findUniqueOrThrow({ where: { id } });
    return this.prisma.coupon.update({ where: { id }, data: { status } });
  }

  /** 用户领取优惠券 */
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

      return tx.userCoupon.create({
        data: { userId, couponId },
      });
    });
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
  async listReviews(productId: string, page = 1, pageSize = 20) {
    const where = { productId, status: "PUBLISHED" };
    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return { reviews, total, page, pageSize };
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

  // ═══════════════════ 物流追踪 ═══════════════════

  /** 获取物流信息 */
  async getLogistics(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");

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
