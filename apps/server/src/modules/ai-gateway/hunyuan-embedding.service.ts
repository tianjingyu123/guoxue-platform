import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { RedisService } from "../../redis/redis.service";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import {
  hasTencentCloudCredentialConfiguration,
  resolveTencentCloudCredentials,
} from "../../common/tencent-instance-role-credentials";

/**
 * 腾讯混元 Embedding 语义向量服务 —— 全平台「文本 → 真语义向量」的单一真源。
 *
 * ## 定位
 * - 过去 embedding 全线降级为「字符哈希 / TF-IDF」，毫无语义（同义不同字就召不回）。
 * - 本服务接腾讯云混元 GetEmbedding（1024 维真语义向量），供两条管线共用：
 *   1) 推荐召回（HunyuanEmbeddingProvider 包装本服务，见 recommend 模块）
 *   2) RAG / 智能客服 / 语义缓存（VectorService.embed 优先走本服务）
 *
 * ## 选型（与内容审核 ModerationService 同调）
 * - 复用腾讯云同一账号 SecretId/SecretKey（混元是腾讯云服务，无需另建密钥）。
 * - 纯原生 API + tc3Sign 签名，不引第三方 SDK（与 tms/ims 一致，减依赖）。
 *
 * ## API 规范（腾讯云官方 https://cloud.tencent.com/document/api/1729/102832）
 * - Action=GetEmbedding · Service=hunyuan · Version=2023-09-01 · Host=hunyuan.tencentcloudapi.com
 * - 入参：InputList（String 数组，单批 ≤50 条；单条 ≤1024 Token，超出截断）
 * - 出参：Response.Data[] 每项 { Embedding: number[1024], Index }（按 Index 还原顺序）
 * - 限流：默认 5 QPS（本服务批间隔 250ms 控速）
 *
 * ## 成本控制
 * - 两级缓存：进程内 LRU（近端）+ Redis（7天，跨实例/重启复用）。
 * - 分批（≤50/请求）+ 限流（≤5 QPS）+ 文本截断（≤1000 字）。
 *
 * ## 降级（不阻塞）
 * - 未开启 / 未配密钥：isEnabled=false，调用返回全 null，由调用方降级到 TF-IDF/字符哈希。
 * - 运行期 API 失败：抛错由调用方 catch，已命中缓存的照常返回。
 *
 * 🔒 敏感：SecretId/SecretKey 绝不写日志（仅记录腾讯云返回的错误码/文案）。
 */
@Injectable()
export class HunyuanEmbeddingService {
  private readonly logger = new Logger(HunyuanEmbeddingService.name);

  /** 混元 GetEmbedding 固定输出 1024 维 */
  readonly dimension = 1024;

  /** 单批上限（腾讯云限制 ≤50） */
  private readonly MAX_BATCH = 50;
  /** 批间隔（ms）——控 ≤5 QPS */
  private readonly BATCH_INTERVAL_MS = 250;
  /** 单条文本截断长度（混元单条 ≤1024 Token，中文约 1 字/Token，留余量取 1000） */
  private readonly MAX_TEXT_LEN = 1000;
  /** Redis 缓存 TTL（7天） */
  private readonly REDIS_TTL = 604800;

  /** 进程内缓存：文本指纹 → 向量（近端命中，减少 Redis 往返） */
  private readonly localCache = new Map<string, number[]>();
  private readonly MAX_LOCAL_CACHE = 5000;

  constructor(private readonly redis: RedisService) {}

  // ─────────── 配置（读 env，由后台第三方配置 syncToEnv 写入·热生效） ───────────

  /** 混元密钥优先自身，否则复用腾讯云通用/COS 密钥（同一云账号） */
  private get secretId(): string {
    return process.env.HUNYUAN_SECRET_ID || process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || "";
  }
  private get secretKey(): string {
    return process.env.HUNYUAN_SECRET_KEY || process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || "";
  }
  private get region(): string {
    return process.env.HUNYUAN_EMBEDDING_REGION || process.env.COS_REGION || "ap-guangzhou";
  }

  /** 是否启用：显式开关 = true 且密钥齐备（复用腾讯云也算齐备） */
  get isEnabled(): boolean {
    return process.env.HUNYUAN_EMBEDDING_ENABLED === "true" &&
      hasTencentCloudCredentialConfiguration(this.secretId, this.secretKey);
  }

  // ─────────── 公共接口 ───────────

  /** 单条文本 → 向量；未启用/失败返回 null（调用方降级） */
  async embedOne(text: string): Promise<number[] | null> {
    const [v] = await this.embedBatch([text]);
    return v ?? null;
  }

  /**
   * 批量文本 → 向量。返回数组与输入等长、按序对应；
   * 单个元素为 null 表示该条未取到（未启用 / 缓存未命中且本批 API 失败）。
   * 幂等、可重复调用（命中缓存不重复计费）。
   */
  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    if (!this.isEnabled || texts.length === 0) return results;

    // 1) 进程内缓存
    const misses: { idx: number; text: string; key: string }[] = [];
    for (let i = 0; i < texts.length; i++) {
      const key = this.fingerprint(texts[i]);
      const local = this.localCache.get(key);
      if (local) { results[i] = local; continue; }
      misses.push({ idx: i, text: texts[i], key });
    }
    if (misses.length === 0) return results;

    // 2) Redis 缓存
    const redisVals = await Promise.all(
      misses.map((m) => this.redis.getJson<number[]>(this.redisKey(m.key)).catch(() => null)),
    );
    const stillMiss: { idx: number; text: string; key: string }[] = [];
    for (let j = 0; j < misses.length; j++) {
      const v = redisVals[j];
      if (v && v.length) {
        results[misses[j].idx] = v;
        this.putLocal(misses[j].key, v);
      } else {
        stillMiss.push(misses[j]);
      }
    }
    if (stillMiss.length === 0) return results;

    // 3) 分批调 API（≤50/批 + 批间隔限流）。单批失败只影响该批（留 null 由调用方降级），不牵连其它批与缓存命中项。
    for (let start = 0; start < stillMiss.length; start += this.MAX_BATCH) {
      const chunk = stillMiss.slice(start, start + this.MAX_BATCH);
      let vectors: number[][];
      try {
        vectors = await this.callGetEmbedding(chunk.map((c) => this.truncate(c.text)));
      } catch (err) {
        this.logger.warn((err as Error).message);
        continue;
      }
      for (let k = 0; k < chunk.length; k++) {
        const vec = vectors[k];
        if (!vec || !vec.length) continue;
        results[chunk[k].idx] = vec;
        this.putLocal(chunk[k].key, vec);
        // 异步回写 Redis（失败不阻塞）
        this.redis.setJson(this.redisKey(chunk[k].key), vec, this.REDIS_TTL).catch(() => undefined);
      }
      if (start + this.MAX_BATCH < stillMiss.length) await this.sleep(this.BATCH_INTERVAL_MS);
    }
    return results;
  }

  // ─────────── 腾讯云 GetEmbedding 调用 ───────────

  private async callGetEmbedding(inputs: string[]): Promise<number[][]> {
    const credentials = await resolveTencentCloudCredentials(this.secretId, this.secretKey);
    const { host, headers, payloadStr } = tc3Sign({
      secretId: credentials.secretId,
      secretKey: credentials.secretKey,
      securityToken: credentials.securityToken,
      service: "hunyuan",
      action: "GetEmbedding",
      version: "2023-09-01",
      payload: { InputList: inputs },
      region: this.region,
    });

    const resp = await fetch(`https://${host}`, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(15000), // 防第三方无响应挂死
    });

    const data = (await resp.json()) as TencentCloudResponse & {
      Response?: { Data?: Array<{ Embedding: number[]; Index?: number }> };
    };
    if (data.Response?.Error) {
      // 只记错误码/文案，绝不记密钥
      throw new Error(`混元 GetEmbedding 失败 [${data.Response.Error.Code}]: ${data.Response.Error.Message}`);
    }
    const rows = data.Response?.Data ?? [];
    // 按 Index 还原与 InputList 一致的顺序
    const ordered: number[][] = new Array(inputs.length).fill(null);
    rows.forEach((r, i) => {
      const at = typeof r.Index === "number" ? r.Index : i;
      ordered[at] = r.Embedding;
    });
    return ordered;
  }

  // ─────────── 工具 ───────────

  private truncate(text: string): string {
    const t = (text ?? "").replace(/\s+/g, " ").trim();
    return t.length > this.MAX_TEXT_LEN ? t.slice(0, this.MAX_TEXT_LEN) : t;
  }

  /** 文本指纹（截断后再哈希，保证与实际送模型的文本一致） */
  private fingerprint(text: string): string {
    return createHash("sha256").update(this.truncate(text)).digest("hex").slice(0, 24);
  }

  private redisKey(fp: string): string {
    return `emb:hunyuan:v1:${fp}`;
  }

  private putLocal(key: string, vec: number[]): void {
    if (this.localCache.size >= this.MAX_LOCAL_CACHE) {
      // 朴素 LRU：删最早插入的一个
      const first = this.localCache.keys().next().value;
      if (first !== undefined) this.localCache.delete(first);
    }
    this.localCache.set(key, vec);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
