import { Injectable, Logger } from "@nestjs/common";
import { VectorService } from "./vector.service";
import { AiGatewayService, GatewayChatRequest } from "./ai-gateway.service";
import { AiMessage } from "./adapters/base.adapter";

interface KnowledgeChunk {
  id: string;
  content: string;
  similarity: number;
  sourceType?: string;
}

interface RagAskResult {
  answer: string;
  sources: KnowledgeChunk[];
}

const RAG_SYSTEM_PROMPT = `你是一个专业的国学知识助手。请根据提供的知识库内容回答用户的问题。

规则：
1. 优先使用知识库中的内容回答，不要编造信息
2. 如果知识库中没有相关信息，请诚实告知用户
3. 回答时引用具体的知识来源
4. 回答风格要有人情味，避免机械化的语气
5. 使用简洁清晰的中文表达`;

/**
 * RAG 检索增强生成服务
 *
 * 流程：用户提问 → Embedding → pgvector 向量搜索 → Prompt 组装 → DeepSeek 生成
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vector: VectorService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 向圈子知识库提问 */
  async askCircle(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<RagAskResult> {
    // 1. 向量化问题
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) throw new Error("Embedding 失败");

    // 2. 向量检索
    const chunks = await this.vector.searchCircleKnowledge(queryVec, circleId, 5);

    if (chunks.length === 0) {
      return { answer: "知识库中暂无相关内容，请添加更多知识后再提问。", sources: [] };
    }

    // 3. 构建上下文
    const contextText = chunks
      .map((c, i) => `[参考${i + 1}] ${c.content}`)
      .join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: RAG_SYSTEM_PROMPT },
      { role: "system", content: `知识库内容：\n${contextText}` },
      ...(history || []),
      { role: "user", content: question },
    ];

    // 4. 调用 AI 生成回答
    const result = await this.gateway.chat({
      scene: "circle_assistant",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    });

    return { answer: result.content, sources: chunks };
  }

  /** 流式向圈子知识库提问 */
  async *askCircleStream(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): AsyncIterable<string> {
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) throw new Error("Embedding 失败");

    const chunks = await this.vector.searchCircleKnowledge(queryVec, circleId, 5);

    if (chunks.length === 0) {
      yield "知识库中暂无相关内容，请添加更多知识后再提问。";
      return;
    }

    const contextText = chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n");

    const messages: AiMessage[] = [
      { role: "system", content: RAG_SYSTEM_PROMPT },
      { role: "system", content: `知识库内容：\n${contextText}` },
      ...(history || []),
      { role: "user", content: question },
    ];

    const req: GatewayChatRequest = {
      scene: "circle_assistant",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    };

    for await (const chunk of this.gateway.chatStream(req)) {
      yield chunk;
    }
  }

  /** 通用 RAG 检索（多知识源） */
  async searchContext(
    question: string,
    circleIds: string[],
    topK = 5,
  ): Promise<KnowledgeChunk[]> {
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) return [];

    return this.vector.searchAllKnowledge(queryVec, circleIds, topK);
  }

  /** 知识库内容同步 — 为新入库的文本生成向量 */
  async indexUnindexed(batchSize = 20): Promise<number> {
    const unindexed = await this.vector.findUnindexed(batchSize);
    if (unindexed.length === 0) return 0;

    const texts = unindexed.map((r) => r.content);
    const vectors = await this.vector.embed(texts);

    for (let i = 0; i < unindexed.length && i < vectors.length; i++) {
      await this.vector.storeCircleKnowledge(unindexed[i].id, vectors[i]);
    }

    this.logger.log(`向量索引完成: ${Math.min(unindexed.length, vectors.length)} 条`);
    return Math.min(unindexed.length, vectors.length);
  }
}
