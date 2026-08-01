import { ThrottleGuard, StrictThrottleGuard } from "./throttle.guard";
import { RedisThrottleGuard, StrictRedisThrottleGuard } from "./redis-throttle.guard";
import { RedisService } from "../redis/redis.service";
import { ExecutionContext, HttpException } from "@nestjs/common";

function mockContext(ip?: string, userId?: string, body?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip: ip ?? "192.168.1.1",
        ...(userId ? { user: { id: userId } } : {}),
        ...(body ? { body } : {}),
      }),
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
    getJson: jest.fn().mockResolvedValue(null),
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
    expect(redis.counters.has("rate:local:ip:unknown")).toBe(true);
  });

  it("计数键使用 rate:local 前缀（与全局守卫 rate: 区分，避免双计数）", async () => {
    await guard.canActivate(mockContext("10.0.0.6"));
    expect(redis.counters.has("rate:local:ip:10.0.0.6")).toBe(true);
    expect(redis.counters.has("rate:ip:10.0.0.6")).toBe(false);
  });
});

describe("RedisThrottleGuard 全局基础限流", () => {
  it("默认允许单个 IP 每分钟 1200 次请求，第 1201 次返回 429", async () => {
    const redis = createFakeRedis();
    const guard = new RedisThrottleGuard(redis);
    const context = mockContext("10.0.0.7");

    for (let i = 0; i < 1200; i++) {
      expect(await guard.canActivate(context)).toBe(true);
    }
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
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
    expect(redis.counters.has("rate:strict:ip:10.0.1.1")).toBe(true);
  });
});

describe("StrictRedisThrottleGuard 用户限流白名单", () => {
  it("兼容历史 string[] 并跳过附加限流计数", async () => {
    const redis = createFakeRedis();
    (redis.getJson as jest.Mock).mockResolvedValue(["u1"]);
    const guard = new StrictRedisThrottleGuard(redis);

    expect(await guard.canActivate(mockContext("10.0.2.1", "u1"))).toBe(true);
    expect(redis.incrWithTtl).not.toHaveBeenCalled();
  });

  it("识别结构化名单条目", async () => {
    const redis = createFakeRedis();
    (redis.getJson as jest.Mock).mockResolvedValue([{ userId: "u1", reason: "联调" }]);
    const guard = new StrictRedisThrottleGuard(redis);

    expect(await guard.canActivate(mockContext("10.0.2.2", "u1"))).toBe(true);
    expect(redis.incrWithTtl).not.toHaveBeenCalled();
  });

  it("非名单用户继续使用独立的严格限流计数键", async () => {
    const redis = createFakeRedis();
    (redis.getJson as jest.Mock).mockResolvedValue([{ userId: "u1" }]);
    const guard = new StrictRedisThrottleGuard(redis);

    expect(await guard.canActivate(mockContext("10.0.2.3", "u2"))).toBe(true);
    expect(redis.counters.has("rate:strict:user:844a57b2d30b9566372bd8ad3e43a7f6")).toBe(true);
    expect(redis.counters.has("rate:ip:10.0.2.3")).toBe(false);
  });

  it("名单读取异常时不报 500，继续执行正常限流", async () => {
    const redis = createFakeRedis();
    (redis.getJson as jest.Mock).mockRejectedValueOnce(new Error("redis unavailable"));
    const guard = new StrictRedisThrottleGuard(redis);

    expect(await guard.canActivate(mockContext("10.0.2.4", "u1"))).toBe(true);
    expect([...redis.counters.keys()].some((key) => key.startsWith("rate:strict:user:"))).toBe(true);
  });

  it("共享同一公网 IP 的不同登录用户独立计数", async () => {
    const redis = createFakeRedis();
    const guard = new StrictRedisThrottleGuard(redis);

    for (let i = 0; i < 10; i++) await guard.canActivate(mockContext("203.0.113.8", "user-a"));
    await expect(guard.canActivate(mockContext("203.0.113.8", "user-a"))).rejects.toThrow(
      HttpException,
    );
    expect(await guard.canActivate(mockContext("203.0.113.8", "user-b"))).toBe(true);
  });

  it("同一登录用户更换出口 IP 后仍共用严格额度", async () => {
    const redis = createFakeRedis();
    const guard = new StrictRedisThrottleGuard(redis);

    for (let i = 0; i < 10; i++) await guard.canActivate(mockContext("203.0.113.9", "user-c"));
    await expect(guard.canActivate(mockContext("198.51.100.7", "user-c"))).rejects.toThrow(
      HttpException,
    );
  });

  it("匿名认证请求按脱敏账号标识计数且 Redis key 不包含手机号", async () => {
    const redis = createFakeRedis();
    const guard = new StrictRedisThrottleGuard(redis);
    const firstPhone = { phone: "13800138000" };
    const secondPhone = { phone: "13900139000" };

    for (let i = 0; i < 10; i++) {
      await guard.canActivate(mockContext("203.0.113.10", undefined, firstPhone));
    }
    await expect(
      guard.canActivate(mockContext("203.0.113.10", undefined, firstPhone)),
    ).rejects.toThrow(HttpException);
    expect(
      await guard.canActivate(mockContext("203.0.113.10", undefined, secondPhone)),
    ).toBe(true);
    expect([...redis.counters.keys()].every((key) => !key.includes("13800138000"))).toBe(true);
  });
});
