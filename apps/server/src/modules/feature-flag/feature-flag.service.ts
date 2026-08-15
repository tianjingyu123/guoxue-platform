import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { createHash } from "crypto";
import { FEATURE_FLAG_KEY_PATTERN } from "./feature-flag.dto";
import { Prisma } from "@prisma/client";

const CLIENT_VISIBLE_LEGACY_FLAGS = new Set([
  "live_start",
  "member_purchase",
  "merchant_onboarding",
  "shop_checkout",
]);

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

  /**
   * 返回允许客户端感知的开关。服务端风控、审核和内部运维开关不得进入公开响应。
   * 新增客户端开关统一使用 client_ 前缀；少量既有业务开关保留显式白名单兼容。
   */
  async getClientFeatures(userId?: string): Promise<Record<string, boolean>> {
    const flags = await this.list();
    const visibleFlags = flags.filter((flag: { key: string }) =>
      flag.key.startsWith("client_") || CLIENT_VISIBLE_LEGACY_FLAGS.has(flag.key),
    );
    const entries = await Promise.all(
      visibleFlags.map(async (flag: { key: string }) => [
        flag.key,
        await this.isEnabled(flag.key, userId),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  /** 获取单个开关 */
  async getByKey(key: string) {
    return this.getFlag(key);
  }

  /** 创建或更新开关 */
  async upsert(key: string, dto: {
    name?: string;
    description?: string | null;
    enabled?: boolean;
    percentage?: number;
    targetUserIds?: string[];
  }, changedBy?: string) {
    this.assertValidKey(key);
    const targetUserIds = dto.targetUserIds === undefined
      ? undefined
      : [...new Set(dto.targetUserIds.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
    const flag = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.featureFlag.findUnique({ where: { key } });
      const saved = await tx.featureFlag.upsert({
        where: { key },
        create: {
          key,
          name: dto.name ?? key,
          description: dto.description,
          enabled: dto.enabled ?? false,
          percentage: dto.percentage ?? 100,
          targetUserIds: targetUserIds ?? [],
        },
        update: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.enabled !== undefined && { enabled: dto.enabled }),
          ...(dto.percentage !== undefined && { percentage: dto.percentage }),
          ...(targetUserIds !== undefined && { targetUserIds }),
        },
      });
      const snapshot = this.toSnapshot(saved);
      const previousSnapshot = existing ? this.toSnapshot(existing) : null;
      if (JSON.stringify(snapshot) !== JSON.stringify(previousSnapshot)) {
        const configKey = this.historyKey(key);
        const latest = await tx.configVersion.findFirst({
          where: { configKey },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        let nextVersion = latest?.version ?? 0;
        // 线上既有开关首次纳入版本管理时，先保存变更前状态；否则第一次
        // 修改虽然会显示“有历史”，却无法真正回滚到修改前的值。
        if (!latest && previousSnapshot) {
          await tx.configVersion.create({
            data: {
              configKey,
              value: previousSnapshot as Prisma.InputJsonValue,
              version: 1,
              comment: "首次纳入版本管理（变更前快照）",
            },
          });
          nextVersion = 1;
        }
        await tx.configVersion.create({
          data: {
            configKey,
            value: snapshot as Prisma.InputJsonValue,
            version: nextVersion + 1,
            changedBy,
            comment: existing ? "更新功能开关" : "创建功能开关",
          },
        });
      }
      return saved;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.invalidateCaches(key);

    return flag;
  }

  async getHistory(key: string) {
    this.assertValidKey(key);
    return this.prisma.configVersion.findMany({
      where: { configKey: this.historyKey(key) },
      orderBy: { version: "desc" },
      take: 50,
    });
  }

  async rollback(key: string, version: number, changedBy?: string) {
    this.assertValidKey(key);
    if (!Number.isInteger(version) || version < 1) {
      throw new BadRequestException("回滚版本号不合法");
    }
    const record = await this.prisma.configVersion.findFirst({
      where: { configKey: this.historyKey(key), version },
    });
    if (!record || !record.value || typeof record.value !== "object" || Array.isArray(record.value)) {
      throw new BadRequestException("功能开关历史版本不存在或内容无效");
    }
    const value = record.value as Record<string, unknown>;
    if (value.key !== key || typeof value.name !== "string") {
      throw new BadRequestException("功能开关历史快照校验失败");
    }
    return this.upsert(key, {
      name: value.name,
      description: typeof value.description === "string" ? value.description : null,
      enabled: value.enabled === true,
      percentage: typeof value.percentage === "number" ? value.percentage : 100,
      targetUserIds: Array.isArray(value.targetUserIds)
        ? value.targetUserIds.filter((id): id is string => typeof id === "string")
        : [],
    }, changedBy);
  }

  /** 删除开关 */
  async delete(key: string) {
    this.assertValidKey(key);
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

  private assertValidKey(key: string) {
    if (!FEATURE_FLAG_KEY_PATTERN.test(key)) {
      throw new BadRequestException("功能开关 key 格式不合法");
    }
  }

  private historyKey(key: string) {
    return `feature_flag:${key}`;
  }

  private toSnapshot(flag: {
    key: string;
    name: string;
    description?: string | null;
    enabled: boolean;
    percentage: number;
    targetUserIds: string[];
  }) {
    return {
      key: flag.key,
      name: flag.name,
      description: flag.description ?? null,
      enabled: flag.enabled,
      percentage: flag.percentage,
      targetUserIds: flag.targetUserIds,
    };
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
