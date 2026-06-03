import { RedisService } from "../redis/redis.service";

// 全局持有 RedisService 的单例引用
let redisService: RedisService;

export function setCacheRedisService(svc: RedisService) {
  redisService = svc;
}

interface CacheableOptions {
  key: string | ((args: any[]) => string);
  ttl?: number;
  condition?: (result: any) => boolean;
}

interface CacheEvictOptions {
  key: string | string[] | ((args: any[]) => string | string[]);
  pattern?: boolean;
}

/** 空值缓存标记 — 防止缓存穿透 */
const NULL_MARKER = "__CACHE_NULL__";
/** 互斥锁前缀 */
const LOCK_PREFIX = "lock:";
/** 锁 TTL（秒） */
const LOCK_TTL = 10;
/** 空值缓存 TTL（秒） */
const NULL_TTL = 60;
/** 锁等待重试间隔（毫秒） */
const LOCK_RETRY_MS = 100;
/** 最多重试次数 */
const MAX_RETRIES = 30;

export function Cacheable(opts: CacheableOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const svc = redisService;
      if (!svc) return originalMethod.apply(this, args);

      const cacheKey = typeof opts.key === "function" ? opts.key(args) : opts.key;
      const ttl = opts.ttl ?? 300;

      try {
        const cached = await svc.getJson(cacheKey);
        if (cached === NULL_MARKER) return null;
        if (cached !== null && cached !== undefined) return cached;
      } catch {
        /* 缓存不可用时降级 */
      }

      // 缓存击穿保护：获取互斥锁，未获取则等待重试
      const lockKey = `${LOCK_PREFIX}${cacheKey}`;
      let locked = false;
      try {
        locked = await svc.setNX(lockKey, "1", LOCK_TTL);
      } catch {
        /* 锁服务不可用，降级为直接穿透 */
      }

      if (!locked) {
        for (let i = 0; i < MAX_RETRIES; i++) {
          await sleep(LOCK_RETRY_MS);
          try {
            const retryCached = await svc.getJson(cacheKey);
            if (retryCached === NULL_MARKER) return null;
            if (retryCached !== null && retryCached !== undefined) return retryCached;
          } catch {
            break;
          }
        }
        // 重试耗尽，降级穿透
      }

      try {
        const result = await originalMethod.apply(this, args);

        // 空值也缓存，防止穿透（短 TTL）
        if (result === null || result === undefined) {
          try { await svc.setJson(cacheKey, NULL_MARKER, NULL_TTL); } catch { /* */ }
        } else if (!opts.condition || opts.condition(result)) {
          try { await svc.setJson(cacheKey, result, ttl); } catch { /* */ }
        }
        return result;
      } finally {
        if (locked) {
          try { await svc.del(lockKey); } catch { /* 锁释放失败不阻塞 */ }
        }
      }
    };
  };
}

export function CacheEvict(opts: CacheEvictOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      const svc = redisService;
      if (!svc) return result;

      const keys = typeof opts.key === "function" ? opts.key(args) : opts.key;
      const keyList = Array.isArray(keys) ? keys : [keys];

      try {
        for (const k of keyList) {
          if (opts.pattern) {
            await svc.delByPattern(k);
          } else {
            await svc.del(k);
          }
        }
      } catch {
        /* 清除缓存失败不影响主流程 */
      }
      return result;
    };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
