import { Injectable } from "@nestjs/common";

/**
 * Redis 缓存服务（内存降级方案）
 *
 * 当前使用内存 Map 实现缓存，接口与 ioredis 保持一致以便后续切换。
 * 安装 ioredis 后只需替换此文件内部实现，无需修改调用方。
 */
@Injectable()
export class RedisService {
  private cache = new Map<string, { value: string; expiry: number }>();

  /** 获取缓存值 */
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiry > 0 && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /** 设置缓存值 */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.cache.set(key, { value, expiry });
  }

  /** 删除缓存 */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /** 获取 JSON 反序列化值 */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** 设置 JSON 序列化值（含 TTL） */
  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}
