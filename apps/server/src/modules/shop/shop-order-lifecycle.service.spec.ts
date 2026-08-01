import { Test } from "@nestjs/testing"
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service"
import { ShopOrderService } from "./shop-order.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { CommissionService } from "../commission/commission.service"
import { ShopPaymentService } from "./shop-payment.service"
import { BusinessException } from "../../common/business.exception"
import { makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockCommission } from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockCommission = makeMockCommission()
// adminPayOrder 现在会在事务内跑支付后处理器（会员开通/分站激活/运营商建号）
const mockPayment = {
  runPaidPostProcessors: jest.fn(),
  emitOrderPaidEvent: jest.fn(),
}

describe("ShopOrderLifecycleService", () => {
  let svc: ShopOrderLifecycleService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopOrderLifecycleService,
        ShopOrderService,
        ShopAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: CommissionService, useValue: mockCommission },
        { provide: ShopPaymentService, useValue: mockPayment },
      ],
    }).compile()
    svc = mod.get(ShopOrderLifecycleService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
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

  // ═══════════════════ 秒杀资金链路（取消回补侧） ═══════════════════

  describe("秒杀资金链路（取消回补）", () => {
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

  // 端到端实测抓到的 bug：adminPayOrder 此前绕过 paidPostProcessors，
  // 导致线下确认收款的订单「变 PAID 但权益不开通」（会员不开通/分站不激活/运营商不建号）= 钱收了货不发。
  // B 端加盟费的线下转账正是主要付款路径，此处必须锁死。
  describe("adminPayOrder（线下确认收款）", () => {
    it("确认收款后必须触发支付后处理器（否则钱收了货不发）", async () => {
      const order = { id: "o9", type: "STATION_MASTER", userId: "u1", targetId: "st1", amount: 999, status: "PENDING" }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })

      await svc.adminPayOrder("o9", "TX-001", "admin")

      expect(mockPayment.runPaidPostProcessors).toHaveBeenCalledWith(order, expect.anything())
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "o9", status: "PENDING" },
        data: expect.objectContaining({
          status: "PAID",
          payMethod: "MANUAL",
          payTransactionId: "TX-001",
        }),
      })
      expect(mockPayment.emitOrderPaidEvent).toHaveBeenCalledWith(order, "o9", "MANUAL", "TX-001")
    })

    it("CAS 落空（并发重复确认）：不跑后处理器，防重复开通", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o9", type: "MEMBER", userId: "u1", status: "PENDING" })
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 })

      await expect(svc.adminPayOrder("o9", "TX-002", "admin")).rejects.toThrow(BusinessException)
      expect(mockPayment.runPaidPostProcessors).not.toHaveBeenCalled()
      expect(mockPayment.emitOrderPaidEvent).not.toHaveBeenCalled()
    })

    it("非待支付订单：直接拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o9", type: "MEMBER", status: "PAID" })
      await expect(svc.adminPayOrder("o9", "TX-003", "admin")).rejects.toThrow("仅待支付订单可确认支付")
      expect(mockPayment.runPaidPostProcessors).not.toHaveBeenCalled()
    })

    it("同一人工流水重试：补齐支付事件但不重复翻状态或开通权益", async () => {
      const order = {
        id: "o9", type: "MEMBER", userId: "u1", amount: 299,
        status: "PAID", payMethod: "MANUAL", payTransactionId: "TX-REPLAY",
      }
      mockPrisma.order.findUnique.mockResolvedValue(order)

      const result = await svc.adminPayOrder("o9", "TX-REPLAY", "admin")

      expect(result).toEqual(expect.objectContaining({ success: true, replayed: true }))
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPayment.runPaidPostProcessors).not.toHaveBeenCalled()
      expect(mockPayment.emitOrderPaidEvent).toHaveBeenCalledWith(order, "o9", "MANUAL", "TX-REPLAY")
    })

    it("缺流水号：拒绝（资金操作须可追溯）", async () => {
      await expect(svc.adminPayOrder("o9", "", "admin")).rejects.toThrow("必须提供支付流水号")
    })
  })
})
