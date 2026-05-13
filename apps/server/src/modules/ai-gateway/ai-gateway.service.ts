import { Injectable, Logger } from "@nestjs/common";
import { ModelRouterService } from "./model-router.service";
import { AiLoggerService } from "./ai-logger.service";
import { DeepSeekAdapter } from "./adapters/deepseek.adapter";
import { AiMessage, AiChatOptions, AiChatResponse } from "./adapters/base.adapter";

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
    private readonly deepseek: DeepSeekAdapter,
  ) {}

  /** 非流式对话 */
  async chat(req: GatewayChatRequest): Promise<AiChatResponse> {
    const { model, fallbackModel, options } = await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = model;

    let result: AiChatResponse;
    try {
      result = await this.deepseek.chat(model, req.messages, mergedOptions);
    } catch (err) {
      if (fallbackModel && fallbackModel !== model) {
        this.logger.warn(`场景 [${req.scene}] 主模型 ${model} 失败，降级到 ${fallbackModel}`);
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
      latency,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      inputSummary: inputText,
      outputSummary: result.content,
    }).catch(() => {});

    return result;
  }

  /** 流式对话 — 返回 AsyncIterable */
  async *chatStream(req: GatewayChatRequest): AsyncIterable<string> {
    const { model, fallbackModel, options } = await this.router.resolve(req.scene);
    const mergedOptions: AiChatOptions = { ...options, ...req.options };

    const startedAt = Date.now();
    let fallbackUsed = false;
    let actualModel = model;
    let fullContent = "";

    try {
      for await (const chunk of this.deepseek.chatStream(model, req.messages, mergedOptions)) {
        fullContent += chunk;
        yield chunk;
      }
    } catch (err) {
      if (fallbackModel && fallbackModel !== model) {
        this.logger.warn(`流式场景 [${req.scene}] 主模型 ${model} 失败，降级到 ${fallbackModel}`);
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
      latency,
      inputSummary: inputText,
      outputSummary: fullContent,
    }).catch(() => {});
  }
}
