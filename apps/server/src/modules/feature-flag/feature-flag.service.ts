import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { createHash } from "crypto";

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cacheTtl = 30; // Redis 缓存 30 秒

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** 查询功能开关是否对指定用户启用 */
  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlag(key);
    if (!flag) return false;

    // 关闭状态直接拒绝
    if (!flag.enabled) return false;

    // 用户白名单优先
    if (userId && flag.targetUserIds.includes(userId)) return true;

    // 百分比灰度：使用 userId hash 保证同一用户结果一致
    if (flag.percentage < 100 && userId) {
      const bucket = this.hashBucket(userId, key);
      return bucket < flag.percentage;
    }

    // 100% 开启
    return flag.percentage === 100;
  }

  /** 列出所有功能开关 */
  async list() {
    const cacheKey = "feature:list";
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    await this.redis.setJson(cacheKey, flags, 60);
    return flags;
  }

  /** 获取单个开关 */
  async getByKey(key: string) {
    return this.getFlag(key);
  }

  /** 创建或更新开关 */
  async upsert(key: string, dto: {
    name?: string;
    description?: string;
    enabled?: boolean;
    percentage?: number;
    targetUserIds?: string[];
  }) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        name: dto.name ?? key,
        description: dto.description,
        enabled: dto.enabled ?? false,
        percentage: dto.percentage ?? 100,
        targetUserIds: dto.targetUserIds ?? [],
      },
      update: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.percentage !== undefined && { percentage: dto.percentage }),
        ...(dto.targetUserIds !== undefined && { targetUserIds: dto.targetUserIds }),
      },
    });

    await this.invalidateCaches(key);

    return flag;
  }

  /** 删除开关 */
  async delete(key: string) {
    await this.prisma.featureFlag.delete({ where: { key } }).catch((err) => this.logger.warn("功能开关删除失败", err));
    await this.invalidateCaches(key);
  }

  // ─── 私有方法 ───

  private async invalidateCaches(key: string) {
    await Promise.all([
      this.redis.del(`feature:${key}`),
      this.redis.del("feature:list"),
    ]).catch((err) => this.logger.warn("功能开关缓存失效失败", err));
  }

  private async getFlag(key: string) {
    const cacheKey = `feature:${key}`;

    // 1. Redis 缓存
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    // 2. 数据库
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (flag) {
      await this.redis.setJson(cacheKey, flag, this.cacheTtl);
    }

    return flag;
  }

  /** 一致性 hash 分桶：相同用户+相同开关永远落在相同桶 */
  private hashBucket(userId: string, key: string): number {
    const hash = createHash("md5").update(`${userId}:${key}`).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % 100;
  }
}
