import { Injectable, Logger } from "@nestjs/common";
import { ModelRouterService, AiProvider } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { SemanticCacheService } from "./semantic-cache.service";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { ClaudeAdapter } from "./adapters/claude.adapter";
import { QwenAdapter } from "./adapters/qwen.adapter";
import { LocalModelAdapter } from "./adapters/local.adapter";
import { MultiAgentService } from "./adapters/multi-agent.service";
import { MultimodalService } from "./adapters/multimodal.service";
import { MetricsService } from "../../common/metrics.service";
import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./adapters/base.adapter";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

export interface GatewayChatRequest {
  scene: string;
  userId?: string;
  messages: AiMessage[];
  options?: AiChatOptions;
  /** 跳过语义缓存（创作型场景用：营销文案等要求每次生成都是新内容，且固定指令占比大易误命中） */
  skipCache?: boolean;
  /** 缓存作用域键（数据隔离修复P1）：按实体隔离的场景传入(如圈主助理传 circleId)，
   *  使语义缓存按实体分区、杜绝跨圈串答；不参与模型选路。 */
  cacheScopeKey?: string;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly adapters: Map<AiProvider, AiModelAdapter> = new Map();

  constructor(
    private readonly router: ModelRouterService,
    private readonly aiLogger: AiLoggerService,
    private readonly semCache: SemanticCacheService,
    private readonly deepseek: DeepSeekAdapter,
    private readonly claude: ClaudeAdapter,
    private readonly qwen: QwenAdapter,
    private readonly localModel: LocalModelAdapter,
    private readonly metrics: MetricsService,
    multiAgent: MultiAgentService,
    multimodal: MultimodalService,
  ) {
    this.adapters.set("deepseek", deepseek);
    this.adapters.set("anthropic", claude);
    this.adapters.set("alibaba", qwen);
    this.adapters.set("local", localModel);

    multiAgent.setGateway({
      chat: (scene: string, messages: AiMessage[]) => this.chat({ scene, messages }),
    });

    multimodal.setGateway({
      chat: (scene: string, messages: Array<{ role: string; content: string }>) =>
        this.chat({ scene, messages: messages as AiMessage[] }),
    });
  }

  private getAdapter(provider: AiProvider): AiModelAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, `不支持的AI供应商: ${provider}`);
    }
    return adapter;
  }

  /** 非流式对话 */
  async chat(req: GatewayChatRequest): Promise<AiChatResponse> {
    const userQuery = req.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    // 1. 语义缓存查找（创作型场景可通过 skipCache 跳过）
    if (userQuery.length > 0 && !req.skipCache) {
      const cached = await this.semCache.lookup(req.scene, userQuery, req.cacheScopeKey);
      if (cached) {
        this.logger.debug(`语义缓存命中: scene=${req.scene}`);
        this.metrics.recordSemanticCacheHit(req.scene);
        this.metrics.recordAiCall(req.scene, "semantic-cache", true, 0);
        return { content: cached, model: "semantic-cache" } as AiChatResponse;
      }
    }

    const { model, provider, fallbackModel, fallbackProvider, options, grayReleaseModel, grayReleaseProvider, costCapped } =
      await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = grayReleaseModel || model;
    let actualProvider = grayReleaseProvider || provider;

    let result: AiChatResponse;
    try {
      const adapter = this.getAdapter(actualProvider);
      result = await adapter.chat(actualModel, req.messages, mergedOptions);
    } catch (err) {
      const reason = err instanceof AiTimeoutError ? "超时" : "失败";
      this.metrics.recordAiCall(req.scene, actualModel, false, Date.now() - startedAt);
      if (fallbackModel && fallbackModel !== model) {
        const fbProvider = fallbackProvider || "deepseek";
        this.logger.warn(
          `场景 [${req.scene}] 主模型 ${actualProvider}:${actualModel} ${reason}，降级到 ${fbProvider}:${fallbackModel}`,
        );
        fallbackUsed = true;
        actualModel = fallbackModel;
        actualProvider = fbProvider;
        const adapter = this.getAdapter(actualProvider);
        result = await adapter.chat(actualModel, req.messages, mergedOptions);
      } else {
        throw err;
      }
    }

    const latency = Date.now() - startedAt;
    const inputText = req.messages.map((m) => m.content).join(" ");

    this.aiLogger
      .log({
        userId: req.userId,
        scene: req.scene,
        model: actualModel,
        provider: actualProvider,
        fallbackUsed,
        fallbackModel: fallbackUsed ? fallbackModel : undefined,
        grayReleaseModel,
        costCapped,
        latency,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        inputSummary: inputText,
        outputSummary: result.content,
      })
      .catch((err) => this.logger.warn("AI分析记录写入失败", err));

    if (userQuery.length > 0 && result.content && !req.skipCache) {
      this.semCache.store(req.scene, userQuery, result.content, actualModel, undefined, req.cacheScopeKey).catch((err) => this.logger.warn("语义缓存存储失败", err));
    }

    this.metrics.recordAiCall(req.scene, actualModel, true, latency);

    return result;
  }

  /** 流式对话 — 返回 AsyncIterable */
  async *chatStream(req: GatewayChatRequest): AsyncIterable<string> {
    const userQuery = req.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    if (userQuery.length > 0 && !req.skipCache) {
      const cached = await this.semCache.lookup(req.scene, userQuery, req.cacheScopeKey);
      if (cached) {
        this.logger.debug(`流式语义缓存命中: scene=${req.scene}`);
        this.metrics.recordSemanticCacheHit(req.scene);
        this.metrics.recordAiCall(req.scene, "semantic-cache", true, 0);
        yield cached;
        return;
      }
    }

    const { model, provider, fallbackModel, fallbackProvider, options, grayReleaseModel, grayReleaseProvider, costCapped } =
      await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = grayReleaseModel || model;
    let actualProvider = grayReleaseProvider || provider;
    let fullContent = "";

    try {
      const adapter = this.getAdapter(actualProvider);
      for await (const chunk of adapter.chatStream(actualModel, req.messages, mergedOptions)) {
        fullContent += chunk;
        yield chunk;
      }
    } catch (err) {
      const reason = err instanceof AiTimeoutError ? "超时" : "失败";
      this.metrics.recordAiCall(req.scene, actualModel, false, Date.now() - startedAt);
      if (fallbackModel && fallbackModel !== model) {
        const fbProvider = fallbackProvider || "deepseek";
        this.logger.warn(
          `流式场景 [${req.scene}] 主模型 ${actualProvider}:${actualModel} ${reason}，降级到 ${fbProvider}:${fallbackModel}`,
        );
        // 先通知客户端内容切换，再输出 fallback 内容
        yield `\n\n[AI服务切换中，以下内容由备用模型生成]\n\n`;
        fallbackUsed = true;
        actualModel = fallbackModel;
        actualProvider = fbProvider;
        const adapter = this.getAdapter(actualProvider);
        for await (const chunk of adapter.chatStream(actualModel, req.messages, mergedOptions)) {
          fullContent += chunk;
          yield chunk;
        }
      } else {
        throw err;
      }
    }

    const latency = Date.now() - startedAt;
    const inputText = req.messages.map((m) => m.content).join(" ");

    this.aiLogger
      .log({
        userId: req.userId,
        scene: req.scene,
        model: actualModel,
        provider: actualProvider,
        fallbackUsed,
        fallbackModel: fallbackUsed ? fallbackModel : undefined,
        grayReleaseModel,
        costCapped,
        latency,
        inputSummary: inputText,
        outputSummary: fullContent,
      })
      .catch((err) => this.logger.warn("AI分析记录写入失败", err));

    if (userQuery.length > 0 && fullContent && !req.skipCache) {
      this.semCache.store(req.scene, userQuery, fullContent, actualModel, undefined, req.cacheScopeKey).catch((err) => this.logger.warn("语义缓存存储失败", err));
    }

    this.metrics.recordAiCall(req.scene, actualModel, true, latency);
  }
}
