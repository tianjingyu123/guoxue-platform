import { ThrottleGuard, StrictThrottleGuard } from "./throttle.guard";
import { RedisService } from "../redis/redis.service";
import { ExecutionContext, HttpException } from "@nestjs/common";

function mockContext(ip?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip: ip ?? "192.168.1.1" }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

/** 内存假 Redis：incrWithTtl 语义与 RedisService 一致（M3 后守卫全走 Redis 计数） */
function createFakeRedis() {
  const counters = new Map<string, { count: number; resetAt: number }>();
  return {
    counters,
    incrWithTtl: jest.fn(async (key: string, ttlSeconds: number) => {
      const now = Date.now();
      const entry = counters.get(key);
      if (!entry || now > entry.resetAt) {
        counters.set(key, { count: 1, resetAt: now + ttlSeconds * 1000 });
        return { count: 1, ttl: ttlSeconds };
      }
      entry.count++;
      return { count: entry.count, ttl: Math.ceil((entry.resetAt - now) / 1000) };
    }),
  } as unknown as RedisService & { counters: Map<string, { count: number; resetAt: number }> };
}

describe("ThrottleGuard (Redis 分布式限流)", () => {
  let guard: ThrottleGuard;
  let redis: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    redis = createFakeRedis();
    guard = new ThrottleGuard(redis); // 默认 30 次/60 秒
  });

  it("首次请求允许", async () => {
    expect(await guard.canActivate(mockContext("10.0.0.1"))).toBe(true);
  });

  it("在限制内多次请求允许", async () => {
    for (let i = 0; i < 30; i++) {
      expect(await guard.canActivate(mockContext("10.0.0.2"))).toBe(true);
    }
  });

  it("超过限制后抛出 429", async () => {
    for (let i = 0; i < 30; i++) {
      await guard.canActivate(mockContext("10.0.0.3"));
    }
    await expect(guard.canActivate(mockContext("10.0.0.3"))).rejects.toThrow(HttpException);
    try {
      await guard.canActivate(mockContext("10.0.0.3"));
    } catch (e: any) {
      expect(e.getStatus()).toBe(429);
      const body = e.getResponse();
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(body.message).toContain("频繁");
    }
  });

  it("不同 IP 独立计数", async () => {
    for (let i = 0; i < 30; i++) await guard.canActivate(mockContext("10.0.0.4"));
    await expect(guard.canActivate(mockContext("10.0.0.4"))).rejects.toThrow(HttpException);
    expect(await guard.canActivate(mockContext("10.0.0.5"))).toBe(true);
  });

  it("无 IP 时使用 unknown 作为 key", async () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(redis.counters.has("rate:local:unknown")).toBe(true);
  });

  it("计数键使用 rate:local 前缀（与全局守卫 rate: 区分，避免双计数）", async () => {
    await guard.canActivate(mockContext("10.0.0.6"));
    expect(redis.counters.has("rate:local:10.0.0.6")).toBe(true);
    expect(redis.counters.has("rate:10.0.0.6")).toBe(false);
  });
});

describe("StrictThrottleGuard", () => {
  it("10 次后拒绝，且使用 rate:strict 前缀独立计数", async () => {
    const redis = createFakeRedis();
    const guard = new StrictThrottleGuard(redis);
    for (let i = 0; i < 10; i++) {
      expect(await guard.canActivate(mockContext("10.0.1.1"))).toBe(true);
    }
    await expect(guard.canActivate(mockContext("10.0.1.1"))).rejects.toThrow(HttpException);
    expect(redis.counters.has("rate:strict:10.0.1.1")).toBe(true);
  });
});
