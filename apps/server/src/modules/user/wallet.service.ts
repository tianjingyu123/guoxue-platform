import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinService } from "../coin/coin.service";
import { RedisService } from "../../redis/redis.service";
import { LedgerBalanceService } from "../settlement/ledger-balance.service";
import { Prisma } from "@prisma/client";
import { COIN_TO_RMB } from "../../common/constants";
import { encryptAccountInfo, resolveAccountInfo } from "../../common/crypto.util";

/** 提现门槛与上限（元），与 PRD 一致 */
const MIN_WITHDRAW_RMB = 100;
const MAX_WITHDRAW_RMB = 50000;
/** 提现手续费 */
const WITHDRAW_FEE_RATE = 0.006;
const WITHDRAW_MIN_FEE = 1;
/** 代扣代缴税款配置键（后台可配） */
const TAX_ENABLED_KEY = "finance.tax.enabled";
const TAX_RATE_KEY = "finance.tax.rate";
/** 计算可提现余额时视为"占用额度"的提现状态（驳回 REJECTED 自动释放额度，无需退款补偿）。
 *  CONVERTED=收益转金币（董事长拍板 2026-07-10·转出即永久占用可提现额度，金币侧同事务入账） */
/**
 * 计算可提现余额时视为「占用额度」的提现状态。
 * 🔴 TRANSFERRING 必须在列：渠道转账已发起、钱已从平台账户发出，只是用户还没在微信里点
 *    「确认收款」。此时若不占额度，用户就能拿同一笔余额再提一次 —— 直接资损。
 */
const OCCUPYING_WITHDRAW_STATUSES = ["PENDING", "APPROVED", "TRANSFERRING", "PAID", "CONVERTED"];

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private coin: CoinService,
    private redis: RedisService,
    private ledgerBalance: LedgerBalanceService,
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
   * 计算用户可提现余额（元）。
   * P2-c 转正后（灰度开关开）：引擎口径 = LedgerEntry 净结算额(USER) − 占用中提现；
   * 开关关：旧口径 = 累计收益(UserEarning) − 占用中提现（随时可回切）。
   * 注：充值的虚拟币(VirtualCoinAccount.balance)只能消费，不计入可提现额度。
   */
  private async getWithdrawableBalance(userId: string): Promise<number> {
    const useLedger = await this.ledgerBalance.isAuthoritative();
    const [earnedRmb, withdrawn] = await Promise.all([
      useLedger
        ? this.ledgerBalance.getNetSettled("USER", userId)
        : this.prisma.userEarning
            .aggregate({ where: { userId }, _sum: { amountRmb: true } })
            .then((r) => Number(r._sum.amountRmb ?? 0)),
      this.prisma.withdrawalApplication.aggregate({
        where: { userId, status: { in: OCCUPYING_WITHDRAW_STATUSES } },
        _sum: { amount: true },
      }),
    ]);
    const balance = earnedRmb - Number(withdrawn._sum.amount ?? 0);
    return balance > 0 ? balance : 0;
  }

  /**
   * 读取代扣代缴税款配置（后台系统配置·管理员开关控制是否扣税、可配扣税比例）。
   * 未配置或关闭时税率为 0；个人/企业统一按配置比例执行。
   */
  private async getTaxConfig(): Promise<{ enabled: boolean; rate: number }> {
    const rows = await this.prisma.configSystem.findMany({
      where: { configKey: { in: [TAX_ENABLED_KEY, TAX_RATE_KEY] } },
    });
    const map = new Map(rows.map((r) => [r.configKey, r.configValue]));
    const enabled = map.get(TAX_ENABLED_KEY) === "true";
    const rate = Number(map.get(TAX_RATE_KEY) ?? "0");
    return { enabled, rate: enabled && Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : 0 };
  }

  /** 计算某提现总额的手续费/税款/实际到账 */
  private computeWithdrawBreakdown(amount: number, taxRate: number) {
    const fee = Math.max(WITHDRAW_MIN_FEE, Math.round(amount * WITHDRAW_FEE_RATE * 100) / 100);
    const taxAmount = Math.round(amount * taxRate * 100) / 100;
    const actualAmount = Math.round((amount - fee - taxAmount) * 100) / 100;
    return { fee, taxAmount, actualAmount };
  }

  /** 提现信息 */
  async getWithdrawInfo(userId: string) {
    const [availableBalance, savedAccounts, tax] = await Promise.all([
      this.getWithdrawableBalance(userId),
      this.prisma.withdrawalApplication.findMany({
        where: { userId, status: "PAID" },
        // 切读：取密文列优先解密，回退明文列兼容存量
        select: { accountInfo: true, accountInfoEnc: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.getTaxConfig(),
    ]);

    return {
      availableBalance,
      minWithdraw: MIN_WITHDRAW_RMB,
      maxWithdraw: MAX_WITHDRAW_RMB,
      feeRate: WITHDRAW_FEE_RATE,
      minFee: WITHDRAW_MIN_FEE,
      taxEnabled: tax.enabled,
      taxRate: tax.rate, // 代扣代缴税率（0 表示未开启扣税）
      savedAccounts: savedAccounts.map(
        (a) => resolveAccountInfo(a.accountInfoEnc, a.accountInfo) as Record<string, unknown>,
      ),
    };
  }

  /**
   * 我的提现记录。
   *
   * 🔴 needConfirm 是这个接口存在的理由：微信商家转账发起后钱并没到用户手上，
   *    要他在微信里点「确认收款」，超时不点会自动退回。用户看不到这笔单 = 钱永远到不了。
   *    packageInfo（能唤起确认页的凭据）不在列表里返回，要单独走 payout/my/:id/confirm。
   */
  async getMyWithdrawals(userId: string, page = 1, pageSize = 20) {
    const skip = (Math.max(1, page) - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.withdrawalApplication.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          amount: true,
          fee: true,
          taxAmount: true,
          actualAmount: true,
          payMethod: true,
          status: true,
          transferState: true,
          transferFailReason: true,
          reviewNote: true, // 驳回原因存在这里（本表无 rejectReason 字段）
          createdAt: true,
        },
      }),
      this.prisma.withdrawalApplication.count({ where: { userId } }),
    ]);

    return {
      total,
      page,
      pageSize,
      list: list.map((w) => ({
        ...w,
        amount: Number(w.amount),
        fee: Number(w.fee),
        taxAmount: Number(w.taxAmount ?? 0),
        actualAmount: Number(w.actualAmount),
        needConfirm: w.status === "TRANSFERRING" && w.transferState === "WAIT_USER_CONFIRM",
      })),
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
  /**
   * 收益转金币（董事长拍板 2026-07-10）：可提现 RMB 收益 → 金币（1元=10币·单向不可逆）。
   * 打赏等收益既可提现也可转金币消费全平台虚拟币项目。
   * 记一条 status=CONVERTED 的提现申请单占用可提现额度（对账留痕），金币入账同一事务。
   */
  async convertToCoin(userId: string, amountRmb: number) {
    if (!Number.isInteger(amountRmb) || amountRmb <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "转换金额须为正整数（元）");
    }

    const lockKey = `withdraw:lock:${userId}`; // 与提现同锁：防转币+提现并发双花同一笔余额
    const locked = await this.redis.setNX(lockKey, "1", 10);
    if (!locked) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "处理中，请稍后再试");
    }
    try {
      const available = await this.getWithdrawableBalance(userId);
      if (amountRmb > available) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, `可提现余额不足，当前可提现 ${available.toFixed(2)} 元`);
      }

      const amountCoin = amountRmb * COIN_TO_RMB;
      const application = await this.prisma.$transaction(async (tx) => {
        const app = await tx.withdrawalApplication.create({
          data: {
            userId,
            amount: amountRmb,
            fee: 0,
            taxAmount: 0,
            taxRate: 0,
            actualAmount: amountRmb,
            payMethod: "COIN_CONVERT",
            accountInfo: { type: "COIN", note: "收益转金币" },
            status: "CONVERTED",
          },
        });
        await this.coin.income(userId, {
          amountCoin,
          scene: "EARNING_CONVERT",
          refId: app.id,
          description: `收益转金币 ¥${amountRmb} → ${amountCoin} 金币`,
        }, tx);
        return app;
      });

      return { amountRmb, amountCoin, applicationId: application.id };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 提现收款方式白名单。落库一律大写 —— 出款侧（payout/admin）按大写判分支，
   *  历史上前端发的是小写 'alipay'/'bank'，不统一口径会导致微信提现永远匹配不上自动代付。 */
  private static readonly WITHDRAW_METHODS = ["WECHAT", "ALIPAY", "BANK"];

  async submitWithdraw(userId: string, data: { amount: number; method: string; account: Record<string, string> }) {
    if (!data.amount || data.amount <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "提现金额必须大于0");
    }
    const payMethod = String(data.method || "").toUpperCase();
    if (!WalletService.WITHDRAW_METHODS.includes(payMethod)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的收款方式");
    }
    if (data.amount < MIN_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `最低提现金额为${MIN_WITHDRAW_RMB}元`);
    }
    if (data.amount > MAX_WITHDRAW_RMB) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `单次提现金额不可超过${MAX_WITHDRAW_RMB}元`);
    }

    // 提现二次验证：必须持有近期通过支付密码验证写入的凭证(前端"验密→提现"流程)，
    // 服务端强制校验，防止绕过客户端单侧校验直接调提现端点盗刷。单次消费。
    const verifiedKey = `paypwd:verified:${userId}`;
    if (!(await this.redis.get(verifiedKey))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请先验证支付密码后再提现");
    }
    await this.redis.del(verifiedKey);

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

      // 代扣代缴：按后台配置计算手续费与税款，落库快照便于对账/申报
      const tax = await this.getTaxConfig();
      const { fee, taxAmount, actualAmount } = this.computeWithdrawBreakdown(data.amount, tax.rate);
      if (actualAmount <= 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "扣除手续费与税款后实际到账为 0，请提高提现金额");
      }

      // 前端「上次收款账户」按 accountInfo.method 匹配，不带上就永远预填不出来
      const accountInfo = { ...data.account, method: payMethod.toLowerCase() };
      const application = await this.prisma.withdrawalApplication.create({
        data: {
          userId,
          amount: data.amount,
          fee,
          taxAmount,
          taxRate: tax.rate,
          actualAmount,
          payMethod,
          // 双写：明文列过渡期保留（兼容旧读路径/存量），密文列为加密真源（读取优先解密）
          accountInfo,
          accountInfoEnc: encryptAccountInfo(accountInfo),
          status: "PENDING",
        },
      });

      return { success: true, id: application.id, status: "PENDING", amount: data.amount, fee, taxAmount, actualAmount };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ───────── 充值 ─────────

  /** 支持的充值支付渠道（云闪付=UNIONPAY） */
  private static readonly RECHARGE_METHODS = ["WECHAT", "ALIPAY", "UNIONPAY"];
  /** 单次充值上限（币）：前端标称 5 万元 = 50 万币，服务端必须强制，防刷单/误操作/洗钱通道 */
  private static readonly MAX_RECHARGE_COIN = 500_000;

  /** 创建充值订单（PENDING）。真实支付需对接微信/支付宝/云闪付下单 API（本地无密钥）→ 返回订单待支付。 */
  async createRecharge(userId: string, dto: { amountCoin: number; payMethod: string }) {
    if (!dto.amountCoin || dto.amountCoin <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "充值金额必须大于0");
    }
    if (dto.amountCoin > WalletService.MAX_RECHARGE_COIN) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "单次充值金额超过上限");
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
