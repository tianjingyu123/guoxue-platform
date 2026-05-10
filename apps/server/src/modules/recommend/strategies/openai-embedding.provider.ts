import { Injectable, Logger } from "@nestjs/common";
import { VectorRecallProvider } from "./vector-recall.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";

interface EmbeddingCacheEntry {
  text: string;
  vector: number[];
}

/**
 * OpenAI 兼容的 Embedding Provider
 *
 * 支持 DeepSeek / OpenAI / 本地模型等兼容 API。
 * 按需调用 API，结果缓存到 Redis（24h）。
 * 未配置 API Key 时自动降级为本地标签向量。
 */
@Injectable()
export class OpenAIEmbeddingProvider implements VectorRecallProvider {
  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimension: number;
  private enabled = false;

  /** 内存缓存：文本 → 向量（减少重复 API 调用） */
  private readonly localCache = new Map<string, number[]>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = process.env.EMBEDDING_BASE_URL ?? "https://api.deepseek.com/v1";
    this.model = process.env.EMBEDDING_MODEL ?? "deepseek-embedding";
    this.dimension = parseInt(process.env.EMBEDDING_DIMENSION ?? "1024", 10);

    if (this.apiKey) {
      this.enabled = true;
      this.logger.log(`Embedding Provider 就绪: ${this.baseUrl} model=${this.model}`);
    } else {
      this.logger.warn("未配置 DEEPSEEK_API_KEY / OPENAI_API_KEY，降级为本地标签向量");
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  // ─── 公共接口 ───

  async embed(texts: string[]): Promise<number[][]> {
    if (this.enabled) {
      return this.apiEmbed(texts);
    }
    return this.localEmbed(texts);
  }

  async search(
    queryVector: number[],
    topK: number,
    filter?: { type?: string; excludeIds?: string[] },
  ): Promise<{ id: string; type: string; score: number }[]> {
    // 从 Redis 读取预存的所有内容向量（由定时任务批量计算）
    const allVectors = await this.redis.getJson<{
      id: string;
      type: string;
      vector: number[];
    }[]>("recommend:embedding:vectors:v1");

    if (!allVectors?.length) return [];

    const exclude = new Set(filter?.excludeIds ?? []);
    const results: { id: string; type: string; score: number }[] = [];

    for (const v of allVectors) {
      if (filter?.type && v.type !== filter.type) continue;
      if (exclude.has(v.id)) continue;
      const sim = cosineSimilarity(queryVector, v.vector);
      if (sim > 0.3) {
        results.push({ id: v.id, type: v.type, score: sim });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async buildUserVector(userId: string): Promise<number[] | null> {
    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 10,
    });

    if (interests.length === 0) return null;

    // 用户标签文本 → embedding → 加权平均
    const tagTexts = interests.map((i) => i.tag);
    const vectors = await this.embed(tagTexts);

    const dim = vectors[0]?.length ?? this.dimension;
    const userVec = new Array(dim).fill(0);
    let totalWeight = 0;

    for (let i = 0; i < vectors.length; i++) {
      const weight = interests[i].score;
      for (let j = 0; j < dim; j++) {
        userVec[j] += vectors[i][j] * weight;
      }
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < dim; i++) {
        userVec[i] /= totalWeight;
      }
    }

    return userVec;
  }

  // ─── API 调用 ───

  private async apiEmbed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const toFetch: { idx: number; text: string }[] = [];

    // 检查本地缓存
    for (let i = 0; i < texts.length; i++) {
      const cached = this.localCache.get(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        toFetch.push({ idx: i, text: texts[i] });
      }
    }

    if (toFetch.length === 0) return results;

    // 检查 Redis 缓存
    const redisKeys = toFetch.map((t) => `recommend:emb:${hashText(t.text)}:v1`);
    const redisCached = await Promise.all(redisKeys.map((k) => this.redis.getJson<number[]>(k)));

    const stillToFetch: { idx: number; text: string }[] = [];
    for (let j = 0; j < toFetch.length; j++) {
      if (redisCached[j]) {
        results[toFetch[j].idx] = redisCached[j]!;
        this.localCache.set(toFetch[j].text, redisCached[j]!);
      } else {
        stillToFetch.push(toFetch[j]);
      }
    }

    if (stillToFetch.length === 0) return results;

    // 批量调用 API
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: stillToFetch.map((t) => t.text),
        }),
      });

      if (!response.ok) {
        this.logger.error(`Embedding API error: ${response.status} ${await response.text().catch(() => "")}`);
        // 降级：未成功获取的用本地向量
        for (const t of stillToFetch) {
          results[t.idx] = this.textToLocalVec(t.text);
        }
        return results;
      }

      const json = await response.json() as { data?: { embedding: number[] }[] };
      const embeddings: number[][] = json.data?.map((d) => d.embedding) ?? [];

      for (let k = 0; k < stillToFetch.length && k < embeddings.length; k++) {
        const vec = embeddings[k];
        results[stillToFetch[k].idx] = vec;
        this.localCache.set(stillToFetch[k].text, vec);
        // 异步写 Redis（24h TTL）
        this.redis.setJson(`recommend:emb:${hashText(stillToFetch[k].text)}:v1`, vec, 86400).catch((err) => this.logger.warn("Embedding 请求失败", err));
      }
    } catch (err: unknown) {
      this.logger.error(`Embedding API 异常: ${err instanceof Error ? err.message : String(err)}`);
      for (const t of stillToFetch) {
        results[t.idx] = this.textToLocalVec(t.text);
      }
    }

    return results;
  }

  // ─── 降级：本地标签向量（极简 TF 加权） ───

  private localEmbed(texts: string[]): number[][] {
    return texts.map((t) => this.textToLocalVec(t));
  }

  private textToLocalVec(text: string): number[] {
    // 用字符 unicode 码点做稀疏散列，生成固定维度向量
    const dim = this.dimension;
    const vec = new Array(dim).fill(0);
    const cleaned = text.replace(/\s+/g, "");
    for (let i = 0; i < cleaned.length; i++) {
      const idx = cleaned.charCodeAt(i) % dim;
      vec[idx] += 1;
    }
    // 简单归一化
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] /= norm;
      }
    }
    return vec;
  }
}

// ─── 工具函数 ───

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
