import { Test } from "@nestjs/testing"
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service"
import { ShopOrderService } from "./shop-order.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { CommissionService } from "../commission/commission.service"
import { BusinessException } from "../../common/business.exception"
import { makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockCommission } from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockCommission = makeMockCommission()

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
})
