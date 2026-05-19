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
        if (cached !== null && cached !== undefined) return cached;
      } catch {
        /* 缓存不可用时降级 */
      }

      const result = await originalMethod.apply(this, args);

      if (result !== null && result !== undefined) {
        if (!opts.condition || opts.condition(result)) {
          try {
            await svc.setJson(cacheKey, result, ttl);
          } catch {
            /* 写入缓存失败不影响主流程 */
          }
        }
      }
      return result;
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
