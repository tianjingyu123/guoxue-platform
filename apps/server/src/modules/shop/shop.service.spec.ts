import { Test } from "@nestjs/testing"
import { ShopService } from "./shop.service"
import { PrismaService } from "../../prisma/prisma.service"
import { CommissionService } from "../commission/commission.service"
import { WechatPayService } from "./wechat-pay.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { CoinService } from "../coin/coin.service"
import { WebhookService } from "../webhook/webhook.service"
import { RedisService } from "../../redis/redis.service"
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"

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
    delete: jest.fn(),
    count: jest.fn(),
  },
  productSku: {
    create: jest.fn(),
    delete: jest.fn(),
  },
  productReview: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
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
  },
  memberPurchase: {
    create: jest.fn(),
  },
}

const mockCommission = {
  calculateAndRecord: jest.fn().mockResolvedValue(undefined),
}

describe("ShopService", () => {
  let svc: ShopService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommissionService, useValue: mockCommission },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: RedisService, useValue: mockRedis },
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
      await expect(svc.getProduct("no")).rejects.toThrow(NotFoundException)
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
      await expect(svc.updateProduct("u1", "no", { title: "x" })).rejects.toThrow(NotFoundException)
    })
  })

  describe("deleteProduct", () => {
    it("删除成功", async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({ id: "p1" })
      const result = await svc.deleteProduct("p1")
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════ 订单管理 ═══════════════════

  describe("createOrder", () => {
    it("非会员订单验证商品失败", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "bad", amount: 99 }),
      ).rejects.toThrow(BadRequestException)
    })

    it("创建订单成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o1", status: "PENDING" })
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99 })
      expect(result.id).toBe("o1")
    })

    it("使用优惠券创建订单", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o2" })
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
      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow(BadRequestException)
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.createNativePayment("no", "u1")).rejects.toThrow(NotFoundException)
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
      await expect(svc.cancelOrder("o1", "u2")).rejects.toThrow(ForbiddenException)
    })

    it("已支付订单不可取消", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID" })
      await expect(svc.cancelOrder("o1", "u1")).rejects.toThrow(BadRequestException)
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
      await expect(svc.refundOrder("o1")).rejects.toThrow(BadRequestException)
    })
  })

  describe("getUserOrders", () => {
    it("返回用户订单列表", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1" }])
      mockPrisma.order.count.mockResolvedValue(1)
      const result = await svc.getUserOrders("u1")
      expect(result.total).toBe(1)
    })
  })

  // ═══════════════════ 优惠券管理 ═══════════════════

  describe("createCoupon", () => {
    it("创建满减优惠券", async () => {
      mockPrisma.coupon.create.mockResolvedValue({ id: "c1", type: "FULL_REDUCE", value: "10" })
      const result = await svc.createCoupon({
        type: "FULL_REDUCE", name: "满100减10", value: 10, minAmount: 100,
        validStart: "2026-01-01", validEnd: "2026-12-31",
      })
      expect(result.type).toBe("FULL_REDUCE")
    })
  })

  describe("claimCoupon", () => {
    const mockCoupon = { id: "c1", status: "ACTIVE", validEnd: new Date("2027-01-01"), totalCount: 100, usedCount: 0 }

    it("领取成功", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)
      mockPrisma.userCoupon.findFirst.mockResolvedValue(null)
      mockPrisma.coupon.update.mockResolvedValue({})
      mockPrisma.userCoupon.create.mockResolvedValue({ id: "uc1" })
      const result = await svc.claimCoupon("u1", "c1")
      expect(result.id).toBe("uc1")
    })

    it("优惠券已领完", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ ...mockCoupon, totalCount: 1, usedCount: 1 })
      await expect(svc.claimCoupon("u1", "c1")).rejects.toThrow(BadRequestException)
    })

    it("已领过不可重复领", async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon)
      mockPrisma.userCoupon.findFirst.mockResolvedValue({ id: "existing" })
      await expect(svc.claimCoupon("u1", "c1")).rejects.toThrow(BadRequestException)
    })
  })

  describe("getUserCoupons", () => {
    it("返回用户未使用的优惠券", async () => {
      mockPrisma.userCoupon.findMany.mockResolvedValue([{ id: "uc1", coupon: { id: "c1", type: "FULL_REDUCE" } }])
      const result = await svc.getUserCoupons("u1")
      expect(result).toHaveLength(1)
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
      await expect(svc.createReview("u1", "p1", { rating: 6, content: "x" })).rejects.toThrow(BadRequestException)
    })

    it("商品不存在", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.createReview("u1", "no", { rating: 4, content: "x" })).rejects.toThrow(NotFoundException)
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
    it("返回物流信息", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED" })
      mockPrisma.orderLogistics.findUnique.mockResolvedValue({ orderId: "o1", logisticsNo: "SF123" })
      const result = await svc.getLogistics("o1")
      expect(result.logistics?.logisticsNo).toBe("SF123")
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.getLogistics("no")).rejects.toThrow(NotFoundException)
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
      await expect(svc.updateLogistics("o1", { logisticsNo: "SF456" })).rejects.toThrow(BadRequestException)
    })
  })
})
