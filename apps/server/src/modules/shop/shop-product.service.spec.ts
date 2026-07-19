import { Test } from "@nestjs/testing"
import { ShopProductService } from "./shop-product.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { AuditService } from "../audit/audit.service"
import { BusinessException } from "../../common/business.exception"
import { makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockAudit } from "./shop-test-mocks"
import { PUBLIC_QUARANTINED_IDS } from "../../common/public-content-quarantine"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockAudit = makeMockAudit()

describe("ShopProductService", () => {
  let svc: ShopProductService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopProductService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile()
    svc = mod.get(ShopProductService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

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

    // P0 状态过滤（商城收敛·断流止血）：C 端缺省只出在售，管理端 ALL 查全量，支持逗号多值
    it("不传 status 默认只查 ON_SALE（C 端防待审/下架曝光）", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      await svc.listProducts({ page: 1, pageSize: 10 })
      const arg = mockPrisma.product.findMany.mock.calls.at(-1)![0]
      expect(arg.where.status).toBe("ON_SALE")
      expect(arg.where.id).toEqual({ notIn: [...PUBLIC_QUARANTINED_IDS.product] })
    })

    it("status=ALL 查全量（管理端工作队列·不加状态过滤）", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      await svc.listProducts({ page: 1, pageSize: 10, status: "ALL" })
      const arg = mockPrisma.product.findMany.mock.calls.at(-1)![0]
      expect(arg.where.status).toBeUndefined()
      expect(arg.where.id).toBeUndefined()
    })

    it("status 逗号多值转 in 查询", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      await svc.listProducts({ page: 1, pageSize: 10, status: "PENDING,OFF_SHELF" })
      const arg = mockPrisma.product.findMany.mock.calls.at(-1)![0]
      expect(arg.where.status).toEqual({ in: ["PENDING", "OFF_SHELF"] })
    })

    it("显式单值 status 照常过滤", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      await svc.listProducts({ page: 1, pageSize: 10, status: "PENDING" })
      const arg = mockPrisma.product.findMany.mock.calls.at(-1)![0]
      expect(arg.where.status).toBe("PENDING")
    })

    // P2-4 分页入参加固：非法 page 归一化，防 skip:NaN 进 Prisma 抛 500
    it("非法 page(NaN) 归一化第1页·skip 不为 NaN", async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      await svc.listProducts({ page: "abc", pageSize: "xyz" } as any)
      const arg = mockPrisma.product.findMany.mock.calls.at(-1)![0]
      expect(Number.isNaN(arg.skip)).toBe(false)
      expect(arg.skip).toBe(0)
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
      expect(args.where).toEqual({
        id: { notIn: [...PUBLIC_QUARANTINED_IDS.product] },
        status: "ON_SALE",
        deletedAt: null,
        sceneTags: { has: "节气时令" },
      })
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

  describe("getStore", () => {
    it("店铺主页商品列表排除精确隔离商品", async () => {
      ;(mockPrisma.merchant as any).findFirst = jest.fn().mockResolvedValue({
        id: "merchant-1",
        userId: "merchant-user",
        shopName: "国学雅集",
        shopLogo: null,
        shopIntro: null,
        openedAt: new Date(),
        creditGrade: "B",
      })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.order.count.mockResolvedValue(0)
      ;(mockPrisma.productReview as any).aggregate = jest.fn().mockResolvedValue({ _avg: { rating: null }, _count: 0 })

      await svc.getStore("merchant-1")

      expect(mockPrisma.product.findMany.mock.calls.at(-1)![0].where.id).toEqual({
        notIn: [...PUBLIC_QUARANTINED_IDS.product],
      })
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

  describe("setProductCommissionRate（佣-V2-P1·admin-only）", () => {
    it("设置逐品佣金率成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      mockPrisma.product.update.mockResolvedValue({ id: "p1", title: "商品", commissionRate: 0.15 })
      const result = await svc.setProductCommissionRate("p1", 0.15)
      expect(result.commissionRate).toBe(0.15)
      expect(mockPrisma.product.update.mock.calls[0][0].data.commissionRate).toBe(0.15)
    })

    it("传 null 清除逐品配置回落类目默认", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      mockPrisma.product.update.mockResolvedValue({ id: "p1", title: "商品", commissionRate: null })
      await svc.setProductCommissionRate("p1", null)
      expect(mockPrisma.product.update.mock.calls[0][0].data.commissionRate).toBeNull()
    })

    it("商品不存在抛 BusinessException", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.setProductCommissionRate("no", 0.2)).rejects.toThrow(BusinessException)
    })
  })
})
