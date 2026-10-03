import { Test } from "@nestjs/testing";
import { ValidationPipe, INestApplication } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { sign } from "jsonwebtoken";
import request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { WechatService } from "./wechat.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { UniverifyBridgeService } from "./univerify-bridge.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

// 真实 HTTP、DTO、JWT 策略与绑定服务；数据库/Redis/供应商均为合成替身。
// 此测试不替代 PostgreSQL 并发、真实微信授权或正式客户端验收。
describe("微信账号绑定 HTTP 主体边界", () => {
  const userA = "123e4567-e89b-42d3-a456-426614174000";
  const userB = "123e4567-e89b-42d3-a456-426614174001";
  const secret = "synthetic-binding-http-test-only-32-characters";
  const previousSecret = process.env.JWT_SECRET;
  const previousOldSecrets = process.env.JWT_PREVIOUS_SECRETS;
  let app: INestApplication;
  const db = {
    user: { findUnique: jest.fn(async ({ where }) => [userA, userB].includes(where.id) ? { id: where.id, status: "ACTIVE", roles: [] } : null) },
    auth: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const wechat = {
    resolveLoginClient: jest.fn(() => ({ type: "h5", clientKey: "synthetic", identityNamespace: "wechat:h5:synthetic", unionNamespace: "wechat-open:synthetic", appId: "synthetic" })),
    exchangeOAuthCode: jest.fn(async () => ({ openId: "synthetic-open-id" })),
  };
  const service = Object.assign(Object.create(AuthService.prototype), { prisma: db, wechat, featureFlag: { isEnabled: jest.fn(async () => true) } });
  const token = (userId = userA) => sign({ sub: userId }, secret, { expiresIn: "5m" });
  const post = (body, accessToken = token()) => request(app.getHttpServer()).post("/auth/bind/wechat").set("Authorization", "Bearer " + accessToken).send(body);

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    delete process.env.JWT_PREVIOUS_SECRETS;
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AuthController],
      providers: [JwtStrategy, { provide: AuthService, useValue: service }, { provide: PrismaService, useValue: db },
        { provide: RedisService, useValue: { get: jest.fn(async () => null) } },
        { provide: WechatService, useValue: wechat }, { provide: SystemService, useValue: {} }, { provide: UniverifyBridgeService, useValue: {} }],
    }).overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    db.auth.upsert.mockResolvedValue({ userId: userA });
    db.$transaction.mockImplementation(async fn => fn(db));
  });
  afterAll(async () => {
    await app?.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    if (previousOldSecrets === undefined) delete process.env.JWT_PREVIOUS_SECRETS; else process.env.JWT_PREVIOUS_SECRETS = previousOldSecrets;
  });

  it("未登录与伪造 JWT 不能交换供应商票据", async () => {
    await request(app.getHttpServer()).post("/auth/bind/wechat").send({ code: "synthetic" }).expect(401);
    await post({ code: "synthetic" }, "forged").expect(401);
    expect(wechat.exchangeOAuthCode).not.toHaveBeenCalled();
  });
  it("JWT B 不能提交账号 A 发起的绑定，拒绝发生在事务之前", async () => {
    await post({ code: "synthetic", expectedUserId: userA }, token(userB)).expect(400);
    expect(wechat.exchangeOAuthCode).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("发起主体字段不合法时由真实 DTO 拒绝", async () => {
    await post({ code: "synthetic", expectedUserId: "not-a-user-id" }).expect(400);
    expect(wechat.exchangeOAuthCode).not.toHaveBeenCalled();
  });
  it("同一主体成功返回绑定状态，不返回新的登录令牌", async () => {
    const response = await post({ code: "synthetic", expectedUserId: userA }).expect(201);
    expect(response.body).toEqual({ success: true });
    expect(db.auth.upsert.mock.calls[0][0].create.userId).toBe(userA);
  });
  it("其他账号持有身份时真实服务返回冲突，不自动换绑", async () => {
    db.auth.upsert.mockResolvedValueOnce({ userId: userB });
    const response = await post({ code: "synthetic", expectedUserId: userA });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).not.toBe(true);
    expect(db.auth.upsert.mock.calls[0][0].update.userId).toBeUndefined();
  });
  it("事务异常不返回绑定成功", async () => {
    db.$transaction.mockRejectedValueOnce(new Error("synthetic transaction failure"));
    const response = await post({ code: "synthetic", expectedUserId: userA }).expect(500);
    expect(response.body.success).not.toBe(true);
  });
});
