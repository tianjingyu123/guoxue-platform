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
  it("无 requiredRoles 时放行", () => {
    const reflector = { getAllAndOverride: () => undefined } as any;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext())).toBe(true);
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

describe("ThrottleGuard", () => {
  it("首次请求放行", () => {
    const guard = new ThrottleGuard(5, 60);
    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it("在限额内多次请求放行", () => {
    const guard = new ThrottleGuard(5, 60);
    const ctx = mockContext();
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it("超限额抛出 429", () => {
    const guard = new ThrottleGuard(2, 60);
    const ctx = mockContext();
    guard.canActivate(ctx); // 1
    guard.canActivate(ctx); // 2
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});

describe("StrictThrottleGuard", () => {
  it("默认每分钟 10 次", () => {
    const guard = new StrictThrottleGuard();
    const ctx = mockContext();
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});
