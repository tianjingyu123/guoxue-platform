import { Injectable } from "@nestjs/common";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

interface StrategyWeight {
  strategy: BaseRecommendStrategy;
  weight: number;
}

@Injectable()
export class MixedStrategy extends BaseRecommendStrategy {
  name = "mixed";
  private strategies: StrategyWeight[] = [];

  supports(_scene: RecommendScene): boolean {
    return true; // 混排作为兜底策略
  }

  /** 注册子策略及权重 */
  use(strategy: BaseRecommendStrategy, weight: number) {
    this.strategies.push({ strategy, weight });
    // 按权重降序排列
    this.strategies.sort((a, b) => b.weight - a.weight);
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (this.strategies.length === 0) return [];

    // 并行执行所有子策略
    const results = await Promise.all(
      this.strategies.map(async ({ strategy, weight }) => {
        if (!strategy.supports(ctx.scene)) return [];
        try {
          const items = await strategy.recommend(ctx);
          // 按权重缩放分数
          return items.map((item) => ({
            ...item,
            score: item.score * weight,
            strategies: [...item.strategies, "mixed"],
          }));
        } catch (err) {
          console.warn(`推荐策略执行失败`, err);
          return [];
        }
      }),
    );

    // 合并去重：相同 id+type 只保留最高分
    const merged = new Map<string, RecommendItem>();
    for (const batch of results) {
      for (const item of batch) {
        const key = `${item.type}:${item.id}`;
        const existing = merged.get(key);
        if (!existing || item.score > existing.score) {
          merged.set(key, item);
        }
      }
    }

    return [...merged.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, ctx.pageSize * 2);
  }
}
