import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { COIN_TO_RMB } from "../../common/constants";

@Injectable()
export class CoinService {
  private readonly logger = new Logger(CoinService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

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
    return { userId, balance: account.balance, totalRecharged: account.totalRecharged, totalSpent: account.totalSpent };
  }

  /** 充值（管理员手动充值 或 支付回调触发） */
  async recharge(userId: string, dto: { amountCoin: number; payMethod?: string; orderNo?: string; description?: string }) {
    if (dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "充值币数必须大于0");

    await this.getOrCreateAccount(userId);

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
          amountRmb: dto.amountCoin / COIN_TO_RMB,
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

  /** 消费虚拟币（交互式事务 + 原子扣减防超额） */
  async spend(userId: string, dto: { amountCoin: number; scene: string; refId?: string; description?: string }) {
    if (dto.amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "消费币数必须大于0");

    await this.getOrCreateAccount(userId);

    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  /** 退款（平台赠送等，交互式事务 + 原子增量） */
  async refund(userId: string, amountCoin: number, description: string) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "退款币数必须大于0");

    await this.getOrCreateAccount(userId);

    return this.prisma.$transaction(async (tx) => {
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
    });
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

  /** 充值档位配置 */
  getRechargeTiers() {
    return [
      { amountRmb: 6, amountCoin: 60, bonus: 0 },
      { amountRmb: 18, amountCoin: 180, bonus: 0 },
      { amountRmb: 68, amountCoin: 680, bonus: 0 },
      { amountRmb: 198, amountCoin: 1980, bonus: 0 },
      { amountRmb: 648, amountCoin: 6480, bonus: 0 },
    ];
  }

  /** 礼物列表 */
  async getGifts() {
    return this.prisma.gift.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** 创建礼物（管理员） */
  async createGift(dto: { name: string; icon?: string; iconUrl?: string; price?: number; priceCoin?: number; level?: string; animationType?: string; effectUrl?: string; sort?: number; sortOrder?: number }) {
    const data: Prisma.GiftCreateInput = {
      name: dto.name,
      icon: dto.icon || dto.iconUrl || "",
      priceCoin: dto.priceCoin ?? dto.price ?? 0,
      level: dto.level || dto.animationType || dto.effectUrl || "",
      sortOrder: dto.sortOrder ?? dto.sort ?? 0,
    };
    return this.prisma.gift.create({ data });
  }

  /** 更新礼物（管理员） */
  async updateGift(giftId: string, dto: { name?: string; icon?: string; iconUrl?: string; price?: number; priceCoin?: number; level?: string; animationType?: string; effectUrl?: string; sort?: number; sortOrder?: number }) {
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
    return this.prisma.gift.update({ where: { id: giftId }, data });
  }

  /** 删除礼物（管理员） */
  async deleteGift(giftId: string) {
    await this.prisma.gift.delete({ where: { id: giftId } });
    return { success: true };
  }

  /** 打赏 */
  async sendGift(userId: string, liveRoomId: string, toUserId: string, giftId: string, quantity = 1) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");

    const totalCoin = gift.priceCoin * quantity;

    // 扣减虚拟币
    await this.spend(userId, {
      amountCoin: totalCoin,
      scene: "LIVE_GIFT",
      refId: liveRoomId,
      description: `赠送 ${gift.name} x${quantity}`,
    });

    // 记录打赏
    return this.prisma.giftRecord.create({
      data: { userId, liveRoomId, toUserId, giftId, quantity, totalCoin },
    });
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

      const amountRmb = amountCoin / COIN_TO_RMB;

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
  async freeze(userId: string, amountCoin: number, scene: string, refId?: string) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "冻结币数必须大于0");

    await this.getOrCreateAccount(userId);

    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  /** 解冻虚拟币（归还原余额） */
  async unfreeze(userId: string, amountCoin: number, refId?: string) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "解冻币数必须大于0");

    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  /** 转移冻结币（从冻结方转给接收方） */
  async transferFrozen(fromUserId: string, toUserId: string, amountCoin: number, refId?: string) {
    if (amountCoin <= 0) throw new BusinessException(ErrorCode.COIN_AMOUNT_INVALID, "转移币数必须大于0");

    await this.getOrCreateAccount(toUserId);

    return this.prisma.$transaction(async (tx) => {
      // 减扣冻结方
      const decResult = await tx.virtualCoinAccount.updateMany({
        where: { userId: fromUserId, frozen: { gte: amountCoin } },
        data: { frozen: { decrement: amountCoin } },
      });
      if (decResult.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "冻结币数不足");

      // 增加接收方余额
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
    });
  }
}
