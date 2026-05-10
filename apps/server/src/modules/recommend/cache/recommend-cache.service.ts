import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../redis/redis.service";
import { RecommendScene } from "../recommend.dto";

@Injectable()
export class RecommendCacheService {
  constructor(private redis: RedisService) {}

  // 构建缓存键
  buildKey(params: {
    scene: RecommendScene;
    userId?: string;
    contentId?: string;
    paipanType?: string;
    listType?: string;
    page: number;
    pageSize: number;
  }): string {
    const parts = [params.contentId, params.paipanType, params.listType, params.page, params.pageSize]
      .map((v) => v ?? "_")
      .join(":");
    return `recommend:${params.scene}:${params.userId ?? "anonymous"}:${parts}:v1`;
  }

  // 获取推荐缓存
  async get<T>(key: string): Promise<T | null> {
    return this.redis.getJson<T>(key);
  }

  // 设置推荐缓存
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    await this.redis.setJson(key, data, ttlSeconds);
  }

  // 按场景清除缓存
  async clearByScene(scene: RecommendScene): Promise<void> {
    await this.redis.delByPattern(`recommend:${scene}:*`);
  }

  // 清除用户相关缓存
  async clearByUser(userId: string): Promise<void> {
    await this.redis.delByPattern(`recommend:*:${userId}:*`);
  }

  // 清除去重缓存
  async clearDedup(userId: string): Promise<void> {
    await this.redis.del(`recommend:dedup:${userId}`);
  }

  // 清除运营规则缓存
  async clearRules(): Promise<void> {
    await this.redis.del("recommend:rules:active");
  }
}
