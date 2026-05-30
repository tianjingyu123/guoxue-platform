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

  /**
   * 新鲜度衰减系数（牛顿冷却）
   * @param createdAt 内容创建时间
   * @param halfLifeDays 半衰期天数，默认 30 天
   */
  static freshnessDecay(createdAt?: Date | string, halfLifeDays = 30): number {
    if (!createdAt) return 0.9; // 无时间信息默认偏中性
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / (24 * 3600 * 1000);
    return 1 / (1 + ageDays / halfLifeDays);
  }

  /** 对推荐列表应用新鲜度加权 */
  applyFreshnessBoost(items: RecommendItem[]): RecommendItem[] {
    return items.map((item) => {
      const freshness = ScoringService.freshnessDecay(item.createdAt);
      return {
        ...item,
        score: Math.round(item.score * freshness * 100) / 100,
        strategies: freshness < 0.5 ? [...item.strategies, "freshness-boost"] : item.strategies,
      };
    });
  }

  /** 综合评分流水线：新鲜度 → 会员加权 → 归一化 */
  async score(
    items: RecommendItem[],
    userId?: string,
  ): Promise<RecommendItem[]> {
    let scored = this.applyFreshnessBoost(items);
    const levelBoost = await this.getUserLevelBoost(userId);
    scored = this.applyMemberBoost(scored, levelBoost);
    scored = this.normalize(scored);
    return scored;
  }
}
