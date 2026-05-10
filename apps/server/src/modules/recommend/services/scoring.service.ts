import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RecommendItem } from "../strategies/base.strategy";

/**
 * 集中评分服务
 * 在策略生成基础分后，叠加运营加权 + 会员加权 + CTR 自适应
 */
@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}

  /** 会员等级加权系数 */
  private readonly memberLevelBoost: Record<string, number> = {
    NONE: 1.0,
    SILVER: 1.05,
    GOLD: 1.1,
    PLATINUM: 1.2,
    DIAMOND: 1.3,
  };

  /** 根据会员等级获取加权系数 */
  async getUserLevelBoost(userId?: string): Promise<number> {
    if (!userId) return 1.0;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true },
    });

    return this.memberLevelBoost[user?.memberLevel ?? "NONE"] ?? 1.0;
  }

  /** 对推荐列表应用会员加权 */
  applyMemberBoost(items: RecommendItem[], levelBoost: number): RecommendItem[] {
    if (levelBoost <= 1.0) return items;

    return items.map((item) => ({
      ...item,
      score: Math.round(item.score * levelBoost * 100) / 100,
      strategies: levelBoost > 1.05 ? [...item.strategies, "member-boost"] : item.strategies,
    }));
  }

  /** 归一化分数到 0-1000 区间 */
  normalize(items: RecommendItem[]): RecommendItem[] {
    if (items.length === 0) return items;

    const scores = items.map((i) => i.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    if (max === min) return items.map((i) => ({ ...i, score: 500 }));

    return items.map((i) => ({
      ...i,
      score: Math.round(((i.score - min) / (max - min)) * 1000),
    }));
  }

  /** 综合评分流水线：会员加权 → 归一化 */
  async score(
    items: RecommendItem[],
    userId?: string,
  ): Promise<RecommendItem[]> {
    const levelBoost = await this.getUserLevelBoost(userId);
    let scored = this.applyMemberBoost(items, levelBoost);
    scored = this.normalize(scored);
    return scored;
  }
}
