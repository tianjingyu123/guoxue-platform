import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { buildRedisTlsOptions } from "./redis-tls";

/** 脱敏 Redis URL，隐藏密码部分 */
function maskRedisUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch (err) {
    process.stderr.write(`[Redis] URL 解析失败: ${(err as Error).message}\n`);
    return url.replace(/\/\/.*?@/, "//***:***@");
  }
}

/**
 * Redis 缓存服务
 *
 * 优先连接真实 Redis（REDIS_URL 环境变量），连接失败自动降级为内存 Map。
 * 接口与之前完全兼容，调用方无需修改。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memory = new Map<string, { value: string; expiry: number }>();
  private connected = false;
  private triedConnect = false;

  constructor() {
    const sentinelHosts = process.env.REDIS_SENTINEL_HOSTS;
    const sentinelName = process.env.REDIS_SENTINEL_NAME || "mymaster";

    if (sentinelHosts) {
      // Sentinel 模式：高可用连接
      const sentinels = sentinelHosts.split(",").map((h) => {
        const [host, port] = h.trim().split(":");
        return { host, port: parseInt(port || "26379", 10) };
      });
      this.logger.log(`Redis Sentinel 模式: ${sentinels.map((s) => `${s.host}:${s.port}`).join(", ")} / ${sentinelName}`);
      this.client = new Redis({
        sentinels,
        name: sentinelName,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        sentinelRetryStrategy(times: number) {
          if (times > 10) return null;
          return Math.min(times * 200, 3000);
        },
      });
    } else if (process.env.REDIS_URL) {
      const tls = buildRedisTlsOptions(process.env.REDIS_URL);
      this.client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        ...(tls ? { tls } : {}),
        retryStrategy(times: number) {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
      });
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch((err) => this.logger.warn("Redis 连接关闭失败", err));
    }
  }

  /** 获取可用连接，Redis 不可用时返回 null */
  private async getConn(): Promise<Redis | null> {
    if (!this.client) return null;
    if (this.connected) return this.client;
    if (this.triedConnect) return null;
    this.triedConnect = true;
    try {
      await this.client.connect();
      this.connected = true;
      return this.client;
    } catch (err) {
      this.logger.warn(`Redis 不可用（${maskRedisUrl(process.env.REDIS_URL || "")}），降级为内存缓存`, err);
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const conn = await this.getConn();
    if (conn) return conn.get(key);
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * 原子读取并删除。用于一次性票据、刷新令牌轮换等不可重放场景。
   * Redis 连接使用 Lua 保证多实例原子性；内存降级在同一事件循环内同步完成读取与删除。
   */
  async getDel(key: string): Promise<string | null> {
    const conn = await this.getConn();
    if (conn) {
      const lua = `
        local value = redis.call('GET', KEYS[1])
        if value then redis.call('DEL', KEYS[1]) end
        return value
      `;
      return (await conn.eval(lua, 1, key)) as string | null;
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this.memory.delete(key);
      return null;
    }
    this.memory.delete(key);
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const conn = await this.getConn();
    if (conn) {
      if (ttlSeconds) await conn.setex(key, ttlSeconds, value);
      else await conn.set(key, value);
      return;
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.memory.set(key, { value, expiry });
  }

  /** SET NX EX — 分布式锁原语，返回 true 表示获取锁成功 */
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const conn = await this.getConn();
    if (conn) {
      const result = await conn.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    }
    const entry = this.memory.get(key);
    if (entry) {
      if (entry.expiry > 0 && Date.now() > entry.expiry) {
        this.memory.delete(key);
      } else {
        return false;
      }
    }
    this.memory.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  async del(key: string): Promise<void> {
    const conn = await this.getConn();
    if (conn) {
      await conn.del(key);
      return;
    }
    this.memory.delete(key);
    this.setMemory.delete(key);
    this.zsetMemory.delete(key);
  }

  /**
   * 分布式互斥执行（cron 多实例防重复）：抢到 `cron:lock:{name}` 锁才执行 fn，抢不到直接跳过。
   * ttl 应略大于任务最坏执行时长，防持锁进程崩溃后锁长期不释放。返回 fn 结果或 undefined(未抢到锁/被拒跑)。
   *
   * M5 锁降级策略：Redis 不可用时 setNX 会降级为进程内存锁（多实例下不互斥）——
   * 普通任务降级执行并告警；critical=true 的资金类任务（结算/对账/佣金/钱包）直接拒跑，
   * 宁可延迟一轮也不冒重复入账风险。
   */
  async runExclusive<T>(
    name: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
    opts?: { critical?: boolean },
  ): Promise<T | undefined> {
    const conn = await this.getConn();
    if (!conn) {
      if (opts?.critical) {
        this.logger.error(`【锁降级·拒跑】Redis 不可用，资金关键任务 ${name} 本轮拒绝执行（防多实例重复入账）`);
        return undefined;
      }
      this.logger.warn(`【锁降级】Redis 不可用，任务 ${name} 以进程内存锁降级执行（多实例下不互斥）`);
    }
    const lockKey = `cron:lock:${name}`;
    const locked = await this.setNX(lockKey, "1", ttlSeconds);
    if (!locked) return undefined;
    try {
      return await fn();
    } finally {
      await this.del(lockKey);
    }
  }

  /** Redis Pub/Sub 发布（仅真实连接可用，内存模式静默忽略） */
  async publish(channel: string, message: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.publish(channel, message);
    return 0; // 内存模式不支持 Pub/Sub
  }

  async ttl(key: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.ttl(key);
    const entry = this.memory.get(key);
    if (!entry) return -2;
    if (entry.expiry <= 0) return -1;
    const remaining = Math.ceil((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis JSON 解析失败`, err);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /** 批量获取 JSON 值（Redis mget + 自动 JSON.parse） */
  async mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
    const conn = await this.getConn();
    if (conn) {
      const vals = await conn.mget(...keys);
      return vals.map((v: string | null) => {
        if (!v) return null;
        try { return JSON.parse(v) as T; } catch (err) {
          this.logger.warn(`Redis JSON 解析失败`, err);
          return null;
        }
      });
    }
    return keys.map((k) => {
      const entry = this.memory.get(k);
      if (!entry || (entry.expiry > 0 && entry.expiry <= Date.now())) return null;
      try { return JSON.parse(entry.value) as T; } catch (err) {
        this.logger.warn(`Redis JSON 解析失败`, err);
        return null;
      }
    });
  }

  async delByPattern(pattern: string): Promise<void> {
    const conn = await this.getConn();
    if (conn) {
      // Redis SCAN 迭代删除（避免 KEYS 阻塞）
      const stream = conn.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream) {
        if (keys.length > 0) await conn.del(...keys);
      }
      return;
    }
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.memory.keys()) {
      if (regex.test(key)) this.memory.delete(key);
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const conn = await this.getConn();
    if (conn) {
      const buf = await conn.getBuffer(key);
      return buf ?? null;
    }
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return Buffer.from(raw, "base64");
    } catch (err) {
      this.logger.warn(`Buffer 解码失败`, err);
      return null;
    }
  }

  async setBuffer(key: string, value: Buffer, ttlSeconds?: number): Promise<void> {
    const conn = await this.getConn();
    if (conn) {
      if (ttlSeconds) await conn.setex(key, ttlSeconds, value);
      else await conn.set(key, value);
      return;
    }
    await this.set(key, value.toString("base64"), ttlSeconds);
  }

  // ───────── Set 操作 ─────────

  private setMemory = new Map<string, Set<string>>();

  async sadd(key: string, member: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.sadd(key, member);
    if (!this.setMemory.has(key)) this.setMemory.set(key, new Set());
    const s = this.setMemory.get(key)!;
    const existed = s.has(member);
    s.add(member);
    return existed ? 0 : 1;
  }

  async srem(key: string, member: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.srem(key, member);
    const s = this.setMemory.get(key);
    if (!s) return 0;
    return s.delete(member) ? 1 : 0;
  }

  async scard(key: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.scard(key);
    const s = this.setMemory.get(key);
    return s ? s.size : 0;
  }

  async smembers(key: string): Promise<string[]> {
    const conn = await this.getConn();
    if (conn) return conn.smembers(key);
    const s = this.setMemory.get(key);
    return s ? Array.from(s) : [];
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const conn = await this.getConn();
    if (conn) return (await conn.sismember(key, member)) === 1;
    return this.setMemory.get(key)?.has(member) ?? false;
  }

  /** 原子增减计数（delta 可为负），可选刷新 TTL。返回新值 */
  async incrBy(key: string, delta: number, ttlSeconds?: number): Promise<number> {
    const conn = await this.getConn();
    if (conn) {
      const val = await conn.incrby(key, delta);
      if (ttlSeconds) await conn.expire(key, ttlSeconds);
      return val;
    }
    const now = Date.now();
    const raw = this.memory.get(key);
    const current = raw && (raw.expiry <= 0 || now <= raw.expiry) ? parseInt(raw.value, 10) || 0 : 0;
    const next = current + delta;
    this.memory.set(key, { value: String(next), expiry: ttlSeconds ? now + ttlSeconds * 1000 : raw?.expiry ?? 0 });
    return next;
  }

  /** 刷新键 TTL（内存降级下 set 类型无过期语义，仅对 string 键生效） */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    const conn = await this.getConn();
    if (conn) {
      await conn.expire(key, ttlSeconds);
      return;
    }
    const entry = this.memory.get(key);
    if (entry) entry.expiry = Date.now() + ttlSeconds * 1000;
  }

  // ───────── 限流 ─────────

  /** 原子递增并设 TTL，用于分布式限流。返回 { count, ttl }，Redis 不可用时降级内存 */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<{ count: number; ttl: number }> {
    const conn = await this.getConn();
    if (conn) {
      const lua = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('TTL', KEYS[1])
        return {count, ttl > 0 and ttl or 0}
      `;
      const [count, ttl] = (await conn.eval(lua, 1, key, ttlSeconds)) as [number, number];
      return { count, ttl };
    }

    // 内存降级
    const now = Date.now();
    const raw = this.memory.get(key);
    if (!raw || now > raw.expiry) {
      this.memory.set(key, { value: "1", expiry: now + ttlSeconds * 1000 });
      return { count: 1, ttl: ttlSeconds };
    }
    const count = parseInt(raw.value, 10) + 1;
    raw.value = String(count);
    const remaining = Math.ceil((raw.expiry - now) / 1000);
    return { count, ttl: remaining > 0 ? remaining : 0 };
  }

  // ───────── Sorted Set 操作 ─────────

  private zsetMemory = new Map<string, Array<{ member: string; score: number }>>();

  async zadd(key: string, score: number, member: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.zadd(key, score, member);
    if (!this.zsetMemory.has(key)) this.zsetMemory.set(key, []);
    const arr = this.zsetMemory.get(key)!;
    const existing = arr.find((e) => e.member === member);
    if (existing) {
      existing.score = score;
      return 0;
    }
    arr.push({ member, score });
    return 1;
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const conn = await this.getConn();
    if (conn) return conn.zrevrange(key, start, stop);
    const arr = this.zsetMemory.get(key);
    if (!arr) return [];
    return arr.sort((a, b) => b.score - a.score).slice(start, stop >= 0 ? stop + 1 : undefined).map((e) => e.member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const conn = await this.getConn();
    if (conn) return conn.zrange(key, start, stop);
    const arr = this.zsetMemory.get(key);
    if (!arr) return [];
    return arr.sort((a, b) => a.score - b.score).slice(start, stop >= 0 ? stop + 1 : undefined).map((e) => e.member);
  }

  async zcard(key: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.zcard(key);
    const arr = this.zsetMemory.get(key);
    return arr ? arr.length : 0;
  }

  async zrem(key: string, member: string): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.zrem(key, member);
    const arr = this.zsetMemory.get(key);
    if (!arr) return 0;
    const next = arr.filter((entry) => entry.member !== member);
    this.zsetMemory.set(key, next);
    return arr.length - next.length;
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.zremrangebyscore(key, min, max);
    const arr = this.zsetMemory.get(key);
    if (!arr) return 0;
    const next = arr.filter((entry) => entry.score < min || entry.score > max);
    this.zsetMemory.set(key, next);
    return arr.length - next.length;
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    const conn = await this.getConn();
    if (conn) return conn.zremrangebyrank(key, start, stop);
    const arr = this.zsetMemory.get(key);
    if (!arr) return 0;
    const sorted = arr.sort((a, b) => a.score - b.score);
    const removed = sorted.splice(start, stop >= 0 ? stop - start + 1 : sorted.length - start);
    this.zsetMemory.set(key, sorted);
    return removed.length;
  }

  async keys(pattern: string): Promise<string[]> {
    const conn = await this.getConn();
    if (conn) return conn.keys(pattern);
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    const allKeys = new Set(this.memory.keys());
    for (const key of this.zsetMemory.keys()) allKeys.add(key);
    return Array.from(allKeys).filter((k) => regex.test(k));
  }

  /**
   * 缓存读取 + 防击穿锁（Cache-Aside with Mutex）。
   *
   * 先查缓存，命中直接返回；未命中时获取互斥锁，仅一个请求穿透到 DB/外部服务，
   * 其余请求等待并重试读取缓存。防止缓存失效瞬间大量请求压垮数据库。
   *
   * @param key       缓存键
   * @param ttlSeconds 缓存 TTL（秒）
   * @param factory   缓存未命中时的数据生成函数（DB查询/API调用等）
   * @param lockTtlSeconds 互斥锁 TTL（默认 10 秒），防止死锁
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    lockTtlSeconds = 10,
  ): Promise<T> {
    // 1. 先查缓存
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;

    // 2. 尝试获取互斥锁
    const lockKey = `mutex:${key}`;
    const lockId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const locked = await this.setNX(lockKey, lockId, lockTtlSeconds);

    if (locked) {
      try {
        // 3. 双检：获取锁后再次检查缓存（可能其他请求已刷新）
        const recheck = await this.getJson<T>(key);
        if (recheck !== null) return recheck;

        // 4. 唯一穿透：调用 factory 获取数据
        const data = await factory();
        await this.setJson(key, data, ttlSeconds);
        return data;
      } finally {
        // 5. 释放锁（仅删除自己持有的锁，防误删）
        const currentLock = await this.get(lockKey);
        if (currentLock === lockId) await this.del(lockKey);
      }
    }

    // 6. 未获取到锁：等待后重试读缓存（最多等 lockTtlSeconds）
    const maxRetries = Math.ceil(lockTtlSeconds * 2);
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const retry = await this.getJson<T>(key);
      if (retry !== null) return retry;
    }

    // 7. 最终降级：直接调用 factory（锁可能已过期，避免无限等待）
    const data = await factory();
    await this.setJson(key, data, ttlSeconds);
    return data;
  }

  /** 获取原始 ioredis 客户端（用于 pipeline 等高级操作），不可用时返回 null */
  getClient(): Redis | null {
    if (this.connected && this.client) return this.client;
    return null;
  }
}
