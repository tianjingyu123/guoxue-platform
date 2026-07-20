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

    beforeEach(() => {
      mockRedis.getJson.mockReset().mockResolvedValue(null)
      mockRedis.setJson.mockReset().mockResolvedValue(undefined)
      mockRedis.setNX.mockReset().mockResolvedValue(true)
      mockRedis.del.mockReset().mockResolvedValue(undefined)
      mockWechatPay.createNativeOrder.mockReset().mockResolvedValue({ codeUrl: "weixin://wxpay/mock" })
      mockWechatPay.closeOrder.mockReset().mockResolvedValue({})
      mockWechatPay.queryOrder.mockReset().mockResolvedValue({ trade_state: "NOTPAY" })
    })

    it("创建扫码支付成功", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })
      const result = await svc.createNativePayment("o1", "u1")
      expect(result.codeUrl).toBeDefined()
      expect(mockRedis.del).toHaveBeenCalledWith("shop:order:o1")
    })

    it("重复进入时复用已缓存付款码，不向微信再建一笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockRedis.getJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ codeUrl: "weixin://wxpay/existing", raw: { reused: true } })

      const result = await svc.createNativePayment("o1", "u1")

      expect(result.codeUrl).toBe("weixin://wxpay/existing")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
      expect(mockRedis.setNX).not.toHaveBeenCalled()
    })

    it("付款码缓存失效时先关闭旧微信订单，再生成新码", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })

      const result = await svc.createNativePayment("o1", "u1")

      expect(mockWechatPay.closeOrder).toHaveBeenCalledWith("GX-old")
      expect(mockWechatPay.createNativeOrder).toHaveBeenCalledTimes(1)
      expect(result.codeUrl).toBe("weixin://wxpay/mock")
    })

    it("付款码生成锁冲突时拒绝创建第二笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockRedis.setNX.mockResolvedValueOnce(false)

      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("付款码正在生成")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
    })

    it("旧微信订单无法安全关单时不创建第二笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockWechatPay.closeOrder.mockRejectedValueOnce(new Error("ORDERPAID"))
      mockWechatPay.queryOrder.mockResolvedValueOnce({ trade_state: "USERPAYING" })

      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("原付款正在处理中")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
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

  // ═══════════════════ 加盟费支付后处理（分站年租 / 运营商开通）═══════════════════

  /** 极简 fake tx：只提供两个处理器实际用到的表 */
  const makeTx = (over: any = {}) => ({
    configSystem: { findUnique: jest.fn().mockResolvedValue({ configValue: "12" }) },
    // SILVER 为唯一对外档位：¥4999 / 6 名额（1 自用 + 5 可售·对齐合规文案）
    commissionConfig: { findUnique: jest.fn().mockResolvedValue({ rateA: 4999, rateB: 6 }) },
    station: { findUnique: jest.fn(), update: jest.fn() },
    operator: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
    ...over,
  })

  /** 月差（四舍五入到整月），用于断言到期日叠加了正确的周期 */
  const monthsBetween = (from: Date, to: Date) =>
    Math.round(((to.getTime() - from.getTime()) / 86400000) / 30.44)

  describe("processStationMasterPaid（分站年租）", () => {
    it("首次缴费：PENDING → ACTIVE，到期日 = 当下 + 12 个月", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: null, status: "PENDING" })
      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(data.status).toBe("ACTIVE")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("续期不吞剩余天数：未到期时从原到期日起算叠加", async () => {
      const tx = makeTx()
      // 还剩 6 个月到期 → 续费后应为 6 + 12 = 18 个月后
      const remaining = new Date()
      remaining.setMonth(remaining.getMonth() + 6)
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: remaining, status: "ACTIVE" })

      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(monthsBetween(new Date(), data.expireAt)).toBe(18)
    })

    it("支付回调遇到平台停用态只顺延有效期，不解除 DISABLED", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: null, status: "DISABLED" })

      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(data.status).toBe("DISABLED")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("分站不存在：记录错误但不抛（不阻断已成功的支付记账）", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue(null)
      await expect(
        (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "gone" }, tx),
      ).resolves.toBeUndefined()
      expect(tx.station.update).not.toHaveBeenCalled()
    })
  })

  describe("processOperatorPaid（运营商开通）", () => {
    it("首次开通：按档位建号，名额取 rateB，mgmtRate 留空以走 channelType 默认", async () => {
      const tx = makeTx()
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.create.mock.calls[0][0].data
      expect(data.level).toBe("SILVER")
      expect(data.containQuota).toBe(6) // 1 自用 + 5 可售
      expect(data.channelType).toBe("ONLINE")
      expect(data.status).toBe("ACTIVE")
      // 关键：不得写入 mgmtRate（seed 里的 rateC 是已废止的旧分级费率，读它会与现行口径打架）
      expect(data.mgmtRate).toBeUndefined()
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("等级只升不降：已是 DIAMOND 再买 SILVER，仍保持 DIAMOND 且名额取大者", async () => {
      const tx = makeTx()
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "DIAMOND", containQuota: 100, expireAt: null,
      })
      // 买的是 SILVER（rateA=4999 / rateB=10）
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.level).toBe("DIAMOND")
      expect(data.containQuota).toBe(100)
    })

    it("升档：已是 SILVER 再买 DIAMOND，升为 DIAMOND 并提升名额", async () => {
      const tx = makeTx({
        commissionConfig: { findUnique: jest.fn().mockResolvedValue({ rateA: 19999, rateB: 100 }) },
      })
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "SILVER", containQuota: 6, expireAt: null,
      })
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "DIAMOND" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.level).toBe("DIAMOND")
      expect(data.containQuota).toBe(100)
    })

    it("非法档位：不建号，记录错误后返回", async () => {
      const tx = makeTx()
      await expect(
        (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "PLATINUM" }, tx),
      ).resolves.toBeUndefined()
      expect(tx.operator.create).not.toHaveBeenCalled()
      expect(tx.operator.update).not.toHaveBeenCalled()
    })
  })
})
