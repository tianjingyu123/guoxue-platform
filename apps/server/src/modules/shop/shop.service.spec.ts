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
  },
  user: {
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
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
}

const mockHuifu = {
  createOrder: jest.fn().mockResolvedValue({ huifuId: "h1" }),
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
      mockPrisma.userCoupon.update.mockResolvedValue({})
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99, couponId: "c1" })
      expect(mockPrisma.userCoupon.update).toHaveBeenCalled()
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
