import { Test } from "@nestjs/testing";
import { WalletService } from "./wallet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

/**
 * C1 提现漏洞回归测试
 * 业务规则（已与产品确认）：普通用户提现只能提"赚来的收益"(UserEarning)，
 * 充值的虚拟币(VirtualCoinAccount.balance)只能消费、不可提现。
 * 可提现余额 = 累计收益 - 进行中/已完成提现(PENDING/APPROVED/PAID)。
 */
const mockPrisma: any = {
  userEarning: { aggregate: jest.fn() },
  withdrawalApplication: { aggregate: jest.fn(), create: jest.fn(), findMany: jest.fn() },
};
const mockCoin: any = {
  // 故意把虚拟币余额设得很高：用来证明提现【不再】依赖虚拟币余额
  getBalance: jest.fn().mockResolvedValue({ balance: 999999, totalRecharged: 999999, totalSpent: 0 }),
};
const mockRedis: any = {
  setNX: jest.fn(),
  del: jest.fn(),
};

describe("WalletService 提现（基于收益）", () => {
  let svc: WalletService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoinService, useValue: mockCoin },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(WalletService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockRedis.del.mockResolvedValue(undefined);
    mockCoin.getBalance.mockResolvedValue({ balance: 999999, totalRecharged: 999999, totalSpent: 0 });
  });

  it("收益不足时拒绝提现（即使虚拟币余额很高也不能提）", async () => {
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 50 } });
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    await expect(
      svc.submitWithdraw("u1", { amount: 200, method: "WECHAT", account: { no: "x" } }),
    ).rejects.toThrow(BusinessException);
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
  });

  it("可提现余额充足时创建 PENDING 申请", async () => {
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 500 } });
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.withdrawalApplication.create.mockResolvedValue({ id: "w1", status: "PENDING" });

    const res = await svc.submitWithdraw("u1", { amount: 200, method: "WECHAT", account: { no: "x" } });
    expect(res.status).toBe("PENDING");
    expect(res.id).toBe("w1");
    expect(mockPrisma.withdrawalApplication.create).toHaveBeenCalledTimes(1);
  });

  it("扣除进行中/已完成提现后余额不足则拒绝（防止反复套现）", async () => {
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 500 } });
    // 已有 450 处于占用（PENDING/APPROVED/PAID）→ 可用仅 50
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 450 } });

    await expect(
      svc.submitWithdraw("u1", { amount: 200, method: "WECHAT", account: { no: "x" } }),
    ).rejects.toThrow(BusinessException);
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
  });

  it("低于提现门槛（100 元）时拒绝", async () => {
    await expect(
      svc.submitWithdraw("u1", { amount: 50, method: "WECHAT", account: { no: "x" } }),
    ).rejects.toThrow(BusinessException);
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
  });

  it("并发锁未获取时拒绝（防重复提交）", async () => {
    mockRedis.setNX.mockResolvedValue(false);
    await expect(
      svc.submitWithdraw("u1", { amount: 200, method: "WECHAT", account: { no: "x" } }),
    ).rejects.toThrow(BusinessException);
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
  });

  it("getWithdrawInfo 返回基于收益的可提现余额", async () => {
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 500 } });
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 120 } });
    mockPrisma.withdrawalApplication.findMany.mockResolvedValue([]);

    const info = await svc.getWithdrawInfo("u1");
    expect(info.availableBalance).toBe(380); // 500 - 120
    expect(info.minWithdraw).toBe(100);
  });
});
