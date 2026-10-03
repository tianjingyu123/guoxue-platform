import { UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import request from "supertest";
import { ClientPresentationController } from "./client-presentation.controller";
import { ClientPresentationService } from "./client-presentation.service";
import { FeatureFlagService } from "./feature-flag.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { RedLineGuard } from "../../common/red-lines";
import { AuditInterceptor } from "../../common/audit.interceptor";
describe("声明式运营后台 HTTP 权限、输入与审计", () => {
  let app: any;
  const calls: any[] = [];
  const audit = { log: jest.fn(async () => {}) };
  const service = {
    history: async () => [],
    capabilityHistory: async () => [],
    saveDraft: async (...args: any[]) => {
      calls.push(args);
      return { id: "draft" };
    },
    preview: async () => ({ config: null, reasons: ["旧包"] }),
    publish: async (...args: any[]) => {
      calls.push(args);
      return { id: "published" };
    },
    rollback: async () => ({}),
    registerCapabilities: async (...args: any[]) => {
      calls.push(args);
      return {};
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClientPresentationController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: ClientPresentationService, useValue: service },
        { provide: FeatureFlagService, useValue: { requestScope: async () => null } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers["x-test-role"]) throw new UnauthorizedException();
          req.user = { id: "synthetic-operator", roles: [req.headers["x-test-role"]] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalGuards(new RedLineGuard(module.get(Reflector)));
    app.useGlobalInterceptors(new AuditInterceptor(audit as any));
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    calls.length = 0;
    audit.log.mockClear();
  });
  it("未登录和普通用户拒绝；运营可保存不生效草稿", async () => {
    await request(app.getHttpServer()).get("/admin/client-presentation").expect(401);
    await request(app.getHttpServer())
      .get("/admin/client-presentation")
      .set("X-Test-Role", "USER")
      .expect(403);
    await request(app.getHttpServer())
      .post("/admin/client-presentation/draft")
      .set("X-Test-Role", "OPERATION_ADMIN")
      .send({ payload: { schemaVersion: 1, rules: [] }, reason: "合成预览" })
      .expect(201);
    expect(calls[0][2]).toBe("synthetic-operator");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "保存包内声明式运营草稿",
        userId: "synthetic-operator",
        targetType: "CLIENT_PRESENTATION",
      }),
    );
  });
  it("发布、回退、能力登记仅超管；自动化不能绕过人工闸", async () => {
    for (const path of ["draft/test/publish", "rollback/1", "capabilities"]) {
      await request(app.getHttpServer())
        .post("/admin/client-presentation/" + path)
        .set("X-Test-Role", "OPERATION_ADMIN")
        .send({ payload: {}, reason: "合成审核" })
        .expect(403);
      await request(app.getHttpServer())
        .post("/admin/client-presentation/" + path)
        .set("X-Test-Role", "SUPER_ADMIN")
        .set("X-Executor-Type", "AUTOMATION")
        .send({ payload: {}, reason: "合成审核" })
        .expect(403);
    }
    expect(calls).toHaveLength(0);
  });
  it("原因和顶层字段严格校验，成功发布调用实际审计拦截器", async () => {
    await request(app.getHttpServer())
      .post("/admin/client-presentation/draft")
      .set("X-Test-Role", "SUPER_ADMIN")
      .send({ payload: {}, reason: "", script: "alert(1)" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/admin/client-presentation/draft/test/publish")
      .set("X-Test-Role", "SUPER_ADMIN")
      .send({ reason: "合成发布" })
      .expect(201);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "发布包内声明式运营配置", targetId: "published" }),
    );
  });
});
