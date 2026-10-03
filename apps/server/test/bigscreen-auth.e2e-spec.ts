import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { randomBytes } from "crypto";
import request from "supertest";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { JwtStrategy } from "../src/common/jwt.strategy";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";
import { BigScreenAuthGuard } from "../src/modules/dashboard/bigscreen-auth.guard";
import { BigScreenAuthService } from "../src/modules/dashboard/bigscreen-auth.service";
import { BigScreenController } from "../src/modules/dashboard/bigscreen.controller";
import { BigScreenService } from "../src/modules/dashboard/bigscreen.service";

const screens = [
  ["platform", "platform"],
  ["transactions", "transactions"],
  ["content_eco", "content-eco"],
  ["ai_capability", "ai-capability"],
  ["offline_map", "offline-map"],
] as const;

@Controller("auth-control")
class AuthControlController {
  @Get()
  @UseGuards(JwtAuthGuard)
  get() { return { authenticated: true }; }
}

type ScreenToken = {
  type: string; status: string; validFrom: Date; validTo: Date; ipWhitelist: string | null;
};

// 使用真实 Passport/JwtStrategy 与 HTTP 路由，只隔离数据仓库和大屏业务查询。
describe("大屏鉴权与统一登录策略 HTTP 回归", () => {
  let app: INestApplication;
  let jwt: JwtService;
  let bearer: string;
  let user: { id: string; status: string; roles: { roleType: string }[] } | null;
  let revokedAt: string | null;
  const currentSecret = randomBytes(32).toString("hex");
  const previousSecret = randomBytes(32).toString("hex");
  const originalSecret = process.env.JWT_SECRET;
  const originalPrevious = process.env.JWT_PREVIOUS_SECRETS;
  const records = new Map<string, ScreenToken>();
  const tokens = new Map<string, string>();
  const prisma = {
    user: { findUnique: jest.fn() },
    bigScreenToken: { findUnique: jest.fn() },
  };
  const redis = { get: jest.fn() };
  const data = {
    getPlatformScreen: jest.fn(), getTransactionsScreen: jest.fn(), getContentEcoScreen: jest.fn(),
    getAiCapabilityScreen: jest.fn(), getOfflineMapScreen: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = currentSecret;
    process.env.JWT_PREVIOUS_SECRETS = previousSecret;
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: currentSecret })],
      controllers: [BigScreenController, AuthControlController],
      providers: [
        JwtStrategy, BigScreenAuthGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: BigScreenService, useValue: data },
        { provide: BigScreenAuthService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useLogger(false);
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalPrevious === undefined) delete process.env.JWT_PREVIOUS_SECRETS;
    else process.env.JWT_PREVIOUS_SECRETS = originalPrevious;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    records.clear(); tokens.clear();
    revokedAt = null;
    user = { id: "bigscreen-qa-admin", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] };
    prisma.user.findUnique.mockImplementation(async () => user);
    prisma.bigScreenToken.findUnique.mockImplementation(async ({ where }: { where: { token: string } }) => records.get(where.token) || null);
    redis.get.mockImplementation(async (key: string) => key === "revoked:user:bigscreen-qa-admin" ? revokedAt : null);
    for (const method of Object.values(data)) method.mockResolvedValue({ isolated: true });
    bearer = jwt.sign({ sub: user.id, sessionIssuedAt: Date.now() - 5000 }, { expiresIn: "5m" });
    for (const [scope] of screens) {
      const token = randomBytes(32).toString("hex");
      tokens.set(scope, token);
      records.set(token, {
        type: scope, status: "ACTIVE", validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 60000), ipWhitelist: null,
      });
    }
  });

  it.each(screens)("正常管理员可读取 %s 大屏", async (_scope, route) => {
    await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`)
      .set("Authorization", `Bearer ${bearer}`).expect(200);
  });

  it.each(screens)("撤销登录后普通接口和 %s 大屏同时拒绝旧 JWT", async (_scope, route) => {
    revokedAt = String(Date.now());
    await request(app.getHttpServer()).get("/api/v1/auth-control").set("Authorization", `Bearer ${bearer}`).expect(401);
    await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`).set("Authorization", `Bearer ${bearer}`).expect(401);
  });

  it.each(screens.flatMap(([scope, route]) => ["DISABLED", "BANNED"].map(status => [scope, route, status])))(
    "专题 %s（路由 %s）拒绝 %s 账号的现有 JWT", async (_scope, route, status) => {
      user!.status = status;
      await request(app.getHttpServer()).get("/api/v1/auth-control").set("Authorization", `Bearer ${bearer}`).expect(401);
      await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`).set("Authorization", `Bearer ${bearer}`).expect(401);
    });

  it.each(screens)("密钥轮换中的有效历史 JWT 仍可读取 %s 大屏", async (_scope, route) => {
    const token = new JwtService({ secret: previousSecret }).sign({ sub: user!.id }, { expiresIn: "5m" });
    await request(app.getHttpServer()).get("/api/v1/auth-control").set("Authorization", `Bearer ${token}`).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`).set("Authorization", `Bearer ${token}`).expect(200);
  });

  it.each(screens)("移除后台角色后 %s 大屏拒绝现有 JWT", async (_scope, route) => {
    user!.roles = [{ roleType: "USER" }];
    const result = await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`).set("Authorization", `Bearer ${bearer}`);
    expect([401, 403]).toContain(result.status);
    expect(Object.values(data).every(method => method.mock.calls.length === 0)).toBe(true);
  });

  it.each(screens.flatMap(([scope]) => screens.map(([target, route]) => [scope, target, route])))(
    "独立令牌 %s 仅能读取 %s 对应路由 %s", async (scope, target, route) => {
      await request(app.getHttpServer()).get(`/api/v1/bigscreen/${route}`)
        .set("x-bigscreen-token", tokens.get(scope)!).expect(scope === target ? 200 : 403);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

  it.each(["PENDING", "REVOKED", "EXPIRED"])("%s 独立令牌拒绝访问", async status => {
    records.get(tokens.get("platform")!)!.status = status;
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform")
      .set("x-bigscreen-token", tokens.get("platform")!).expect(401);
  });

  it("保留历史 APPROVED 状态但仍按专题限制", async () => {
    records.get(tokens.get("platform")!)!.status = "APPROVED";
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").set("x-bigscreen-token", tokens.get("platform")!).expect(200);
    await request(app.getHttpServer()).get("/api/v1/bigscreen/transactions").set("x-bigscreen-token", tokens.get("platform")!).expect(403);
  });

  it.each(["expired", "future"])("拒绝 %s 独立令牌", async period => {
    const record = records.get(tokens.get("platform")!)!;
    if (period === "expired") record.validTo = new Date(Date.now() - 1000);
    else record.validFrom = new Date(Date.now() + 60000);
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").set("x-bigscreen-token", tokens.get("platform")!).expect(401);
  });

  it("保留独立令牌 IP 白名单限制", async () => {
    const record = records.get(tokens.get("platform")!)!;
    record.ipWhitelist = "203.0.113.9";
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").set("x-bigscreen-token", tokens.get("platform")!).expect(401);
    record.ipWhitelist = "*";
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").set("x-bigscreen-token", tokens.get("platform")!).expect(200);
  });

  it("查询串令牌同样受专题限制", async () => {
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").query({ token: tokens.get("platform") }).expect(200);
    await request(app.getHttpServer()).get("/api/v1/bigscreen/offline-map").query({ token: tokens.get("platform") }).expect(403);
  });

  it("缺少凭据与无效独立令牌不自动回退到 JWT", async () => {
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform").expect(401);
    await request(app.getHttpServer()).get("/api/v1/bigscreen/platform")
      .set("x-bigscreen-token", "invalid-isolated-fixture").set("Authorization", `Bearer ${bearer}`).expect(401);
  });
});
