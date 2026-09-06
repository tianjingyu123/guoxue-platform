import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { FeatureFlagController } from "../src/modules/feature-flag/feature-flag.controller";
import { FeatureFlagService } from "../src/modules/feature-flag/feature-flag.service";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { RolesGuard } from "../src/common/roles.guard";
import { RedLineGuard } from "../src/common/red-lines";

// 真 HTTP/DTO/角色/红线；仅身份来源和业务服务模拟，不冒充线上登录或数据库验收。
describe("后台配置预览发布 HTTP 边界", () => {
  let app: INestApplication;
  const api = { preview: jest.fn(), upsert: jest.fn(), rollback: jest.fn() };
  const base = "/api/v1/admin/feature-flags/client_test";
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [FeatureFlagController], providers: [
      { provide: FeatureFlagService, useValue: api }, RolesGuard, RedLineGuard,
    ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const role = ({ "Bearer admin": "SUPER_ADMIN", "Bearer operator": "OPERATION_ADMIN", "Bearer consumer": "USER" } as Record<string, string>)[req.headers.authorization];
      if (!role) throw new UnauthorizedException();
      req.user = { id: "synthetic-actor", roles: [role] }; return true;
    } }).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalGuards(module.get(RedLineGuard)); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); api.preview.mockResolvedValue({ previewOnly: true, published: false }); api.upsert.mockResolvedValue({}); api.rollback.mockResolvedValue({}); });
  it("匿名和普通用户不能预览后台配置", async () => {
    await request(app.getHttpServer()).post(`${base}/preview`).send({}).expect(401);
    await request(app.getHttpServer()).post(`${base}/preview`).set("Authorization", "Bearer consumer").send({}).expect(403);
    expect(api.preview).not.toHaveBeenCalled();
  });
  it("运营人员预览成功且禁止共享缓存，无发布调用", async () => {
    const response = await request(app.getHttpServer()).post(`${base}/preview`).set("Authorization", "Bearer operator").send({ percentage: 20 }).expect(201);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.body).toEqual({ previewOnly: true, published: false }); expect(api.upsert).not.toHaveBeenCalled();
  });
  it.each([{ percentage: 101 }, { percentage: "20" }, { actorId: "forged" }, { expectedFingerprint: "bad" }])("非法预览拒绝 %j", async body => {
    await request(app.getHttpServer()).post(`${base}/preview`).set("Authorization", "Bearer admin").send(body).expect(400);
    expect(api.preview).not.toHaveBeenCalled();
  });
  it("运营角色不能回滚，自动化管理员不能发布或回滚", async () => {
    await request(app.getHttpServer()).post(`${base}/rollback/1`).set("Authorization", "Bearer operator").send({}).expect(403);
    await request(app.getHttpServer()).put(base).set("Authorization", "Bearer admin").set("x-executor-type", "AUTOMATION").send({ enabled: true }).expect(403);
    await request(app.getHttpServer()).post(`${base}/rollback/1`).set("Authorization", "Bearer admin").set("x-executor-type", "AUTOMATION").send({}).expect(403);
    expect(api.upsert).not.toHaveBeenCalled(); expect(api.rollback).not.toHaveBeenCalled();
  });
  it("真人回滚将指纹和可信操作人传入服务", async () => {
    await request(app.getHttpServer()).post(`${base}/rollback/1`).set("Authorization", "Bearer admin").send({ expectedFingerprint: "a".repeat(64) }).expect(201);
    expect(api.rollback).toHaveBeenCalledWith("client_test", 1, "synthetic-actor", "a".repeat(64));
  });
});
