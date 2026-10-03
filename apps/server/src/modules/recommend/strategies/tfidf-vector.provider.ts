import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { VectorRecallProvider } from "./vector-recall.strategy";

interface TfidfVector {
  id: string;
  type: string;
  vector: number[];
  /** 标签 + 标题分词后存储，供调试 */
  terms: string[];
}

/**
 * TF-IDF 向量召回提供者
 *
 * 用标签 + 标题分词构建稀疏向量 → 余弦相似度检索。
 * 纯 TypeScript 实现，不依赖 PGVector 或外部 embedding API。
 * 后续接入 Openai/本地模型时只需替换此 Provider。
 */
@Injectable()
export class TfidfVectorProvider implements VectorRecallProvider {
  private readonly logger = new Logger(TfidfVectorProvider.name);
  /** 词汇表 → 索引 */
  private vocab: Map<string, number> = new Map();
  /** 文档频率：词 → 出现文档数 */
  private df: Map<string, number> = new Map();
  /** 内容向量缓存 */
  private vectors: Map<string, TfidfVector> = new Map();
  /** 文档总数 */
  private docCount = 0;
  /** 是否已构建索引 */
  private built = false;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ─── 公共接口 ───

  async embed(texts: string[]): Promise<number[][]> {
    await this.ensureBuilt();
    return texts.map((t) => this.textToVector(t));
  }

  async search(
    queryVector: number[],
    topK: number,
    filter?: { type?: string; excludeIds?: string[] },
  ): Promise<{ id: string; type: string; score: number }[]> {
    await this.ensureBuilt();
    const exclude = new Set(filter?.excludeIds ?? []);

    const results: { id: string; type: string; score: number }[] = [];
    for (const [, v] of this.vectors) {
      if (filter?.type && v.type !== filter.type) continue;
      if (exclude.has(v.id)) continue;
      const sim = cosineSimilarity(queryVector, v.vector);
      if (sim > 0) {
        results.push({ id: v.id, type: v.type, score: sim });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async buildUserVector(userId: string): Promise<number[] | null> {
    await this.ensureBuilt();

    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 10,
    });

    if (interests.length === 0) return null;

    // 用户向量 = 兴趣标签向量的加权平均
    const vecLen = this.vocab.size || 128;
    const userVec = new Array(vecLen).fill(0);
    let totalWeight = 0;

    for (const interest of interests) {
      const tagVec = this.textToVector(interest.tag);
      const weight = interest.score;
      for (let i = 0; i < vecLen; i++) {
        userVec[i] += tagVec[i] * weight;
      }
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < vecLen; i++) {
        userVec[i] /= totalWeight;
      }
    }

    return userVec;
  }

  // ─── 索引构建 ───

  /** 从数据库加载所有内容并构建 TF-IDF 索引，缓存到 Redis */
  async ensureBuilt(): Promise<void> {
    if (this.built) return;

    // 尝试从 Redis 恢复（跳过完整重建）
    const cachedVocab = await this.redis.getJson<[string, number][]>("recommend:tfidf:vocab:v1");
    if (cachedVocab?.length) {
      // Redis 有缓存时直接做完整重建（vocab 恢复不可靠，全量重建更安全）
      await this.fullRebuild();
      return;
    }

    await this.fullRebuild();
  }

  async fullRebuild(): Promise<void> {
    this.vocab.clear();
    this.df.clear();
    this.vectors.clear();
    this.docCount = 0;

    // 加载所有内容
    const [articles, courses, products, circles] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM" }, select: { id: true, title: true, tags: true } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: { id: true, title: true, tags: true } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: { id: true, title: true, tags: true } }),
      this.prisma.circle.findMany({ select: { id: true, name: true, tags: true } }),
    ]);

    // 收集文档
    const docs: { id: string; type: string; terms: string[] }[] = [];
    for (const a of articles) docs.push({ id: a.id, type: "ARTICLE", terms: tokenize(a.title, a.tags) });
    for (const c of courses) docs.push({ id: c.id, type: "COURSE", terms: tokenize(c.title, c.tags) });
    for (const p of products) docs.push({ id: p.id, type: "PRODUCT", terms: tokenize(p.title, p.tags) });
    for (const c of circles) docs.push({ id: c.id, type: "CIRCLE", terms: tokenize(c.name, c.tags) });

    this.docCount = docs.length;

    // 统计词频（DF）
    for (const doc of docs) {
      const seen = new Set<string>();
      for (const term of doc.terms) {
        if (!seen.has(term)) {
          this.df.set(term, (this.df.get(term) ?? 0) + 1);
          seen.add(term);
        }
      }
    }

    // 构建词汇表（按 DF 排序，取 top 5000）
    const sortedTerms = [...this.df.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5000);

    this.vocab.clear();
    sortedTerms.forEach(([term], i) => this.vocab.set(term, i));

    // 构建 TF-IDF 向量
    const vSize = this.vocab.size;
    for (const doc of docs) {
      const tf = new Map<string, number>();
      for (const t of doc.terms) tf.set(t, (tf.get(t) ?? 0) + 1);

      const vec = new Array(vSize).fill(0);
      for (const [term, freq] of tf) {
        const idx = this.vocab.get(term);
        if (idx === undefined) continue;
        const tfVal = Math.log1p(freq);
        const dfVal = this.df.get(term) ?? 1;
        const idf = Math.log((this.docCount + 1) / (dfVal + 1)) + 1;
        vec[idx] = tfVal * idf;
      }

      this.vectors.set(`${doc.type}:${doc.id}`, { id: doc.id, type: doc.type, vector: vec, terms: doc.terms });
    }

    this.built = true;

    // 持久化词汇表到 Redis（30天）
    await this.redis.setJson("recommend:tfidf:vocab:v1", [...this.vocab.entries()], 2592000);
  }

  // ─── 工具方法 ───

  private textToVector(text: string): number[] {
    const terms = tokenize(text, []);
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);

    const vec = new Array(this.vocab.size || 128).fill(0);
    for (const [term, freq] of tf) {
      const idx = this.vocab.get(term);
      if (idx === undefined) continue;
      const tfVal = Math.log1p(freq);
      const dfVal = this.df.get(term) ?? 1;
      const idf = Math.log((Math.max(this.docCount, 1) + 1) / (dfVal + 1)) + 1;
      vec[idx] = tfVal * idf;
    }
    return vec;
  }

  getStats(): { docCount: number; vocabSize: number; vectorCount: number } {
    return { docCount: this.docCount, vocabSize: this.vocab.size, vectorCount: this.vectors.size };
  }
}

// ─── 工具函数 ───

/** 中文简单分词：标题逐字 + 标签直接使用 */
function tokenize(title: string, tags: string[]): string[] {
  const terms: string[] = [];
  // 标题逐字 + 二字组
  const cleaned = title.replace(/[《》（）\s[\]【】"",.!！?？:：;；\-—/\\]+/g, "");
  for (const ch of cleaned) {
    terms.push(ch);
  }
  // 二字组
  for (let i = 0; i < cleaned.length - 1; i++) {
    terms.push(cleaned.slice(i, i + 2));
  }
  // 标签直接加入
  for (const tag of tags) {
    terms.push(tag);
  }
  return terms;
}

/** 余弦相似度 */
function cosineSimilarity(a: number[], b: number[]): number {
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
