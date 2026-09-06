import { INestApplication, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule, PassportStrategy } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { ExtractJwt, Strategy } from "passport-jwt";
import request from "supertest";
import { BaziCaseController, BaziCaseAdminController } from "../src/modules/bazi-case/bazi-case.controller";
import { BaziCaseService } from "../src/modules/bazi-case/bazi-case.service";
import { NativePaipanGuard, PaipanRuntimeService } from "../src/common/paipan-runtime.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RolesGuard } from "../src/common/roles.guard";

// 仅本地测试签名器，不使用应用真实密钥、账号或数据库。
const secret = "local-preview-http-test-not-a-deployment-secret";
@Injectable()
class LocalJwtStrategy extends PassportStrategy(Strategy) {
  constructor() { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: secret }); }
  validate(payload: { sub: string; roles: string[] }) { return { id: payload.sub, roles: payload.roles }; }
}

describe("案例库前后台整套排盘HTTP门禁（主库与业务为替身，JWT验签真实）", () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret });
  const token = (roles = ["SUPER_ADMIN"]) => jwt.sign({ sub: "local-test-user", roles });
  const svc = Object.fromEntries(["list", "leaderboard", "findSimilar", "rewardPlan", "myContributions", "submit", "saveGuess", "reveal", "selfScore", "myAttempt", "detail", "listForReview", "approve", "reject"]
    .map(name => [name, jest.fn().mockResolvedValue({ ok: true })]));
  const prisma = { $queryRaw: jest.fn() };
  const runtime = { isQaRequestAllowed: jest.fn((_host: string, user: { roles: string[] }) => user.roles.includes("SUPER_ADMIN")) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule],
      controllers: [BaziCaseController, BaziCaseAdminController], providers: [LocalJwtStrategy, NativePaipanGuard, RolesGuard,
        { provide: BaziCaseService, useValue: svc }, { provide: PrismaService, useValue: prisma },
        { provide: PaipanRuntimeService, useValue: runtime }],
    }).compile();
    app = module.createNestApplication({ logger: false }); await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => { jest.clearAllMocks(); prisma.$queryRaw.mockResolvedValue([{ allowed: false }]); });
  const routes = [
    ["get", "/bazi-cases"], ["get", "/bazi-cases/leaderboard"], ["post", "/bazi-cases/similar"],
    ["get", "/bazi-cases/reward-plan"], ["get", "/bazi-cases/mine"], ["post", "/bazi-cases"],
    ["post", "/bazi-cases/test/guess"], ["post", "/bazi-cases/test/reveal"], ["put", "/bazi-cases/test/self-score"],
    ["get", "/bazi-cases/test/mine"], ["get", "/bazi-cases/test"], ["get", "/admin/bazi-cases"],
    ["post", "/admin/bazi-cases/test/approve"], ["post", "/admin/bazi-cases/test/reject"],
  ] as const;
  it.each(routes)("关闭/主库撤权：%s %s 必须在业务前404", async (method, url) => {
    await request(app.getHttpServer())[method](url).set("Authorization", `Bearer ${token()}`).send({}).expect(404)
      .expect("Cache-Control", "private, no-store");
    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
  });
  it("未登录、过期JWT不能借主库允许结果进入", async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer()).get("/bazi-cases").expect(404);
    await request(app.getHttpServer()).get("/bazi-cases").set("Authorization", `Bearer ${jwt.sign({ sub: "local", roles: ["SUPER_ADMIN"] }, { expiresIn: -1 })}`).expect(404);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it("第三方模式主库拒绝时，运营管理员不能借角色进入", async () => {
    await request(app.getHttpServer()).get("/admin/bazi-cases").set("Authorization", `Bearer ${token(["OPERATION_ADMIN"])}`).expect(404);
    expect(prisma.$queryRaw.mock.calls[0]).toContain(false);
    expect(svc.listForReview).not.toHaveBeenCalled();
  });
  it("整套自研允许时普通账号可读前台，后台仍保留原角色权限", async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer()).get("/bazi-cases").set("Authorization", `Bearer ${token(["CONSUMER"])}`).expect(200);
    await request(app.getHttpServer()).get("/admin/bazi-cases").set("Authorization", `Bearer ${token(["CONSUMER"])}`).expect(403);
    expect(svc.listForReview).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get("/admin/bazi-cases").set("Authorization", `Bearer ${token(["OPERATION_ADMIN"])}`).expect(200);
    expect(svc.listForReview).toHaveBeenCalledTimes(1);
  });
  it("当前超级管理员且主库同意才可浏览，主库异常失败关闭", async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer()).get("/bazi-cases").set("Authorization", `Bearer ${token()}`).expect(200)
      .expect("Cache-Control", "private, no-store").expect("X-Robots-Tag", "noindex, nofollow, noarchive");
    await request(app.getHttpServer()).get("/admin/bazi-cases").set("Authorization", `Bearer ${token()}`).expect(200);
    expect(svc.list).toHaveBeenCalledTimes(1); expect(svc.listForReview).toHaveBeenCalledTimes(1);
    prisma.$queryRaw.mockRejectedValue(new Error("local database unavailable"));
    await request(app.getHttpServer()).get("/bazi-cases").set("Authorization", `Bearer ${token()}`).expect(404);
    expect(svc.list).toHaveBeenCalledTimes(1);
  });
});
