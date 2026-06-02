/**
 * AI 模型适配器基类
 *
 * ## 选型理由
 * - **为什么用适配器模式而非直接调用：** 每个 AI 厂商（DeepSeek/Claude/Qwen/本地模型）
 *   请求/响应格式不同，适配器封装差异，上层 AiGatewayService 只依赖接口，
 *   新增模型只需实现 AiModelAdapter，零侵入
 * - **为什么用 AsyncIterable 而非 EventEmitter：** AsyncIterable 天然支持
 *   for-await-of，与 NestJS SSE 管道完美契合，错误处理更简洁
 * - **考虑过的方案：**
 *   1. 每个场景各自调不同 SDK → 放弃，无法统一限流/监控/降级
 *   2. 统一用 OpenAI 兼容格式代理所有模型 → 部分可行但非 OpenAI 模型语义丢失
 *   3. 适配器模式（当前方案）→ ✅ 灵活性与统一性的平衡点
 * - **注意事项：** 如果未来模型数量 >10，考虑引入模型注册表 + 自动发现机制，
 *   避免手动维护 adapter 列表
 */
export interface AiModelAdapter {
  /** 模型提供商标识 */
  readonly provider: string;

  /**
   * 非流式对话
   * @param model 模型名称
   * @param messages 消息数组
   * @param options 可选参数 (temperature, maxTokens 等)
   */
  chat(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): Promise<AiChatResponse>;

  /**
   * 流式对话 — 返回 AsyncIterable，逐块产出 delta 文本
   */
  chatStream(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): AsyncIterable<string>;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** 请求超时时间(ms)，超时后适配器抛出 AiTimeoutError */
  timeout?: number;
}

export interface AiChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

/** 超时专用错误，网关捕获后触发 fallback */
export class AiTimeoutError extends Error {
  constructor(message = "AI请求超时") {
    super(message);
    this.name = "AiTimeoutError";
  }
}
