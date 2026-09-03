import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { BigScreenAuthGuard, BIGSCREEN_TYPE_KEY } from "./bigscreen-auth.guard";
import { BigScreenController } from "./bigscreen.controller";

describe("BigScreenAuthGuard 范围与统一认证约束", () => {
  const prisma = { bigScreenToken: { findUnique: jest.fn() } };
  let reflector: Reflector;
  let guard: BigScreenAuthGuard;
  let req: { headers: Record<string, unknown>; query: Record<string, unknown>; user?: { roles: string[] } };
  let ctx: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = new Reflector();
    guard = new BigScreenAuthGuard(prisma as unknown as PrismaService, reflector);
    req = { headers: {}, query: {} };
    ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => BigScreenController.prototype.getPlatform,
      getClass: () => BigScreenController,
    } as unknown as ExecutionContext;
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it.each([
    ["getPlatform", "platform", "platform"],
    ["getTransactions", "transactions", "transactions"],
    ["getContentEco", "content-eco", "content_eco"],
    ["getAiCapability", "ai-capability", "ai_capability"],
    ["getOfflineMap", "offline-map", "offline_map"],
  ])("%s 路由 %s 精确绑定令牌类型 %s", (method, route, type) => {
    const handler = BigScreenController.prototype[method as keyof BigScreenController];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(route);
    expect(Reflect.getMetadata(BIGSCREEN_TYPE_KEY, handler)).toBe(type);
  });

  it.each([undefined, "unknown"])("范围 %s 未显式受支持时失败关闭", async type => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(type);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.bigScreenToken.findUnique).not.toHaveBeenCalled();
  });

  it.each(["", " ", ["a", "b"], { token: "a" }])("拒绝非单值令牌 %j 且不查询数据库", async token => {
    req.headers["x-bigscreen-token"] = token;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.bigScreenToken.findUnique).not.toHaveBeenCalled();
  });

  it("令牌到达有效期上界即拒绝", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-03T00:00:00Z"));
    req.headers["x-bigscreen-token"] = "isolated-fixture";
    prisma.bigScreenToken.findUnique.mockResolvedValue({
      status: "ACTIVE", type: "platform", validFrom: new Date("2026-09-02T00:00:00Z"),
      validTo: new Date(), ipWhitelist: null,
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("统一认证拒绝时不降级、不重新验签", async () => {
    const authenticate = jest.spyOn(JwtAuthGuard.prototype, "canActivate").mockRejectedValue(new UnauthorizedException());
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authenticate).toHaveBeenCalledWith(ctx);
    expect(prisma.bigScreenToken.findUnique).not.toHaveBeenCalled();
  });

  it.each(["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE", "CONTENT_AUDITOR", "GOODS_AUDITOR"])(
    "保留统一认证返回的 %s 访问权限", async role => {
      jest.spyOn(JwtAuthGuard.prototype, "canActivate").mockImplementation(async () => {
        req.user = { roles: [role] }; return true;
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

  it("统一认证通过但无管理员角色时拒绝", async () => {
    jest.spyOn(JwtAuthGuard.prototype, "canActivate").mockImplementation(async () => {
      req.user = { roles: ["USER"] }; return true;
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
