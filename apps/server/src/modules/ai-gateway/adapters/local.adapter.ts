import { Injectable, Logger } from "@nestjs/common";
import { AiModelAdapter, AiMessage, AiChatOptions, AiChatResponse, AiTimeoutError } from "./base.adapter";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";

interface LocalModelResponse {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string }; finish_reason?: string }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * 本地模型适配器 — 兼容 OpenAI 格式的本地/内网模型服务
 *
 * 适用场景：
 * - Ollama / vLLM / llama.cpp server / LocalAI 等自部署模型
 * - 数据不出内网的合规需求
 * - 高频调用降低延迟
 *
 * 环境变量：
 * - LOCAL_MODEL_BASE_URL — 本地模型服务地址（默认 http://localhost:11434/v1）
 * - LOCAL_MODEL_API_KEY — 可选，本地服务通常不需要
 */
@Injectable()
export class LocalModelAdapter implements AiModelAdapter {
  readonly provider = "local";
  private readonly logger = new Logger(LocalModelAdapter.name);

  // 运行时读取：后台保存密钥后热生效，无需重启（此前构造快照）。
  private get baseUrl(): string {
    return process.env.LOCAL_MODEL_BASE_URL || "http://localhost:11434/v1";
  }
  private get apiKey(): string {
    return process.env.LOCAL_MODEL_API_KEY || "";
  }

  async chat(
    model: string,
    messages: AiMessage[],
    options?: AiChatOptions,
  ): Promise<AiChatResponse> {
    const timeout = options?.timeout ?? 60_000;
    const signal = AbortSignal.timeout(timeout);

    const startedAt = Date.now();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

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
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        const elapsed = Date.now() - startedAt;
        this.logger.warn(`本地模型请求超时 [${model}] ${elapsed}ms / ${timeout}ms`);
        throw new AiTimeoutError(`本地模型请求超时 [${model}]`);
      }
      const errMsg = (err as Error).message || "";
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `无法连接本地模型服务: ${errMsg.slice(0, 200)}。请检查 LOCAL_MODEL_BASE_URL 配置。`);
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`本地模型API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `本地模型API返回 ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as LocalModelResponse;
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
    const timeout = options?.timeout ?? 60_000;
    const signal = AbortSignal.timeout(timeout);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

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
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "TimeoutError" || (err as Error).name === "AbortError") {
        this.logger.warn(`本地模型流式请求超时 [${model}]`);
        throw new AiTimeoutError(`本地模型流式请求超时 [${model}]`);
      }
      const errMsg = (err as Error).message || "";
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `无法连接本地模型服务: ${errMsg.slice(0, 200)}`);
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      this.logger.error(`本地模型流式API错误 [${resp.status}]: ${errText}`);
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, `本地模型流式API返回 ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "无法获取本地模型响应流");

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
            const parsed = JSON.parse(data) as LocalModelResponse;
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
