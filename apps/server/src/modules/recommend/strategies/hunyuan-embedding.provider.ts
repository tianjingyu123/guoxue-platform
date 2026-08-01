import { Injectable, Logger } from "@nestjs/common";
import { VectorRecallProvider } from "./vector-recall.strategy";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { HunyuanEmbeddingService } from "../../ai-gateway/hunyuan-embedding.service";

/**
 * 腾讯混元 Embedding 召回提供者（推荐系统 VectorRecallProvider 实现）。
 *
 * - embed：走混元真语义向量（1024维），未取到用同维字符哈希兜底（维度一致，才能与内容库做余弦）。
 * - search：读内容向量库 `recommend:embedding:vectors:v1`（由 ContentVectorizeService 审核通过后写入），
 *           在同一 1024 维语义空间内做余弦 top-K。管线未跑（库为空）时返回空，向量召回不贡献信号、由其它策略兜底。
 * - buildUserVector：用户兴趣标签向量的加权平均。
 *
 * 选择优先级（见 RecommendSceneCoreService）：混元(enabled) > TF-IDF > 字符哈希。
 * isEnabled 直接透传混元服务：未开启/未配密钥时不会被选中。
 */
@Injectable()
export class HunyuanEmbeddingProvider implements VectorRecallProvider {
  private readonly logger = new Logger(HunyuanEmbeddingProvider.name);

  /** 内容向量库缓存键（与 ContentVectorizeService 写入端、旧 OpenAI provider 读取端一致） */
  static readonly VECTOR_STORE_KEY = "recommend:embedding:vectors:v1";

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly hunyuan: HunyuanEmbeddingService,
  ) {}

  get isEnabled(): boolean {
    return this.hunyuan.isEnabled;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const vs = await this.hunyuan.embedBatch(texts);
    return texts.map((t, i) => vs[i] ?? charHashVector(t, this.hunyuan.dimension));
  }

  async search(
    queryVector: number[],
    topK: number,
    filter?: { type?: string; excludeIds?: string[] },
  ): Promise<{ id: string; type: string; score: number }[]> {
    const allVectors = await this.redis.getJson<{ id: string; type: string; vector: number[] }[]>(
      HunyuanEmbeddingProvider.VECTOR_STORE_KEY,
    );
    if (!allVectors?.length) return []; // 内容向量化管线未跑，向量召回暂不贡献

    const exclude = new Set(filter?.excludeIds ?? []);
    const results: { id: string; type: string; score: number }[] = [];
    for (const v of allVectors) {
      if (filter?.type && v.type !== filter.type) continue;
      if (exclude.has(v.id)) continue;
      const sim = cosineSimilarity(queryVector, v.vector);
      if (sim > 0.3) results.push({ id: v.id, type: v.type, score: sim });
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

    const vectors = await this.embed(interests.map((i) => i.tag));
    const dim = vectors[0]?.length ?? this.hunyuan.dimension;
    const userVec = new Array(dim).fill(0);
    let totalWeight = 0;
    for (let i = 0; i < vectors.length; i++) {
      const w = interests[i].score;
      for (let j = 0; j < dim; j++) userVec[j] += vectors[i][j] * w;
      totalWeight += w;
    }
    if (totalWeight > 0) for (let i = 0; i < dim; i++) userVec[i] /= totalWeight;
    return userVec;
  }
}

// ─────────── 工具 ───────────

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

/** 字符哈希兜底向量（1024维，与混元同维，仅在混元单条失败时占位） */
function charHashVector(text: string, dim: number): number[] {
  const vec = new Array(dim).fill(0);
  const cleaned = (text ?? "").replace(/\s+/g, "");
  for (let i = 0; i < cleaned.length; i++) vec[cleaned.charCodeAt(i) % dim] += 1;
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) for (let i = 0; i < dim; i++) vec[i] /= norm;
  return vec;
}
