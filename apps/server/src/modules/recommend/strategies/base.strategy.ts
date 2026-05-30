import { RecommendScene, RecommendItemVO } from "../recommend.dto";

export interface RecommendContext {
  userId?: string;
  stationId?: string;
  scene: RecommendScene;
  contentId?: string;
  targetTags?: string[];
  paipanType?: string;
  listType?: string;
  orderItemIds?: string[];
  excludeIds?: string[];
  page: number;
  pageSize: number;
}

export interface RecommendItem {
  id: string;
  type: "ARTICLE" | "COURSE" | "PRODUCT" | "CIRCLE" | "VIDEO" | "CONTENT" | "CLASSIC" | "EBOOK";
  title: string;
  cover?: string;
  excerpt?: string;
  tags?: string[];
  score: number;
  reason: string;
  strategies: string[];
  metadata?: Record<string, any>;
  createdAt?: Date | string;
}

export abstract class BaseRecommendStrategy {
  abstract name: string;
  abstract supports(scene: RecommendScene): boolean;
  abstract recommend(ctx: RecommendContext): Promise<RecommendItem[]>;
}

export function toRecommendItemVO(item: RecommendItem): RecommendItemVO {
  return {
    id: item.id,
    type: item.type as RecommendItemVO["type"],
    title: item.title,
    cover: item.cover,
    excerpt: item.excerpt,
    tags: item.tags,
    reason: item.reason,
    strategies: item.strategies,
    score: item.score,
    metadata: item.metadata,
  };
}
