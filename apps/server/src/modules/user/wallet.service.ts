import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
  ) {}

  /** 钱包余额概览 */
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

  /** 提现信息 */
  async getWithdrawInfo(userId: string) {
    const account = await this.coin.getBalance(userId);
    const savedAccounts = await this.prisma.withdrawalApplication.findMany({
      where: { userId, status: "PAID" },
      select: { accountInfo: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      availableBalance: account.balance,
      frozenBalance: 0,
      pendingBalance: 0,
      minWithdraw: 10,
      maxWithdraw: 50000,
      feeRate: 0.006,
      minFee: 1,
      savedAccounts: savedAccounts.map((a) => a.accountInfo as Record<string, unknown>),
    };
  }

  /** 提交提现申请 */
  async submitWithdraw(userId: string, data: { amount: number; method: string; account: Record<string, string> }) {
    if (!data.amount || data.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现金额必须大于0");
    }
    if (data.amount < 10) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "最低提现金额为10元");
    }

    const account = await this.coin.getBalance(userId);
    if (account.balance < data.amount) {
      throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "余额不足");
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
  }
}
