import { Injectable, Inject, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { isStocklessOrderType } from "./shop-order-types.constants";
import { RedisService } from "../../redis/redis.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { CommissionService } from "../commission/commission.service";
import { ShopAttributionService } from "./shop-attribution.service";
import { safePagination } from "../../common/pagination";
import { CreateOrderDto, OrderListQueryDto } from "./shop.dto";

/** 订单缓存 TTL */
const ORDER_CACHE_TTL = 300;
/** 订单列表缓存 TTL */
const ORDER_LIST_CACHE_TTL = 60;
/** 缓存前缀 */
const CACHE_PREFIX = "shop:";
/** 运营商档位白名单（对齐 schema enum OperatorLevel 与 CommissionConfig 的 operator_* 配置键） */
const OPERATOR_LEVELS = ["SILVER", "GOLD", "DIAMOND", "BLACK_GOLD"];
/**
 * 加盟费订单：B 端资格费，不是商品 → 不参与优惠券、不参与分销自购立减。
 * 站长/运营商本身就是分销角色，不排除会被自己的分销比例打折（实测 4999 → 3999.2）。
 */
const FRANCHISE_ORDER_TYPES = ["STATION_MASTER", "OPERATOR"];

interface FreightQuote {
  shippingFee: number;
  freightTemplateId: string | null;
  snapshot: Prisma.InputJsonValue;
}

/**
 * 商城订单-下单与查询域（从 shop.service 拆出·纯搬家不改逻辑）。
 * 职责：下单(含归因/秒杀/优惠券/自购立减)、拼团下单与成团结算、订单查询/列表补全。
 * 归因逻辑委托 ShopAttributionService；订单履约/取消见 ShopOrderLifecycleService。
 */
@Injectable()
export class ShopOrderService {
  private readonly logger = new Logger(ShopOrderService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private unifiedPricing: UnifiedPricingService,
    private attribution: ShopAttributionService,
    @Inject(CommissionService) private commissionSvc?: CommissionService,
  ) {}

  /**
   * 加盟费定价（分站年租/运营商档位）——真源 CommissionConfig.rateA，禁硬编码。
   * 沿用既有约定（同 withdrawal_min）：价格塞 rateA、名额塞 rateB。改价受 FundApproval 审批流保护。
   */
  private async resolveBillingPrice(configKey: string, label: string): Promise<number> {
    const cfg = await this.prisma.commissionConfig.findUnique({ where: { configKey } });
    const price = Number(cfg?.rateA ?? 0);
    if (!cfg || !(price > 0)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `${label}未配置价格，请联系管理员`);
    }
    return Math.round(price * 100) / 100;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 服务端计算实际金额，无视前端传入的 amount（防篡改）
    let actualAmount = 0;
    let promotionType: string | undefined;
    let promotionId: string | undefined;
    let supplierUserId: string | undefined;
    let supplierType: string | undefined;

    // 购买数量（仅实物 PRODUCT 生效；其他类型恒为 1，保持原行为不受影响）
    const qty = dto.type === "PRODUCT" ? Math.max(1, Math.floor(Number(dto.amount) || 1)) : 1;

    // 会员订单：从 MemberConfig 查询实际价格
    if (dto.type === "MEMBER") {
      const plan = await this.prisma.memberConfig.findUnique({ where: { id: dto.targetId } });
      if (!plan) throw new BusinessException(ErrorCode.BAD_REQUEST, "会员方案不存在");
      if (!plan.isActive) throw new BusinessException(ErrorCode.BAD_REQUEST, "该会员方案已停售");
      actualAmount = Number(plan.price);
    } else if (dto.type === "STATION_MASTER") {
      // 分站年租：targetId = stationId（须先 applyStation 建记录）。价格真源 CommissionConfig.rateA，禁硬编码。
      const station = await this.prisma.station.findUnique({
        where: { id: dto.targetId },
        select: { id: true, userId: true, status: true },
      });
      if (!station) throw new BusinessException(ErrorCode.STATION_NOT_FOUND, "分站不存在，请先提交开通申请");
      if (station.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能为自己的分站缴纳年租");
      if (station.status === "DISABLED") {
        throw new BusinessException(ErrorCode.FORBIDDEN, "分站已被平台停用，暂不可续费，请联系平台客服");
      }
      actualAmount = await this.resolveBillingPrice("station_master_price", "分站年租");
    } else if (dto.type === "PRACTITIONER_PRO") {
      // 从业者会员（工作台专业版）月付：价格真源 CommissionConfig.rateA，禁硬编码
      actualAmount = await this.resolveBillingPrice("practitioner_pro_monthly", "从业者会员");
    } else if (dto.type === "OPERATOR") {
      // 运营商开通/续期：targetId = 档位（SILVER/GOLD/DIAMOND/BLACK_GOLD）。价格真源 CommissionConfig.rateA。
      const level = String(dto.targetId || "").toUpperCase();
      if (!OPERATOR_LEVELS.includes(level)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "运营商档位不存在");
      }
      const existingOperator = await this.prisma.operator.findUnique({
        where: { userId },
        select: { id: true, status: true },
      });
      if (existingOperator?.status === "DISABLED") {
        throw new BusinessException(ErrorCode.FORBIDDEN, "运营商资格已被平台停用，暂不可续费，请联系平台客服");
      }
      actualAmount = await this.resolveBillingPrice(`operator_${level}`, "运营商档位");
    } else {
      const productId = dto.targetId;
      if (dto.skuId) {
        const sku = await this.prisma.productSku.findUnique({
          where: { id: dto.skuId },
          select: {
            price: true,
            productId: true,
            isActive: true,
            product: { select: { id: true, status: true, deletedAt: true, supplierType: true, userId: true } },
          },
        });
        if (
          !sku
          || !sku.isActive
          || sku.productId !== productId
          || sku.product.deletedAt
          || sku.product.status !== "ON_SALE"
        ) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        supplierType = sku.product.supplierType;
        supplierUserId = sku.product.userId ?? undefined;
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            price: true,
            status: true,
            deletedAt: true,
            supplierType: true,
            userId: true,
            skus: { where: { isActive: true }, take: 1, select: { id: true } },
          },
        });
        if (!product || product.deletedAt || product.status !== "ON_SALE") {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
        }
        if (product.skus?.length) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择商品规格后再购买");
        }
        supplierType = product.supplierType;
        supplierUserId = product.userId ?? undefined;
      }

      // 使用统一价格引擎计算活动价
      const pricing = await this.unifiedPricing.calculateEffectivePrice(
        productId, dto.skuId, userId, { pageId: (dto as any).pageId, scene: "checkout" },
      );
      // 金额 = 活动单价 × 数量（钱货严谨：多件按件计价，不可只算单件）
      actualAmount = Math.round(pricing.effectivePrice * qty * 100) / 100;
      if (pricing.appliedPromotion) {
        promotionType = pricing.appliedPromotion.type;
        promotionId = pricing.appliedPromotion.id;
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

    // 收货地址校验与快照（实物订单）：API 直调也必须有地址，不能只依赖前端页面拦截。
    if (dto.type === "PRODUCT" && !dto.addressId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "实物商品下单必须选择收货地址");
    }
    let shippingInfo: Record<string, string> | undefined;
    if (dto.addressId) {
      const addr = await this.prisma.shippingAddress.findFirst({
        where: { id: dto.addressId, userId },
        select: { name: true, phone: true, province: true, city: true, district: true, detail: true },
      });
      if (!addr) throw new BusinessException(ErrorCode.BAD_REQUEST, "收货地址不存在或不属于当前用户");
      shippingInfo = {
        name: addr.name, phone: addr.phone, province: addr.province,
        city: addr.city, district: addr.district, detail: addr.detail,
      };
    }
    const freightQuote: FreightQuote = dto.type === "PRODUCT"
      ? await this.quoteFreight(dto.targetId, shippingInfo?.province, actualAmount)
      : { shippingFee: 0, freightTemplateId: null, snapshot: { type: "NOT_APPLICABLE", shippingFee: 0 } };

    // 归因 + 分销自购立减解析（与 estimateOrder 共用同一实现，保证试算与实付一致）
    const {
      tempReferrerId, tempRefSubjectType, permanentReferrerId, effectiveReferrerId,
      selfPurchaseRate, sourceContentType, sourceContentId,
    } = await this.resolveAttribution(userId, dto);

    // ── 白标贺卡（供-P2）──
    // 实物订单归因到分销者时，自动组装贺卡任务 meta（从业者署名+祝语+名片二维码内容），
    // 供应商发货时打印随包裹放入——每个包裹都是从业者的获客物料，也是平台的归因入口。
    // 自购单（selfPurchaseRate>0 推荐关系会被清空）不生成；组装失败不阻塞下单。
    let giftCardMeta: Prisma.InputJsonValue | undefined;
    if (
      dto.type === "PRODUCT" &&
      selfPurchaseRate === 0 &&
      effectiveReferrerId &&
      effectiveReferrerId !== userId
    ) {
      giftCardMeta = (await this.attribution.buildGiftCardMeta(effectiveReferrerId)) ?? undefined;
    }

    // 加盟费（分站年租/运营商开通）是 B 端资格费，不是商品：不参与任何促销。
    // 尤其自购立减——站长本身是分销角色，不排除的话他买运营商资格会被自己的分销比例打折（实测 4999→3999.2，平台白丢 1000）。
    const isFranchiseFee = FRANCHISE_ORDER_TYPES.includes(dto.type);

    // 分站年租和运营商资格均属可续期服务：同用户/同标的下单串行化，只保留一张可支付订单。
    const recurringOrderLockKey = dto.type === "STATION_MASTER"
      ? "station-order:create:" + userId + ":" + dto.targetId
      : dto.type === "OPERATOR"
        ? "operator-order:create:" + userId + ":" + dto.targetId
        : null;
    if (recurringOrderLockKey) {
      const locked = await this.redis.setNX(recurringOrderLockKey, "1", 30);
      if (!locked) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付订单正在创建，请稍后重试");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.type === "STATION_MASTER" || dto.type === "OPERATOR") {
          // PostgreSQL 事务级锁是 Redis 降级/多实例场景的最终防线；事务结束自动释放。
          const dbLockName = (dto.type === "STATION_MASTER" ? "station-order:" : "operator-order:")
            + userId + ":" + dto.targetId;
          await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", dbLockName);
          const pending = await tx.order.findFirst({
            where: { userId, type: dto.type as any, targetId: dto.targetId, status: "PENDING" },
            orderBy: { createdAt: "desc" },
          });
          if (pending) return pending;
        }

        // 优惠券校验与折扣计算（服务端计算，防篡改；计算逻辑与 estimateOrder 共用同一实现）
        if (dto.couponId && !isFranchiseFee) {
          actualAmount = await this.applyCouponPricing(tx, userId, dto.couponId, dto.targetId, actualAmount);

          // 条件更新防并发双花：仅当券仍 used:false 才置为已用；两并发单只有一个 count>0
          const claimed = await tx.userCoupon.updateMany({
            where: { id: dto.couponId, userId, used: false },
            data: { used: true, usedAt: new Date() },
          });
          if (claimed.count === 0) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在或已被使用");
        }

        // 分销角色自购立减（供-P3 泛化）：在券后价基础上按直推佣金比例立减，并清空推荐关系（佣金天然不产生）
        let selfDiscount = 0;
        if (selfPurchaseRate > 0 && !isFranchiseFee) {
          selfDiscount = Math.round(actualAmount * selfPurchaseRate * 100) / 100;
          actualAmount = Math.max(0.01, Math.round((actualAmount - selfDiscount) * 100) / 100);
        }
        // 运费独立于商品优惠计算：优惠券/自购立减只抵商品，运费按下单前展示的同一模板快照计入实付。
        if (dto.type === "PRODUCT") {
          actualAmount = Math.round((actualAmount + freightQuote.shippingFee) * 100) / 100;
        }

        // ── 秒杀两道闸（每人限购 + 秒杀条目量原子扣减）──
        // FlashSaleItem 按 @@unique([flashSaleId, productId]) 唯一定位；
        // 与下方 Product/SKU 库存 CAS 扣减并存：两道闸都通过才成交。
        if (promotionType === "FLASH_SALE" && promotionId) {
          const flashItem = await tx.flashSaleItem.findFirst({
            where: { flashSaleId: promotionId, productId: dto.targetId },
            select: { id: true, limitCount: true },
          });
          if (!flashItem) {
            throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND, "秒杀商品不存在");
          }

          // 闸1: 每人限购（limitCount > 0 才限购）：统计该用户同活动有效订单（未取消/未退款）已购数量
          if (flashItem.limitCount > 0) {
            const bought = await tx.order.aggregate({
              where: {
                userId,
                promotionType: "FLASH_SALE",
                promotionId,
                targetId: dto.targetId,
                status: { notIn: ["CANCELLED", "REFUNDED"] },
              },
              _sum: { quantity: true },
            });
            const boughtQty = bought._sum.quantity ?? 0;
            if (boughtQty + qty > flashItem.limitCount) {
              throw new BusinessException(ErrorCode.BAD_REQUEST, `超出每人限购 ${flashItem.limitCount} 件`);
            }
          }

          // 闸2: 原子扣减秒杀条目量（Prisma 不支持列间比较，用条件 UPDATE：sold + qty <= stock 才成交）
          const flashDeducted = await tx.$executeRaw`
            UPDATE "FlashSaleItem"
            SET "sold" = "sold" + ${qty}, "updatedAt" = NOW()
            WHERE "id" = ${flashItem.id} AND "sold" + ${qty} <= "stock"
          `;
          if (flashDeducted === 0) {
            throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "秒杀商品已抢完");
          }
        }

        const order = await tx.order.create({
          data: {
            userId,
            type: dto.type as any,
            targetId: dto.targetId,
            skuId: dto.skuId,
            quantity: qty,
            amount: actualAmount,
            couponId: dto.couponId,
            promotionType,
            promotionId,
            merchantId,
            addressId: dto.addressId,
            shippingInfo: shippingInfo as any,
            shippingFee: freightQuote.shippingFee,
            freightTemplateId: freightQuote.freightTemplateId,
            freightSnapshot: freightQuote.snapshot,
            referrerId: selfDiscount > 0 ? null : permanentReferrerId,
            tempReferrerId: selfDiscount > 0 ? null : tempReferrerId,
            tempRefSubjectType: selfDiscount > 0 ? null : tempRefSubjectType, // 渠道主体类型（佣-V2-P2·分佣受益人路由依据·与推荐关系同生共灭）
            sourceContentType, // 内容来源（佣-V2-P3·纯记录·自购单也保留来源便于内容转化统计）
            sourceContentId,
            selfDiscount: selfDiscount > 0 ? selfDiscount : null,
            giftCardMeta: selfDiscount > 0 ? undefined : giftCardMeta, // 白标贺卡任务（供-P2·与推荐关系同生共灭）
            status: "PENDING",
          },
        });

        // 扣减库存（仅有库存概念的订单），带库存 >= 数量 约束防止超卖（按 qty 扣减，钱货严谨）。
        // 无库存概念的订单（会员/分站年租/运营商开通）targetId 不是商品ID，扣库存会匹配 0 行 → 误报「库存不足」。
        if (!isStocklessOrderType(dto.type)) {
          let beforeStock: number | null = null;
          let movementProductId = dto.targetId;
          if (dto.skuId) {
            const skuResult = await tx.productSku.updateMany({
              where: { id: dto.skuId, productId: dto.targetId, isActive: true, stock: { gte: qty } },
              data: { stock: { decrement: qty } },
            });
            if (skuResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "SKU库存不足");
            if (merchantId) {
              const skuAfter = await tx.productSku.findUnique({ where: { id: dto.skuId }, select: { stock: true, productId: true } });
              beforeStock = skuAfter ? skuAfter.stock + qty : null;
              movementProductId = skuAfter?.productId ?? dto.targetId;
            }
          } else {
            const productResult = await tx.product.updateMany({
              where: { id: dto.targetId, status: "ON_SALE", deletedAt: null, stock: { gte: qty } },
              data: { stock: { decrement: qty } },
            });
            if (productResult.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "商品库存不足");
            if (merchantId) {
              const productAfter = await tx.product.findUnique({ where: { id: dto.targetId }, select: { stock: true } });
              beforeStock = productAfter ? productAfter.stock + qty : null;
            }
          }
          if (merchantId && beforeStock !== null) {
            await tx.inventoryMovement.create({ data: {
              merchantId, productId: movementProductId, skuId: dto.skuId || null,
              type: "SALE_OUT", quantity: -qty, beforeStock, afterStock: beforeStock - qty,
              referenceType: "ORDER", referenceId: order.id, idempotencyKey: `order-sale:${order.id}`,
              operatorId: userId, reason: "商城订单创建扣减库存",
            } });
          }
        }

        return order;
      });
    } finally {
      if (recurringOrderLockKey) await this.redis.del(recurringOrderLockKey);
    }
  }

  /**
   * 归因与分销自购立减解析（createOrder / estimateOrder 共用同一实现，保证「试算=实付」）。
   * 逻辑原样自 createOrder 抽出（2026-07-11 商城收敛·行为零变化）：
   * 临时推荐人（分享链接 7 天窗口）→ 渠道点击归因（灰度开关）→ 直播圈主归因 → 永久归属分站 → 自购立减比例。
   */
  private async resolveAttribution(
    userId: string,
    dto: { targetId: string; type?: string; tempReferrerId?: string; sourceContentType?: string; sourceContentId?: string },
  ) {
    // ── 推荐归因（2026-07-02 拍板）──
    // 全平台单一分享链接（ref=分享者用户ID或分站推广码）：最近分享者=临时推荐人（前端7天窗口传入），
    // 优先于永久归属分站；永久归属由服务端从 ReferralRelation 回填，不信任前端传入的 referrerId。
    let tempReferrerId = await this.attribution.resolveReferrerUserId(dto.tempReferrerId, userId);
    // ── 佣-V2-P2 渠道主体临时链接归因（2026-07-04 拍板·设计 §3.2）──
    // 灰度开关 ConfigSystem[commission_v2_attribution]="true" 才启用（关=完全走上面现行逻辑·回滚路径）。
    // 服务端受信任来源：查 ChannelClick（该用户对该商品 targetId 精确优先，其次 SHOP_ALL 全店）
    // 未过期记录中 clickedAt 最新一条 → tempReferrerId=点击时解析好的渠道受益人（last-click 抢佣）；
    // 无命中 → 现行归因逻辑不变。查询失败不阻塞下单。
    let tempRefSubjectType: string | null = null;
    // ── 佣-V2-P3 内容来源（拍板规则6）：纯记录下单入口的内容场景（LIVE/ARTICLE/VIDEO·成对才落库·不改金额库存支付）
    let sourceContentType = dto.sourceContentType && dto.sourceContentId ? dto.sourceContentType : null;
    let sourceContentId = sourceContentType ? dto.sourceContentId ?? null : null;
    // 直播来源参与圈主分佣与直播经营统计，必须由服务端验证“商品确实在该直播间挂车”。
    // 对无效/过期来源只剥离归因，不阻断用户按正常商城价继续购买。
    if (sourceContentType === "LIVE") {
      const isValidLiveSource = dto.type === "PRODUCT"
        && !!sourceContentId
        && await this.attribution.isLiveProductSource(sourceContentId, dto.targetId);
      if (!isValidLiveSource) {
        this.logger.warn(`忽略无效直播商品来源: live=${sourceContentId || "-"}, product=${dto.targetId}`);
        sourceContentType = null;
        sourceContentId = null;
      }
    }
    try {
      if (await this.attribution.isChannelAttributionEnabled()) {
        const click = await this.attribution.findLatestChannelClick(userId, dto.targetId);
        if (click && click.beneficiaryUserId !== userId) {
          tempReferrerId = click.beneficiaryUserId;
          tempRefSubjectType = click.subjectType;
        }
        // ── 佣-V2-P3：直播间购买视同圈子渠道点击（设计§3.2-4·直播更接近成交，优先级不低于 ChannelClick 查询结果）。
        // 直播→LiveRoom.circleId→圈主为受益人；无圈子/圈主即买家本人 → 静默跳过不覆盖。
        // ARTICLE/VIDEO 本批只落来源字段不做受益人路由（作者渠道身份判定在 P4 积分侧统一处理）。
        if (sourceContentType === "LIVE" && sourceContentId) {
          const circleOwner = await this.attribution.resolveLiveCircleOwner(sourceContentId);
          if (circleOwner && circleOwner !== userId) {
            tempReferrerId = circleOwner;
            tempRefSubjectType = "CIRCLE";
          }
        }
      }
    } catch (e) {
      this.logger.warn("渠道点击归因查询失败，回落现行归因逻辑", e);
    }
    let permanentReferrerId: string | null = null;
    try {
      const relation = await this.prisma.referralRelation.findFirst({
        where: { userId, referrerType: "STATION_MASTER", relationStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { referrerId: true },
      });
      permanentReferrerId = relation?.referrerId ?? null;
    } catch {
      /* 归属查询失败不阻塞下单，按无永久归属处理 */
    }
    const effectiveReferrerId = tempReferrerId || permanentReferrerId;

    // 分销角色自购立减（2026-07-02 拍板站长版·供-P3 泛化到全部分销角色）：
    // 站长/圈主/驿站运营者/认证从业者/运营商本人购买（无推荐人或推荐人为本人）直接按直推佣金比例立减成交
    // （比例=CommissionConfig.rateA·后台可配），不产生佣金；退款按实付价退。杜绝自购返佣/刷单套利。
    let selfPurchaseRate = 0;
    if (this.commissionSvc && (!effectiveReferrerId || effectiveReferrerId === userId)) {
      try {
        if (await this.attribution.isDistributorSelfPurchaseEligible(userId)) {
          selfPurchaseRate = (await this.commissionSvc.getStationRate(dto.type ?? "PRODUCT")) ?? 0;
        }
      } catch (e) {
        this.logger.warn("分销角色自购立减查询失败，按原价下单", e);
      }
    }

    return { tempReferrerId, tempRefSubjectType, permanentReferrerId, effectiveReferrerId, selfPurchaseRate, sourceContentType, sourceContentId };
  }

  /**
   * 优惠券校验与折扣计算（createOrder 事务内 / estimateOrder 只读 共用；不做核销）。
   * 逻辑原样自 createOrder 抽出（行为零变化）：状态/有效期/适用范围/门槛校验 + FULL_REDUCE/NO_THRESHOLD/DISCOUNT 计算。
   */
  private async applyCouponPricing(
    db: Pick<Prisma.TransactionClient, "userCoupon">,
    userId: string,
    couponId: string,
    targetId: string,
    amount: number,
  ): Promise<number> {
    let actualAmount = amount;
    const userCoupon = await db.userCoupon.findFirst({
      where: { id: couponId, userId, used: false },
      include: { coupon: true },
    });
    if (!userCoupon) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不存在或已被使用");

    const coupon = userCoupon.coupon;
    if (coupon.status !== "ACTIVE") throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券已失效");
    const now = new Date();
    if (now < coupon.validStart) throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券尚未生效");
    if (now > coupon.validEnd) throw new BusinessException(ErrorCode.COUPON_EXPIRED, "优惠券已过期");
    if (coupon.scope === "PRODUCT" && coupon.scopeId && coupon.scopeId !== targetId) {
      throw new BusinessException(ErrorCode.COUPON_INVALID, "优惠券不适用于该商品");
    }
    if (coupon.minAmount && actualAmount < Number(coupon.minAmount)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不满足优惠券最低消费 ¥${Number(coupon.minAmount).toFixed(2)}`);
    }

    // 服务端计算优惠后金额
    if (coupon.type === "FULL_REDUCE" || coupon.type === "NO_THRESHOLD") {
      actualAmount = Math.max(0.01, actualAmount - Number(coupon.discountAmount || coupon.value || 0));
    } else if (coupon.type === "DISCOUNT") {
      const rate = Number(coupon.discountRate || (coupon.value ? Number(coupon.value) / 100 : 1));
      actualAmount = Math.max(0.01, actualAmount * rate);
    }
    return Math.round(actualAmount * 100) / 100;
  }

  /**
   * 订单试算（POST /shop/orders/estimate）——结算页价格明细预演，与 createOrder 完全同口径：
   * 活动单价×数量（统一定价引擎）→ 优惠券折扣（同一 applyCouponPricing，不核销）→ 分销自购立减（同一 resolveAttribution）。
   * 只读：不建单、不占券、不扣库存、不做秒杀限购/库存闸（那些在真实下单时拦截）。
   */
  async estimateOrder(userId: string, dto: { targetId: string; skuId?: string; quantity?: number; couponId?: string; tempReferrerId?: string; addressId?: string }) {
    const qty = Math.max(1, Math.floor(Number(dto.quantity) || 1));

    // 商品可购校验（与 createOrder 同口径）
    if (dto.skuId) {
      const sku = await this.prisma.productSku.findUnique({
        where: { id: dto.skuId },
        select: {
          productId: true,
          isActive: true,
          product: { select: { status: true, deletedAt: true } },
        },
      });
      if (!sku || !sku.isActive || sku.productId !== dto.targetId || sku.product.deletedAt || sku.product.status !== "ON_SALE") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
      }
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.targetId },
        select: {
          status: true,
          deletedAt: true,
          skus: { where: { isActive: true }, take: 1, select: { id: true } },
        },
      });
      if (!product || product.deletedAt || product.status !== "ON_SALE") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
      }
      if (product.skus?.length) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择商品规格后再购买");
      }
    }

    // 活动价（统一定价引擎·scene 与下单一致）
    const pricing = await this.unifiedPricing.calculateEffectivePrice(
      dto.targetId, dto.skuId, userId, { scene: "checkout" },
    );
    const goodsAmount = Math.round(pricing.effectivePrice * qty * 100) / 100;
    if (!dto.addressId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择收货地址后再核算运费");
    const address = await this.prisma.shippingAddress.findFirst({
      where: { id: dto.addressId, userId },
      select: { province: true },
    });
    if (!address) throw new BusinessException(ErrorCode.BAD_REQUEST, "收货地址不存在或不属于当前用户");
    const freightQuote = await this.quoteFreight(dto.targetId, address.province, goodsAmount);

    // 券后价（同一计算实现·只读不核销）
    let payableAmount = goodsAmount;
    if (dto.couponId) {
      payableAmount = await this.applyCouponPricing(this.prisma, userId, dto.couponId, dto.targetId, payableAmount);
    }
    const couponDiscount = Math.round((goodsAmount - payableAmount) * 100) / 100;

    // 分销自购立减（同一归因实现）
    const { selfPurchaseRate } = await this.resolveAttribution(userId, { targetId: dto.targetId, type: "PRODUCT", tempReferrerId: dto.tempReferrerId });
    let selfDiscount = 0;
    if (selfPurchaseRate > 0) {
      selfDiscount = Math.round(payableAmount * selfPurchaseRate * 100) / 100;
      payableAmount = Math.max(0.01, Math.round((payableAmount - selfDiscount) * 100) / 100);
    }
    payableAmount = Math.round((payableAmount + freightQuote.shippingFee) * 100) / 100;

    return {
      goodsAmount,
      shippingFee: freightQuote.shippingFee,
      freightTemplateId: freightQuote.freightTemplateId,
      couponDiscount,
      selfDiscount,
      selfDiscountRate: selfPurchaseRate,
      payableAmount,
      unitPrice: pricing.effectivePrice,
      quantity: qty,
      appliedPromotion: pricing.appliedPromotion ?? null,
    };
  }

  /** 运费唯一计算口径：商品绑定模板 + 收货省份 + 优惠前商品金额，试算与建单共用。 */
  private async quoteFreight(productId: string, province: string | undefined, goodsAmount: number): Promise<FreightQuote> {
    if (!province) throw new BusinessException(ErrorCode.BAD_REQUEST, "收货地址缺少省份，无法核算运费");
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        freightTemplateId: true,
        freightTemplate: {
          select: { id: true, name: true, type: true, defaultFee: true, conditionFree: true, regions: true, isActive: true },
        },
      },
    });
    if (!product) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
    if (!product.freightTemplateId) {
      return {
        shippingFee: 0,
        freightTemplateId: null,
        snapshot: { templateName: "平台包邮（未绑定模板）", type: "FREE", province, shippingFee: 0 },
      };
    }
    const template = product.freightTemplate;
    if (!template?.isActive) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品运费模板已停用，请联系商家处理后再下单");

    const regions = template.regions && typeof template.regions === "object" && !Array.isArray(template.regions)
      ? template.regions as Record<string, unknown>
      : {};
    const provinceSuffix = /(壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/u;
    const normalizedProvince = province.replace(provinceSuffix, "");
    const regionEntry = Object.entries(regions).find(([key]) => {
      const normalizedKey = key.replace(provinceSuffix, "");
      return key === province || normalizedKey === normalizedProvince;
    });
    const defaultFee = Math.max(0, Number(template.defaultFee));
    const regionFee = regionEntry && Number.isFinite(Number(regionEntry[1])) ? Math.max(0, Number(regionEntry[1])) : defaultFee;
    const condition = template.conditionFree && typeof template.conditionFree === "object"
      ? (Array.isArray(template.conditionFree) ? template.conditionFree[0] : template.conditionFree) as Record<string, unknown>
      : {};
    const freeThreshold = Math.max(0, Number(condition?.threshold ?? 0));
    const shippingFee = template.type === "FREE"
      ? 0
      : template.type === "CONDITIONAL" && freeThreshold > 0 && goodsAmount >= freeThreshold
        ? 0
        : regionFee;

    return {
      shippingFee: Math.round(shippingFee * 100) / 100,
      freightTemplateId: template.id,
      snapshot: {
        templateName: template.name,
        type: template.type,
        province,
        defaultFee,
        regionFee,
        freeThreshold: template.type === "CONDITIONAL" ? freeThreshold : null,
        goodsAmount,
        shippingFee: Math.round(shippingFee * 100) / 100,
      },
    };
  }

  /**
   * 创建拼团订单（付费拼团：用拼团价 groupPrice 下单，标记 promotionType=GROUP_BUY + groupId，扣库存）。
   * 由 marketing.joinGroupBuy 委托调用；支付成功后由 settleGroupBuyIfNeeded 创建参与者并判定成团。
   */
  async createGroupBuyOrder(userId: string, params: {
    groupBuyId: string; productId: string; skuId?: string; groupPrice: number; groupId: string;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: params.productId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        supplierType: true,
        userId: true,
        skus: { where: { isActive: true }, take: 1, select: { id: true } },
      },
    });
    if (!product || product.deletedAt || product.status !== "ON_SALE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "商品不可购买");
    }
    if (params.skuId) {
      const sku = await this.prisma.productSku.findUnique({
        where: { id: params.skuId },
        select: { productId: true, isActive: true },
      });
      if (!sku || !sku.isActive || sku.productId !== params.productId) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "商品规格不可购买");
      }
    } else if (product.skus?.length) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请选择商品规格后再购买");
    }
    let merchantId: string | undefined;
    if (product.supplierType === "CERTIFIED_MERCHANT" && product.userId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId: product.userId }, select: { id: true },
      });
      merchantId = merchant?.id;
    }
    const amount = Math.round(Number(params.groupPrice) * 100) / 100;
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId, type: "PRODUCT", targetId: params.productId, skuId: params.skuId,
          amount, promotionType: "GROUP_BUY", promotionId: params.groupBuyId,
          groupId: params.groupId, merchantId, status: "PENDING",
        },
      });
      if (params.skuId) {
        const r = await tx.productSku.updateMany({ where: { id: params.skuId, productId: params.productId, isActive: true, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
        if (r.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "SKU库存不足");
      } else {
        const r = await tx.product.updateMany({ where: { id: params.productId, status: "ON_SALE", deletedAt: null, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
        if (r.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "商品库存不足");
      }
      return order;
    });
  }

  /**
   * 拼团订单支付成功后结算：创建参与者(已付) + 判定成团（同团已付人数 ≥ minMembers → 全组 SUCCESS）。
   * 幂等（按 orderId 防重复创建）；并发安全（不同订单的参与者创建互不冲突，成团 updateMany 幂等）。
   */
  async settleGroupBuyIfNeeded(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.promotionType !== "GROUP_BUY" || !order.promotionId || !order.groupId) return;
    const exist = await this.prisma.groupBuyParticipant.findFirst({ where: { orderId } });
    if (exist) return; // 幂等：该订单已创建参与者
    const gb = await this.prisma.groupBuy.findUnique({ where: { id: order.promotionId } });
    if (!gb) return;
    const cnt = await this.prisma.groupBuyParticipant.count({ where: { groupId: order.groupId } });
    await this.prisma.groupBuyParticipant.create({
      data: {
        groupBuyId: order.promotionId, userId: order.userId, groupId: order.groupId,
        isLeader: cnt === 0, orderId: order.id, status: "WAITING",
      },
    });
    const paidCount = await this.prisma.groupBuyParticipant.count({
      where: { groupId: order.groupId, status: { in: ["WAITING", "SUCCESS"] } },
    });
    if (paidCount >= gb.minMembers) {
      await this.prisma.groupBuyParticipant.updateMany({
        where: { groupId: order.groupId, status: "WAITING" }, data: { status: "SUCCESS" },
      });
      this.logger.log(`拼团成团 groupId=${order.groupId} 人数=${paidCount}/${gb.minMembers}`);
    }
  }

  async getOrder(orderId: string, userId?: string, isAdmin = false) {
    const cacheKey = `${CACHE_PREFIX}order:${orderId}`;
    let order = await this.redis.getJson<any>(cacheKey);
    if (!order) {
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, nickname: true } },
        },
      });
      if (!order) throw new BusinessException(ErrorCode.NOT_FOUND, "订单不存在");
      await this.redis.setJson(cacheKey, order, ORDER_CACHE_TTL);
    }
    if (!isAdmin && userId && order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的订单");

    const [enriched] = await this.enrichOrders([order]);
    return enriched;
  }

  /**
   * 订单状态变更后清缓存 —— 详情缓存 + 该用户订单列表全部分页/状态组合缓存。
   * 支付回调入账（PENDING→PAID）后必须调用：否则 getOrder 命中旧 PENDING 缓存（TTL 300s），
   * 导致支付页轮询 getOrderPayState 永远读到未支付（不跳转）、订单详情显示「待付款」。
   * 列表 key 形如 userOrders:{uid}:{page}:{pageSize}:{status}，用 delByPattern 一次清净。
   */
  async invalidateOrderCache(orderId: string, userId?: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${CACHE_PREFIX}order:${orderId}`),
      this.redis.del(`${CACHE_PREFIX}pay:native:${orderId}`),
      userId ? this.redis.delByPattern(`${CACHE_PREFIX}userOrders:${userId}:*`) : Promise.resolve(),
    ]);
  }

  private readonly VALID_ORDER_STATUSES = new Set(["PENDING", "PAID", "SHIPPED", "COMPLETED", "REFUNDED", "CANCELLED"]);

  async listOrders(dto: OrderListQueryDto) {
    const { orderNo, type, status, userId, startDate, endDate } = dto;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize);
    const filterHash = createHash("sha1")
      .update(`${orderNo || ""}|${type || ""}|${status || ""}|${userId || ""}|${startDate || ""}|${endDate || ""}`)
      .digest("hex");
    const cacheKey = `${CACHE_PREFIX}orders:${page}:${pageSize}:${filterHash}`;

    // 简单查询走缓存
    const cached = !orderNo && !startDate && !endDate ? await this.redis.getJson<any>(cacheKey) : null;
    if (cached) return cached;

    const where: Prisma.OrderWhereInput = {};
    if (orderNo) where.id = { contains: orderNo };
    if (type) where.type = type as any;
    // status 支持逗号分隔多值（如 PAID,SHIPPED,COMPLETED —— 已收款口径统计需要，
    // 已发货/已完成同样是收了钱的单，只算 PAID 会漏计）。单值行为不变，非法值忽略。
    if (status) {
      const statuses = status.split(",").map(s => s.trim()).filter(s => this.VALID_ORDER_STATUSES.has(s));
      if (statuses.length === 1) where.status = statuses[0] as any;
      else if (statuses.length > 1) where.status = { in: statuses as any };
    }
    if (userId) where.userId = userId;
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate + "T00:00:00+08:00"),
        lte: new Date(endDate + "T23:59:59+08:00"),
      };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = { orders, total, page, pageSize };
    await this.redis.setJson(cacheKey, data, ORDER_LIST_CACHE_TTL);
    return data;
  }

  async getUserOrders(userId: string, rawPage = 1, rawPageSize = 20, status?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const safeStatus = status && this.VALID_ORDER_STATUSES.has(status) ? status : undefined;
    const cacheKey = `${CACHE_PREFIX}userOrders:${userId}:${page}:${pageSize}:${safeStatus || "all"}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.OrderWhereInput = { userId };
    if (safeStatus) where.status = safeStatus as any;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.order.count({ where }),
    ]);
    const data = { orders: await this.enrichOrders(orders), total, page, pageSize };
    await this.redis.setJson(cacheKey, data, ORDER_LIST_CACHE_TTL);
    return data;
  }

  /**
   * 批量补全订单的商品/SKU 信息，供 C 端订单列表与详情渲染。
   * 原 Order 行仅含 targetId/skuId，无商品名/封面/规格，前端无法展示。
   * 按 targetId join Product、skuId join ProductSku，附加 product/sku 字段（原字段全部透传，内部调用方不受影响）。
   */
  private async enrichOrders<T extends { targetId: string; skuId: string | null }>(orders: T[]) {
    if (orders.length === 0) return [] as (T & { product: any; sku: any })[];

    const productIds = [...new Set(orders.map(o => o.targetId).filter(Boolean))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, images: true, price: true },
        })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    const skuIds = orders.map(o => o.skuId).filter((s): s is string => !!s);
    const skus = skuIds.length
      ? await this.prisma.productSku.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, specs: true, price: true },
        })
      : [];
    const skuMap = new Map(skus.map(s => [s.id, s]));

    return orders.map(o => {
      const p = o.targetId ? productMap.get(o.targetId) : null;
      const sku = o.skuId ? skuMap.get(o.skuId) : null;
      const skuName = sku?.specs && typeof sku.specs === "object" && !Array.isArray(sku.specs)
        ? Object.values(sku.specs as Record<string, unknown>).filter(Boolean).join(" ") || null
        : null;
      return {
        ...o,
        product: p ? { id: p.id, title: p.title, cover: p.images?.[0] || null, price: Number(p.price) } : null,
        sku: sku ? { id: sku.id, skuName, price: Number(sku.price) } : null,
      };
    });
  }
}
