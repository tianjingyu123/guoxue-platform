import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";

/**
 * SSE 流式响应格式定义
 *
 * 所有模型适配器的流式输出统一为以下 SSE 事件格式：
 * - data: {"type":"chunk","content":"文本增量"}
 * - data: {"type":"source","index":0,"title":"参考标题","excerpt":"摘要"}
 * - data: {"type":"card","cardType":"bazi-card","payload":{...}}   ← 富消息结构化卡片
 * - data: {"type":"meta","conversationId":"...","disclaimer":"..."} ← 会话元信息（流结束前下发）
 * - data: {"type":"done","usage":{"promptTokens":100,"completionTokens":200}}
 * - data: {"type":"error","message":"错误描述"}
 *
 * ## 富消息扩展方法（新增一种卡片）
 * 1. 后端：在业务 service 里组装 payload，流式路径 `res.write(sse.encode({ type: "card", cardType: "xxx-card", payload }))`，
 *    非流式路径在响应 messages 数组里插一条 `{ type: "xxx-card", payload }`；
 * 2. 前端：components/agent/cards/ 下新增 xxx-card.vue 渲染组件，并在 components/agent/rich-message.vue 的
 *    CARD_COMPONENTS 注册表登记一行即可；未注册的 cardType 前端自动降级显示 content 文本（向前兼容）。
 */
export interface UnifiedStreamChunk {
  type: "chunk" | "source" | "card" | "meta" | "done" | "error";
  content?: string;
  index?: number;
  title?: string;
  excerpt?: string;
  message?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  /** type=card：卡片类型标识（如 bazi-card），前端按此分发渲染组件 */
  cardType?: string;
  /** type=card：卡片结构化载荷 */
  payload?: unknown;
  /** type=meta：会话续聊 id（Coze 链路） */
  conversationId?: string;
  /** type=meta：AI 风险免责声明 */
  disclaimer?: string;
  /** type=meta：软性导流推荐（征求同意后展开） */
  recommendation?: unknown;
}

type StreamMeta = Pick<UnifiedStreamChunk, "conversationId" | "disclaimer" | "recommendation">;

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
    options?: { sources?: Array<{ title: string; excerpt: string }>; meta?: StreamMeta },
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

      // 业务元信息统一在文本完成后、done 前发送（免责声明/会话 id/推荐等）
      if (options?.meta && Object.values(options.meta).some((value) => value !== undefined)) {
        yield this.encode({ type: "meta", ...options.meta });
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
    meta?: StreamMeta,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const line of this.unify(source, { sources, meta })) {
        res.write(line);
      }
    } catch (err: any) {
      res.write(this.encode({ type: "error", message: err.message || "流式输出失败" }));
    } finally {
      res.end();
    }
  }
}
