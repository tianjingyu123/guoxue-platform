import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
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

/**
 * 按场景覆写持久缓存有效期（小时）。
 * "固定原文→固定输出"类场景（点句白话/查词/诗词赏析）译文永远不变，
 * 长效缓存后每段原文终身只花一次 AI 费，成本上限=库内句子总数，不随用户量增长。
 * 取 1 年而非永久：保留 prompt/模型升级后全量刷新的机会。
 */
const SCENE_EXPIRY_HOURS: Record<string, number> = {
  classic_translate: 24 * 365,
  classic_dictionary: 24 * 365,
  poetry_appreciation: 24 * 365,
};

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

  async lookup(scene: string, query: string, scopeKey?: string): Promise<string | null> {
    // 数据隔离修复(后端审计P1)：圈主助理等按实体隔离的场景传 scopeKey(如 circleId)，
    // 将其并入缓存作用域，使 L0/L0.5/L1 三级全部按实体分区，杜绝 A 圈答案命中返回给 B 圈。
    // 路由仍用原始 scene(不含 scopeKey)，故不影响模型选路。
    if (scopeKey) scene = `${scene}#${scopeKey}`;
    const normalized = normalizeQuery(query);
    if (normalized.length < 4) return null;

    const hash = md5(`${scene}:${normalized}`);
    const redisKey = `${REDIS_PREFIX}${scene}:${hash}`;

    // L0: Redis 精确匹配
    const cached = await this.redis.getJson<CacheEntry>(redisKey);
    if (cached?.response) {
      this.logger.debug(`L0 精确命中: scene=${scene}`);
      this.bumpHitCount(scene, hash).catch((err) => this.logger.warn("命中计数更新失败", err));
      return cached.response;
    }

    // L0.5: DB 精确哈希匹配（Redis 24h 过期后长效持久层仍可精确命中·不依赖向量质量）
    try {
      const exact = await this.prisma.aiCacheEntry.findFirst({
        where: { scene, queryHash: hash, expiresAt: { gt: new Date() } },
        select: { response: true, model: true },
      });
      if (exact?.response) {
        this.logger.debug(`L0.5 持久层精确命中: scene=${scene}`);
        await this.redis
          .setJson(redisKey, { response: exact.response, model: exact.model } as CacheEntry, EXACT_TTL)
          .catch((err) => this.logger.warn("语义缓存回写失败", err));
        this.bumpHitCount(scene, hash).catch((err) => this.logger.warn("命中计数更新失败", err));
        return exact.response;
      }
    } catch (err: any) {
      this.logger.warn(`持久层精确匹配查询失败: ${err.message}`);
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
          .catch((err) => this.logger.warn("语义缓存写入失败", err));
        this.bumpHitCount(scene, result.queryHash).catch((err) => this.logger.warn("语义缓存写入失败", err));
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
    scopeKey?: string,
  ): Promise<void> {
    // 与 lookup 对称：写入时同样并入 scopeKey，保证按实体分区存储。
    if (scopeKey) scene = `${scene}#${scopeKey}`;
    const normalized = normalizeQuery(query);
    if (normalized.length < 4) return;

    const hash = md5(`${scene}:${normalized}`);
    const redisKey = `${REDIS_PREFIX}${scene}:${hash}`;
    const entry: CacheEntry = { response, model: model || "unknown", tokenUsage };

    await this.redis.setJson(redisKey, entry, EXACT_TTL).catch((err) => this.logger.warn("语义缓存写入失败", err));

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
    const expiryHours = SCENE_EXPIRY_HOURS[scene] ?? DEFAULT_EXPIRY_HOURS;
    const expiresAt = new Date(Date.now() + expiryHours * 3600_000);

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

  /** 每天凌晨清理过期语义缓存（分布式锁防多实例重复执行） */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanExpiredCache() {
    await this.redis.runExclusive("semantic_cache_cleanup", 600, async () => {
      try {
        const result = await this.prisma.aiCacheEntry.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        if (result.count > 0) {
          this.logger.log(`清理过期语义缓存: ${result.count} 条`);
        }
      } catch (err: any) {
        this.logger.warn(`语义缓存清理失败: ${err.message}`);
      }
    });
  }

  /** 获取缓存统计（管理接口） */
  async getStats() {
    const [total, expired, totalHits] = await Promise.all([
      this.prisma.aiCacheEntry.count(),
      this.prisma.aiCacheEntry.count({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.aiCacheEntry.aggregate({ _sum: { hitCount: true } }),
    ]);
    return {
      total,
      expired,
      totalHits: totalHits._sum.hitCount ?? 0,
      avgHitRate: total > 0 ? ((totalHits._sum.hitCount ?? 0) / total).toFixed(2) : "0",
    };
  }
}
