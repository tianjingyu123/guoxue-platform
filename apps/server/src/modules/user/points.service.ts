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
