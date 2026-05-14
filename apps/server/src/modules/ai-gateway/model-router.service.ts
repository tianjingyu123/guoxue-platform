import { Injectable, Logger } from "@nestjs/common";
import { SystemService } from "../system/system.service";
import { PrismaService } from "../../prisma/prisma.service";

interface SceneRouting {
  model: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** 灰度配置 */
  grayRelease?: {
    newModel: string;      // 新模型名称
    percentage: number;    // 灰度比例 0-100
  };
  /** 成本控制 */
  budgetControl?: {
    monthlyTokenLimit: number;  // 月度Token上限
    lightModel: string;        // 超预算降级模型
  };
}

interface ModelRoutingConfig {
  default: SceneRouting;
  scenes: Record<string, SceneRouting>;
}

const DEFAULT_ROUTING: ModelRoutingConfig = {
  default: {
    model: "deepseek-v4-flash",
    fallbackModel: "deepseek-v4-flash",
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
  },
  scenes: {},
};

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private routingCache: ModelRoutingConfig | null = null;
  private cacheExpireAt = 0;
  /** 月Token消耗缓存（场景→当月已消耗）*/
  private monthlyUsage: Map<string, number> = new Map();
  private usageExpireAt = 0;

  constructor(
    private readonly systemService: SystemService,
    private readonly prisma: PrismaService,
  ) {}

  /** 根据场景名解析路由配置（含灰度+预算控制） */
  async resolve(scene: string): Promise<{
    model: string;
    fallbackModel?: string;
    options: { temperature: number; maxTokens: number; topP: number };
    grayReleaseModel?: string;
    costCapped?: boolean;
  }> {
    const config = await this.getRoutingConfig();
    const sceneConfig = config.scenes[scene] || config.default;

    let model = sceneConfig.model;
    let fallbackModel = sceneConfig.fallbackModel;
    let grayReleaseModel: string | undefined;
    let costCapped = false;

    // 1. 灰度切换：按百分比随机选择新模型
    if (sceneConfig.grayRelease && sceneConfig.grayRelease.percentage > 0) {
      const roll = Math.random() * 100;
      if (roll < sceneConfig.grayRelease.percentage) {
        grayReleaseModel = sceneConfig.grayRelease.newModel;
        this.logger.debug(`场景 [${scene}] 命中灰度，使用: ${grayReleaseModel}`);
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
        fallbackModel = sceneConfig.budgetControl.lightModel;
        costCapped = true;
      }
    }

    return {
      model,
      fallbackModel,
      options: {
        temperature: sceneConfig.temperature ?? config.default.temperature ?? 0.3,
        maxTokens: sceneConfig.maxTokens ?? config.default.maxTokens ?? 2048,
        topP: sceneConfig.topP ?? config.default.topP ?? 0.9,
      },
      grayReleaseModel,
      costCapped,
    };
  }

  /** 获取当月Token消耗 */
  private async getMonthlyTokenUsage(scene: string): Promise<number> {
    // 内存缓存5分钟
    if (Date.now() < this.usageExpireAt) {
      return this.monthlyUsage.get(scene) || 0;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const result = await this.prisma.aiAnalysisRecord.aggregate({
        _sum: {
          cost: true,
        },
        where: {
          scene,
          createdAt: { gte: monthStart },
        },
      });

      // aiAnalysisRecord 的 tokenUsage 是 JSON 字段，无法直接聚合
      // 用 Raw Query 来实现
      const rawResult: Array<{ total_prompt: bigint; total_completion: bigint }> =
        await this.prisma.$queryRawUnsafe(
          `SELECT
             COALESCE(SUM(CAST("tokenUsage"->>'promptTokens' AS INTEGER)), 0) as total_prompt,
             COALESCE(SUM(CAST("tokenUsage"->>'completionTokens' AS INTEGER)), 0) as total_completion
           FROM "AiAnalysisRecord"
           WHERE scene = $1 AND "createdAt" >= $2`,
          scene,
          monthStart,
        );

      const total = Number(rawResult[0]?.total_prompt || 0) + Number(rawResult[0]?.total_completion || 0);
      this.monthlyUsage.set(scene, total);
      this.usageExpireAt = Date.now() + 300_000;
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
  private async getRoutingConfig(): Promise<ModelRoutingConfig> {
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
  clearCache() {
    this.routingCache = null;
    this.cacheExpireAt = 0;
    this.monthlyUsage.clear();
    this.usageExpireAt = 0;
  }
}
