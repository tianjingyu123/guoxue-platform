import { Injectable } from "@nestjs/common";
import {
  BaseRecommendStrategy,
  RecommendContext,
  RecommendItem,
} from "./base.strategy";
import { RecommendScene } from "../recommend.dto";

/**
 * 向量召回策略（预留接口）
 *
 * 后续接入向量数据库（Milvus/Qdrant/PGVector）后：
 * 1. 内容入库时生成 embedding（文本 + 标签 + 元数据）
 * 2. 用户画像向量 = 用户兴趣标签加权平均
 * 3. 在线召回 = ANN 搜索 top-k
 * 4. 本体实现替换此类即可
 */
export interface VectorRecallProvider {
  /** 根据文本/标签生成向量 */
  embed(texts: string[]): Promise<number[][]>;

  /** ANN 搜索相似内容 */
  search(
    queryVector: number[],
    topK: number,
    filter?: { type?: string; excludeIds?: string[] },
  ): Promise<{ id: string; type: string; score: number }[]>;

  /** 构建用户兴趣向量 */
  buildUserVector(userId: string): Promise<number[] | null>;
}

@Injectable()
export class VectorRecallStrategy extends BaseRecommendStrategy {
  name = "vector-recall";

  // 向量召回提供者，默认为 null（未接入）
  private provider: VectorRecallProvider | null = null;

  supports(_scene: RecommendScene): boolean {
    // 向量召回需要 provider 才可用
    return this.provider !== null;
  }

  /** 注册向量召回提供者 */
  setProvider(provider: VectorRecallProvider) {
    this.provider = provider;
  }

  async recommend(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!this.provider || !ctx.userId) return [];

    let queryVector: number[] | null = null;

    if (ctx.contentId) {
      // 基于内容向量召回相似内容
      const embedResult = await this.provider.embed([ctx.contentId]);
      queryVector = embedResult[0];
    } else {
      // 基于用户画像向量召回
      queryVector = await this.provider.buildUserVector(ctx.userId);
    }

    if (!queryVector) return [];

    const results = await this.provider.search(queryVector, ctx.pageSize, {
      excludeIds: ctx.excludeIds,
    });

    // 返回原始召回结果（详情由调用方填充）
    return results.map((r) => ({
      id: r.id,
      type: r.type as RecommendItem["type"],
      title: "",
      score: r.score,
      reason: "向量召回",
      strategies: ["vector-recall"],
      metadata: { similarityScore: r.score },
    }));
  }
}
