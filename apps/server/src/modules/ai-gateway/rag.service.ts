import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VectorService } from "./vector.service";
import { KnowledgeQualityService } from "./knowledge-quality.service";
import { AiGatewayService, GatewayChatRequest } from "./ai-gateway.service";
import { AiMessage } from "./adapters/base.adapter";
import { PrismaService } from "../../prisma/prisma.service";

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
    private readonly prisma: PrismaService,
    private readonly quality: KnowledgeQualityService,
  ) {}

  /** 解析模板变量 */
  private renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }

  /** 获取场景对应的系统提示词（优先数据库模板，回退默认） */
  private async getSystemPrompt(scene: string, variables?: Record<string, string>): Promise<string> {
    const tpl = await this.prisma.ragPromptTemplate.findFirst({
      where: { scene, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (tpl && variables) {
      return this.renderTemplate(tpl.systemPrompt, variables);
    }
    if (tpl) return tpl.systemPrompt;
    return RAG_SYSTEM_PROMPT;
  }

  /** 向圈子知识库提问 */
  async askCircle(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<RagAskResult> {
    // 1. 三级兜底检索：圈子专属知识（优先）+ 全局通用知识库（searchFederated 本地不降权、全局降权 0.3）
    const chunks = await this.searchFederated(question, circleId, 5).catch(() => [] as KnowledgeChunk[]);

    const systemPrompt = await this.getSystemPrompt("circle_assistant", { circleId });
    const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

    if (chunks.length > 0) {
      // 2a. 命中知识库 → RAG 回答（圈子内容优先，来源标注）
      const contextText = chunks
        .map((c, i) => `[参考${i + 1}][${c.sourceType === "global" ? "通用" : "圈子"}] ${c.content}`)
        .join("\n\n");
      messages.push({ role: "system", content: `以下是知识库检索到的内容，请优先依据标注为「圈子」的内容作答，通用内容仅作补充：\n${contextText}` });
    } else {
      // 2b. 知识库无命中 → 通用大模型兜底（基于国学通识，第三级）
      messages.push({ role: "system", content: "知识库暂无直接相关内容。请你作为本圈子的国学助手，基于通用国学常识简明作答，并在结尾用一句话友好说明：本回答来自通用知识，圈子专属内容仍在完善中。" });
    }
    messages.push(...(history || []), { role: "user", content: question });

    // 3. 调用 AI 生成回答
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
    // 三级兜底检索：圈子专属（优先）+ 全局通用知识库
    const chunks = await this.searchFederated(question, circleId, 5).catch(() => [] as KnowledgeChunk[]);

    const systemPrompt = await this.getSystemPrompt("circle_assistant", { circleId });
    const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

    if (chunks.length > 0) {
      const contextText = chunks
        .map((c, i) => `[参考${i + 1}][${c.sourceType === "global" ? "通用" : "圈子"}] ${c.content}`)
        .join("\n\n");
      messages.push({ role: "system", content: `以下是知识库检索到的内容，请优先依据标注为「圈子」的内容作答，通用内容仅作补充：\n${contextText}` });
    } else {
      messages.push({ role: "system", content: "知识库暂无直接相关内容。请你作为本圈子的国学助手，基于通用国学常识简明作答，并在结尾用一句话友好说明：本回答来自通用知识，圈子专属内容仍在完善中。" });
    }
    messages.push(...(history || []), { role: "user", content: question });

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

  /** 联邦检索：圈子知识 + 全局典籍 */
  async searchFederated(
    question: string,
    circleId: string,
    topK = 5,
    globalWeight = 0.3,
  ): Promise<KnowledgeChunk[]> {
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) return [];

    // 并行搜索：本地圈子 + 全局知识
    const [localResults, globalResults] = await Promise.all([
      this.vector.searchCircleKnowledge(queryVec, circleId, topK),
      this.vector.searchGlobalKnowledge(queryVec, topK),
    ]);

    // 合并去重，全局结果降权
    const seen = new Set<string>();
    const merged: KnowledgeChunk[] = [];

    for (const r of localResults) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push({ ...r, sourceType: "circle" });
      }
    }

    for (const r of globalResults) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push({ ...r, similarity: r.similarity * globalWeight, sourceType: "global" });
      }
    }

    merged.sort((a, b) => b.similarity - a.similarity);
    return merged.slice(0, topK);
  }

  /** 加权联邦提问（质量+向量混合排序） */
  async askCircleFederated(
    question: string,
    circleId: string,
    userId?: string,
    history?: AiMessage[],
  ): Promise<RagAskResult> {
    const [queryVec] = await this.vector.embed([question]);
    if (!queryVec) throw new BusinessException(ErrorCode.BAD_REQUEST, "Embedding 失败");

    // 联邦检索
    const chunks = await this.searchFederated(question, circleId, 7);

    if (chunks.length === 0) {
      return { answer: "知识库中暂无相关内容。", sources: [] };
    }

    // 获取质量评分用于加权
    const ids = chunks.map((c) => c.id);
    const qualityMap = new Map<string, number>();
    const records = await this.prisma.circleKnowledge.findMany({
      where: { id: { in: ids } },
      select: { id: true, qualityScore: true },
    });
    for (const r of records) {
      if (r.qualityScore != null) qualityMap.set(r.id, r.qualityScore);
    }

    // 质量加权重排序
    const Q_WEIGHT = 0.3;
    const SIM_WEIGHT = 0.7;
    const scored = chunks.map((c) => {
      const qScore = qualityMap.get(c.id) ?? 0.5;
      const combined = c.similarity * SIM_WEIGHT + qScore * Q_WEIGHT;
      return { ...c, similarity: Math.round(combined * 10000) / 10000 };
    });
    scored.sort((a, b) => b.similarity - a.similarity);

    const topChunks = scored.slice(0, 5);
    const contextText = topChunks
      .map((c, i) => `[参考${i + 1}] [${c.sourceType}] ${c.content}`)
      .join("\n\n");

    const systemPrompt = await this.getSystemPrompt("circle_assistant", { circleId });
    const messages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `知识库内容（含全局典籍）：\n${contextText}` },
      ...(history || []),
      { role: "user", content: question },
    ];

    const result = await this.gateway.chat({
      scene: "circle_assistant",
      userId,
      messages,
      options: { temperature: 0.3, maxTokens: 1024 },
    });

    return { answer: result.content, sources: topChunks };
  }

  /** 智能分块：将长文本切成语义段落 */
  chunkText(content: string, maxChunkSize = 500): string[] {
    if (content.length <= maxChunkSize) return [content];

    const chunks: string[] = [];
    const paragraphs = content.split(/\n{1,}/);

    let current = "";
    for (const para of paragraphs) {
      if ((current + para).length > maxChunkSize && current.length > 0) {
        chunks.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n" : "") + para;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    // 合并过短的尾部chunk
    if (chunks.length >= 2 && chunks[chunks.length - 1].length < 100) {
      chunks[chunks.length - 2] += "\n" + chunks.pop()!;
    }

    return chunks;
  }

  /** 对知识库内容做分块存储（为长文本生成子块） */
  async chunkAndStore(knowledgeId: string): Promise<number> {
    const record = await this.prisma.circleKnowledge.findUnique({
      where: { id: knowledgeId },
      select: { id: true, content: true, circleId: true, sourceType: true },
    });
    if (!record) return 0;

    const chunks = this.chunkText(record.content);
    if (chunks.length <= 1) {
      // 单块，标记为 chunkIndex=0
      await this.prisma.circleKnowledge.update({
        where: { id: knowledgeId },
        data: { chunkIndex: 0 },
      });
      return 0;
    }

    // 删除旧子块
    await this.prisma.circleKnowledge.deleteMany({
      where: { parentChunkId: knowledgeId },
    });

    let created = 0;
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const hash = require("crypto").createHash("md5").update(chunk).digest("hex");
      try {
        await this.prisma.circleKnowledge.create({
          data: {
            circleId: record.circleId,
            sourceType: record.sourceType,
            content: chunk,
            contentHash: `${hash}_chunk_${i}`,
            chunkIndex: i,
            parentChunkId: knowledgeId,
            status: "active",
            scope: "circle",
            addedBy: "SYSTEM",
          },
        });
        created++;
      } catch (err) {
        // 重复chunk跳过
        this.logger.warn(`知识分块创建失败`, err);
      }
    }

    this.logger.log(`分块完成: ${knowledgeId} → ${created} 个子块`);
    return created;
  }
}
