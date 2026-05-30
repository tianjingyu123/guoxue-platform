import { Injectable, Logger } from "@nestjs/common";
import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

interface ClaudeContentBlock {
  type: "text";
  text: string;
}

interface ClaudeResponse {
  id?: string;
  model?: string;
  content?: ClaudeContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface ClaudeStreamEvent {
  type: "message_start" | "content_block_start" | "content_block_delta" | "content_block_stop" | "message_delta" | "message_stop" | "ping";
  message?: { model?: string; usage?: { input_tokens?: number; output_tokens?: number } };
  delta?: { type?: string; text?: string };
  usage?: { output_tokens?: number };
}

/**
 * Claude 模型适配器 — Anthropic Messages API
 * API文档: https://docs.anthropic.com/en/api/messages
 */
@Injectable()
export class ClaudeAdapter implements AiModelAdapter {
  readonly provider = "anthropic";
  private readonly logger = new Logger(ClaudeAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("ANTHROPIC_API_KEY 未配置，Claude适配器将无法使用");
    }
  }

  async chat(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "Claude服务未配置，请在 .env 中设置 ANTHROPIC_API_KEY");
    }

    const timeout = options?.timeout ?? 30_000;
    const signal = AbortSignal.timeout(timeout);

    const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content);
    const conversationMessages = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      messages: conversationMessages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.topP ?? 0.9,
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.join("\n\n");
    }

    const startedAt = Date.now();
    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        const elapsed = Date.now() - startedAt;
        this.logger.warn(`Claude请求超时 [${model}] ${elapsed}ms / ${timeout}ms`);
        throw new AiTimeoutError(`Claude请求超时 [${model}]`);
      }
      throw err;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`Claude API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `Claude API返回 ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as ClaudeResponse;

    return {
      content: data.content?.map((c) => c.text).join("") || "",
      model: data.model || model,
      usage: data.usage
        ? { promptTokens: data.usage.input_tokens || 0, completionTokens: data.usage.output_tokens || 0, totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0) }
        : undefined,
      finishReason: data.stop_reason,
    };
  }

  async *chatStream(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "Claude服务未配置，请在 .env 中设置 ANTHROPIC_API_KEY");
    }

    const timeout = options?.timeout ?? 30_000;
    const signal = AbortSignal.timeout(timeout);

    const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content);
    const conversationMessages = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      messages: conversationMessages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.topP ?? 0.9,
      stream: true,
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.join("\n\n");
    }

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        this.logger.warn(`Claude流式请求超时 [${model}]`);
        throw new AiTimeoutError(`Claude流式请求超时 [${model}]`);
      }
      throw err;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`Claude流式API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `Claude流式API返回 ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "无法获取Claude响应流");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data) as ClaudeStreamEvent;
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch {
            // 忽略无法解析的行（ping 等非 JSON 数据）
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
