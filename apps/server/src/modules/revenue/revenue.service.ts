import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const COIN_TO_RMB = 10; // 10币 = ¥1

// 分佣比例（可通过 CommissionConfig 动态读取，此处为默认值）
const DEFAULT_RATES = {
  QUESTION: 0.8,   // 回答者 80%
  PEEK:    0.7,   // 围观回答者 70%
  AUDIO_CALL: 0.7, // 连麦嘉宾 70%
  LIVE_GIFT: 0.6,  // 主播 60%
};

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  /**
   * 记录收益并返回记录
   */
  async record(params: {
    userId: string;
    scene: "QUESTION" | "PEEK" | "AUDIO_CALL" | "LIVE_GIFT";
    refId: string;
    amountCoin: number;
    rate?: number;
  }) {
    const rate = params.rate ?? DEFAULT_RATES[params.scene];
    const amountRmb = (params.amountCoin / COIN_TO_RMB) * rate;

    return this.prisma.userEarning.create({
      data: {
        userId: params.userId,
        scene: params.scene,
        refId: params.refId,
        amountCoin: params.amountCoin,
        amountRmb: Math.round(amountRmb * 100) / 100,
        rate,
      },
    });
  }

  /** 查询用户收益汇总 */
  async getUserSummary(userId: string) {
    const [total, byScene] = await Promise.all([
      this.prisma.userEarning.aggregate({
        where: { userId },
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
      this.prisma.userEarning.groupBy({
        by: ["scene"],
        where: { userId },
        _sum: { amountRmb: true },
      }),
    ]);

    return {
      totalRmb: total._sum.amountRmb || 0,
      totalCoin: total._sum.amountCoin || 0,
      totalCount: total._count,
      byScene: byScene.map((s) => ({
        scene: s.scene,
        rmb: s._sum.amountRmb || 0,
      })),
    };
  }

  /** 查询用户收益明细 */
  async getUserEarnings(userId: string, page = 1, pageSize = 20) {
    const [earnings, total] = await Promise.all([
      this.prisma.userEarning.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userEarning.count({ where: { userId } }),
    ]);
    return { earnings, total, page, pageSize };
  }
}
