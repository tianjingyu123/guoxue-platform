import { UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import request from "supertest";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { RedLineGuard } from "../../common/red-lines";
import { WgtControlController, WgtControlPublicController } from "./wgt-control.controller";
import { WgtControlService } from "./wgt-control.service";
import { DistributionService } from "./distribution.service";

/** 真正本机 HTTP 验证控制器/权限/人工闸/DTO；认证及数据库结果为明确测试替身。 */
describe("WGT 后台 HTTP 权限与输入门禁", () => {
  let app: any;
  const control = {
    overview: jest.fn(async () => []),
    trustBundle: jest.fn(async () => ({ keys: [] })),
    registerKey: jest.fn(async () => ({ id: "test-key" })),
    revokeKey: jest.fn(async () => ({})),
    submitEvidence: jest.fn(async () => ({ status: "PENDING" })),
    approveEvidence: jest.fn(async () => ({})),
    setEnabled: jest.fn(async () => ({})),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WgtControlController, WgtControlPublicController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: WgtControlService, useValue: control },
        {
          provide: DistributionService,
          useValue: {
            resolve: async (key: string) =>
              key === "test-client" ? { applicationId: "test-app" } : null,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers["x-test-role"]) throw new UnauthorizedException();
          req.user = { id: "test-admin", roles: [req.headers["x-test-role"]] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalGuards(new RedLineGuard(module.get(Reflector)));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("未登录及普通用户拒绝后台；运营能查看和提交待审核证据", async () => {
    await request(app.getHttpServer()).get("/system/wgt/admin").expect(401);
    await request(app.getHttpServer())
      .get("/system/wgt/admin")
      .set("X-Test-Role", "USER")
      .expect(403);
    await request(app.getHttpServer())
      .get("/system/wgt/admin")
      .set("X-Test-Role", "OPERATION_ADMIN")
      .expect(200);
    await request(app.getHttpServer())
      .post("/system/wgt/admin/distributions/test/evidence")
      .set("X-Test-Role", "OPERATION_ADMIN")
      .send({ payload: { kind: "native-recovery" }, signature: "test" })
      .expect(201);
    expect(control.submitEvidence).toHaveBeenCalledTimes(1);
  });
  it("运营不得登记、撤销、批准证据或启停；超管仍受自动化人工闸", async () => {
    for (const path of [
      "keys",
      "keys/test/revoke",
      "evidence/test/approve",
      "distributions/test/enable",
    ]) {
      await request(app.getHttpServer())
        .post("/system/wgt/admin/" + path)
        .set("X-Test-Role", "OPERATION_ADMIN")
        .send({ enabled: true })
        .expect(403);
      await request(app.getHttpServer())
        .post("/system/wgt/admin/" + path)
        .set("X-Test-Role", "SUPER_ADMIN")
        .set("X-Executor-Type", "AUTOMATION")
        .send({ enabled: true })
        .expect(403);
    }
    expect(control.setEnabled).not.toHaveBeenCalled();
    expect(control.registerKey).not.toHaveBeenCalled();
  });
  it("启停必须为布尔值，拒绝携带伪造审批字段", async () => {
    const path = "/system/wgt/admin/distributions/test/enable";
    await request(app.getHttpServer())
      .post(path)
      .set("X-Test-Role", "SUPER_ADMIN")
      .send({ enabled: "true" })
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set("X-Test-Role", "SUPER_ADMIN")
      .send({ enabled: true, approved: true })
      .expect(400);
    expect(control.setEnabled).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(path)
      .set("X-Test-Role", "SUPER_ADMIN")
      .send({ enabled: false })
      .expect(201);
    expect(control.setEnabled).toHaveBeenCalledWith("test", false, "test-admin");
  });
  it("公共信任入口无后台证据，未知登记返回空钥并禁止缓存", async () => {
    await request(app.getHttpServer())
      .get("/system/wgt/trust/unknown")
      .expect(200)
      .expect("Cache-Control", "no-store")
      .expect({ keys: [] });
    expect(control.trustBundle).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get("/system/wgt/trust/test-client")
      .expect(200)
      .expect({ keys: [] });
    expect(control.trustBundle).toHaveBeenCalledWith("test-app");
  });
});
