import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

/** 余弦相似度 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** 将中文文本转为字符哈希向量（Embedding API 不可用时的本地降级方案） */
function textToSparseVector(text: string, dimension: number): number[] {
  const vec = new Array(dimension).fill(0);
  // 提取中文汉字
  const chars = text.replace(/[^一-鿿]/g, "");
  if (chars.length === 0) {
    // 纯数字/英文等，用全部字符
    const all = text.replace(/\s+/g, "");
    for (let i = 0; i < all.length; i++) {
      vec[all.charCodeAt(i) % dimension] += 0.3;
    }
    for (let i = 0; i < all.length - 1; i++) {
      const bigramCode = (all.charCodeAt(i) * 31 + all.charCodeAt(i + 1));
      vec[bigramCode % dimension] += 0.2;
    }
  } else {
    // 中文 unigram
    for (let i = 0; i < chars.length; i++) {
      vec[chars.charCodeAt(i) % dimension] += 0.3;
    }
    // 中文 bigram
    for (let i = 0; i < chars.length - 1; i++) {
      const bigramCode = (chars.charCodeAt(i) * 31 + chars.charCodeAt(i + 1));
      vec[bigramCode % dimension] += 0.2;
    }
  }

  // L2 归一化
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dimension; i++) vec[i] /= norm;
  }
  return vec;
}

/**
 * 向量服务 — pgvector 操作 + Embedding API + 本地降级
 *
 * 三级优雅降级：
 *   1. pgvector 原生 <=> 余弦距离运算符（最快，需要 PostgreSQL pgvector 扩展）
 *   2. vectorJson 列 + JS 余弦相似度（需要 Embedding API 生成向量）
 *   3. 本地字符哈希向量（不依赖任何外部 API，始终可用）
 */
@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly embeddingBaseUrl: string;
  private readonly embeddingApiKey: string;
  private readonly embeddingModel: string;
  private readonly dimension: number;

  /** pgvector 可用性（懒检测） */
  private pgvectorAvailable = false;
  private pgvectorDetected = false;

  /** Embedding API 可用性（懒检测） */
  private embeddingApiAvailable = false;
  private embeddingApiChecked = false;

  constructor(private readonly prisma: PrismaService) {
    this.embeddingApiKey = process.env.DEEPSEEK_API_KEY || "";
    this.embeddingBaseUrl = process.env.EMBEDDING_BASE_URL || "https://api.deepseek.com/v1";
    this.embeddingModel = process.env.EMBEDDING_MODEL || "deepseek-embedding";
    this.dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1536", 10);
    if (!this.embeddingApiKey) {
      this.logger.warn("DEEPSEEK_API_KEY 未配置，使用本地字符哈希向量");
    }
  }

  /** 懒加载检测 pgvector */
  private async detectPgvector(): Promise<void> {
    if (this.pgvectorDetected) return;
    this.pgvectorDetected = true;
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')`,
      );
      this.pgvectorAvailable = rows[0]?.exists ?? false;
    } catch {
      this.pgvectorAvailable = false;
    }
    this.logger.log(this.pgvectorAvailable ? "向量存储: pgvector (<=>)" : "向量存储: JSON (向量在JS侧计算)");
  }

  /** 懒加载检测 Embedding API */
  private async detectEmbeddingApi(): Promise<void> {
    if (this.embeddingApiChecked) return;
    this.embeddingApiChecked = true;
    if (!this.embeddingApiKey) {
      this.embeddingApiAvailable = false;
      this.logger.log("向量生成: 本地字符哈希（无API Key）");
      return;
    }
    try {
      const resp = await fetch(`${this.embeddingBaseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.embeddingApiKey}`,
        },
        body: JSON.stringify({ model: this.embeddingModel, input: ["ping"] }),
      });
      if (resp.ok) {
        this.embeddingApiAvailable = true;
        this.logger.log("向量生成: Embedding API");
      } else if (resp.status === 404) {
        this.embeddingApiAvailable = false;
        this.logger.log("向量生成: 本地字符哈希（Embedding API 端点不存在）");
      } else {
        const err = await resp.text().catch(() => "");
        this.logger.warn(`Embedding API 检测失败 [${resp.status}]: ${err.slice(0, 100)}`);
        this.embeddingApiAvailable = false;
      }
    } catch (err: any) {
      this.logger.warn(`Embedding API 检测失败: ${err.message}`);
      this.embeddingApiAvailable = false;
    }
  }

  /** 文本转向量 */
  async embed(texts: string[]): Promise<number[][]> {
    await this.detectEmbeddingApi();

    if (this.embeddingApiAvailable) {
      return this.callEmbeddingApi(texts);
    }
    return texts.map((t) => textToSparseVector(t, this.dimension));
  }

  /** 调用远程 Embedding API */
  private async callEmbeddingApi(texts: string[]): Promise<number[][]> {
    const resp = await fetch(`${this.embeddingBaseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.embeddingApiKey}`,
      },
      body: JSON.stringify({ model: this.embeddingModel, input: texts }),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      throw new Error(`Embedding API error [${resp.status}]: ${err.slice(0, 200)}`);
    }

    const json = await resp.json() as { data?: { embedding: number[] }[] };
    return json.data?.map((d) => d.embedding) || [];
  }

  /** 将向量写入 circle_knowledge 表 */
  async storeCircleKnowledge(id: string, vector: number[]): Promise<void> {
    await this.detectPgvector();

    if (this.pgvectorAvailable) {
      const vectorStr = `[${vector.join(",")}]`;
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE circle_knowledge SET embedding = $1::vector WHERE id = $2`,
          vectorStr,
          id,
        );
      } catch {
        // pgvector 列可能不存在，降级到 JSON
        await this.prisma.circleKnowledge.update({
          where: { id },
          data: { vectorJson: JSON.stringify(vector) },
        });
      }
    } else {
      await this.prisma.circleKnowledge.update({
        where: { id },
        data: { vectorJson: JSON.stringify(vector) },
      });
    }
  }

  /** 向量相似度搜索 — 圈子知识库 */
  async searchCircleKnowledge(
    queryVector: number[],
    circleId: string,
    topK = 5,
  ): Promise<VectorSearchResult[]> {
    await this.detectPgvector();

    if (this.pgvectorAvailable) {
      try {
        return await this.searchPgvector(queryVector, circleId, topK);
      } catch {
        // pgvector 列可能不存在
      }
    }
    return this.searchJsonFallback(queryVector, [circleId], topK);
  }

  /** 向量相似度搜索 — 全部知识库（跨圈子） */
  async searchAllKnowledge(
    queryVector: number[],
    circleIds: string[],
    topK = 5,
  ): Promise<VectorSearchResult[]> {
    if (circleIds.length === 0) return [];
    await this.detectPgvector();

    if (this.pgvectorAvailable) {
      try {
        return await this.searchPgvectorMulti(queryVector, circleIds, topK);
      } catch {
        // pgvector 列可能不存在
      }
    }
    return this.searchJsonFallback(queryVector, circleIds, topK);
  }

  /** 删除向量 */
  async deleteCircleKnowledge(id: string): Promise<void> {
    await this.detectPgvector();

    if (this.pgvectorAvailable) {
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE circle_knowledge SET embedding = NULL WHERE id = $1`,
          id,
        );
      } catch {
        // 嵌入列可能不存在，降级到 JSON
      }
    }
    await this.prisma.circleKnowledge.update({
      where: { id },
      data: { vectorJson: null },
    });
  }

  /** 批量检查哪些知识条目还没有向量 */
  async findUnindexed(limit = 100): Promise<Array<{ id: string; content: string }>> {
    await this.detectPgvector();

    // 同时检查 pgvector embedding 列和 vectorJson 列
    let pgRows: Array<{ id: string; content: string }> = [];
    if (this.pgvectorAvailable) {
      try {
        pgRows = await this.prisma.$queryRawUnsafe<
          Array<{ id: string; content: string }>
        >(
          `SELECT id, content FROM circle_knowledge
           WHERE embedding IS NULL AND status = 'active'
           LIMIT $1`,
          limit,
        );
      } catch {
        // 嵌入列可能不存在
      }
    }

    const jsonRows = await this.prisma.circleKnowledge.findMany({
      where: { vectorJson: null, status: "active" },
      select: { id: true, content: true },
      take: limit,
    });

    // 合并去重
    const seen = new Set(pgRows.map((r) => r.id));
    const result = [...pgRows];
    for (const r of jsonRows) {
      if (!seen.has(r.id)) {
        result.push(r);
        seen.add(r.id);
      }
    }
    return result.slice(0, limit);
  }

  // ─── pgvector 实现 ───

  private async searchPgvector(
    queryVector: number[],
    circleId: string,
    topK: number,
  ): Promise<VectorSearchResult[]> {
    const vectorStr = `[${queryVector.join(",")}]`;
    return this.prisma.$queryRawUnsafe<VectorSearchResult[]>(
      `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM circle_knowledge
       WHERE embedding IS NOT NULL
         AND circle_id = $2
         AND status = 'active'
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      circleId,
      topK,
    );
  }

  private async searchPgvectorMulti(
    queryVector: number[],
    circleIds: string[],
    topK: number,
  ): Promise<VectorSearchResult[]> {
    const vectorStr = `[${queryVector.join(",")}]`;
    const placeholders = circleIds.map((_, i) => `$${i + 2}`).join(",");
    return this.prisma.$queryRawUnsafe<VectorSearchResult[]>(
      `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM circle_knowledge
       WHERE embedding IS NOT NULL
         AND circle_id IN (${placeholders})
         AND status = 'active'
       ORDER BY embedding <=> $1::vector
       LIMIT $${circleIds.length + 2}`,
      vectorStr,
      ...circleIds,
      topK,
    );
  }

  // ─── JSON fallback 实现 ───

  private async searchJsonFallback(
    queryVector: number[],
    circleIds: string[],
    topK: number,
  ): Promise<VectorSearchResult[]> {
    const rows = await this.prisma.circleKnowledge.findMany({
      where: {
        circleId: { in: circleIds },
        status: "active",
        vectorJson: { not: null },
      },
      select: { id: true, content: true, vectorJson: true },
    });

    const scored: VectorSearchResult[] = [];
    for (const row of rows) {
      if (!row.vectorJson) continue;
      try {
        const vec = JSON.parse(row.vectorJson) as number[];
        const similarity = cosineSimilarity(queryVector, vec);
        scored.push({ id: row.id, content: row.content, similarity });
      } catch {
        // 跳过损坏的向量数据
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }
}
