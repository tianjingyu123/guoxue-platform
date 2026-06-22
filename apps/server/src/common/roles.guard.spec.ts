import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";

function mockContext(user?: { roles?: string[] }): ExecutionContext {
  const request = { user: user ?? null };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("缺少 @Roles() 装饰器时拒绝访问（deny-by-default）", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = mockContext({ roles: ["SUPER_ADMIN"] });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("@Roles() 空数组时拒绝访问", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);
    const ctx = mockContext({ roles: ["SUPER_ADMIN"] });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("用户无 roles 字段时拒绝", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["SUPER_ADMIN"]);
    const ctx = mockContext({ roles: undefined } as any);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("用户无 user 对象时拒绝", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["SUPER_ADMIN"]);
    const ctx = mockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it("用户拥有所需角色 → 允许", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["SUPER_ADMIN"]);
    const ctx = mockContext({ roles: ["SUPER_ADMIN", "OPERATION_ADMIN"] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("用户拥有多角色中至少一个 → 允许", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["SUPER_ADMIN", "FINANCE_ADMIN"]);
    const ctx = mockContext({ roles: ["CONTENT_AUDITOR", "FINANCE_ADMIN"] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("用户角色不匹配任何所需角色 → 拒绝", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["SUPER_ADMIN"]);
    const ctx = mockContext({ roles: ["CONTENT_AUDITOR"] });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("所需角色与用户角色大小写敏感匹配", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["super_admin"]);
    const ctx = mockContext({ roles: ["SUPER_ADMIN"] });
    // 大小写不匹配 → 拒绝
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
