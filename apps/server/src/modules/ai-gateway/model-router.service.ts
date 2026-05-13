import { Injectable, Logger } from "@nestjs/common";
import { SystemService } from "../system/system.service";

interface SceneRouting {
  model: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
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

/**
 * 模型路由服务 — 根据场景名读取 ai_model_routing 配置，解析出模型+参数
 */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private routingCache: ModelRoutingConfig | null = null;
  private cacheExpireAt = 0;

  constructor(private readonly systemService: SystemService) {}

  /** 根据场景名解析路由配置 */
  async resolve(scene: string): Promise<{
    model: string;
    fallbackModel?: string;
    options: { temperature: number; maxTokens: number; topP: number };
  }> {
    const config = await this.getRoutingConfig();
    const sceneConfig = config.scenes[scene] || config.default;

    return {
      model: sceneConfig.model,
      fallbackModel: sceneConfig.fallbackModel,
      options: {
        temperature: sceneConfig.temperature ?? config.default.temperature ?? 0.3,
        maxTokens: sceneConfig.maxTokens ?? config.default.maxTokens ?? 2048,
        topP: sceneConfig.topP ?? config.default.topP ?? 0.9,
      },
    };
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
  }
}
