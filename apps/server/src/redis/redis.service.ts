import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import Redis from "ioredis";

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
    if (process.env.REDIS_URL) {
      this.client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
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
    } catch {
      console.warn("[Redis] Redis 不可用（%s），降级为内存缓存", process.env.REDIS_URL);
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
    if (this.memory.has(key)) return false;
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
    } catch {
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
        try { return JSON.parse(v) as T; } catch { return null; }
      });
    }
    return keys.map((k) => {
      const entry = this.memory.get(k);
      if (!entry || (entry.expiry > 0 && entry.expiry <= Date.now())) return null;
      try { return JSON.parse(entry.value) as T; } catch { return null; }
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
    } catch {
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
}
