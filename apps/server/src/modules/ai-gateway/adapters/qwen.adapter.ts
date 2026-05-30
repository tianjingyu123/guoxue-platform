import { Injectable, Logger } from "@nestjs/common";
import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

interface QwenResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string }; finish_reason?: string }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * 通义千问模型适配器 — 阿里云 DashScope API（兼容 OpenAI 格式）
 * API文档: https://help.aliyun.com/zh/model-studio
 *
 * 环境变量：
 * - DASHSCOPE_API_KEY — 阿里云 API Key
 * - DASHSCOPE_BASE_URL — 可选，默认为 https://dashscope.aliyuncs.com/compatible-mode/v1
 */
@Injectable()
export class QwenAdapter implements AiModelAdapter {
  readonly provider = "alibaba";
  private readonly logger = new Logger(QwenAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.apiKey = process.env.DASHSCOPE_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("DASHSCOPE_API_KEY 未配置，Qwen适配器将无法使用");
    }
  }

  async chat(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "通义千问服务未配置，请在 .env 中设置 DASHSCOPE_API_KEY");
    }

    const timeout = options?.timeout ?? 30_000;
    const signal = AbortSignal.timeout(timeout);

    const startedAt = Date.now();
    const body = {
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP ?? 0.9,
      stream: false,
    };

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        const elapsed = Date.now() - startedAt;
        this.logger.warn(`Qwen请求超时 [${model}] ${elapsed}ms / ${timeout}ms`);
        throw new AiTimeoutError(`Qwen请求超时 [${model}]`);
      }
      throw err;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`Qwen API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `Qwen API返回 ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as QwenResponse;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || "",
      model: data.model || model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 }
        : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  async *chatStream(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "通义千问服务未配置，请在 .env 中设置 DASHSCOPE_API_KEY");
    }

    const timeout = options?.timeout ?? 30_000;
    const signal = AbortSignal.timeout(timeout);

    const body = {
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: options?.topP ?? 0.9,
      stream: true,
    };

    let resp: Response;
    try {
      resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        this.logger.warn(`Qwen流式请求超时 [${model}]`);
        throw new AiTimeoutError(`Qwen流式请求超时 [${model}]`);
      }
      throw err;
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`Qwen流式API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `Qwen流式API返回 ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "无法获取Qwen响应流");

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
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data) as QwenResponse;
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // 忽略无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
