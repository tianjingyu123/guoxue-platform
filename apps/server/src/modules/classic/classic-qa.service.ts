import { Injectable, Logger } from "@nestjs/common";
import { RagService } from "../ai-gateway/rag.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { VectorService } from "../ai-gateway/vector.service";
import { AiMessage } from "../ai-gateway/adapters/base.adapter";

export interface ClassicQAReply {
  answer: string;
  citations: Array<{ bookName: string; chapterName: string; excerpt: string; similarity: number }>;
}

interface RagChunk {
  content: string;
  similarity: number;
  bookName?: string;
  chapterName?: string;
}

const CLASSIC_QA_PROMPT = `你是一位资深的国学经典研究学者。请根据提供的古籍原文回答用户的问题。

规则：
1. 必须引用提供的原文作为依据，不要编造
2. 先引用原文，再用白话文解读
3. 解读要深入浅出，适合现代读者理解
4. 如果涉及不同版本或学派的理解差异，请简要说明
5. 使用典雅但不晦涩的中文表达`;

@Injectable()
export class ClassicQaService {
  private readonly logger = new Logger(ClassicQaService.name);

  constructor(
    private readonly rag: RagService,
    private readonly gateway: AiGatewayService,
    private readonly vector: VectorService,
  ) {}

  /** 古籍问答（非流式） */
  async ask(
    question: string,
    userId?: string,
    history?: AiMessage[],
    _classicId?: string,
  ): Promise<ClassicQAReply> {
    // 1. 向量检索相关古籍段落
    const chunks = await this.rag.searchContext(question, [], 5);

    if (chunks.length === 0) {
      return { answer: "经典库中暂未收录相关内容，管理员正在持续丰富古籍数据。", citations: [] };
    }

    // 2. 构建上下文
    const contextText = chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: CLASSIC_QA_PROMPT },
      { role: "system", content: `古籍参考原文：\n${contextText}` },
      ...(history || []),
      { role: "user", content: question },
    ];

    // 3. AI 生成回答
    const result = await this.gateway.chat({
      scene: "classic_qa",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1536 },
    });

    return {
      answer: result.content,
      citations: chunks.map((c: RagChunk) => ({
        bookName: c.bookName || "未知",
        chapterName: c.chapterName || "未知章节",
        excerpt: c.content.slice(0, 200),
        similarity: c.similarity,
      })),
    };
  }

  /** 古籍问答历史 */
  async getHistory(_classicId: string, _userId?: string) {
    return { items: [], total: 0 };
  }

  /** 古籍问答（流式） */
  async *askStream(
    question: string,
    userId?: string,
    history?: AiMessage[],
    _classicId?: string,
  ): AsyncIterable<string> {
    const chunks = await this.rag.searchContext(question, [], 5);

    if (chunks.length === 0) {
      yield "经典库中暂未收录相关内容。";
      return;
    }

    const contextText = chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: CLASSIC_QA_PROMPT },
      { role: "system", content: `古籍参考原文：\n${contextText}` },
      ...(history || []),
      { role: "user", content: question },
    ];

    for await (const chunk of this.gateway.chatStream({
      scene: "classic_qa",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1536 },
    })) {
      yield chunk;
    }
  }

  /** 索引古籍文本（委托定时任务，保留接口兼容） */
  async indexClassicTexts(_batchSize = 20): Promise<number> {
    this.logger.warn("indexClassicTexts 已由 ClassicIndexTask 接管，调用无效");
    return 0;
  }
}
