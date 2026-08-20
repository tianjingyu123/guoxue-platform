import { Test } from "@nestjs/testing"
import { CoinService } from "./coin.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { WechatPayService } from "../shop/wechat-pay.service"
import { BusinessException } from "../../common/business.exception"
import { ImService } from "../im/im.service"

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
    findUnique: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  liveGiftSpendingPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  liveRoom: {
    findUnique: jest.fn(),
  },
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
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
          findUnique: mockPrisma.giftRecord.findUnique,
          findMany: mockPrisma.giftRecord.findMany,
          aggregate: mockPrisma.giftRecord.aggregate,
        },
        user: mockPrisma.user,
        liveGiftSpendingPreference: mockPrisma.liveGiftSpendingPreference,
        $executeRawUnsafe: mockPrisma.$executeRawUnsafe,
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

const mockIm = {
  sendGroupMsg: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
  relayLiveGroupMsg: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
  relayLiveGift: jest.fn().mockResolvedValue({ ActionStatus: "OK", ErrorCode: 0 }),
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
        { provide: ImService, useValue: mockIm },
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
    it("返回充值档位（董事长拍板 2026-07-10：100/200/500 三档+自定义）", async () => {
      const tiers = await svc.getRechargeTiers()
      expect(tiers).toHaveLength(3)
      expect(tiers[0].amountRmb).toBe(100)
      expect(tiers[0].amountCoin).toBe(1000)
    })
  })

  describe("handleRechargeCallback — 赠币只加币不加价（反向收费修复）", () => {
    beforeEach(() => {
      (mockPrisma.virtualCoinRecharge as any).findUnique = jest.fn().mockResolvedValue(null);
      (mockPrisma.virtualCoinRecharge as any).update = jest.fn().mockResolvedValue({});
      (mockRedis as any).setNX = jest.fn().mockResolvedValue(true);
      (mockRedis as any).del = jest.fn().mockResolvedValue(undefined);
    });

    it("实付按基础币核对通过，到账=基础币+档位赠币（用户不为赠币多付）", async () => {
      jest.spyOn(svc as any, "getRechargeTiers").mockResolvedValue([{ amountRmb: 100, amountCoin: 1000, bonus: 50 }]);
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);
      const handled = await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({ type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000 }),
        amount: { total: 10000 }, // 实付 100 元（分）= 基础币 1000 / 汇率 10
        out_trade_no: "RC12345671",
      });
      expect(handled).toBe(true);
      expect(rechargeSpy).toHaveBeenCalled();
      expect(rechargeSpy.mock.calls[0][1].amountCoin).toBe(1050); // 到账含 50 赠币
      expect(rechargeSpy.mock.calls[0][1].amountRmb).toBe(100); // 落账人民币只记真实实付，不含赠币
    });

    it("渠道实付与基础币应付不符时拒绝入账（不给币）", async () => {
      jest.spyOn(svc as any, "getRechargeTiers").mockResolvedValue([{ amountRmb: 100, amountCoin: 1000, bonus: 50 }]);
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);
      const handled = await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({ type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000 }),
        amount: { total: 10500 }, // 实付 105 ≠ 应付 100（基础币口径）
        out_trade_no: "RC12345672",
      });
      expect(handled).toBe(false);
      expect(rechargeSpy).not.toHaveBeenCalled();
    });

    it("渠道回调缺少实付金额时拒绝入账（不能只凭 attach 给币）", async () => {
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);
      const handled = await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({ type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 10000 }),
        out_trade_no: "RC12345678",
      });
      expect(handled).toBe(false);
      expect(rechargeSpy).not.toHaveBeenCalled();
    });

    it("下单后汇率变化仍按签名回调中的应付分快照入账", async () => {
      jest.spyOn(svc, "getCoinRate").mockResolvedValueOnce(20); // 当前已变为 20币/元
      jest.spyOn(svc as any, "getRechargeTiers").mockResolvedValue([]);
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);
      await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({
          type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 10000, bonusCoin: 50,
        }),
        amount: { total: 10000 },
        out_trade_no: "RC12345673",
      });
      expect(rechargeSpy).toHaveBeenCalledWith("u1", expect.objectContaining({
        amountCoin: 1050,
        amountRmb: 100,
      }));
    });

    it("并发锁冲突时返回未处理，让微信重投而不是误报到账成功", async () => {
      (mockRedis as any).setNX.mockResolvedValueOnce(false);
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);

      const handled = await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({
          type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 10000,
        }),
        amount: { total: 10000 },
        out_trade_no: "RC12345674",
      });

      expect(handled).toBe(false);
      expect(rechargeSpy).not.toHaveBeenCalled();
    });

    it("已入账的渠道重投返回成功，不重复加币", async () => {
      (mockPrisma.virtualCoinRecharge as any).findUnique.mockResolvedValueOnce({ status: "PAID" });
      const rechargeSpy = jest.spyOn(svc, "recharge").mockResolvedValue({} as any);

      const handled = await svc.handleRechargeCallback({
        trade_state: "SUCCESS",
        attach: JSON.stringify({
          type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 10000,
        }),
        amount: { total: 10000 },
        out_trade_no: "RC12345675",
      });

      expect(handled).toBe(true);
      expect(rechargeSpy).not.toHaveBeenCalled();
    });
  });

  describe("直播送礼消费保护", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        identityVerified: true,
        birthday: new Date("1990-01-01T00:00:00.000Z"),
      })
      mockPrisma.liveGiftSpendingPreference.findUnique.mockResolvedValue({
        userId: "u1",
        singleLimitCoin: 100,
        dailyLimitCoin: 500,
        reminderEnabled: true,
      })
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 80 } })
    })

    it("返回脱敏后的年龄资格、限额与当日消费", async () => {
      const result = await svc.getLiveGiftSpendingPreference("u1")
      expect(result).toEqual(expect.objectContaining({
        configured: true,
        eligible: true,
        singleLimitCoin: 100,
        dailyLimitCoin: 500,
        spentTodayCoin: 80,
        reminderEnabled: true,
      }))
      expect(result).not.toHaveProperty("birthday")
    })

    it("首次设置默认开启消费提醒", async () => {
      mockPrisma.liveGiftSpendingPreference.upsert.mockResolvedValue({})
      jest.spyOn(svc, "getLiveGiftSpendingPreference").mockResolvedValueOnce({ configured: true } as any)
      await svc.updateLiveGiftSpendingPreference("u1", { singleLimitCoin: 50, dailyLimitCoin: 200 })
      expect(mockPrisma.liveGiftSpendingPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ reminderEnabled: true }),
        update: expect.objectContaining({ reminderEnabled: true }),
      }))
    })

    it("拒绝未成年人、未设置限额及超限送礼", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        identityVerified: true,
        birthday: new Date(),
      })
      await expect(svc.assertLiveGiftSpendAllowed("u1", 5)).rejects.toThrow("未成年人禁止")

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        identityVerified: true,
        birthday: new Date("1990-01-01T00:00:00.000Z"),
      })
      mockPrisma.liveGiftSpendingPreference.findUnique.mockResolvedValueOnce(null)
      await expect(svc.assertLiveGiftSpendAllowed("u1", 5)).rejects.toThrow("请先设置")

      await expect(svc.assertLiveGiftSpendAllowed("u1", 101)).rejects.toThrow("单次限额")
      mockPrisma.giftRecord.aggregate.mockResolvedValueOnce({ _sum: { totalCoin: 480 } })
      await expect(svc.assertLiveGiftSpendAllowed("u1", 30)).rejects.toThrow("日累计限额")
    })
  })

  describe("sendGift", () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        identityVerified: true,
        birthday: new Date("1990-01-01T00:00:00.000Z"),
      })
      mockPrisma.liveGiftSpendingPreference.findUnique.mockResolvedValue({
        userId: "u1",
        singleLimitCoin: 100,
        dailyLimitCoin: 500,
        reminderEnabled: true,
      })
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 0 } })
    })
    it("打赏成功", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue(null)
      mockPrisma.gift.findUnique.mockResolvedValue({ id: "g1", name: "玫瑰", priceCoin: 5 })
      mockPrisma.virtualCoinAccount.findUnique.mockResolvedValue({ userId: "u1", balance: 100 })
      mockPrisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.virtualCoinTransaction.create.mockResolvedValue({ id: "gt" })
      mockPrisma.giftRecord.create.mockResolvedValue({
        id: "gr1", idempotencyKey: "coin-gift:room1:request-001", userId: "u1", liveRoomId: "room1",
        toUserId: "host1", giftId: "g1", quantity: 1, totalCoin: 5,
      })
      mockPrisma.liveRoom.findUnique.mockResolvedValue({ imGroupId: "live_room1" })
      const result = await svc.sendGift("u1", "room1", "host1", "g1", 1, "coin-gift:room1:request-001")
      expect(result.totalCoin).toBe(5)
      await new Promise((resolve) => setImmediate(resolve))
      expect(mockIm.relayLiveGift).toHaveBeenCalledWith("live_room1", {
        recordId: "gr1",
        giftId: "g1",
        giftName: "玫瑰",
        quantity: 1,
      }, "u1")
    })

    it("礼物不存在", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue(null)
      mockPrisma.gift.findUnique.mockResolvedValue(null)
      await expect(svc.sendGift("u1", "room1", "host1", "no", 1, "coin-gift:room1:request-002")).rejects.toThrow(BusinessException)
    })

    it("相同幂等键重放不再次扣币", async () => {
      mockPrisma.giftRecord.findUnique.mockResolvedValue({
        id: "gr1", idempotencyKey: "coin-gift:room1:request-001", userId: "u1", liveRoomId: "room1",
        toUserId: "host1", giftId: "g1", quantity: 1, totalCoin: 5,
      })

      const result = await svc.sendGift("u1", "room1", "host1", "g1", 1, "coin-gift:room1:request-001")

      expect(result.id).toBe("gr1")
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe("分页入参加固（P2-4 NaN 防护）", () => {
    it("getTransactions 传 page='abc' 时 skip 不为 NaN", async () => {
      mockPrisma.virtualCoinTransaction.findMany.mockResolvedValue([])
      mockPrisma.virtualCoinTransaction.count.mockResolvedValue(0)
      await svc.getTransactions("u1", "abc" as any)
      const arg = mockPrisma.virtualCoinTransaction.findMany.mock.calls[0][0]
      expect(Number.isNaN(arg.skip)).toBe(false)
    })
  })
})
