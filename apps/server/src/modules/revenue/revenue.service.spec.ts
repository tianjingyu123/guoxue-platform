import { Test } from "@nestjs/testing"
import { RevenueService } from "./revenue.service"
import { PrismaService } from "../../prisma/prisma.service"

const mockPrisma = {
  userEarning: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  settlementRule: {
    findUnique: jest.fn(),
  },
}

describe("RevenueService", () => {
  let svc: RevenueService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        RevenueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    svc = mod.get(RevenueService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("record", () => {
    it("规则表未配置时回退默认分佣比例", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null)
      mockPrisma.userEarning.create.mockResolvedValue({ id: "e1", amountRmb: 8 })
      const result = await svc.record({ userId: "u1", scene: "QUESTION", refId: "q1", amountCoin: 100 })
      expect(result.amountRmb).toBe(8)
      expect(mockPrisma.userEarning.create.mock.calls[0][0].data.rate).toBe(0.8)
    })

    it("优先读 SettlementRule 的 PROVIDER 比例", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({
        enabled: true,
        splits: [
          { role: "PROVIDER", rate: 0.65 },
          { role: "PLATFORM", rate: 0.35 },
        ],
      })
      mockPrisma.userEarning.create.mockResolvedValue({ id: "e3" })
      await svc.record({ userId: "u1", scene: "PEEK", refId: "p1", amountCoin: 100 })
      expect(mockPrisma.userEarning.create.mock.calls[0][0].data.rate).toBe(0.65)
    })

    it("使用自定义分佣比例（调用方显式传入优先于规则表）", async () => {
      mockPrisma.userEarning.create.mockResolvedValue({ id: "e2", amountRmb: 5 })
      const result = await svc.record({ userId: "u1", scene: "LIVE_GIFT", refId: "g1", amountCoin: 100, rate: 0.5 })
      expect(result.amountRmb).toBe(5)
      expect(mockPrisma.settlementRule.findUnique).not.toHaveBeenCalled()
    })
  })

  describe("getUserSummary", () => {
    it("返回用户收益汇总", async () => {
      mockPrisma.userEarning.aggregate.mockResolvedValue({
        _sum: { amountRmb: 80, amountCoin: 1000 },
        _count: 5,
      })
      mockPrisma.userEarning.groupBy.mockResolvedValue([
        { scene: "QUESTION", _sum: { amountRmb: 50 } },
        { scene: "LIVE_GIFT", _sum: { amountRmb: 30 } },
      ])
      const result = await svc.getUserSummary("u1")
      expect(result.totalRmb).toBe(80)
      expect(result.totalCoin).toBe(1000)
      expect(result.totalCount).toBe(5)
      expect(result.byScene).toHaveLength(2)
    })
  })

  describe("getUserEarnings", () => {
    it("分页返回收益明细", async () => {
      mockPrisma.userEarning.findMany.mockResolvedValue([{ id: "e1", amountRmb: 8 }])
      mockPrisma.userEarning.count.mockResolvedValue(1)
      const result = await svc.getUserEarnings("u1", 1, 10)
      expect(result.total).toBe(1)
      expect(result.earnings).toHaveLength(1)
    })
  })
})
