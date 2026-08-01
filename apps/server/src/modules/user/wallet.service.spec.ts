import { Test } from "@nestjs/testing";
import { WalletService } from "./wallet.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RedisService } from "../../redis/redis.service";
import { LedgerBalanceService } from "../settlement/ledger-balance.service";
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
  configSystem: { findMany: jest.fn().mockResolvedValue([]) },
};
const mockCoin: any = {
  // 故意把虚拟币余额设得很高：用来证明提现【不再】依赖虚拟币余额
  getBalance: jest.fn().mockResolvedValue({ balance: 999999, totalRecharged: 999999, totalSpent: 0 }),
  getRechargeTiers: jest.fn().mockResolvedValue([{ amountRmb: 100, amountCoin: 1000, bonus: 0 }]),
  getCoinRate: jest.fn().mockResolvedValue(10),
};
const mockRedis: any = {
  get: jest.fn(),
  set: jest.fn(),
  setNX: jest.fn(),
  del: jest.fn(),
};
// P2-c 引擎口径：默认开关关（旧口径），单独用例验证开关开时读 LedgerEntry 净额
const mockLedgerBalance: any = {
  isAuthoritative: jest.fn().mockResolvedValue(false),
  getNetSettled: jest.fn().mockResolvedValue(0),
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
        { provide: LedgerBalanceService, useValue: mockLedgerBalance },
      ],
    }).compile();
    svc = mod.get(WalletService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.setNX.mockResolvedValue(true);
    mockRedis.del.mockResolvedValue(undefined);
    mockRedis.get.mockResolvedValue("1"); // 默认已持有支付密码验证凭证
    mockCoin.getBalance.mockResolvedValue({ balance: 999999, totalRecharged: 999999, totalSpent: 0 });
  });

  it("充值配置同时返回档位和权威汇率", async () => {
    const result = await svc.getRechargeConfig();
    expect(result.coinRate).toBe(10);
    expect(result.tiers[0]).toMatchObject({ amountRmb: 100, amountCoin: 1000 });
    expect(mockCoin.getRechargeTiers).toHaveBeenCalled();
    expect(mockCoin.getCoinRate).toHaveBeenCalled();
  });

  it("未验证支付密码时拒绝提现（防绕过客户端直接调端点）", async () => {
    mockRedis.get.mockResolvedValue(null); // 无验证凭证
    await expect(
      svc.submitWithdraw("u1", { amount: 200, method: "WECHAT", account: { no: "x" } }),
    ).rejects.toThrow("请先验证支付密码");
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
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

  /**
   * 🔴 出款侧（PayoutService / admin）按大写 'WECHAT' 判分支，前端历史上发的是小写 'wechat'。
   *    口径不统一 → 微信提现永远匹配不上自动代付，只能人工打款。
   */
  it("payMethod 一律大写落库（前端传小写也要归一）", async () => {
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 500 } });
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.withdrawalApplication.create.mockResolvedValue({ id: "w1", status: "PENDING" });

    await svc.submitWithdraw("u1", { amount: 200, method: "wechat", account: { realName: "张三" } });

    const arg = mockPrisma.withdrawalApplication.create.mock.calls[0][0];
    expect(arg.data.payMethod).toBe("WECHAT");
    // accountInfo 要带上 method，否则前端「上次收款账户」永远预填不出来
    expect(arg.data.accountInfo).toMatchObject({ realName: "张三", method: "wechat" });
  });

  it("不支持的收款方式直接拒绝", async () => {
    await expect(
      svc.submitWithdraw("u1", { amount: 200, method: "PAYPAL", account: {} }),
    ).rejects.toThrow(BusinessException);
    expect(mockPrisma.withdrawalApplication.create).not.toHaveBeenCalled();
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

  // ───────── P2-c 引擎口径转正（灰度开关） ─────────

  it("开关开时可提现余额改读引擎净结算额（不再读 UserEarning）", async () => {
    mockLedgerBalance.isAuthoritative.mockResolvedValue(true);
    mockLedgerBalance.getNetSettled.mockResolvedValue(300);
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
    mockPrisma.withdrawalApplication.findMany.mockResolvedValue([]);

    const info = await svc.getWithdrawInfo("u1");
    expect(info.availableBalance).toBe(200); // 引擎净额300 - 占用100
    expect(mockLedgerBalance.getNetSettled).toHaveBeenCalledWith("USER", "u1");
    expect(mockPrisma.userEarning.aggregate).not.toHaveBeenCalled();
    mockLedgerBalance.isAuthoritative.mockResolvedValue(false); // 还原默认
    mockLedgerBalance.getNetSettled.mockResolvedValue(0);
  });

  it("开关关时保持旧口径（UserEarning），可随时回切", async () => {
    mockLedgerBalance.isAuthoritative.mockResolvedValue(false);
    mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 500 } });
    mockPrisma.withdrawalApplication.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockPrisma.withdrawalApplication.findMany.mockResolvedValue([]);

    const info = await svc.getWithdrawInfo("u1");
    expect(info.availableBalance).toBe(500);
    expect(mockLedgerBalance.getNetSettled).not.toHaveBeenCalled();
  });
});
