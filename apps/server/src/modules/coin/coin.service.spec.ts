import { Test } from "@nestjs/testing"
import { CoinService } from "./coin.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { WechatPayService } from "../shop/wechat-pay.service"
import { BusinessException } from "../../common/business.exception"

const mockWechatPay = {
  createNativeOrder: jest.fn().mockResolvedValue({ code_url: "weixin://wxpay/mock" }),
  createJsapiOrder: jest.fn().mockResolvedValue({ prepay_id: "mock-prepay" }),
  queryOrder: jest.fn().mockResolvedValue({ trade_state: "SUCCESS" }),
  closeOrder: jest.fn().mockResolvedValue({}),
  verifyNotify: jest.fn().mockResolvedValue({ event_type: "TRANSACTION.SUCCESS" }),
}

const mockPrisma: any = {
  virtualCoinAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  virtualCoinTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  virtualCoinRecharge: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  gift: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  giftRecord: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((arg: any): any => {
    if (typeof arg === "function") {
      const tx: Record<string, any> = {
        virtualCoinAccount: {
          findUnique: mockPrisma.virtualCoinAccount.findUnique,
          create: mockPrisma.virtualCoinAccount.create,
          update: mockPrisma.virtualCoinAccount.update,
          updateMany: mockPrisma.virtualCoinAccount.updateMany,
        },
        virtualCoinTransaction: {
          create: mockPrisma.virtualCoinTransaction.create,
          findMany: mockPrisma.virtualCoinTransaction.findMany,
          count: mockPrisma.virtualCoinTransaction.count,
        },
        virtualCoinRecharge: {
          create: mockPrisma.virtualCoinRecharge.create,
          findMany: mockPrisma.virtualCoinRecharge.findMany,
          count: mockPrisma.virtualCoinRecharge.count,
        },
        giftRecord: {
          create: mockPrisma.giftRecord.create,
          findMany: mockPrisma.giftRecord.findMany,
        },
      };
      return arg(tx);
    }
    return Promise.all(arg);
  }),
}

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn(),
}

describe("CoinService", () => {
  let svc: CoinService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CoinService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: WechatPayService, useValue: mockWechatPay },
      ],
    }).compile()
    svc = mod.get(CoinService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getOrCreateAccount", () => {
    it("已有账户直接返回", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 100 })
      const result = await svc.getOrCreateAccount("u1")
      expect(result.balance).toBe(100)
      expect(mockPrisma.virtualCoinAccount.create).not.toHaveBeenCalled()
    })

    it("无账户时自动创建", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue(null)
      mockPrisma.virtualCoinAccount.create.mockResolvedValue({ userId: "u1", balance: 0 })
      const result = await svc.getOrCreateAccount("u1")
      expect(result.balance).toBe(0)
    })
  })

  describe("getBalance", () => {
    it("返回余额信息", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 50, totalRecharged: 100, totalSpent: 50,
      })
      const result = await svc.getBalance("u1")
      expect(result.balance).toBe(50)
    })
  })

  describe("recharge", () => {
    it("充值成功（事务执行）", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 10 })
      mockPrisma.virtualCoinAccount.update.mockResolvedValue({ userId: "u1", balance: 60 })
      mockPrisma.virtualCoinRecharge.create.mockResolvedValue({ id: "r1" })
      mockPrisma.virtualCoinTransaction.create.mockResolvedValue({ id: "t1" })
      const result = await svc.recharge("u1", { amountCoin: 50 })
      expect(result.account.balance).toBe(60)
    })

    it("充值金额必须大于0", async () => {
      await expect(svc.recharge("u1", { amountCoin: 0 })).rejects.toThrow(BusinessException)
    })
  })

  describe("spend", () => {
    it("消费成功", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 100 })
      mockPrisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.virtualCoinTransaction.create.mockResolvedValue({ id: "t2" })
      const result = await svc.spend("u1", { amountCoin: 30, scene: "CIRCLE_JOIN" })
      expect(result.account.balance).toBe(100)
    })

    it("余额不足", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 10 })
      mockPrisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 0 })
      await expect(svc.spend("u1", { amountCoin: 50, scene: "CIRCLE_JOIN" })).rejects.toThrow(BusinessException)
    })

    it("消费金额必须大于0", async () => {
      await expect(svc.spend("u1", { amountCoin: 0, scene: "CIRCLE_JOIN" })).rejects.toThrow(BusinessException)
    })
  })

  describe("refund", () => {
    it("退款成功", async () => {
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 50 })
      mockPrisma.virtualCoinAccount.update.mockResolvedValue({ userId: "u1", balance: 80 })
      mockPrisma.virtualCoinTransaction.create.mockResolvedValue({ id: "t3" })
      const result = await svc.refund("u1", 30, "活动退款")
      expect(result.account.balance).toBe(80)
    })

    it("退款金额必须大于0", async () => {
      await expect(svc.refund("u1", 0, "x")).rejects.toThrow(BusinessException)
    })
  })

  describe("getTransactions", () => {
    it("分页返回流水", async () => {
      mockPrisma.virtualCoinTransaction.findMany.mockResolvedValue([{ id: "t1", type: "RECHARGE" }])
      mockPrisma.virtualCoinTransaction.count.mockResolvedValue(1)
      const result = await svc.getTransactions("u1", 1, 10)
      expect(result.total).toBe(1)
    })

    it("按类型过滤", async () => {
      mockPrisma.virtualCoinTransaction.findMany.mockResolvedValue([])
      mockPrisma.virtualCoinTransaction.count.mockResolvedValue(0)
      await svc.getTransactions("u1", 1, 10, "SPEND")
      expect(mockPrisma.virtualCoinTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", type: "SPEND" } }),
      )
    })
  })

  describe("getRechargeTiers", () => {
    it("返回充值档位", async () => {
      const tiers = await svc.getRechargeTiers()
      expect(tiers).toHaveLength(5)
      expect(tiers[0].amountRmb).toBe(6)
    })
  })

  describe("sendGift", () => {
    it("打赏成功", async () => {
      mockPrisma.gift.findUnique.mockResolvedValue({ id: "g1", name: "玫瑰", priceCoin: 5 })
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 100 })
      mockPrisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.virtualCoinTransaction.create.mockResolvedValue({ id: "gt" })
      mockPrisma.giftRecord.create.mockResolvedValue({ id: "gr1", totalCoin: 5 })
      const result = await svc.sendGift("u1", "room1", "host1", "g1", 1)
      expect(result.totalCoin).toBe(5)
    })

    it("礼物不存在", async () => {
      mockPrisma.gift.findUnique.mockResolvedValue(null)
      await expect(svc.sendGift("u1", "room1", "host1", "no", 1)).rejects.toThrow(BusinessException)
    })
  })
})
