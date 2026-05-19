import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { VectorService } from "./vector.service";

interface CacheEntry {
  response: string;
  model: string;
  tokenUsage?: { promptTokens?: number; completionTokens?: number };
}

const REDIS_PREFIX = "sem:v1:";
const EXACT_TTL = 86400;
const SIMILARITY_THRESHOLD = 0.88;
const DEFAULT_EXPIRY_HOURS = 72;

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

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

/**
 * 语义缓存服务 — 两级缓存降低 AI 调用成本
 *
 * L0: Redis MD5 精确匹配（<1ms）
 * L1: PostgreSQL 向量相似度搜索（<50ms，pgvector 或 JSON 降级）
 */
@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly vector: VectorService,
  ) {}

  async lookup(scene: string, query: string): Promise<string | null> {
    const normalized = normalizeQuery(query);
    if (normalized.length < 4) return null;

    const hash = md5(`${scene}:${normalized}`);
    const redisKey = `${REDIS_PREFIX}${scene}:${hash}`;

    // L0: Redis 精确匹配
    const cached = await this.redis.getJson<CacheEntry>(redisKey);
    if (cached?.response) {
      this.logger.debug(`L0 精确命中: scene=${scene}`);
      this.bumpHitCount(scene, hash).catch(() => {});
      return cached.response;
    }

    // L1: PostgreSQL 向量相似度搜索
    try {
      const [queryVec] = await this.vector.embed([normalized]);
      if (!queryVec || queryVec.length === 0) return null;

      const result = await this.searchSimilar(scene, queryVec);
      if (result) {
        this.logger.debug(`L1 语义命中: scene=${scene}, similarity=${result.similarity.toFixed(3)}`);
        await this.redis
          .setJson(redisKey, { response: result.response, model: result.model } as CacheEntry, EXACT_TTL)
          .catch(() => {});
        this.bumpHitCount(scene, result.queryHash).catch(() => {});
        return result.response;
      }
    } catch (err: any) {
      this.logger.warn(`语义缓存向量搜索失败: ${err.message}`);
    }

    return null;
  }

  async store(
    scene: string,
    query: string,
    response: string,
    model?: string,
    tokenUsage?: Record<string, number>,
  ): Promise<void> {
    const normalized = normalizeQuery(query);
    if (normalized.length < 4) return;

    const hash = md5(`${scene}:${normalized}`);
    const redisKey = `${REDIS_PREFIX}${scene}:${hash}`;
    const entry: CacheEntry = { response, model: model || "unknown", tokenUsage };

    await this.redis.setJson(redisKey, entry, EXACT_TTL).catch(() => {});

    this.persistEntry(scene, hash, normalized, response, model || "unknown", tokenUsage).catch((err) => {
      this.logger.warn(`语义缓存持久化失败: ${err.message}`);
    });
  }

  private async persistEntry(
    scene: string,
    queryHash: string,
    queryText: string,
    response: string,
    model: string,
    tokenUsage?: Record<string, number>,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3600_000);

    let vectorJson: string | null = null;
    try {
      const [vec] = await this.vector.embed([queryText]);
      if (vec && vec.length > 0) {
        vectorJson = JSON.stringify(vec);
      }
    } catch (err: any) {
      this.logger.debug(`Embedding 不可用，跳过向量存储: ${err.message}`);
    }

    const existing = await this.prisma.aiCacheEntry.findFirst({
      where: { scene, queryHash },
    });

    if (existing) {
      await this.prisma.aiCacheEntry.update({
        where: { id: existing.id },
        data: {
          response,
          model,
          tokenUsage: tokenUsage || undefined,
          queryVectorJson: vectorJson,
          expiresAt,
        },
      });
    } else {
      await this.prisma.aiCacheEntry.create({
        data: {
          scene,
          queryHash,
          queryText,
          queryVectorJson: vectorJson,
          response,
          model,
          tokenUsage: tokenUsage || undefined,
          expiresAt,
        },
      });
    }
  }

  private async searchSimilar(
    scene: string,
    queryVec: number[],
  ): Promise<{ response: string; model: string; queryHash: string; similarity: number } | null> {
    const candidates = await this.prisma.aiCacheEntry.findMany({
      where: {
        scene,
        expiresAt: { gt: new Date() },
        queryVectorJson: { not: null },
      },
      select: {
        queryHash: true,
        queryVectorJson: true,
        response: true,
        model: true,
      },
      orderBy: { hitCount: "desc" },
      take: 200,
    });

    if (candidates.length === 0) return null;

    let best: { response: string; model: string; queryHash: string; similarity: number } | null = null;

    for (const c of candidates) {
      if (!c.queryVectorJson) continue;
      try {
        const vec = JSON.parse(c.queryVectorJson) as number[];
        const sim = cosineSimilarity(queryVec, vec);
        if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.similarity)) {
          best = { response: c.response, model: c.model, queryHash: c.queryHash, similarity: sim };
        }
      } catch (err: any) {
        this.logger.warn(`缓存向量数据解析失败: ${err.message}`);
      }
    }

    return best;
  }

  private async bumpHitCount(scene: string, queryHash: string): Promise<void> {
    await this.prisma.aiCacheEntry.updateMany({
      where: { scene, queryHash },
      data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
    });
  }
}
