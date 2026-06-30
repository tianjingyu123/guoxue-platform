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
      frozen: account.frozen,
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

  // ───────── 充值 ─────────

  /** 支持的充值支付渠道（云闪付=UNIONPAY） */
  private static readonly RECHARGE_METHODS = ["WECHAT", "ALIPAY", "UNIONPAY"];

  /** 创建充值订单（PENDING）。真实支付需对接微信/支付宝/云闪付下单 API（本地无密钥）→ 返回订单待支付。 */
  async createRecharge(userId: string, dto: { amountCoin: number; payMethod: string }) {
    if (!dto.amountCoin || dto.amountCoin <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值金额必须大于0");
    }
    const pm = String(dto.payMethod || "WECHAT").toUpperCase();
    if (!WalletService.RECHARGE_METHODS.includes(pm)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的支付方式");
    }
    const coinRate = await this.coin.getCoinRate();
    const orderNo = `RC${Date.now()}${userId.replace(/-/g, "").slice(0, 8)}`;
    const order = await this.prisma.virtualCoinRecharge.create({
      data: {
        userId,
        amountCoin: dto.amountCoin,
        amountRmb: dto.amountCoin / coinRate,
        payMethod: pm,
        orderNo,
        status: "PENDING",
      },
    });
    return { orderNo: order.orderNo, amountCoin: order.amountCoin, amountRmb: Number(order.amountRmb), payMethod: pm };
  }

  /**
   * 模拟支付到账（本地无真实支付渠道；真实支付由各渠道回调触发同等逻辑）。
   * 资金安全：①条件 updateMany 原子置 PAID（防并发重复加币）②已 PAID 幂等返回 ③加币与订单状态同事务。
   */
  async mockPayRecharge(userId: string, orderNo: string) {
    // 安全：模拟到账仅限非生产环境，杜绝真实用户凭空充值（免费刷币）；生产须由支付渠道回调验签后到账
    if (process.env.NODE_ENV === "production") {
      throw new BusinessException(ErrorCode.FORBIDDEN, "生产环境不支持模拟支付，请通过支付渠道完成");
    }
    await this.coin.getOrCreateAccount(userId); // 确保虚拟币账户存在
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.virtualCoinRecharge.findFirst({ where: { orderNo, userId } });
      if (!order) throw new BusinessException(ErrorCode.NOT_FOUND, "充值订单不存在");
      if (order.status === "PAID") {
        return { success: true, alreadyPaid: true, amountCoin: order.amountCoin };
      }
      if (order.status !== "PENDING") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "订单状态异常，无法支付");
      }
      // 原子置 PAID：只有把 PENDING→PAID 成功的那次事务才加币，杜绝重复到账
      const upd = await tx.virtualCoinRecharge.updateMany({
        where: { orderNo, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (upd.count === 0) {
        return { success: true, alreadyPaid: true, amountCoin: order.amountCoin };
      }
      const acc = await tx.virtualCoinAccount.update({
        where: { userId },
        data: { balance: { increment: order.amountCoin }, totalRecharged: { increment: order.amountCoin } },
      });
      await tx.virtualCoinTransaction.create({
        data: {
          userId,
          type: "RECHARGE",
          amountCoin: order.amountCoin,
          balanceAfter: acc.balance,
          scene: "RECHARGE",
          description: `充值${order.amountCoin}国学币`,
        },
      });
      return { success: true, amountCoin: order.amountCoin, balance: acc.balance };
    });
  }
}
