import { Test } from "@nestjs/testing"
import { ShopPaymentService } from "./shop-payment.service"
import { ShopOrderService } from "./shop-order.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { CommissionService } from "../commission/commission.service"
import { WechatPayService } from "./wechat-pay.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { CoinService } from "../coin/coin.service"
import { WebhookService } from "../webhook/webhook.service"
import { MemberBenefitService } from "../member/member-benefit.service"
import { BusinessException } from "../../common/business.exception"
import {
  makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockCommission,
  makeMockWechatPay, makeMockAlipay, makeMockUnionpay, makeMockCoin, makeMockWebhook, makeMockMemberBenefit,
} from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockCommission = makeMockCommission()
const mockWechatPay = makeMockWechatPay()
const mockAlipay = makeMockAlipay()
const mockUnionpay = makeMockUnionpay()
const mockCoin = makeMockCoin()
const mockWebhook = makeMockWebhook()
const mockMemberBenefit = makeMockMemberBenefit()

describe("ShopPaymentService", () => {
  let svc: ShopPaymentService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopPaymentService,
        ShopOrderService,
        ShopAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: CommissionService, useValue: mockCommission },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: CoinService, useValue: mockCoin },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: MemberBenefitService, useValue: mockMemberBenefit },
      ],
    }).compile()
    svc = mod.get(ShopPaymentService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
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

    it("无商户证书时返回结构化错误（优雅 400 非 500）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockWechatPay.isConfigured = false
      try {
        await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("微信支付未配置")
        await expect(svc.createNativePayment("o1", "u1")).rejects.toMatchObject({ status: 400 })
      } finally {
        mockWechatPay.isConfigured = true
      }
    })
  })

  describe("createH5Payment", () => {
    const mockOrder = { id: "o1", userId: "u1", type: "PRODUCT", amount: "99", status: "PENDING" }

    it("创建 H5 支付成功（返回 mwebUrl）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })
      const result = await svc.createH5Payment("o1", "u1", "1.2.3.4")
      expect(result.mwebUrl).toBe("https://wx.tenpay.com/h5/pay/mock")
      // 微信 V3 场景信息按客户端 IP 传入
      expect(mockWechatPay.createH5Order).toHaveBeenCalledWith(expect.objectContaining({
        sceneInfo: expect.objectContaining({ payerClientIp: "1.2.3.4" }),
      }))
    })

    it("归属校验：别人的订单 403", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: "someone-else" })
      await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 403 })
    })

    it("状态校验：已支付订单 400", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: "PAID" })
      await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 400 })
    })

    it("订单不存在 404", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.createH5Payment("no", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 404 })
    })

    it("无商户证书时返回结构化 400（非 500 裸奔）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockWechatPay.isConfigured = false
      try {
        await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toThrow("微信支付未配置")
        await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 400 })
      } finally {
        mockWechatPay.isConfigured = true
      }
    })
  })
})
