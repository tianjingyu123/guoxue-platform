import { Injectable, Logger } from "@nestjs/common";
import { randomInt } from "crypto";
import { SystemService } from "../system/system.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

export type AiProvider = "deepseek" | "anthropic" | "alibaba" | "local";

interface SceneRouting {
  model: string;
  /** 模型供应商，默认 deepseek */
  provider?: AiProvider;
  fallbackModel?: string;
  /** fallback 模型的供应商 */
  fallbackProvider?: AiProvider;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** 灰度配置 */
  grayRelease?: {
    newModel: string;
    newModelProvider?: AiProvider;
    percentage: number;
  };
  /** 成本控制 */
  budgetControl?: {
    monthlyTokenLimit: number;
    lightModel: string;
    lightModelProvider?: AiProvider;
  };
}

export interface ModelRoutingConfig {
  default: SceneRouting;
  scenes: Record<string, SceneRouting>;
}

const DEFAULT_ROUTING: ModelRoutingConfig = {
  default: {
    model: "deepseek-v4-flash",
    provider: "deepseek",
    fallbackModel: "deepseek-v4-flash",
    fallbackProvider: "deepseek",
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
  },
  scenes: {
    "multi-agent": {
      model: "deepseek-v4-flash",
      provider: "deepseek",
      fallbackModel: "deepseek-v4-flash",
      fallbackProvider: "deepseek",
      temperature: 0.5,
      maxTokens: 4096,
      topP: 0.9,
    },
    "knowledge_graph": {
      model: "deepseek-v4-flash",
      provider: "deepseek",
      fallbackModel: "deepseek-v4-flash",
      fallbackProvider: "deepseek",
      temperature: 0.2,
      maxTokens: 2048,
      topP: 0.9,
    },
  },
};

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private routingCache: ModelRoutingConfig | null = null;
  private cacheExpireAt = 0;
  /** 月Token消耗缓存键前缀（M4·入 Redis 多实例共享，防各实例内存计数导致预算封顶失准）*/
  private static readonly USAGE_CACHE_PREFIX = "ai:budget:usage:";
  private static readonly USAGE_CACHE_TTL = 300; // 5分钟

  constructor(
    private readonly systemService: SystemService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 根据场景名解析路由配置（含灰度+预算控制+供应商） */
  async resolve(scene: string): Promise<{
    model: string;
    provider: AiProvider;
    fallbackModel?: string;
    fallbackProvider?: AiProvider;
    options: { temperature: number; maxTokens: number; topP: number };
    grayReleaseModel?: string;
    grayReleaseProvider?: AiProvider;
    costCapped?: boolean;
  }> {
    const config = await this.getRoutingConfig();
    const sceneConfig = config.scenes[scene] || config.default;

    let model = sceneConfig.model;
    let provider: AiProvider = sceneConfig.provider || "deepseek";
    let fallbackModel = sceneConfig.fallbackModel;
    let fallbackProvider: AiProvider = sceneConfig.fallbackProvider || "deepseek";
    let grayReleaseModel: string | undefined;
    let grayReleaseProvider: AiProvider | undefined;
    let costCapped = false;

    // 1. 灰度切换
    if (sceneConfig.grayRelease && sceneConfig.grayRelease.percentage > 0) {
      const roll = randomInt(0, 100);
      if (roll < sceneConfig.grayRelease.percentage) {
        grayReleaseModel = sceneConfig.grayRelease.newModel;
        grayReleaseProvider = sceneConfig.grayRelease.newModelProvider || "deepseek";
        this.logger.debug(`场景 [${scene}] 命中灰度，使用: ${grayReleaseModel} (${grayReleaseProvider})`);
      }
    }

    // 2. 成本预算控制
    if (sceneConfig.budgetControl) {
      const monthlyUsage = await this.getMonthlyTokenUsage(scene);
      const limit = sceneConfig.budgetControl.monthlyTokenLimit;
      if (monthlyUsage >= limit) {
        this.logger.warn(
          `场景 [${scene}] 当月Token已达上限 (${monthlyUsage}/${limit})，降级到 ${sceneConfig.budgetControl.lightModel}`,
        );
        model = sceneConfig.budgetControl.lightModel;
        provider = sceneConfig.budgetControl.lightModelProvider || "deepseek";
        fallbackModel = sceneConfig.budgetControl.lightModel;
        fallbackProvider = sceneConfig.budgetControl.lightModelProvider || "deepseek";
        costCapped = true;
      }
    }

    return {
      model,
      provider,
      fallbackModel,
      fallbackProvider,
      options: {
        temperature: sceneConfig.temperature ?? config.default.temperature ?? 0.3,
        maxTokens: sceneConfig.maxTokens ?? config.default.maxTokens ?? 2048,
        topP: sceneConfig.topP ?? config.default.topP ?? 0.9,
      },
      grayReleaseModel,
      grayReleaseProvider,
      costCapped,
    };
  }

  /** 获取当月Token消耗（Redis 缓存5分钟·多实例共享一份，预算封顶口径一致） */
  private async getMonthlyTokenUsage(scene: string): Promise<number> {
    const cacheKey = `${ModelRouterService.USAGE_CACHE_PREFIX}${scene}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      const parsed = Number(cached);
      if (Number.isFinite(parsed)) return parsed;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // aiAnalysisRecord 的 tokenUsage 是 JSON 字段，无法直接聚合
      // 用 Raw Query 来实现
      const rawResult: Array<{ total_prompt: bigint; total_completion: bigint }> =
        await this.prisma.$queryRawUnsafe(
          `SELECT
             COALESCE(SUM(CAST("tokenUsage"->>'promptTokens' AS INTEGER)), 0) as total_prompt,
           COALESCE(SUM(CAST("tokenUsage"->>'completionTokens' AS INTEGER)), 0) as total_completion
           FROM "AiAnalysisRecord"
           WHERE scene = $1 AND "createdAt" >= $2::timestamp`,
          scene,
          monthStart,
        );

      const total = Number(rawResult[0]?.total_prompt || 0) + Number(rawResult[0]?.total_completion || 0);
      await this.redis.set(cacheKey, String(total), ModelRouterService.USAGE_CACHE_TTL);
      return total;
    } catch (err: any) {
      this.logger.warn(`获取Token消耗失败: ${err.message}`);
      return 0;
    }
  }

  /** 获取场景月度预算剩余 */
  async getBudgetRemaining(scene: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  }> {
    const config = await this.getRoutingConfig();
    const sceneConfig = config.scenes[scene] || config.default;
    const limit = sceneConfig.budgetControl?.monthlyTokenLimit || 0;

    if (limit === 0) {
      return { used: 0, limit: 0, remaining: 0, percentage: 0 };
    }

    const used = await this.getMonthlyTokenUsage(scene);
    const remaining = Math.max(0, limit - used);
    return { used, limit, remaining, percentage: Math.round((used / limit) * 100) };
  }

  /** 获取路由配置（带5分钟内存缓存） */
  async getRoutingConfig(): Promise<ModelRoutingConfig> {
    if (this.routingCache && Date.now() < this.cacheExpireAt) return this.routingCache;

    try {
      const config = await this.systemService.getConfig("ai_model_routing");
      if (config?.configValue) {
        this.routingCache = JSON.parse(config.configValue) as ModelRoutingConfig;
        this.cacheExpireAt = Date.now() + 300_000;
        return this.routingCache;
      }
    } catch (err) {
      this.logger.warn("AI路由配置解析失败，使用默认配置", err);
    }

    this.routingCache = DEFAULT_ROUTING;
    this.cacheExpireAt = Date.now() + 60_000;
    return DEFAULT_ROUTING;
  }

  /** 清除缓存（配置更新后调用） */
  async clearCache() {
    this.routingCache = null;
    this.cacheExpireAt = 0;
    await this.redis.delByPattern(`${ModelRouterService.USAGE_CACHE_PREFIX}*`);
  }

  /** 获取所有场景的预算使用情况 */
  async getSceneBudgets() {
    const config = await this.getRoutingConfig();
    const scenes = Object.keys(config.scenes);
    const budgets: Record<string, { used: number; limit: number; remaining: number; percentage: number }> = {};

    for (const scene of scenes) {
      budgets[scene] = await this.getBudgetRemaining(scene);
    }

    return {
      defaultModel: config.default.model,
      scenes: budgets,
      totalScenes: scenes.length,
    };
  }
}
