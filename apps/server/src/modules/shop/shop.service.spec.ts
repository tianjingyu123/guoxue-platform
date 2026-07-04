import { Test } from "@nestjs/testing"
import { ShopService } from "./shop.service"
import { PrismaService } from "../../prisma/prisma.service"
import { CommissionService } from "../commission/commission.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { PaymentProviderFactory } from "./payment-factory"
import { WechatPayService } from "./wechat-pay.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { CoinService } from "../coin/coin.service"
import { WebhookService } from "../webhook/webhook.service"
import { RedisService } from "../../redis/redis.service"
import { AuditService } from "../audit/audit.service"
import { MemberBenefitService } from "../member/member-benefit.service"
import { BusinessException } from "../../common/business.exception"

const mockWechatPay = {
  createNativeOrder: jest.fn().mockResolvedValue({ codeUrl: "weixin://wxpay/mock" }),
  createJsapiOrder: jest.fn().mockResolvedValue({ prepay_id: "mock-prepay" }),
  queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
  closeOrder: jest.fn().mockResolvedValue({}),
  refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
  verifyAndDecryptNotify: jest.fn().mockResolvedValue({ valid: true, data: { out_trade_no: "o1" } }),
}

const mockAlipay = {
  verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "o1", tradeStatus: "TRADE_SUCCESS" } }),
  query: jest.fn().mockResolvedValue({ alipay_trade_query_response: {} }),
  refund: jest.fn().mockResolvedValue("https://openapi.alipay.com/..."),
}

const mockUnionpay = {
  verifyNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "o1", respCode: "00" } }),
  query: jest.fn().mockResolvedValue({ respCode: "00" }),
  refund: jest.fn().mockResolvedValue({ respCode: "00" }),
}

const mockCoin = {
  getOrCreateAccount: jest.fn(),
  spend: jest.fn(),
  refund: jest.fn(),
}
const mockWebhook = { fire: jest.fn().mockResolvedValue(undefined) }
const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delByPattern: jest.fn().mockResolvedValue(undefined),
  setNX: jest.fn().mockResolvedValue(true),
}

const mockPrisma: any = {
  $transaction: jest.fn((arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(mockPrisma);
  }),
  $executeRaw: jest.fn().mockResolvedValue(1),
  product: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    delete: jest.fn(),
    count: jest.fn(),
  },
  productSku: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    delete: jest.fn(),
  },
  productReview: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
  },
  flashSaleItem: {
    findFirst: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  orderLogistics: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  coupon: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  userCoupon: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  user: {
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  configSystem: {
    findUnique: jest.fn(),
  },
  memberPurchase: {
    create: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  groupBuy: {
    findUnique: jest.fn(),
  },
  groupBuyParticipant: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
}

const mockCommission = {
  calculateAndRecord: jest.fn().mockResolvedValue(undefined),
  reverseCommission: jest.fn().mockResolvedValue({ reversed: true }),
}

const mockUnifiedPricing = {
  calculateEffectivePrice: jest.fn().mockResolvedValue({
    productId: "p1", effectivePrice: 99, originalPrice: 99,
    appliedPromotion: null, activePromotions: [], hasPromotion: false,
  }),
  batchCalculateEffectivePrice: jest.fn().mockResolvedValue([]),
  calculateFullReduction: jest.fn().mockResolvedValue({ reducedAmount: 99, reduction: 0 }),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  invalidateCacheByProduct: jest.fn().mockResolvedValue(undefined),
}

const mockPaymentFactory = {
  getProvider: jest.fn().mockReturnValue(mockWechatPay),
  refund: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
  queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
  isConfigured: jest.fn().mockReturnValue(true),
}

const mockHuifu = {
  createOrder: jest.fn().mockResolvedValue({ huifuId: "h1" }),
}

const mockMemberBenefit = {
  isActiveMember: jest.fn().mockResolvedValue(false),
  consumeAiQuota: jest.fn().mockResolvedValue({ isMember: false, remaining: 9 }),
  getAiQuota: jest.fn().mockResolvedValue({ isMember: false, dailyLimit: 10, usedToday: 0, remaining: 10 }),
  grantMonthlyBenefits: jest.fn().mockResolvedValue(true),
}

describe("ShopService", () => {
  let svc: ShopService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommissionService, useValue: mockCommission },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: RedisService, useValue: mockRedis },
        { provide: PaymentProviderFactory, useValue: mockPaymentFactory },
        { provide: "HuifuService", useValue: mockHuifu },
        { provide: CoinService, useValue: mockCoin },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: AuditService, useValue: { moderateTextOrThrow: jest.fn().mockResolvedValue(undefined) } },
        { provide: MemberBenefitService, useValue: mockMemberBenefit },
      ],
    }).compile()
    svc = mod.get(ShopService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ═══════════════════ 商品管理 ═══════════════════

  describe("createProduct", () => {
    it("创建商品成功", async () => {
      const dto = { title: "国学书籍", price: 99, stock: 10, detail: "详情" }
      mockPrisma.product.create.mockResolvedValue({ id: "p1", ...dto, skus: [] })
      const result = await svc.createProduct("u1", dto)
      expect(result.id).toBe("p1")
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: "国学书籍" }) }),
      )
    })

    it("创建带 SKU 的商品", async () => {
      const dto = { title: "T恤", price: 99, skus: [{ specs: { size: "L" }, price: 99, stock: 5 }] }
      mockPrisma.product.create.mockResolvedValue({ id: "p2" })
      await svc.createProduct("u1", dto)
      const callData = mockPrisma.product.create.mock.calls[0][0].data
      expect(callData.skus.create).toHaveLength(1)
    })
  })

  describe("getProduct", () => {
    it("返回商品含 SKU 和圈子信息", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", title: "书", skus: [], circle: null })
      const result = await svc.getProduct("p1")
      expect(result.id).toBe("p1")
    })

    it("商品不存在抛出 NotFoundException", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.getProduct("no")).rejects.toThrow(BusinessException)
    })
  })

  describe("listProducts", () => {
    it("分页返回商品列表", async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: "p1" }])
      mockPrisma.product.count.mockResolvedValue(1)
      const result = await svc.listProducts({ page: 1, pageSize: 10 })
      expect(result.total).toBe(1)
      expect(result.products).toHaveLength(1)
    })
  })

  describe("listProductsByScene（供-P1 场景取货）", () => {
    it("白名单校验：非法场景标签抛 BusinessException（不查库）", async () => {
      await expect(svc.listProductsByScene("开运化解")).rejects.toThrow(BusinessException)
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
    })

    it("在售+含标签·销量优先上架时间兜底·默认取 6", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: "p1", title: "冬至礼盒", intro: null, images: [], price: "199.00", originalPrice: null, salesCount: 88, sceneTags: ["节气时令"], createdAt: new Date() },
      ])
      const result = await svc.listProductsByScene("节气时令")
      expect(result).toHaveLength(1)
      expect(result[0].price).toBe(199)
      expect(result[0].originalPrice).toBe(199) // 无原价回落现价
      const args = mockPrisma.product.findMany.mock.calls[0][0]
      expect(args.where).toEqual({ status: "ON_SALE", deletedAt: null, sceneTags: { has: "节气时令" } })
      expect(args.orderBy).toEqual([{ salesCount: "desc" }, { createdAt: "desc" }])
      expect(args.take).toBe(6)
    })

    it("limit 归一化：非法值回落 6·超上限夹取 50", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      await svc.listProductsByScene("本命年", NaN)
      expect(mockPrisma.product.findMany.mock.calls[0][0].take).toBe(6)
      await svc.listProductsByScene("本命年", 999)
      expect(mockPrisma.product.findMany.mock.calls[1][0].take).toBe(50)
    })

    it("空态：无匹配商品返回空数组", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      const result = await svc.listProductsByScene("学业考试")
      expect(result).toEqual([])
    })
  })

  describe("updateProduct", () => {
    it("更新商品成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", userId: "u1" })
      mockPrisma.product.update.mockResolvedValue({ id: "p1", title: "新标题" })
      const result = await svc.updateProduct("u1", "p1", { title: "新标题" })
      expect(result.title).toBe("新标题")
    })

    it("商品不存在抛出 NotFoundException", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.updateProduct("u1", "no", { title: "x" })).rejects.toThrow(BusinessException)
    })

    it("场景打标即生效：sceneTags 持久化到 update data（供-P1）", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", userId: "u1" })
      mockPrisma.product.update.mockResolvedValue({ id: "p1", sceneTags: ["节气时令", "长辈寿诞"] })
      await svc.updateProduct("u1", "p1", { sceneTags: ["节气时令", "长辈寿诞"] } as any)
      expect(mockPrisma.product.update.mock.calls[0][0].data.sceneTags).toEqual(["节气时令", "长辈寿诞"])
    })
  })

  describe("deleteProduct", () => {
    it("删除成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", userId: "u1" })
      const result = await svc.deleteProduct("u1", "p1")
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════ 订单管理 ═══════════════════

  describe("createOrder", () => {
    it("非会员订单验证商品失败", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "bad", amount: 99 }),
      ).rejects.toThrow(BusinessException)
    })

    it("创建订单成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o1", status: "PENDING" })
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99 })
      expect(result.id).toBe("o1")
    })

    it("使用优惠券创建订单", async () => {
      const now = new Date()
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o2" })
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: "c1",
        userId: "u1",
        used: false,
        coupon: {
          status: "ACTIVE",
          type: "FULL_REDUCE",
          value: 10,
          discountAmount: 10,
          discountRate: null,
          minAmount: 0,
          validStart: new Date(now.getTime() - 86400000),
          validEnd: new Date(now.getTime() + 86400000),
          scope: "ALL",
          scopeId: null,
        },
      })
      // C-1：核销改条件更新 updateMany(used:false) 防并发双花
      mockPrisma.userCoupon.updateMany.mockResolvedValue({ count: 1 })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99, couponId: "c1" })
      expect(mockPrisma.userCoupon.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "c1", used: false }) }),
      )
    })
  })

  // ═══════════════════ 白标贺卡（供-P2） ═══════════════════

  describe("白标贺卡 giftCardMeta（供-P2）", () => {
    /** 常规实物订单基础 mock（无秒杀·无优惠券） */
    function setupProductOrder() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 99, originalPrice: 99,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-gift", status: "PENDING" })
    }

    it("归因单自动生成贺卡任务：fromName=归因者昵称·qrRef=其名片页链接（带归因 ref）", async () => {
      setupProductOrder()
      // resolveReferrerUserId 与 buildGiftCardMeta 共用 user.findUnique
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "王老师" })
      mockPrisma.configSystem.findUnique.mockResolvedValue(null) // 无配置行=默认开

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("ref1")
      expect(data.giftCardMeta).toEqual({
        fromName: "王老师",
        blessing: expect.any(String),
        qrRef: expect.stringContaining("/pkg-creator/teacher-profile/index?userId=ref1&ref=ref1"),
      })
    })

    it("无归因不生成：giftCardMeta 为 undefined 且不触碰全局开关配置", async () => {
      setupProductOrder()
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.giftCardMeta).toBeUndefined()
      expect(mockPrisma.configSystem.findUnique).not.toHaveBeenCalled()
    })

    it("全局开关关闭（shop.gift_card.enabled=false）：归因单也不生成贺卡", async () => {
      setupProductOrder()
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "王老师" })
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "false" })

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("ref1") // 归因照常保留，只是不附贺卡
      expect(data.giftCardMeta).toBeUndefined()
    })
  })

  describe("createNativePayment", () => {
    const mockOrder = { id: "o1", userId: "u1", type: "PRODUCT", amount: "99", status: "PENDING" }

    it("创建扫码支付成功", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })
      const result = await svc.createNativePayment("o1", "u1")
      expect(result.codeUrl).toBeDefined()
    })

    it("已支付订单不可重复支付", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: "PAID" })
      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow(BusinessException)
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.createNativePayment("no", "u1")).rejects.toThrow(BusinessException)
    })
  })

  describe("cancelOrder", () => {
    it("取消待付款订单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PENDING" })
      mockPrisma.order.update.mockResolvedValue({ id: "o1", status: "CANCELLED" })
      const result = await svc.cancelOrder("o1", "u1")
      expect(result.status).toBe("CANCELLED")
    })

    it("他人不可取消订单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PENDING" })
      await expect(svc.cancelOrder("o1", "u2")).rejects.toThrow(BusinessException)
    })

    it("已支付订单不可取消", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID" })
      await expect(svc.cancelOrder("o1", "u1")).rejects.toThrow(BusinessException)
    })

    it("取消多件订单按 quantity 恢复库存（修复只回 1 件的 bug）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PENDING", type: "PRODUCT", skuId: "sku1", quantity: 3 })
      await svc.cancelOrder("o1", "u1")
      // 旧逻辑硬编码 increment:1，多件订单库存丢失；修复后按下单数量恢复
      expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: { increment: 3 } } }),
      )
    })
  })

  // ═══════════════════ 秒杀资金链路（两道闸 + 回补） ═══════════════════

  describe("秒杀资金链路", () => {
    const flashPricing = {
      productId: "p1",
      effectivePrice: 9.9,
      originalPrice: 99,
      appliedPromotion: { type: "FLASH_SALE", id: "fs1", name: "秒杀", priority: 100, price: 9.9 },
      activePromotions: [],
      hasPromotion: true,
    }

    function setupFlashOrder(limitCount = 5) {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue(flashPricing)
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue({ id: "fi1", limitCount })
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { quantity: 0 } })
      mockPrisma.$executeRaw.mockResolvedValue(1)
      mockPrisma.order.create.mockResolvedValue({ id: "o-flash", status: "PENDING" })
    }

    it("秒杀正常成交：秒杀条目量与商品库存双扣", async () => {
      setupFlashOrder()
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 2 })
      expect(result.id).toBe("o-flash")
      // 闸2: 秒杀条目量原子扣减（raw 条件 UPDATE）
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
      // 原有商品库存 CAS 扣减不受影响（两道闸并存）
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1", stock: { gte: 2 } },
          data: { stock: { decrement: 2 } },
        }),
      )
      // 订单落库带活动标记与数量
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ promotionType: "FLASH_SALE", promotionId: "fs1", quantity: 2 }),
        }),
      )
    })

    it("秒杀条目量耗尽：拒绝下单且不创建订单", async () => {
      setupFlashOrder()
      mockPrisma.$executeRaw.mockResolvedValue(0) // sold + qty > stock，条件 UPDATE 影响 0 行
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 }),
      ).rejects.toThrow("秒杀商品已抢完")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("超出每人限购：拒绝下单且不扣秒杀量", async () => {
      setupFlashOrder(2)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { quantity: 2 } }) // 已买满 2 件
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 }),
      ).rejects.toThrow("超出每人限购 2 件")
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("limitCount=0 不限购：不统计历史订单直接成交", async () => {
      setupFlashOrder(0)
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 3 })
      expect(result.id).toBe("o-flash")
      expect(mockPrisma.order.aggregate).not.toHaveBeenCalled()
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
    })

    it("非秒杀订单：完全不触碰 FlashSaleItem", async () => {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 99, originalPrice: 99,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-normal", status: "PENDING" })
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-normal")
      expect(mockPrisma.flashSaleItem.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
      // 常规商品库存扣减照常执行
      expect(mockPrisma.product.updateMany).toHaveBeenCalled()
    })

    it("取消秒杀订单：回补 FlashSaleItem.sold", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PENDING", type: "PRODUCT",
        targetId: "p1", skuId: null, quantity: 2,
        promotionType: "FLASH_SALE", promotionId: "fs1",
      })
      mockPrisma.flashSaleItem.updateMany.mockResolvedValue({ count: 1 })
      await svc.cancelOrder("o1", "u1")
      expect(mockPrisma.flashSaleItem.updateMany).toHaveBeenCalledWith({
        where: { flashSaleId: "fs1", productId: "p1", sold: { gte: 2 } },
        data: { sold: { decrement: 2 } },
      })
    })

    it("取消回补防负数：sold 不足时归零兜底", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PENDING", type: "PRODUCT",
        targetId: "p1", skuId: null, quantity: 5,
        promotionType: "FLASH_SALE", promotionId: "fs1",
      })
      mockPrisma.flashSaleItem.updateMany
        .mockResolvedValueOnce({ count: 0 }) // sold < 5，带 gte 守卫的 decrement 未命中
        .mockResolvedValueOnce({ count: 1 })
      await svc.cancelOrder("o1", "u1")
      expect(mockPrisma.flashSaleItem.updateMany).toHaveBeenNthCalledWith(2, {
        where: { flashSaleId: "fs1", productId: "p1", sold: { gt: 0 } },
        data: { sold: 0 },
      })
    })

    it("取消非秒杀订单：不触碰 FlashSaleItem", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PENDING", type: "PRODUCT",
        targetId: "p1", skuId: null, quantity: 1,
        promotionType: null, promotionId: null,
      })
      await svc.cancelOrder("o1", "u1")
      expect(mockPrisma.flashSaleItem.updateMany).not.toHaveBeenCalled()
    })
  })

  describe("refundOrder", () => {
    it("已支付订单可退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID", amount: "99", payTransactionId: "txn1" })
      mockPrisma.order.update.mockResolvedValue({ id: "o1", status: "REFUNDED" })
      const result = await svc.refundOrder("o1")
      expect(result.status).toBe("SUCCESS")
    })

    it("待付款订单不可退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING" })
      await expect(svc.refundOrder("o1")).rejects.toThrow(BusinessException)
    })
  })

  describe("getUserOrders", () => {
    it("返回用户订单列表", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1" }])
      mockPrisma.order.count.mockResolvedValue(1)
      const result = await svc.getUserOrders("u1")
      expect(result.total).toBe(1)
    })

    it("传合法 status 时按状态过滤", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o2" }])
      mockPrisma.order.count.mockResolvedValue(1)
      await svc.getUserOrders("u1", 1, 20, "PAID")
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", status: "PAID" } }),
      )
    })

    it("传非法 status 时忽略过滤(回退全部)", async () => {
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.count.mockResolvedValue(0)
      await svc.getUserOrders("u1", 1, 20, "NOT_A_STATUS")
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } }),
      )
    })
  })

  // ═══════════════════ 商品评价 ═══════════════════

  describe("createReview", () => {
    it("创建评价成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      mockPrisma.productReview.create.mockResolvedValue({ id: "r1", rating: 5 })
      const result = await svc.createReview("u1", "p1", { rating: 5, content: "很好" })
      expect(result.rating).toBe(5)
    })

    it("评分超出范围", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      await expect(svc.createReview("u1", "p1", { rating: 6, content: "x" })).rejects.toThrow(BusinessException)
    })

    it("商品不存在", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.createReview("u1", "no", { rating: 4, content: "x" })).rejects.toThrow(BusinessException)
    })
  })

  describe("listReviews", () => {
    it("返回商品评价列表", async () => {
      mockPrisma.productReview.findMany.mockResolvedValue([{ id: "r1" }])
      mockPrisma.productReview.count.mockResolvedValue(1)
      const result = await svc.listReviews("p1")
      expect(result.total).toBe(1)
    })

    // 评分多维过滤下沉：列表 where 带 rating/images 过滤，stats 始终全量（tab 计数准确）
    describe("filter 评分多维过滤", () => {
      beforeEach(() => {
        mockPrisma.productReview.findMany.mockResolvedValue([]) // 空列表 → enrichReviews 提前返回，聚焦过滤逻辑
        mockPrisma.productReview.count.mockResolvedValue(0)
        mockPrisma.productReview.groupBy.mockResolvedValue([])
      })

      it("good=好评只过滤列表(rating>=4)，stats 不受筛选影响", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "good")
        const listWhere = mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where
        expect(listWhere.rating).toEqual({ gte: 4 })
        // stats(groupBy) 的 where 不带 rating，保证「全部/好评/中评/差评」tab 计数为全量
        const statsWhere = mockPrisma.productReview.groupBy.mock.calls.at(-1)![0].where
        expect(statsWhere.rating).toBeUndefined()
      })

      it("medium=中评(rating==3) / bad=差评(rating<=2)", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "medium")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.rating).toBe(3)
        await svc.listReviews("p1", 1, 20, undefined, "bad")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.rating).toEqual({ lte: 2 })
      })

      it("images=有图(images 非空)", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "images")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.images).toEqual({ isEmpty: false })
      })

      it("stats 返回全量 withImages 计数(供有图 tab)", async () => {
        mockPrisma.productReview.count.mockResolvedValue(7)
        const result = await svc.listReviews("p1")
        expect(result.stats.withImages).toBe(7)
      })
    })
  })

  // ═══════════════════ 物流追踪 ═══════════════════

  describe("getLogistics", () => {
    it("返回物流信息（本人订单）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED", userId: "u1" })
      mockPrisma.orderLogistics.findUnique.mockResolvedValue({ orderId: "o1", logisticsNo: "SF123" })
      const result = await svc.getLogistics("o1", "u1")
      expect(result.logistics?.logisticsNo).toBe("SF123")
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.getLogistics("no", "u1")).rejects.toThrow(BusinessException)
    })

    it("拒绝查看他人订单物流（防越权）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED", userId: "u1" })
      await expect(svc.getLogistics("o1", "u2")).rejects.toThrow(BusinessException)
    })
  })

  describe("退款金额校验 (C7)", () => {
    beforeEach(() => { jest.clearAllMocks() })

    it("支付宝退款超过订单实付额时拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await expect(svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 200, outRefundNo: "r1" })).rejects.toThrow(BusinessException)
      expect(mockAlipay.refund).not.toHaveBeenCalled()
    })

    it("支付宝退款金额合法时放行", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 50, outRefundNo: "r1" })
      expect(mockAlipay.refund).toHaveBeenCalled()
    })

    it("订单不存在时拒绝退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.alipayRefund({ outTradeNo: "NOPE", refundAmount: 50, outRefundNo: "r1" })).rejects.toThrow(BusinessException)
    })

    it("银联退款(分)超过实付额时拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await expect(svc.unionpayRefund({ outTradeNo: "GX1", outRefundNo: "r1", amount: 20000 })).rejects.toThrow(BusinessException)
      expect(mockUnionpay.refund).not.toHaveBeenCalled()
    })

    it("银联退款(分)合法时放行", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await svc.unionpayRefund({ outTradeNo: "GX1", outRefundNo: "r1", amount: 5000 })
      expect(mockUnionpay.refund).toHaveBeenCalled()
    })
  })

  describe("updateLogistics", () => {
    it("更新物流并自动发货", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" })
      mockPrisma.orderLogistics.upsert.mockResolvedValue({ orderId: "o1", logisticsNo: "SF456" })
      mockPrisma.order.update.mockResolvedValue({ status: "SHIPPED" })
      const result = await svc.updateLogistics("o1", { logisticsNo: "SF456" })
      expect(result.logisticsNo).toBe("SF456")
    })

    it("待付款订单不可更新物流", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING" })
      await expect(svc.updateLogistics("o1", { logisticsNo: "SF456" })).rejects.toThrow(BusinessException)
    })
  })

  describe("付费拼团状态机", () => {
    it("createGroupBuyOrder 用拼团价下单并标记 GROUP_BUY/groupId/PENDING", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", status: "ON_SALE", supplierType: "PLATFORM", userId: null })
      mockPrisma.order.create.mockResolvedValue({ id: "gbo1", amount: 279.3, status: "PENDING" })
      const order = await svc.createGroupBuyOrder("u1", { groupBuyId: "gb1", productId: "p1", groupPrice: 279.3, groupId: "g1" })
      expect(order.id).toBe("gbo1")
      const data = mockPrisma.order.create.mock.calls.at(-1)[0].data
      expect(data.amount).toBe(279.3)
      expect(data.promotionType).toBe("GROUP_BUY")
      expect(data.promotionId).toBe("gb1")
      expect(data.groupId).toBe("g1")
      expect(data.status).toBe("PENDING")
    })

    it("createGroupBuyOrder 下架商品不可下单", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", status: "OFF_SALE" })
      await expect(svc.createGroupBuyOrder("u1", { groupBuyId: "gb1", productId: "p1", groupPrice: 279.3, groupId: "g1" }))
        .rejects.toThrow(BusinessException)
    })

    it("settleGroupBuyIfNeeded 跳过非拼团订单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", promotionType: null })
      mockPrisma.groupBuyParticipant.create.mockClear()
      await svc.settleGroupBuyIfNeeded("o1")
      expect(mockPrisma.groupBuyParticipant.create).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 幂等：订单已有参与者则跳过", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o3", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue({ id: "existing" })
      mockPrisma.groupBuyParticipant.create.mockClear()
      await svc.settleGroupBuyIfNeeded("o3")
      expect(mockPrisma.groupBuyParticipant.create).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 未满员仅创建参与者(团长/WAITING)不成团", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null)
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", minMembers: 2 })
      mockPrisma.groupBuyParticipant.count.mockReset()
      mockPrisma.groupBuyParticipant.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1) // 现有0(团长) → 已付1(<2)
      mockPrisma.groupBuyParticipant.create.mockResolvedValue({ id: "part1" })
      mockPrisma.groupBuyParticipant.updateMany.mockClear()
      await svc.settleGroupBuyIfNeeded("o1")
      const cdata = mockPrisma.groupBuyParticipant.create.mock.calls.at(-1)[0].data
      expect(cdata.isLeader).toBe(true)
      expect(cdata.status).toBe("WAITING")
      expect(mockPrisma.groupBuyParticipant.updateMany).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 满员触发全组成团 SUCCESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o2", userId: "u2", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null)
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", minMembers: 2 })
      mockPrisma.groupBuyParticipant.count.mockReset()
      mockPrisma.groupBuyParticipant.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2) // 现有1(非团长) → 已付2(≥2)
      mockPrisma.groupBuyParticipant.create.mockResolvedValue({ id: "part2" })
      mockPrisma.groupBuyParticipant.updateMany.mockClear().mockResolvedValue({ count: 2 })
      await svc.settleGroupBuyIfNeeded("o2")
      expect(mockPrisma.groupBuyParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: "g1", status: "WAITING" }, data: { status: "SUCCESS" } }),
      )
    })
  })
})
