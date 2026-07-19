import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VectorService } from "../ai-gateway/vector.service";
import { publicQuarantinedIds } from "../../common/public-content-quarantine";

export interface SemanticResult {
  id: string;
  title: string;
  type: string;
  similarity: number;
  excerpt?: string;
  cover?: string;
  metadata?: Record<string, unknown>;
}

/** 将文本转为本地字符哈希向量（Embedding API 降级用） */
function localTextVector(text: string, dim = 1024): number[] {
  const vec = new Array(dim).fill(0);
  const cleaned = text.replace(/\s+/g, "");
  for (let i = 0; i < cleaned.length; i++) {
    vec[cleaned.charCodeAt(i) % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) for (let i = 0; i < dim; i++) vec[i] /= norm;
  return vec;
}

function dotSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vector: VectorService,
  ) {}

  /** 语义搜索 — 对内容标题+摘要做向量相似度匹配 */
  async search(query: string, topK = 10): Promise<SemanticResult[]> {
    if (!query?.trim()) return [];

    // 1. 生成查询向量
    let queryVec: number[];
    try {
      const embeddings = await this.vector.embed([query.trim()]);
      queryVec = embeddings[0];
    } catch (err: unknown) {
      this.logger.warn(`查询向量生成失败，使用本地向量: ${(err as Error).message}`);
      queryVec = localTextVector(query.trim());
    }

    // 2. 收集各类型内容的候选文本
    const candidates = await this.collectCandidates();

    // 3. 计算相似度并排序
    const scored: SemanticResult[] = [];
    for (const c of candidates) {
      const candVec = localTextVector(c.text);
      const similarity = dotSimilarity(queryVec, candVec);
      if (similarity > 0.15) {
        scored.push({
          id: c.id,
          title: c.title,
          type: c.type,
          similarity: Math.round(similarity * 100) / 100,
          excerpt: c.excerpt,
          cover: c.cover,
        });
      }
    }

    // 如果 Embedding API 可用，用 API 重新计算高分候选的向量以提升精度
    if (scored.length > 0) {
      try {
        await this.rerankWithApi(queryVec, scored);
      } catch (err: unknown) {
        this.logger.debug(`API 重排序跳过: ${(err as Error).message}`);
      }
    }

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /** 混合搜索：FTS 结果 + 语义重排序 */
  async hybridRerank(
    query: string,
    ftsResults: Array<{ id: string; title: string; type: string; excerpt?: string }>,
  ): Promise<Array<{ id: string; title: string; type: string; score: number }>> {
    if (!query?.trim() || ftsResults.length === 0) {
      return ftsResults.map((r) => ({ ...r, score: 1 }));
    }

    let queryVec: number[];
    try {
      const embeddings = await this.vector.embed([query.trim()]);
      queryVec = embeddings[0];
    } catch (err) {
      this.logger.warn(`向量嵌入失败，使用本地向量兜底`, err);
      queryVec = localTextVector(query.trim());
    }

    return ftsResults
      .map((r) => {
        const text = `${r.title} ${r.excerpt || ""}`;
        const similarity = dotSimilarity(queryVec, localTextVector(text));
        // 混合评分: 60% FTS rank + 40% semantic similarity
        const score = 0.6 * 1.0 + 0.4 * similarity;
        return { ...r, score: Math.round(score * 100) / 100 };
      })
      .sort((a, b) => b.score - a.score);
  }

  /** 语义查询建议 — 基于 search_history 找相似查询 */
  async suggestSimilar(query: string, limit = 5): Promise<string[]> {
    if (!query?.trim()) return [];

    let queryVec: number[];
    try {
      const embeddings = await this.vector.embed([query.trim()]);
      queryVec = embeddings[0];
    } catch (err) {
      this.logger.warn(`向量嵌入失败，建议查询返回空`, err);
      return [];
    }

    // 从 AiCacheEntry 的 queryVectorJson 中找相似查询
    try {
      const rows = await this.prisma.aiCacheEntry.findMany({
        where: { queryVectorJson: { not: null } },
        select: { queryText: true, queryVectorJson: true },
        take: 200,
      });

      const scored = rows
        .filter((r) => r.queryVectorJson)
        .map((r) => {
          try {
            const vec = JSON.parse(r.queryVectorJson!) as number[];
            return {
              text: r.queryText,
              similarity: dotSimilarity(queryVec, vec),
            };
          } catch (err) {
            this.logger.warn(`查询向量 JSON 解析失败`, err);
            return null;
          }
        })
        .filter((s): s is { text: string; similarity: number } => s !== null && s.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // 去重
      const seen = new Set<string>();
      return scored.filter((s) => {
        if (seen.has(s.text)) return false;
        seen.add(s.text);
        return true;
      }).map((s) => s.text);
    } catch (err) {
      this.logger.warn(`语义建议查询失败`, err);
      return [];
    }
  }

  // ─── 私有方法 ───

  private async collectCandidates(): Promise<
    Array<{ id: string; title: string; type: string; text: string; excerpt?: string; cover?: string }>
  > {
    const results: Array<{ id: string; title: string; type: string; text: string; excerpt?: string; cover?: string }> = [];

    try {
      const [articles, courses, circles, contents, videos] = await Promise.all([
        this.prisma.article.findMany({
          where: { auditStatus: "APPROVED" },
          select: { id: true, title: true, excerpt: true, cover: true },
          take: 100,
        }),
        this.prisma.course.findMany({
          where: { id: { notIn: publicQuarantinedIds("course") }, auditStatus: "APPROVED" },
          select: { id: true, title: true, intro: true, cover: true },
          take: 100,
        }),
        this.prisma.circle.findMany({
          where: { id: { notIn: publicQuarantinedIds("circle") }, status: "ACTIVE" },
          select: { id: true, name: true, intro: true, cover: true },
          take: 50,
        }),
        this.prisma.content.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, excerpt: true, cover: true },
          take: 100,
        }),
        this.prisma.video.findMany({
          where: { id: { notIn: publicQuarantinedIds("video") }, status: "PUBLISHED" },
          select: { id: true, title: true, coverUrl: true },
          take: 50,
        }),
      ]);

      for (const a of articles) {
        results.push({ id: a.id, title: a.title, type: "article", text: `${a.title} ${a.excerpt || ""}`, excerpt: a.excerpt || undefined, cover: a.cover || undefined });
      }
      for (const c of courses) {
        results.push({ id: c.id, title: c.title, type: "course", text: `${c.title} ${c.intro || ""}`, excerpt: c.intro || undefined, cover: c.cover || undefined });
      }
      for (const c of circles) {
        results.push({ id: c.id, title: c.name, type: "circle", text: `${c.name} ${c.intro || ""}`, excerpt: c.intro || undefined, cover: c.cover || undefined });
      }
      for (const c of contents) {
        results.push({ id: c.id, title: c.title, type: "content", text: `${c.title} ${c.excerpt || ""}`, excerpt: c.excerpt || undefined, cover: c.cover || undefined });
      }
      for (const v of videos) {
        const title = v.title || "";
        results.push({ id: v.id, title, type: "video", text: title, cover: v.coverUrl || undefined });
      }
    } catch (err: unknown) {
      this.logger.warn(`候选内容收集失败: ${(err as Error).message}`);
    }

    return results;
  }

  /** 使用 Embedding API 对 Top 候选重新计算精确相似度 */
  private async rerankWithApi(
    queryVec: number[],
    candidates: SemanticResult[],
  ): Promise<void> {
    // 只对 Top-20 用 API 重算
    const top = candidates.slice(0, 20);

    // 重新获取这些候选项的完整文本
    const texts = top.map((c) => c.title);
    let apiVecs: number[][];
    try {
      apiVecs = await this.vector.embed(texts);
    } catch (err) {
      this.logger.warn(`API向量嵌入失败，跳过精确重算`, err);
      return;
    }

    for (let i = 0; i < top.length && i < apiVecs.length; i++) {
      top[i].similarity = Math.round(dotSimilarity(queryVec, apiVecs[i]) * 100) / 100;
    }
  }
}
