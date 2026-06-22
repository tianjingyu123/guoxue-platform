import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";

/** 提现门槛与上限（元），与 PRD 一致 */
const MIN_WITHDRAW_RMB = 100;
const MAX_WITHDRAW_RMB = 50000;
/** 计算可提现余额时视为"占用额度"的提现状态（驳回 REJECTED 自动释放额度，无需退款补偿） */
const OCCUPYING_WITHDRAW_STATUSES = ["PENDING", "APPROVED", "PAID"];

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private redis: RedisService,
  ) {}

  /** 钱包余额概览（虚拟币，用于站内消费） */
  async getBalance(userId: string) {
    const [account, points] = await Promise.all([
      this.coin.getBalance(userId),
      this.prisma.userPoints.findUnique({ where: { userId } }),
    ]);
    return {
      coin: account.balance,
      points: points?.balance ?? 0,
      frozen: account.balance, // 简化为coin字段，实际frozen在account中
      totalRecharged: account.totalRecharged,
      totalSpent: account.totalSpent,
    };
  }

  /** 交易流水 */
  async getTransactions(userId: string, params: { type?: string; month?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return this.coin.getTransactions(userId, page, pageSize, params.type);
  }

  /** 充值选项 */
  async getRechargeOptions() {
    return this.coin.getRechargeTiers();
  }

  /**
   * 计算用户可提现余额（元）= 累计收益(UserEarning) - 进行中/已完成提现。
   * 注：充值的虚拟币(VirtualCoinAccount.balance)只能消费，不计入可提现额度。
   */
  private async getWithdrawableBalance(userId: string): Promise<number> {
    const [earned, withdrawn] = await Promise.all([
      this.prisma.userEarning.aggregate({ where: { userId }, _sum: { amountRmb: true } }),
      this.prisma.withdrawalApplication.aggregate({
        where: { userId, status: { in: OCCUPYING_WITHDRAW_STATUSES } },
        _sum: { amount: true },
      }),
    ]);
    const balance = Number(earned._sum.amountRmb ?? 0) - Number(withdrawn._sum.amount ?? 0);
    return balance > 0 ? balance : 0;
  }

  /** 提现信息 */
  async getWithdrawInfo(userId: string) {
    const [availableBalance, savedAccounts] = await Promise.all([
      this.getWithdrawableBalance(userId),
      this.prisma.withdrawalApplication.findMany({
        where: { userId, status: "PAID" },
        select: { accountInfo: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      availableBalance,
      minWithdraw: MIN_WITHDRAW_RMB,
      maxWithdraw: MAX_WITHDRAW_RMB,
      feeRate: 0.006,
      minFee: 1,
      savedAccounts: savedAccounts.map((a) => a.accountInfo as Record<string, unknown>),
    };
  }

  /**
   * 提交提现申请。
   *
   * 资金安全机制（三层防护）：
   * 1. 资金口径：仅可提现"赚来的收益"(UserEarning)，不可提现充值的虚拟币。
   * 2. 并发安全：Redis 锁串行化同一用户的提交，防止并发绕过额度校验。
   * 3. 额度占用：OCCUPYING_WITHDRAW_STATUSES（PENDING/APPROVED/PAID）状态的提现
   *    金额从可提现余额中扣除，防止同一笔收益被多次提现。
   *
   * 驳回(REJECTED)的提现自动释放额度，因为 REJECTED 不在 OCCUPYING_STATUSES 中。
   */
  async submitWithdraw(userId: string, data: { amount: number; method: string; account: Record<string, string> }) {
    if (!data.amount || data.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现金额必须大于0");
    }
    if (data.amount < MIN_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `最低提现金额为${MIN_WITHDRAW_RMB}元`);
    }
    if (data.amount > MAX_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `单次提现金额不可超过${MAX_WITHDRAW_RMB}元`);
    }

    const lockKey = `withdraw:lock:${userId}`;
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现处理中，请稍后再试");
    }
    try {
      const available = await this.getWithdrawableBalance(userId);
      if (data.amount > available) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          `可提现余额不足，当前可提现 ${available.toFixed(2)} 元`,
        );
      }

      const application = await this.prisma.withdrawalApplication.create({
        data: {
          userId,
          amount: data.amount,
          payMethod: data.method,
          accountInfo: data.account,
          status: "PENDING",
        },
      });

      return { success: true, id: application.id, status: "PENDING" };
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
