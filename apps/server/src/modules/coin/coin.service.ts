import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class CoinService {
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
    if (dto.amountCoin <= 0) throw new BadRequestException("充值币数必须大于0");

    const account = await this.getOrCreateAccount(userId);
    const newBalance = account.balance + dto.amountCoin;

    // 事务: 更新账户 + 创建充值记录 + 创建流水
    const [updatedAccount, recharge, transaction] = await this.prisma.$transaction([
      this.prisma.virtualCoinAccount.update({
        where: { userId },
        data: { balance: newBalance, totalRecharged: { increment: dto.amountCoin } },
      }),
      this.prisma.virtualCoinRecharge.create({
        data: {
          userId,
          amountRmb: dto.amountCoin / 10, // 10币=1元
          amountCoin: dto.amountCoin,
          payMethod: dto.payMethod || "ADMIN",
          orderNo: dto.orderNo || `ADMIN_${Date.now()}`,
          status: "PAID",
          paidAt: new Date(),
        },
      }),
      this.prisma.virtualCoinTransaction.create({
        data: {
          userId,
          type: "RECHARGE",
          amountCoin: dto.amountCoin,
          balanceAfter: newBalance,
          scene: "RECHARGE",
          description: dto.description || "充值",
        },
      }),
    ]);

    return { account: updatedAccount, recharge, transaction };
  }

  /** 消费虚拟币 */
  async spend(userId: string, dto: { amountCoin: number; scene: string; refId?: string; description?: string }) {
    if (dto.amountCoin <= 0) throw new BadRequestException("消费币数必须大于0");

    const account = await this.getOrCreateAccount(userId);
    if (account.balance < dto.amountCoin) {
      throw new BadRequestException("虚拟币余额不足");
    }

    const newBalance = account.balance - dto.amountCoin;

    const [updatedAccount, transaction] = await this.prisma.$transaction([
      this.prisma.virtualCoinAccount.update({
        where: { userId },
        data: { balance: newBalance, totalSpent: { increment: dto.amountCoin } },
      }),
      this.prisma.virtualCoinTransaction.create({
        data: {
          userId,
          type: "SPEND",
          amountCoin: -dto.amountCoin,
          balanceAfter: newBalance,
          scene: dto.scene as any,
          refId: dto.refId,
          description: dto.description,
        },
      }),
    ]);

    return { account: updatedAccount, transaction };
  }

  /** 退款（平台赠送等） */
  async refund(userId: string, amountCoin: number, description: string) {
    if (amountCoin <= 0) throw new BadRequestException("退款币数必须大于0");

    const account = await this.getOrCreateAccount(userId);
    const newBalance = account.balance + amountCoin;

    const [updatedAccount, transaction] = await this.prisma.$transaction([
      this.prisma.virtualCoinAccount.update({
        where: { userId },
        data: { balance: newBalance },
      }),
      this.prisma.virtualCoinTransaction.create({
        data: {
          userId,
          type: "REFUND",
          amountCoin,
          balanceAfter: newBalance,
          scene: "REFUND",
          description,
        },
      }),
    ]);

    return { account: updatedAccount, transaction };
  }

  /** 交易流水 */
  async getTransactions(userId: string, page = 1, pageSize = 20, type?: string, scene?: string) {
    const where: any = { userId };
    if (type) where.type = type;
    if (scene) where.scene = scene;

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
    const where: any = {};
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
  async createGift(dto: { name: string; icon?: string; priceCoin: number; level?: string; effectUrl?: string; sortOrder?: number }) {
    return this.prisma.gift.create({ data: dto as any });
  }

  /** 打赏 */
  async sendGift(userId: string, liveRoomId: string, toUserId: string, giftId: string, quantity = 1) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new NotFoundException("礼物不存在");

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
}
