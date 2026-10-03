import { BadRequestException, Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { randomUUID } from "crypto";
import { FEATURE_FLAG_KEY_PATTERN } from "./feature-flag.dto";
import { Prisma } from "@prisma/client";
import { DistributionService } from "../system/distribution.service";
import { DistributionScope } from "../system/distribution.util";
import { evaluateOperation, OperationState } from "./operation.util";
import { UpsertFeatureFlagDto } from "./feature-flag.dto";

const CLIENT_VISIBLE_LEGACY_FLAGS = new Set([
  "live_start",
  "member_purchase",
  "merchant_onboarding",
  "shop_checkout",
]);
const OPTIONAL_CLIENT_OPERATIONS = [
  "client_course_purchase",
  "client_circle_join",
  "client_agent_purchase",
];

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cacheTtl = 30; // Redis 缓存 30 秒

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() private distributions?: DistributionService,
  ) {}

  /** 查询功能开关是否对指定用户启用 */
  async isEnabled(
    key: string,
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ): Promise<boolean> {
    return (await this.getOperationState(key, userId, scope, nativeBuild)) === "OPEN";
  }

  async requestScope(req: { headers?: Record<string, unknown> }) {
    return this.distributions?.requestScope(req) || null;
  }
  /** 新增可选运营开关未配置时保留既有业务；全局急停、已配置状态和原有授权仍优先。 */
  async getConfiguredOperationState(
    key: string,
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ): Promise<OperationState> {
    const emergency = await this.prisma.featureFlag.findUnique({
      where: { key: "client_emergency_close" },
    });
    if (emergency?.enabled) return "UNOPENED";
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    return flag ? evaluateOperation(flag, userId, scope, nativeBuild) : "OPEN";
  }

  async getOperationState(
    key: string,
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ): Promise<OperationState> {
    // 业务判断读主库，避免 Redis 失效失败/TTL 被误认为紧急关闭已立即生效。
    const emergency = await this.prisma.featureFlag.findUnique({
      where: { key: "client_emergency_close" },
    });
    if (
      key !== "client_emergency_close" &&
      emergency?.key === "client_emergency_close" &&
      emergency.enabled
    )
      return "UNOPENED";
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) return "UNOPENED";
    return evaluateOperation(flag, userId, scope, nativeBuild);
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
  async getClientFeatures(
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ): Promise<Record<string, boolean>> {
    const flags = await this.list();
    const visibleFlags = flags.filter(
      (flag: { key: string }) =>
        flag.key.startsWith("client_") || CLIENT_VISIBLE_LEGACY_FLAGS.has(flag.key),
    );
    const entries = await Promise.all(
      visibleFlags.map(
        async (flag: { key: string }) =>
          [flag.key, await this.isEnabled(flag.key, userId, scope, nativeBuild)] as const,
      ),
    );
    for (const key of OPTIONAL_CLIENT_OPERATIONS)
      entries.push([
        key,
        (await this.getConfiguredOperationState(key, userId, scope, nativeBuild)) === "OPEN",
      ]);
    return Object.fromEntries(entries);
  }

  async getClientOperations(
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ) {
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    const visible = flags.filter(
      (f) => f.key.startsWith("client_") || CLIENT_VISIBLE_LEGACY_FLAGS.has(f.key),
    );
    const entries = await Promise.all(
      visible.map(async (f) => [
        f.key,
        await this.getOperationState(f.key, userId, scope, nativeBuild),
      ]),
    );
    for (const key of OPTIONAL_CLIENT_OPERATIONS)
      entries.push([key, await this.getConfiguredOperationState(key, userId, scope, nativeBuild)]);
    return Object.fromEntries(entries);
  }

  /** 获取单个开关 */
  async getByKey(key: string) {
    return this.getFlag(key);
  }

  /** 创建或更新开关 */
  async upsert(
    key: string,
    dto: Omit<UpsertFeatureFlagDto, "description"> & { description?: string | null },
    changedBy?: string,
  ) {
    this.assertValidKey(key);
    const targetUserIds =
      dto.targetUserIds === undefined
        ? undefined
        : [...new Set(dto.targetUserIds.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
    const flag = await this.prisma.$transaction(
      async (tx) => {
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
            operationState: dto.operationState ?? "OPEN",
            emergencyDisabled: dto.emergencyDisabled ?? false,
            scopeRules: dto.scopeRules
              ? JSON.parse(JSON.stringify(dto.scopeRules))
              : Prisma.JsonNull,
          },
          update: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.enabled !== undefined && { enabled: dto.enabled }),
            ...(dto.percentage !== undefined && { percentage: dto.percentage }),
            ...(targetUserIds !== undefined && { targetUserIds }),
            ...(dto.operationState !== undefined && { operationState: dto.operationState }),
            ...(dto.emergencyDisabled !== undefined && {
              emergencyDisabled: dto.emergencyDisabled,
            }),
            ...(dto.scopeRules !== undefined && {
              scopeRules: JSON.parse(JSON.stringify(dto.scopeRules)),
            }),
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
              comment: dto.changeReason || (existing ? "更新功能开关" : "创建功能开关"),
            },
          });
        }
        return saved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

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

  async saveDraft(key: string, dto: UpsertFeatureFlagDto, changedBy?: string) {
    this.assertValidKey(key);
    return this.prisma.configVersion.create({
      data: {
        configKey: "feature_flag_draft:" + key + ":" + randomUUID(),
        value: JSON.parse(JSON.stringify(dto)),
        version: 1,
        changedBy,
        comment: "运营配置草稿，未发布",
      },
    });
  }

  async preview(
    key: string,
    dto: UpsertFeatureFlagDto,
    userId?: string,
    scope?: DistributionScope | null,
    nativeBuild?: string,
  ) {
    this.assertValidKey(key);
    const current = await this.prisma.featureFlag.findUnique({ where: { key } });
    const proposed = {
      key,
      enabled: false,
      percentage: 100,
      targetUserIds: [],
      ...current,
      ...dto,
    };
    const emergency = await this.prisma.featureFlag.findUnique({
      where: { key: "client_emergency_close" },
    });
    return {
      key,
      scope,
      state:
        emergency?.key === "client_emergency_close" && emergency.enabled && key !== emergency.key
          ? "UNOPENED"
          : evaluateOperation(proposed, userId, scope, nativeBuild),
      published: false,
    };
  }

  async publishDraft(id: string, changedBy?: string) {
    const draft = await this.prisma.configVersion.findUnique({ where: { id } });
    if (!draft || !draft.configKey.startsWith("feature_flag_draft:"))
      throw new BadRequestException("运营草稿不存在");
    return this.upsert(
      draft.configKey.split(":")[1],
      draft.value as UpsertFeatureFlagDto,
      changedBy,
    );
  }

  async rollback(key: string, version: number, changedBy?: string) {
    this.assertValidKey(key);
    if (!Number.isInteger(version) || version < 1) {
      throw new BadRequestException("回滚版本号不合法");
    }
    const record = await this.prisma.configVersion.findFirst({
      where: { configKey: this.historyKey(key), version },
    });
    if (
      !record ||
      !record.value ||
      typeof record.value !== "object" ||
      Array.isArray(record.value)
    ) {
      throw new BadRequestException("功能开关历史版本不存在或内容无效");
    }
    const value = record.value as Record<string, unknown>;
    if (value.key !== key || typeof value.name !== "string") {
      throw new BadRequestException("功能开关历史快照校验失败");
    }
    return this.upsert(
      key,
      {
        name: value.name,
        description: typeof value.description === "string" ? value.description : null,
        enabled: value.enabled === true,
        percentage: typeof value.percentage === "number" ? value.percentage : 100,
        targetUserIds: Array.isArray(value.targetUserIds)
          ? value.targetUserIds.filter((id): id is string => typeof id === "string")
          : [],
        operationState: ["OPEN", "UNOPENED", "MAINTENANCE", "READ_ONLY"].includes(
          String(value.operationState),
        )
          ? (value.operationState as OperationState)
          : "OPEN",
        emergencyDisabled: value.emergencyDisabled === true,
        scopeRules: Array.isArray(value.scopeRules) ? (value.scopeRules as any) : [],
        changeReason: "回滚功能开关到历史版本 " + version,
      },
      changedBy,
    );
  }

  /** 删除开关 */
  async delete(key: string) {
    this.assertValidKey(key);
    await this.prisma.featureFlag
      .delete({ where: { key } })
      .catch((err) => this.logger.warn("功能开关删除失败", err));
    await this.invalidateCaches(key);
  }

  // ─── 私有方法 ───

  private async invalidateCaches(key: string) {
    await Promise.all([this.redis.del(`feature:${key}`), this.redis.del("feature:list")]).catch(
      (err) => this.logger.warn("功能开关缓存失效失败", err),
    );
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
    operationState?: string;
    emergencyDisabled?: boolean;
    scopeRules?: unknown;
  }) {
    return {
      key: flag.key,
      name: flag.name,
      description: flag.description ?? null,
      enabled: flag.enabled,
      percentage: flag.percentage,
      targetUserIds: flag.targetUserIds,
      operationState: flag.operationState ?? "OPEN",
      emergencyDisabled: flag.emergencyDisabled ?? false,
      scopeRules: flag.scopeRules ?? [],
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
}
