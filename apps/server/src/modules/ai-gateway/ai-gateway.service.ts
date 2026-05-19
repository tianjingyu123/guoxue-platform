import { Injectable, Logger } from "@nestjs/common";
import { ModelRouterService } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { SemanticCacheService } from "./semantic-cache.service";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { MultiAgentService } from "./adapters/multi-agent.service";
import { MetricsService } from "../../common/metrics.service";
import { AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./adapters/base.adapter";

export interface GatewayChatRequest {
  scene: string;
  userId?: string;
  messages: AiMessage[];
  options?: AiChatOptions;
}

/**
 * AI 网关服务 — 统一入口，编排路由→适配器→日志
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly router: ModelRouterService,
    private readonly aiLogger: AiLoggerService,
    private readonly semCache: SemanticCacheService,
    private readonly deepseek: DeepSeekAdapter,
    private readonly metrics: MetricsService,
    multiAgent: MultiAgentService,
  ) {
    multiAgent.setGateway({
      chat: (scene: string, messages: AiMessage[]) => this.chat({ scene, messages }),
    });
  }

  /** 非流式对话 */
  async chat(req: GatewayChatRequest): Promise<AiChatResponse> {
    const userQuery = req.messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");

    // 1. 语义缓存查找
    if (userQuery.length > 0) {
      const cached = await this.semCache.lookup(req.scene, userQuery);
      if (cached) {
        this.logger.debug(`语义缓存命中: scene=${req.scene}`);
        this.metrics.recordSemanticCacheHit(req.scene);
        this.metrics.recordAiCall(req.scene, "semantic-cache", true, 0);
        return { content: cached, model: "semantic-cache" } as AiChatResponse;
      }
    }

    const { model, fallbackModel, options, grayReleaseModel, costCapped } =
      await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = grayReleaseModel || model;

    let result: AiChatResponse;
    try {
      result = await this.deepseek.chat(model, req.messages, mergedOptions);
    } catch (err) {
      const reason = err instanceof AiTimeoutError ? "超时" : "失败";
      this.metrics.recordAiCall(req.scene, model, false, Date.now() - startedAt);
      if (fallbackModel && fallbackModel !== model) {
        this.logger.warn(`场景 [${req.scene}] 主模型 ${model} ${reason}，降级到 ${fallbackModel}`);
        fallbackUsed = true;
        actualModel = fallbackModel;
        result = await this.deepseek.chat(fallbackModel, req.messages, mergedOptions);
      } else {
        throw err;
      }
    }

    const latency = Date.now() - startedAt;
    const inputText = req.messages.map((m) => m.content).join(" ");

    // 异步写日志，不阻塞响应
    this.aiLogger.log({
      userId: req.userId,
      scene: req.scene,
      model: actualModel,
      fallbackUsed,
      fallbackModel: fallbackUsed ? fallbackModel : undefined,
      grayReleaseModel,
      costCapped,
      latency,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      inputSummary: inputText,
      outputSummary: result.content,
    }).catch(() => {});

    // 异步写入语义缓存（不阻塞响应）
    if (userQuery.length > 0 && result.content) {
      this.semCache.store(req.scene, userQuery, result.content, actualModel).catch(() => {});
    }

    // AI 飞轮指标埋点
    this.metrics.recordAiCall(req.scene, actualModel, true, latency);

    return result;
  }

  /** 流式对话 — 返回 AsyncIterable */
  async *chatStream(req: GatewayChatRequest): AsyncIterable<string> {
    const userQuery = req.messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");

    // 语义缓存命中 → 直接返回缓存内容
    if (userQuery.length > 0) {
      const cached = await this.semCache.lookup(req.scene, userQuery);
      if (cached) {
        this.logger.debug(`流式语义缓存命中: scene=${req.scene}`);
        this.metrics.recordSemanticCacheHit(req.scene);
        this.metrics.recordAiCall(req.scene, "semantic-cache", true, 0);
        yield cached;
        return;
      }
    }

    const { model, fallbackModel, options, grayReleaseModel, costCapped } =
      await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = grayReleaseModel || model;
    let fullContent = "";

    try {
      for await (const chunk of this.deepseek.chatStream(model, req.messages, mergedOptions)) {
        fullContent += chunk;
        yield chunk;
      }
    } catch (err) {
      const reason = err instanceof AiTimeoutError ? "超时" : "失败";
      this.metrics.recordAiCall(req.scene, model, false, Date.now() - startedAt);
      if (fallbackModel && fallbackModel !== model) {
        this.logger.warn(`流式场景 [${req.scene}] 主模型 ${model} ${reason}，降级到 ${fallbackModel}`);
        fallbackUsed = true;
        actualModel = fallbackModel;
        for await (const chunk of this.deepseek.chatStream(fallbackModel, req.messages, mergedOptions)) {
          fullContent += chunk;
          yield chunk;
        }
      } else {
        throw err;
      }
    }

    const latency = Date.now() - startedAt;
    const inputText = req.messages.map((m) => m.content).join(" ");

    this.aiLogger.log({
      userId: req.userId,
      scene: req.scene,
      model: actualModel,
      fallbackUsed,
      fallbackModel: fallbackUsed ? fallbackModel : undefined,
      grayReleaseModel,
      costCapped,
      latency,
      inputSummary: inputText,
      outputSummary: fullContent,
    }).catch(() => {});

    // 异步写入语义缓存
    if (userQuery.length > 0 && fullContent) {
      this.semCache.store(req.scene, userQuery, fullContent, actualModel).catch(() => {});
    }

    // AI 飞轮指标埋点
    this.metrics.recordAiCall(req.scene, actualModel, true, latency);
  }
}
