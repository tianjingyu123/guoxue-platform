/**
 * AI模型适配器基类 — 所有模型厂商适配器需实现此接口
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
