import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";

/**
 * SSE 流式响应格式定义
 *
 * 所有模型适配器的流式输出统一为以下 SSE 事件格式：
 * - data: {"type":"chunk","content":"文本增量"}
 * - data: {"type":"source","index":0,"title":"参考标题","excerpt":"摘要"}
 * - data: {"type":"done","usage":{"promptTokens":100,"completionTokens":200}}
 * - data: {"type":"error","message":"错误描述"}
 */
export interface UnifiedStreamChunk {
  type: "chunk" | "source" | "done" | "error";
  content?: string;
  index?: number;
  title?: string;
  excerpt?: string;
  message?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

/**
 * 流式响应统一层
 *
 * 职责：
 * 1. 将不同模型的流式输出转换为统一的 SSE 格式
 * 2. 提供 SSE 编码的辅助方法
 * 3. 支持错误降级：当流式不可用时自动降级为非流式
 */
@Injectable()
export class StreamUnifierService {
  private readonly logger = new Logger(StreamUnifierService.name);

  /** 将 AsyncIterable<string> 包装为统一 SSE 格式的 AsyncGenerator */
  async *unify(
    source: AsyncIterable<string>,
    options?: { sources?: Array<{ title: string; excerpt: string }> },
  ): AsyncGenerator<string, void, undefined> {
    try {
      // 先发送参考来源（如有）
      if (options?.sources?.length) {
        for (let i = 0; i < options.sources.length; i++) {
          yield this.encode({
            type: "source",
            index: i,
            title: options.sources[i].title,
            excerpt: options.sources[i].excerpt,
          });
        }
      }

      // 流式输出文本块
      for await (const chunk of source) {
        yield this.encode({ type: "chunk", content: chunk });
      }

      // 完成信号
      yield this.encode({ type: "done" });
    } catch (err: any) {
      this.logger.error(`流式输出异常: ${err.message}`);
      yield this.encode({ type: "error", message: err.message || "流式输出失败" });
    }
  }

  /** 带用量统计的流式输出 */
  async *unifyWithUsage(
    source: AsyncIterable<string>,
    usage?: { promptTokens?: number; completionTokens?: number },
  ): AsyncGenerator<string, void, undefined> {
    try {
      for await (const chunk of source) {
        yield this.encode({ type: "chunk", content: chunk });
      }
      yield this.encode({ type: "done", usage });
    } catch (err: any) {
      this.logger.error(`流式输出异常: ${err.message}`);
      yield this.encode({ type: "error", message: err.message || "流式输出失败" });
    }
  }

  /** 编码为 SSE 行 */
  encode(chunk: UnifiedStreamChunk): string {
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  /** 错误降级：返回模拟的单次 chunk */
  errorFallback(message: string): string {
    return this.encode({ type: "error", message });
  }

  /** 将完整响应包装为流式（非流式降级场景） */
  *wrapAsStream(content: string): Generator<string, void, undefined> {
    // 按句子拆分，模拟流式输出
    const sentences = content.split(/(?<=[。！？\n])/);
    for (const sentence of sentences) {
      if (sentence.trim()) {
        yield this.encode({ type: "chunk", content: sentence });
      }
    }
    yield this.encode({ type: "done" });
  }

  /** 统一的 SSE 响应写入器 — 所有流式控制器复用此方法 */
  async writeSseStream(
    res: Response,
    source: AsyncIterable<string>,
    sources?: Array<{ title: string; excerpt: string }>,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const line of this.unify(source, { sources })) {
        res.write(line);
      }
    } catch (err: any) {
      res.write(this.encode({ type: "error", message: err.message || "流式输出失败" }));
    } finally {
      res.end();
    }
  }
}
