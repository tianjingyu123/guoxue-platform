import { StationIsolationGuard } from "./station-isolation.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";

function mockContext(user?: { id?: string; roles?: string[] }): ExecutionContext {
  const request: Record<string, any> = { user: user ?? null };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe("StationIsolationGuard", () => {
  let guard: StationIsolationGuard;
  let reflector: Reflector;
  let prisma: any;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      station: { findUnique: jest.fn() },
    };
    guard = new StationIsolationGuard(reflector, prisma);
  });

  it("@SkipStationIsolation() 装饰器存在 → 绕过隔离", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = mockContext({ id: "u1", roles: ["USER"] });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    // 不应调用 prisma 查分站
    expect(prisma.station.findUnique).not.toHaveBeenCalled();
  });

  it("无登录用户 → 放行（公开接口）", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = mockContext(undefined);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("SUPER_ADMIN → 放行且不注入 stationId（看全平台）", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = mockContext({ id: "admin1", roles: ["SUPER_ADMIN"] });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.stationId).toBeUndefined();
    expect(prisma.station.findUnique).not.toHaveBeenCalled();
  });

  it("OPERATION_ADMIN → 放行且不注入 stationId", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = mockContext({ id: "op1", roles: ["OPERATION_ADMIN"] });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().stationId).toBeUndefined();
  });

  it("普通用户有绑定分站 → 注入 stationId", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    prisma.station.findUnique.mockResolvedValue({ id: "st1" });
    const ctx = mockContext({ id: "u1", roles: ["USER"] });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.stationId).toBe("st1");
  });

  it("普通用户无绑定分站 → 不注入 stationId（放行）", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    prisma.station.findUnique.mockResolvedValue(null);
    const ctx = mockContext({ id: "u1", roles: ["USER"] });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().stationId).toBeUndefined();
  });

  it("用户 roles 为 undefined → 正常查询分站", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    prisma.station.findUnique.mockResolvedValue({ id: "st1" });
    const ctx = mockContext({ id: "u1" }); // 无 roles 字段
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().stationId).toBe("st1");
  });
});
