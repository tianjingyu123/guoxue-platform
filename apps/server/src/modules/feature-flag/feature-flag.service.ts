import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";
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
  async isEnabled(key: string, userId?: string, missingDefault = false): Promise<boolean> {
    const flag = await this.getFlag(key);
    if (!flag) return missingDefault;

    return this.evaluateFlag(key, flag, userId);
  }

  private evaluateFlag(key: string, flag: { enabled: boolean; targetUserIds: string[]; percentage: number }, userId?: string) {

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

  /** 草稿预览只读主库，不保存草稿、不发布、不读写线上缓存。 */
  async preview(key: string, dto: {
    name?: string; description?: string; enabled?: boolean; percentage?: number;
    targetUserIds?: string[]; sampleUserId?: string;
  }) {
    this.assertValidKey(key);
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    const candidate = {
      key, name: dto.name ?? existing?.name ?? key,
      description: dto.description ?? existing?.description ?? null,
      enabled: dto.enabled ?? existing?.enabled ?? false,
      percentage: dto.percentage ?? existing?.percentage ?? 100,
      targetUserIds: dto.targetUserIds === undefined ? existing?.targetUserIds ?? []
        : [...new Set(dto.targetUserIds.map(id => id.trim()).filter(Boolean))].slice(0, 500),
    };
    return {
      previewOnly: true, published: false, exists: Boolean(existing),
      clientVisible: key.startsWith("client_") || CLIENT_VISIBLE_LEGACY_FLAGS.has(key),
      enabled: candidate.enabled, percentage: candidate.percentage,
      targetUserCount: candidate.targetUserIds.length,
      anonymousEnabled: this.evaluateFlag(key, candidate),
      sampleEnabled: dto.sampleUserId ? this.evaluateFlag(key, candidate, dto.sampleUserId) : null,
      // 指纹用于后续发布确认；当前预览本身不构成发布凭据或并发锁。
      baseFingerprint: createHash("sha256").update(JSON.stringify(existing ? this.toSnapshot(existing) : null)).digest("hex"),
      candidateFingerprint: createHash("sha256").update(JSON.stringify(this.toSnapshot(candidate))).digest("hex"),
    };
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
    // 管理员恢复结果不明的编辑时必须读主库，不能拿运行时缓存覆盖新配置。
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  /** 创建或更新开关 */
  async upsert(key: string, dto: {
    expectedFingerprint?: string;
    name?: string;
    description?: string | null;
    enabled?: boolean;
    percentage?: number;
    targetUserIds?: string[];
  }, changedBy?: string, createOnly = false) {
    this.assertValidKey(key);
    const targetUserIds = dto.targetUserIds === undefined
      ? undefined
      : [...new Set(dto.targetUserIds.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
    const flag = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.featureFlag.findUnique({ where: { key } });
      // 新增与编辑是不同操作；即使预览读到了同名记录，也不得覆盖它。
      if (createOnly && existing) {
        throw new ConflictException("该开关标识已存在，请返回列表编辑，或使用新的标识");
      }
      if (dto.expectedFingerprint !== undefined) {
        const actual = createHash("sha256").update(JSON.stringify(existing ? this.toSnapshot(existing) : null)).digest("hex");
        if (dto.expectedFingerprint !== actual) {
          throw new ConflictException("配置已被其他管理员修改，请重新加载并预览后发布");
        }
      }
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" || (createOnly && error.code === "P2002"))) {
        // 不自动重试旧意图，必须让管理员重新核对当前配置。
        throw new ConflictException("配置正在被其他管理员修改，请重新加载并预览后发布");
      }
      throw error;
    });

    await this.invalidateCaches(key);

    return flag;
  }

  /** 只向管理员列出有历史但当前不存在的开关，不下发指定用户名单。 */
  async listArchived() {
    const [current, history] = await Promise.all([
      this.prisma.featureFlag.findMany({ select: { key: true } }),
      this.prisma.configVersion.findMany({
        where: { configKey: { startsWith: "feature_flag:" } },
        distinct: ["configKey"], orderBy: [{ configKey: "asc" }, { version: "desc" }],
        select: { configKey: true, value: true, version: true },
      }),
    ]);
    const active = new Set(current.map(row => row.key));
    return history.flatMap(row => {
      const key = row.configKey.slice("feature_flag:".length);
      if (!FEATURE_FLAG_KEY_PATTERN.test(key) || active.has(key)) return [];
      const snapshot = row.value as Record<string, unknown> | null;
      return [{ key, name: snapshot && typeof snapshot.name === "string" ? snapshot.name : key, version: row.version }];
    });
  }

  async getHistory(key: string) {
    this.assertValidKey(key);
    return this.prisma.configVersion.findMany({
      where: { configKey: this.historyKey(key) },
      orderBy: { version: "desc" },
      take: 50,
    });
  }

  async rollback(key: string, version: number, changedBy?: string, expectedFingerprint?: string) {
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
    if (value.key !== key || typeof value.name !== "string" || !value.name.trim() || value.name.length > 80 ||
        (value.description !== null && value.description !== undefined &&
          (typeof value.description !== "string" || value.description.length > 500)) ||
        typeof value.enabled !== "boolean" || !Number.isInteger(value.percentage) ||
        (value.percentage as number) < 0 || (value.percentage as number) > 100 ||
        !Array.isArray(value.targetUserIds) || value.targetUserIds.length > 500 ||
        !value.targetUserIds.every(id => typeof id === "string" && id.trim().length > 0)) {
      throw new BadRequestException("功能开关历史快照校验失败");
    }
    return this.upsert(key, {
      ...(expectedFingerprint !== undefined && { expectedFingerprint }),
      name: value.name,
      description: typeof value.description === "string" ? value.description : null,
      enabled: value.enabled,
      percentage: value.percentage as number,
      targetUserIds: value.targetUserIds as string[],
    }, changedBy);
  }

  /** 删除开关 */
  async delete(key: string, expectedFingerprint?: string) {
    this.assertValidKey(key);
    if (expectedFingerprint !== undefined) {
      await this.prisma.$transaction(async tx => {
        const existing = await tx.featureFlag.findUnique({ where: { key } });
        const actual = createHash("sha256").update(JSON.stringify(existing ? this.toSnapshot(existing) : null)).digest("hex");
        if (actual !== expectedFingerprint) throw new ConflictException("配置已变化，请重新加载并确认后删除");
        if (existing) await tx.featureFlag.delete({ where: { key } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(error.code)) {
          throw new ConflictException("配置正在变化，请重新加载并确认后删除");
        }
        throw error;
      });
      await this.invalidateCaches(key);
      return;
    }
    await this.prisma.featureFlag.delete({ where: { key } }).catch((error: unknown) => {
      // 已不存在可按幂等完成处理；权限/连接/数据库故障不能伪装成删除成功。
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return;
      throw error;
    });
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
