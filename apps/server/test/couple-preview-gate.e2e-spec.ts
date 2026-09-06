import { INestApplication, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule, PassportStrategy } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { ExtractJwt, Strategy } from "passport-jwt";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import request from "supertest";
import { CoupleController } from "../src/modules/paipan/couple.controller";
import { CoupleService } from "../src/modules/paipan/couple.service";
import { NativePaipanGuard, PaipanRuntimeService } from "../src/common/paipan-runtime.service";
import { PrismaService } from "../src/prisma/prisma.service";

// 仅本地合成签名材料；无真实账号、密钥、数据库或外部网络。
const secret = "local-couple-preview-http-only";
@Injectable()
class LocalJwtStrategy extends PassportStrategy(Strategy) {
  constructor() { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: secret }); }
  validate(payload: { sub: string; roles: string[] }) { return { id: payload.sub, roles: payload.roles }; }
}

describe("合盘七接口预览隔离（真实HTTP/JWT/运行时守卫，主库及业务替身）", () => {
  let app: INestApplication;
  const jwt = new JwtService({ secret });
  const token = (roles = ["SUPER_ADMIN"]) => jwt.sign({ sub: "local-user", roles });
  const svc = Object.fromEntries(["invite", "getInvite", "accept", "reject", "getMine", "getById", "remove"].map(name => [name, jest.fn().mockResolvedValue({ ok: true })]));
  const prisma = { $queryRaw: jest.fn() };
  const envKeys = ["PAIPAN_MODE", "PAIPAN_NATIVE_QA_ENABLED", "PAIPAN_NATIVE_QA_HOST", "PUBLIC_API_URL", "PAIPAN_NATIVE_QA_ALLOWLIST"];
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [CoupleController],
      providers: [LocalJwtStrategy, NativePaipanGuard, PaipanRuntimeService,
        { provide: CoupleService, useValue: svc }, { provide: PrismaService, useValue: prisma }],
    }).compile();
    app = module.createNestApplication({ logger: false }); await app.init();
  });
  afterAll(async () => {
    await app?.close();
    for (const key of envKeys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  });
  beforeEach(() => {
    jest.clearAllMocks(); prisma.$queryRaw.mockResolvedValue([{ allowed: false }]);
    Object.assign(process.env, { PAIPAN_MODE: "native", PAIPAN_NATIVE_QA_ENABLED: "true", PAIPAN_NATIVE_QA_HOST: "pre-api.rebugx.cn", PUBLIC_API_URL: "https://pre-api.rebugx.cn", PAIPAN_NATIVE_QA_ALLOWLIST: "role:SUPER_ADMIN" });
  });
  const routes = [
    ["post", "/paipan/couple/invite", "invite"], ["get", "/paipan/couple/invite/local-token", "getInvite"],
    ["post", "/paipan/couple/local-token/accept", "accept"], ["post", "/paipan/couple/local-token/reject", "reject"],
    ["get", "/paipan/couple/mine", "getMine"], ["get", "/paipan/couple/local-id", "getById"], ["delete", "/paipan/couple/local-id", "remove"],
  ] as const;
  it.each(routes)("%s %s：匿名/普通账号/关闭/异常均不可进入业务", async (method, url) => {
    for (const auth of [undefined, token(["USER"]), token()]) {
      const req = request(app.getHttpServer())[method](url).set("Host", "pre-api.rebugx.cn");
      if (auth) req.set("Authorization", `Bearer ${auth}`);
      await req.send({ myRecordId: "local-record" }).expect(404).expect("Cache-Control", "private, no-store");
    }
    prisma.$queryRaw.mockRejectedValue(new Error("local database unavailable"));
    await request(app.getHttpServer())[method](url).set("Host", "pre-api.rebugx.cn").set("Authorization", `Bearer ${token()}`).send({}).expect(404);
    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
  });
  it.each(routes)("%s %s：获准进入后立即撤权，下次请求重新拒绝", async (method, url, handler) => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer())[method](url).set("Host", "pre-api.rebugx.cn").set("Authorization", `Bearer ${token()}`).send({ myRecordId: "local-record" })
      .expect(method === "post" ? 201 : 200).expect("X-Robots-Tag", "noindex, nofollow, noarchive");
    expect(svc[handler]).toHaveBeenCalledTimes(1);
    prisma.$queryRaw.mockResolvedValue([{ allowed: false }]);
    await request(app.getHttpServer())[method](url).set("Host", "pre-api.rebugx.cn").set("Authorization", `Bearer ${token()}`).send({}).expect(404);
    expect(svc[handler]).toHaveBeenCalledTimes(1);
  });
  it("主库拒绝错误预览环境或JWT过期时不进入，公开文档不显示七接口", async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: false }]);
    await request(app.getHttpServer()).get("/paipan/couple/mine").set("Host", "api.rebugx.cn").set("Authorization", `Bearer ${token()}`).expect(404);
    expect(prisma.$queryRaw.mock.calls[0]).toContain(false);
    const expired = jwt.sign({ sub: "local-user", roles: ["SUPER_ADMIN"] }, { expiresIn: -1 });
    await request(app.getHttpServer()).get("/paipan/couple/mine").set("Host", "pre-api.rebugx.cn").set("Authorization", `Bearer ${expired}`).expect(404);
    expect(svc.getMine).not.toHaveBeenCalled();
    expect(Object.keys(SwaggerModule.createDocument(app, new DocumentBuilder().build()).paths).some(path => path.includes("couple"))).toBe(false);
  });
});
