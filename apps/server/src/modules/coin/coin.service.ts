import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { COIN_TO_RMB } from "../../common/constants";
import { CommissionService } from "../commission/commission.service";
import { SystemService } from "../system/system.service";
import { FundApprovalService } from "../fund-approval/fund-approval.service";

/** 默认充值档位（ConfigSystem 未配置时的兜底） */
const DEFAULT_RECHARGE_TIERS = [
  { amountRmb: 6, amountCoin: 60, bonus: 0 },
  { amountRmb: 18, amountCoin: 180, bonus: 0 },
  { amountRmb: 68, amountCoin: 680, bonus: 0 },
  { amountRmb: 198, amountCoin: 1980, bonus: 0 },
  { amountRmb: 648, amountCoin: 6480, bonus: 0 },
];

@Injectable()
export class CoinService {
  private readonly logger = new Logger(CoinService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() private commission?: CommissionService,
    @Optional() private systemService?: SystemService,
    @Optional() private fundApproval?: FundApprovalService,
  ) {}

  /**
   * 发起「灵石充值到账」审批（不立即到账）。
   * 审批通过后由 FundApprovalExecutor 调用 recharge 真正充值。
   * 注意：支付回调 handleRechargeCallback 仍直接 recharge，不走审批（用户已付款，必须立即到账）。
   */
  async requestRecharge(dto: { userId: string; amountCoin: number; description?: string }, requestedBy: string) {
    if (!dto.userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请指定用户ID");
    if (dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "充值币数必须大于0");
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "RECHARGE",
      payload: { userId: dto.userId, amountCoin: dto.amountCoin, description: dto.description },
      amount: dto.amountCoin,
      summary: `灵石充值 ${dto.amountCoin} 币到账（用户 ${dto.userId}）`,
      requestedBy,
    });
  }

  /**
   * 管理员/客服发起虚拟币退款申请（客诉退款/协商金额退款）。
   * 虚拟币默认不可退款，仅在客诉等场景由管理人员发起、经财务审批后执行（职责分离·防自审自批）。
   */
  async requestRefund(dto: { userId: string; amountCoin: number; description?: string }, requestedBy: string) {
    if (!dto.userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请指定用户ID");
    if (!dto.amountCoin || dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "退款币数必须大于0");
    if (!this.fundApproval) throw new BusinessException(ErrorCode.BAD_REQUEST, "审批服务不可用");
    return this.fundApproval.create({
      type: "COIN_REFUND",
      payload: { userId: dto.userId, amountCoin: dto.amountCoin, description: dto.description || "客诉退款" },
      amount: dto.amountCoin,
      summary: `国学币退款 ${dto.amountCoin} 币到账（用户 ${dto.userId}）— ${dto.description || "客诉退款"}`,
      requestedBy,
    });
  }

  /** 获取或创建虚拟币账户 */
  async getOrCreateAccount(userId: string) {
    let account = await this.prisma.virtualCoinAccount.findUnique({ where: { userId } });
    if (!account) {
      account = await this.prisma.virtualCoinAccount.create({ data: { userId } });
    }
    return account;
  }

  /** 获取账户余额 */
  async getBalance(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    return { userId, balance: account.balance, frozen: account.frozen, totalRecharged: account.totalRecharged, totalSpent: account.totalSpent };
  }

  /** 充值（管理员手动充值 或 支付回调触发） */
  async recharge(userId: string, dto: { amountCoin: number; payMethod?: string; orderNo?: string; description?: string }) {
    if (dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "充值币数必须大于0");

    await this.getOrCreateAccount(userId);

    const coinRate = await this.getCoinRate();

    // 交互式事务：余额用 atomic increment，避免读-写竞态
    const [updatedAccount, recharge, transaction] = await this.prisma.$transaction(async (tx) => {
      const acc = await tx.virtualCoinAccount.update({
        where: { userId },
        data: {
          balance: { increment: dto.amountCoin },
          totalRecharged: { increment: dto.amountCoin },
        },
      });
      const rec = await tx.virtualCoinRecharge.create({
        data: {
          userId,
          amountRmb: dto.amountCoin / coinRate,
          amountCoin: dto.amountCoin,
          payMethod: dto.payMethod || "ADMIN",
          orderNo: dto.orderNo || `ADMIN_${Date.now()}`,
          status: "PAID",
          paidAt: new Date(),
        },
      });
      const txn = await tx.virtualCoinTransaction.create({
        data: {
          userId,
          type: "RECHARGE",
          amountCoin: dto.amountCoin,
          balanceAfter: acc.balance,
          scene: "RECHARGE",
          description: dto.description || "充值",
        },
      });
      return [acc, rec, txn];
    });

    return { account: updatedAccount, recharge, transaction };
  }

  /**
   * 消费虚拟币（交互式事务 + 原子扣减防超额）。
   * 调用方可传入 prismaTx 以合并到外层事务，避免嵌套事务导致回滚无效。
   */
  async spend(
    userId: string,
    dto: { amountCoin: number; scene: string; refId?: string; description?: string },
    prismaTx?: Prisma.TransactionClient,
  ) {
    if (dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "消费币数必须大于0");

    await this.getOrCreateAccount(userId);

    const run = async (tx: Prisma.TransactionClient) => {
      const result = await tx.virtualCoinAccount.updateMany({
        where: { userId, balance: { gte: dto.amountCoin } },
        data: {
          balance: { decrement: dto.amountCoin },
          totalSpent: { increment: dto.amountCoin },
        },
      });
      if (result.count === 0) throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "虚拟币余额不足");

      const acc = await tx.virtualCoinAccount.findUnique({ where: { userId } });
      const txn = await tx.virtualCoinTransaction.create({
        data: {
          userId,
          type: "SPEND",
          amountCoin: -dto.amountCoin,
          balanceAfter: acc!.balance,
          scene: dto.scene as Prisma.VirtualCoinTransactionCreateInput["scene"],
          refId: dto.refId,
          description: dto.description,
        },
      });
      return { account: acc!, transaction: txn };
    };

    if (prismaTx) return run(prismaTx);
    return this.prisma.$transaction(run);
  }

  /**
   * 退款（平台赠送等，交互式事务 + 原子增量）。
   * 调用方可传入 prismaTx 以合并到外层事务。
   */
  async refund(
    userId: string,
    amountCoin: number,
    description: string,
    prismaTx?: Prisma.TransactionClient,
  ) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "退款币数必须大于0");

    await this.getOrCreateAccount(userId);

    const run = async (tx: Prisma.TransactionClient) => {
      const acc = await tx.virtualCoinAccount.update({
        where: { userId },
        data: { balance: { increment: amountCoin } },
      });
      const txn = await tx.virtualCoinTransaction.create({
        data: {
          userId,
          type: "REFUND",
          amountCoin,
          balanceAfter: acc.balance,
          scene: "REFUND",
          description,
        },
      });
      return { account: acc, transaction: txn };
    };

    if (prismaTx) return run(prismaTx);
    return this.prisma.$transaction(run);
  }

  /** 交易流水 */
  async getTransactions(userId: string, page = 1, pageSize = 20, type?: string, scene?: string) {
    const where: Prisma.VirtualCoinTransactionWhereInput = { userId };
    if (type) where.type = type as Prisma.VirtualCoinTransactionWhereInput["type"];
    if (scene) where.scene = scene as Prisma.VirtualCoinTransactionWhereInput["scene"];

    const [transactions, total] = await Promise.all([
      this.prisma.virtualCoinTransaction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.virtualCoinTransaction.count({ where }),
    ]);
    return { transactions, total, page, pageSize };
  }

  /** 管理员查看所有交易流水 */
  async getAdminTransactions(page = 1, pageSize = 20, userId?: string, type?: string, scene?: string) {
    const where: Prisma.VirtualCoinTransactionWhereInput = {};
    if (userId) where.userId = userId;
    if (type) where.type = type as Prisma.VirtualCoinTransactionWhereInput["type"];
    if (scene) where.scene = scene as Prisma.VirtualCoinTransactionWhereInput["scene"];

    const [transactions, total] = await Promise.all([
      this.prisma.virtualCoinTransaction.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, phone: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.virtualCoinTransaction.count({ where }),
    ]);
    return { transactions, total, page, pageSize };
  }

  /** 充值记录 */
  async getRecharges(page = 1, pageSize = 20, userId?: string) {
    const where: Prisma.VirtualCoinRechargeWhereInput = {};
    if (userId) where.userId = userId;

    const [recharges, total] = await Promise.all([
      this.prisma.virtualCoinRecharge.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, phone: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.virtualCoinRecharge.count({ where }),
    ]);
    return { recharges, total, page, pageSize };
  }

  /** 充值档位配置（优先从 ConfigSystem 读取，未配置时使用硬编码默认值） */
  async getRechargeTiers() {
    if (this.systemService) {
      const cfg = await this.systemService.getConfig("coin_recharge_tiers");
      if (cfg?.configValue) {
        try {
          const tiers = JSON.parse(cfg.configValue);
          if (Array.isArray(tiers) && tiers.length > 0) return tiers;
        } catch { /* 解析失败回退默认值 */ }
      }
    }
    return DEFAULT_RECHARGE_TIERS;
  }

  /** 获取当前汇率（国学币:人民币），优先从 ConfigSystem 读取 */
  async getCoinRate(): Promise<number> {
    if (this.systemService) {
      const cfg = await this.systemService.getConfig("coin_to_rmb_rate");
      if (cfg?.configValue) {
        const rate = Number(cfg.configValue);
        if (rate > 0) return rate;
      }
    }
    return COIN_TO_RMB;
  }

  /**
   * 礼物列表（管理后台）。
   * 返回全部礼物（含停用），admin 列表需展示停用项以便重新启用。
   * 注意：C 端直播送礼面板走 /live/gifts（live.service 自带 status=ACTIVE 过滤），
   * 不经此端点，故此处放开过滤不会向用户暴露停用礼物。
   */
  async getGifts() {
    return this.prisma.gift.findMany({
      orderBy: { sortOrder: "asc" },
      take: 200,
    });
  }

  /** 创建礼物（管理员） */
  async createGift(dto: { name: string; icon?: string; iconUrl?: string; price?: number; priceCoin?: number; level?: string; animationType?: string; effectUrl?: string; sort?: number; sortOrder?: number; status?: string }) {
    const data: Prisma.GiftCreateInput = {
      name: dto.name,
      icon: dto.icon || dto.iconUrl || "",
      priceCoin: dto.priceCoin ?? dto.price ?? 0,
      level: dto.level || dto.animationType || dto.effectUrl || "",
      sortOrder: dto.sortOrder ?? dto.sort ?? 0,
      status: dto.status || "ACTIVE",
    };
    return this.prisma.gift.create({ data });
  }

  /** 更新礼物（管理员） */
  async updateGift(giftId: string, dto: { name?: string; icon?: string; iconUrl?: string; price?: number; priceCoin?: number; level?: string; animationType?: string; effectUrl?: string; sort?: number; sortOrder?: number; status?: string }) {
    const existing = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");
    const data: Prisma.GiftUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.icon !== undefined || dto.iconUrl !== undefined) data.icon = (dto.icon || dto.iconUrl)!;
    if (dto.priceCoin !== undefined || dto.price !== undefined) data.priceCoin = (dto.priceCoin ?? dto.price)!;
    const animOrLevel = dto.level || dto.animationType || dto.effectUrl;
    if (animOrLevel !== undefined) data.level = animOrLevel;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.sort !== undefined && dto.sortOrder === undefined) data.sortOrder = dto.sort;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.gift.update({ where: { id: giftId }, data });
  }

  /** 删除礼物（管理员） */
  async deleteGift(giftId: string) {
    const existing = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");
    await this.prisma.gift.delete({ where: { id: giftId } });
    return { success: true };
  }

  /** 打赏（扣币与记录在同一事务，防丢币） */
  async sendGift(userId: string, liveRoomId: string, toUserId: string, giftId: string, quantity = 1) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");

    const totalCoin = gift.priceCoin * quantity;

    // 扣币与打赏记录在同一事务
    const record = await this.prisma.$transaction(async (tx) => {
      await this.spend(userId, {
        amountCoin: totalCoin,
        scene: "LIVE_GIFT",
        refId: liveRoomId,
        description: `赠送 ${gift.name} x${quantity}`,
      }, tx);

      return tx.giftRecord.create({
        data: { userId, liveRoomId, toUserId, giftId, quantity, totalCoin },
      });
    });

    // 平台抽成 + 圈主收益（fire-and-forget）
    // 换算：CircleRevenue 以「元」为口径（circle_join 传的是 priceYuan），礼物按币值除以币率转元。
    // 曾误用乘法致收益放大 coinRate(=10) 倍，污染圈主分成账目与研究院「创收」准入门槛，已修。
    if (this.commission) {
      const coinRate = await this.getCoinRate();
      const giftAmountYuan = coinRate > 0 ? (gift.priceCoin * quantity) / coinRate : 0;
      this.recordGiftCommission(liveRoomId, record.id, giftAmountYuan).catch(
        (err) => this.logger.warn("礼物抽成记录失败", err),
      );
    }

    return record;
  }

  /** 记录礼物平台抽成 */
  private async recordGiftCommission(liveRoomId: string, giftRecordId: string, amountRmb: number) {
    const liveRoom = await this.prisma.liveRoom.findUnique({
      where: { id: liveRoomId },
      select: { circleId: true },
    });
    if (!liveRoom?.circleId || !this.commission) return;

    await this.commission.recordCircleRevenue(
      liveRoom.circleId,
      "gift",
      giftRecordId,
      amountRmb,
    );
  }

  /** 直播打赏榜单 */
  async getGiftRank(liveRoomId: string, limit = 20) {
    return this.prisma.giftRecord.findMany({
      where: { liveRoomId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        gift: { select: { name: true, icon: true } },
      },
      orderBy: { totalCoin: "desc" },
      take: limit,
    });
  }

  // ───────── 微信支付充值 ─────────
  // 注意: createRechargePayment 已迁至 ShopService
  // 充值支付由商城模块统一处理，支付回调通过 ShopService.handlePaymentNotify → CoinService.handleRechargeCallback

  /** 处理充值支付回调（由支付通知中心调用） */
  async handleRechargeCallback(body: Record<string, unknown>) {
    if (body.trade_state !== "SUCCESS") return;

    let attach: Record<string, unknown> = {};
    try {
      attach = typeof body.attach === "string" ? JSON.parse(body.attach) : (body.attach as Record<string, unknown>) || {};
    } catch (err) { this.logger.warn("解析充值回调attach失败", err); }

    if (attach.type !== "COIN_RECHARGE") return;

    const userId = attach.userId as string;
    const amountCoin = attach.amountCoin as number;

    if (!userId || !amountCoin) {
      this.logger.error("充值回调参数缺失", attach);
      return;
    }

    const orderNo = body.out_trade_no as string;
    const lockKey = `recharge:lock:${orderNo}`;

    // 分布式锁防并发重复处理
    const locked = await this.redis.setNX(lockKey, "1", 30);
    if (!locked) {
      this.logger.warn(`充值回调重复处理被拦截: ${orderNo}`);
      return;
    }

    try {
      // 检查是否已处理（幂等）
      const existing = await this.prisma.virtualCoinRecharge.findUnique({
        where: { orderNo },
      });
      if (existing?.status === "PAID") return;

      const amountRmb = amountCoin / (await this.getCoinRate());

      // M2 金额比对：attach 是我方下单侧写入的期望值，入账前必须与微信实付金额(amount.total·分)核对
      const wxTotal = (body.amount as Record<string, unknown> | undefined)?.total;
      if (typeof wxTotal === "number" && Math.abs(wxTotal / 100 - amountRmb) >= 0.01) {
        this.logger.error(
          `【资金对账·金额不符】充值回调实付金额与应付金额不一致，拒绝入账: orderNo=${orderNo}, userId=${userId}, 实付=${wxTotal / 100}, 应付=${amountRmb}`,
        );
        return;
      }

      await this.recharge(userId, {
        amountCoin,
        payMethod: "WECHAT",
        orderNo,
        description: `微信支付充值${amountCoin}币`,
      });

      // 更新充值金额
      await this.prisma.virtualCoinRecharge.update({
        where: { orderNo },
        data: { amountRmb, status: "PAID", paidAt: new Date() },
      });

      this.logger.log(`用户 ${userId} 充值 ${amountCoin} 币成功, 微信订单: ${orderNo}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ───────── 冻结/解冻/转移（悬赏等场景） ─────────

  /** 冻结虚拟币（原子扣减 balance，增加 frozen） */
  async freeze(userId: string, amountCoin: number, scene: string, refId?: string, prismaTx?: Prisma.TransactionClient) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "冻结币数必须大于0");

    await this.getOrCreateAccount(userId);

    const run = async (tx: Prisma.TransactionClient) => {
      const result = await tx.virtualCoinAccount.updateMany({
        where: { userId, balance: { gte: amountCoin } },
        data: { balance: { decrement: amountCoin }, frozen: { increment: amountCoin } },
      });
      if (result.count === 0) throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "虚拟币余额不足");

      await tx.virtualCoinFrozen.create({
        data: { userId, amountCoin, scene, refId, status: "FROZEN" },
      });

      const acc = await tx.virtualCoinAccount.findUnique({ where: { userId } });
      await tx.virtualCoinTransaction.create({
        data: {
          userId,
          type: "SPEND",
          amountCoin: -amountCoin,
          balanceAfter: acc!.balance,
          scene: scene as Prisma.VirtualCoinTransactionCreateInput["scene"],
          refId,
          description: `冻结虚拟币: ${scene}`,
        },
      });

      return { frozen: acc!.frozen, balance: acc!.balance };
    };

    // 调用方可传入 prismaTx 合并到外层事务（如悬赏创建：冻结与建单同事务）
    return prismaTx ? run(prismaTx) : this.prisma.$transaction(run);
  }

  /** 解冻虚拟币（归还原余额）。调用方可传入 prismaTx 合并到外层事务。 */
  async unfreeze(userId: string, amountCoin: number, refId?: string, prismaTx?: Prisma.TransactionClient) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "解冻币数必须大于0");

    const run = async (tx: Prisma.TransactionClient) => {
      const result = await tx.virtualCoinAccount.updateMany({
        where: { userId, frozen: { gte: amountCoin } },
        data: { balance: { increment: amountCoin }, frozen: { decrement: amountCoin } },
      });
      if (result.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "冻结币数不足");

      if (refId) {
        await tx.virtualCoinFrozen.updateMany({
          where: { refId, userId, status: "FROZEN" },
          data: { status: "UNFROZEN", resolvedAt: new Date() },
        });
      }

      const acc = await tx.virtualCoinAccount.findUnique({ where: { userId } });
      return { frozen: acc!.frozen, balance: acc!.balance };
    };

    if (prismaTx) return run(prismaTx);
    return this.prisma.$transaction(run);
  }

  /** 转移冻结币（从冻结方转给接收方）。调用方可传入 prismaTx 合并到外层事务。 */
  async transferFrozen(fromUserId: string, toUserId: string, amountCoin: number, refId?: string, prismaTx?: Prisma.TransactionClient) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "转移币数必须大于0");

    await this.getOrCreateAccount(toUserId);

    const run = async (tx: Prisma.TransactionClient) => {
      const decResult = await tx.virtualCoinAccount.updateMany({
        where: { userId: fromUserId, frozen: { gte: amountCoin } },
        data: { frozen: { decrement: amountCoin } },
      });
      if (decResult.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "冻结币数不足");

      await tx.virtualCoinAccount.update({
        where: { userId: toUserId },
        data: { balance: { increment: amountCoin } },
      });

      if (refId) {
        await tx.virtualCoinFrozen.updateMany({
          where: { refId, userId: fromUserId, status: "FROZEN" },
          data: { status: "TRANSFERRED", resolvedAt: new Date() },
        });
      }

      const toAcc = await tx.virtualCoinAccount.findUnique({ where: { userId: toUserId } });
      await tx.virtualCoinTransaction.create({
        data: {
          userId: toUserId,
          type: "RECHARGE",
          amountCoin,
          balanceAfter: toAcc!.balance,
          scene: "BOUNTY" as any,
          refId,
          description: "悬赏赏金到账",
        },
      });

      const fromAcc = await tx.virtualCoinAccount.findUnique({ where: { userId: fromUserId } });
      return { fromFrozen: fromAcc!.frozen, toBalance: toAcc!.balance };
    };

    if (prismaTx) return run(prismaTx);
    return this.prisma.$transaction(run);
  }
}
