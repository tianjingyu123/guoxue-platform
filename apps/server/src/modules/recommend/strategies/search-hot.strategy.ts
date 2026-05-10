import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

@Injectable()
export class SearchHotStrategy extends BaseRecommendStrategy {
  name = "search-hot";

  constructor(private prisma: PrismaService) {
    super();
  }

  supports(scene: RecommendScene): boolean {
    return scene === RecommendScene.SEARCH_EMPTY;
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    // 查询近 7 天热门搜索词（从 RecommendLog 中聚合搜索行为）
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const searchBehaviors = await this.prisma.userBehavior.findMany({
      where: { behavior: "SEARCH", createdAt: { gte: since } },
      select: { targetId: true },
      take: 500,
    });

    // 聚合热门搜索词频次
    const freq = new Map<string, number>();
    for (const b of searchBehaviors) {
      freq.set(b.targetId, (freq.get(b.targetId) ?? 0) + 1);
    }

    const hotWords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (hotWords.length === 0) return [];

    // 返回热门搜索词作为推荐项
    return hotWords.map(([word, count]) => ({
      id: `hot_${Buffer.from(word).toString("base64").slice(0, 12)}`,
      type: "CONTENT" as const,
      title: word,
      score: count * 10,
      reason: "热门搜索",
      strategies: ["search-hot"],
      metadata: { searchWord: word, searchCount: count },
    }));
  }
}
