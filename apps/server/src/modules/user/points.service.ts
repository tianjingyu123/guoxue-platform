import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

const GROWTH_LEVELS = [0, 100, 300, 600, 1000, 2000, 5000, 10000, 20000, 50000];

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  private calcLevel(value: number): number {
    let level = 1;
    for (let i = 0; i < GROWTH_LEVELS.length; i++) {
      if (value >= GROWTH_LEVELS[i]) level = i + 1;
    }
    return level;
  }

  async getPoints(userId: string) {
    let points = await this.prisma.userPoints.findUnique({ where: { userId } });
    if (!points) {
      points = await this.prisma.userPoints.create({ data: { userId } });
    }
    return points;
  }

  async getPointsRecords(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.pointsRecord.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.pointsRecord.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async earnPoints(userId: string, amount: number, source: string, description?: string) {
    const points = await this.prisma.userPoints.upsert({
      where: { userId },
      update: { balance: { increment: amount }, totalEarned: { increment: amount } },
      create: { userId, balance: amount, totalEarned: amount },
    });
    await this.prisma.pointsRecord.create({
      data: { userId, amount, type: "EARN", source, description },
    });
    return points;
  }

  async spendPoints(userId: string, amount: number, source: string, description?: string) {
    const points = await this.getPoints(userId);
    if (points.balance < amount) throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "积分不足");
    const updated = await this.prisma.userPoints.update({
      where: { userId },
      data: { balance: { decrement: amount }, totalSpent: { increment: amount } },
    });
    await this.prisma.pointsRecord.create({
      data: { userId, amount, type: "SPEND", source, description },
    });
    return updated;
  }

  // ───────── 积分商城 ─────────

  /** 积分商城商品列表（上架，按排序） */
  async getProducts() {
    return this.prisma.pointsProduct.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * 积分兑换：事务内扣积分 + 原子减库存 + 建兑换记录。
   * MVP：发放状态为 PENDING（实物发货 / 券 / 会员由运营后台发放；即时发放为二阶段）。
   */
  async exchangeProduct(userId: string, productId: string) {
    const product = await this.prisma.pointsProduct.findUnique({ where: { id: productId } });
    if (!product || product.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.NOT_FOUND, "积分商品不存在或已下架");
    }
    if (product.stock === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该商品已兑完");
    }
    return this.prisma.$transaction(async (tx) => {
      // 原子 CAS 扣积分：仅当余额充足时扣减，防并发读-改-写透支/双花(库存已 CAS，余额此前遗漏)
      const dec = await tx.userPoints.updateMany({
        where: { userId, balance: { gte: product.points } },
        data: { balance: { decrement: product.points }, totalSpent: { increment: product.points } },
      });
      if (dec.count === 0) {
        throw new BusinessException(ErrorCode.COIN_BALANCE_INSUFFICIENT, "积分不足");
      }
      await tx.pointsRecord.create({
        data: { userId, amount: product.points, type: "SPEND", source: "EXCHANGE", description: `兑换${product.title}` },
      });
      // 限量商品原子减库存（条件更新防超卖；-1 表示不限量不减）
      if (product.stock > 0) {
        const dec = await tx.pointsProduct.updateMany({
          where: { id: productId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (dec.count === 0) {
          throw new BusinessException(ErrorCode.BAD_REQUEST, "该商品已兑完");
        }
      }
      const reward =
        product.type === "GIFT" ? "实物奖励将由客服联系发货"
          : product.type === "COIN" ? "国学币将发放到账户"
            : product.type === "COUPON" ? "优惠券将发放到卡券中心"
              : product.type === "VIP" ? "会员权益将开通到账户"
                : "奖励将发放";
      const record = await tx.pointsExchangeRecord.create({
        data: { userId, productId, pointsCost: product.points, status: "PENDING", reward },
      });
      const after = await tx.userPoints.findUnique({ where: { userId }, select: { balance: true } });
      return { success: true, recordId: record.id, reward, balance: after?.balance ?? 0 };
    });
  }

  async getGrowth(userId: string) {
    let gv = await this.prisma.growthValue.findUnique({ where: { userId } });
    if (!gv) {
      gv = await this.prisma.growthValue.create({ data: { userId } });
    }
    const level = this.calcLevel(gv.value);
    const nextLevelValue = GROWTH_LEVELS[level] || GROWTH_LEVELS[GROWTH_LEVELS.length - 1];
    return { ...gv, level, nextLevelValue };
  }

  async getGrowthRecords(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.growthRecord.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.growthRecord.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async addGrowth(userId: string, amount: number, source: string, description?: string) {
    const gv = await this.prisma.growthValue.upsert({
      where: { userId },
      update: { value: { increment: amount } },
      create: { userId, value: amount, level: 1 },
    });
    await this.prisma.growthRecord.create({ data: { userId, amount, source, description } });
    const level = this.calcLevel(gv.value);
    if (level > gv.level) {
      await this.prisma.growthValue.update({ where: { userId }, data: { level } });
    }
    return { ...gv, level };
  }
}
