import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/common/roles.guard";
import { ThrottleGuard, StrictThrottleGuard } from "../src/common/throttle.guard";

function mockContext(user?: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        ip: "10.0.0.1",
        user: user ?? null,
        connection: { remoteAddress: "10.0.0.1" },
      }),
    }),
  } as any;
}

describe("RolesGuard", () => {
  it("无 requiredRoles 时拒绝（deny-by-default 防越权）", () => {
    const reflector = { getAllAndOverride: () => undefined } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext())).toBe(false);
  });

  it("用户有对应角色时放行", () => {
    const reflector = { getAllAndOverride: () => ["SUPER_ADMIN"] } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ roles: ["SUPER_ADMIN"] }))).toBe(true);
  });

  it("用户无对应角色时拒绝", () => {
    const reflector = { getAllAndOverride: () => ["SUPER_ADMIN"] } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({ roles: ["USER"] }))).toBe(false);
  });

  it("用户无 roles 字段时拒绝", () => {
    const reflector = { getAllAndOverride: () => ["SUPER_ADMIN"] } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext({}))).toBe(false);
  });
});

// M3 后 ThrottleGuard 走 RedisService.incrWithTtl 分布式计数：内存假实现保持限流语义可测
function fakeRedis(): any {
  const counters = new Map<string, { count: number; resetAt: number }>();
  return {
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
  };
}

describe("ThrottleGuard", () => {
  it("首次请求放行", async () => {
    const guard = new ThrottleGuard(fakeRedis());
    expect(await guard.canActivate(mockContext())).toBe(true);
  });

  it("在限额内多次请求放行（默认 30 次/60 秒）", async () => {
    const guard = new ThrottleGuard(fakeRedis());
    const ctx = mockContext();
    for (let i = 0; i < 30; i++) {
      expect(await guard.canActivate(ctx)).toBe(true);
    }
  });

  it("超限额抛出 429", async () => {
    const guard = new ThrottleGuard(fakeRedis());
    const ctx = mockContext();
    for (let i = 0; i < 30; i++) await guard.canActivate(ctx);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});

describe("StrictThrottleGuard", () => {
  it("默认每分钟 10 次", async () => {
    const guard = new StrictThrottleGuard(fakeRedis());
    const ctx = mockContext();
    for (let i = 0; i < 10; i++) {
      expect(await guard.canActivate(ctx)).toBe(true);
    }
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
