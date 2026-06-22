import { ThrottleGuard } from "./throttle.guard";
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

describe("ThrottleGuard", () => {
  let guard: ThrottleGuard;

  beforeEach(() => {
    guard = new ThrottleGuard(5, 60); // 小阈值方便测试：60秒内5次
  });

  afterEach(() => {
    if (guard.onModuleDestroy) guard.onModuleDestroy();
  });

  it("首次请求允许", () => {
    expect(guard.canActivate(mockContext("10.0.0.1"))).toBe(true);
  });

  it("在限制内多次请求允许", () => {
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(mockContext("10.0.0.2"))).toBe(true);
    }
  });

  it("超过限制后抛出 429", () => {
    for (let i = 0; i < 5; i++) {
      guard.canActivate(mockContext("10.0.0.3"));
    }
    expect(() => guard.canActivate(mockContext("10.0.0.3"))).toThrow(HttpException);
    try {
      guard.canActivate(mockContext("10.0.0.3"));
    } catch (e: any) {
      expect(e.getStatus()).toBe(429);
    }
  });

  it("不同 IP 独立计数", () => {
    // IP A 打到上限
    for (let i = 0; i < 5; i++) guard.canActivate(mockContext("10.0.0.4"));
    expect(() => guard.canActivate(mockContext("10.0.0.4"))).toThrow(HttpException);
    // IP B 不受影响
    expect(guard.canActivate(mockContext("10.0.0.5"))).toBe(true);
  });

  it("无 IP 时使用 unknown 作为 key", () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("超过限制的异常包含 retryAfter", () => {
    for (let i = 0; i < 5; i++) guard.canActivate(mockContext("10.0.0.6"));
    try {
      guard.canActivate(mockContext("10.0.0.6"));
      fail("应该抛出异常");
    } catch (e: any) {
      const body = e.getResponse();
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(body.message).toContain("频繁");
    }
  });
});
