import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard, StrictThrottleGuard } from "../../common/throttle.guard";
import { SystemService } from "../system/system.service";
import { DEFAULT_VOICE_BILLING, VoiceQuotaService } from "./voice-quota.service";
import { VoiceContextBuilder } from "./voice-context.builder";
import { VoiceSessionService } from "./voice-session.service";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceProviderCallbackController, VoiceSessionController } from "./voice-session.controller";
import { VoiceDeviceAdminController, VoiceDeviceController } from "./voice-device.controller";
import { VoiceAdminController } from "./voice-admin.controller";
import { XiaozhiMcpBridgeService } from "./xiaozhi-mcp-bridge.service";
import { VOICE_PROVIDER } from "./provider/voice-provider.types";
import { MockXiaozhiProvider } from "./provider/mock-xiaozhi.provider";
import { UnavailableXiaozhiProvider } from "./provider/unavailable-xiaozhi.provider";

/**
 * HTTP 层契约与越权测试（默认跳过）：XIAOBU_IT_DATABASE_URL=<隔离库>
 * 真实路由、真实 DTO 校验、真实角色守卫、真实库；只把登录守卫换成「按请求头认人」的测试守卫，
 * 限流守卫放行。供应商为模拟/暂未开放两种，不代表真实接通。
 */
const dbUrl = process.env.XIAOBU_IT_DATABASE_URL;
const run = dbUrl ? describe : describe.skip;

/** 测试身份：x-test-user=<userId>，x-test-roles=A,B；没有头就是未登录 */
class HeaderAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const id = req.headers["x-test-user"];
    if (!id) throw new UnauthorizedException("未登录");
    req.user = { id, roles: String(req.headers["x-test-roles"] || "USER").split(",") };
    return true;
  }
}
const allow = { canActivate: () => true };

async function makeApp(prisma: PrismaClient, provider: any, chargeUsers = true): Promise<INestApplication> {
  const system = {
    getConfig: async () => ({ configValue: JSON.stringify({ ...DEFAULT_VOICE_BILLING, version: "http-it", chargeUsers, sessionMaxSeconds: 300 }) }),
  };
  const mod = await Test.createTestingModule({
    controllers: [VoiceSessionController, VoiceProviderCallbackController, VoiceDeviceController, VoiceDeviceAdminController, VoiceAdminController],
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: SystemService, useValue: system },
      { provide: XiaozhiMcpBridgeService, useValue: { status: "disabled", lastError: null } },
      { provide: VOICE_PROVIDER, useValue: provider },
      VoiceQuotaService,
      VoiceContextBuilder,
      VoiceDeviceService,
      VoiceSessionService,
    ],
  })
    .overrideGuard(JwtAuthGuard).useValue(new HeaderAuthGuard())
    .overrideGuard(ThrottleGuard).useValue(allow)
    .overrideGuard(StrictThrottleGuard).useValue(allow)
    .compile();
  const app = mod.createNestApplication({ rawBody: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

run("小卜语音 HTTP 层契约", () => {
  let prisma: PrismaClient;
  let mockApp: INestApplication;
  let unavailApp: INestApplication;
  let mock: MockXiaozhiProvider;
  const prefix = `it-http-${Date.now()}`;
  const alice = `${prefix}-alice`, bob = `${prefix}-bob`;
  const rid = () => `r${Math.random().toString(36).slice(2, 14)}`;

  beforeAll(async () => {
    process.env.XIAOBU_DEVICE_PEPPER = "it-only-pepper-0123456789abcdef0123456789";
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    mock = new MockXiaozhiProvider();
    mockApp = await makeApp(prisma, mock);
    unavailApp = await makeApp(prisma, new UnavailableXiaozhiProvider());
    const quota = new VoiceQuotaService(prisma as any, { getConfig: async () => null } as any);
    await quota.grant({ ownerType: "user", ownerId: alice, seconds: 1800, idempotencyKey: `${alice}-g` });
  });

  afterAll(async () => {
    const sids = (await prisma.voiceSession.findMany({ where: { userId: { startsWith: prefix } }, select: { id: true } })).map((s) => s.id);
    const accs = (await prisma.voiceQuotaAccount.findMany({ where: { ownerId: { startsWith: prefix } } })).map((a) => a.id);
    await prisma.voiceProviderAttempt.deleteMany({ where: { sessionId: { in: sids } } });
    await prisma.voiceUsageEvent.deleteMany({ where: { OR: [{ sessionId: { in: sids } }, { eventId: { startsWith: prefix } }] } });
    await prisma.voiceQuotaLedger.deleteMany({ where: { accountId: { in: accs } } });
    await prisma.voiceSession.deleteMany({ where: { id: { in: sids } } });
    await prisma.voiceQuotaAccount.deleteMany({ where: { id: { in: accs } } });
    await prisma.voiceDevice.deleteMany({ where: { productSku: { startsWith: prefix } } });
    await mockApp?.close();
    await unavailApp?.close();
    await prisma.$disconnect();
  });

  const as = (app: INestApplication, user?: string, roles?: string) => {
    const agent = request(app.getHttpServer());
    const wrap = (r: request.Test) => (user ? r.set("x-test-user", user).set("x-test-roles", roles || "USER") : r);
    return {
      get: (u: string) => wrap(agent.get(`/api/v1${u}`)),
      post: (u: string, body?: any) => wrap(agent.post(`/api/v1${u}`).send(body ?? {})),
    };
  };

  it("能力探测公开可查，且不暴露供应商名与运营说明", async () => {
    const r = await as(unavailApp).get("/voice/capabilities").expect(200);
    expect(r.body).toMatchObject({ available: false });
    expect(JSON.stringify(r.body)).not.toMatch(/opsNote|providerId|小智|xiaozhi|unavailable"/i);
  });

  it("未登录 401；缺请求号/非法场景/硬件场景走通用入口 400", async () => {
    await as(mockApp).post("/voice/sessions", { scene: "plaza", contextId: "xiaobu", clientRequestId: rid() }).expect(401);
    await as(mockApp, alice).post("/voice/sessions", { scene: "plaza", contextId: "xiaobu" }).expect(400);
    await as(mockApp, alice).post("/voice/sessions", { scene: "coze", clientRequestId: rid() }).expect(400);
    await as(mockApp, alice).post("/voice/sessions", { scene: "device", clientRequestId: rid() }).expect(400);
    await as(mockApp, alice).post("/voice/sessions", { scene: "report_dialogue", contextId: "r1", sectionId: "'; drop", clientRequestId: rid() }).expect(400);
  });

  it("暂未开放：201 + available=false，库里不留会话", async () => {
    const r = await as(unavailApp, alice).post("/voice/sessions", { scene: "plaza", contextId: "xiaobu", clientRequestId: rid() }).expect(201);
    expect(r.body).toMatchObject({ available: false });
    expect(r.body.userMessage).toMatch(/暂未开放/);
  });

  it("模拟供应商：开始 → 本人可查 → 他人 404 → 本人结束 → 回调结算；响应标注 isMock", async () => {
    const start = await as(mockApp, alice).post("/voice/sessions", { scene: "plaza", contextId: "xiaobu", clientRequestId: rid() }).expect(201);
    expect(start.body.session).toMatchObject({ status: "active", isMock: true, clientCredential: null });
    const id = start.body.session.id;

    await as(mockApp, alice).get(`/voice/sessions/${id}`).expect(200);
    await as(mockApp, bob).get(`/voice/sessions/${id}`).expect(404);
    await as(mockApp, bob).post(`/voice/sessions/${id}/end`, {}).expect(404);
    await as(mockApp, bob).post(`/voice/sessions/${id}/feedback`, { satisfaction: "satisfied" }).expect(404);
    const bobList = await as(mockApp, bob).get("/voice/sessions").expect(200);
    expect(bobList.body.total).toBe(0);

    // 通话中不能评价；挂断后可评价
    await as(mockApp, alice).post(`/voice/sessions/${id}/feedback`, { satisfaction: "satisfied" }).expect(400);
    const end = await as(mockApp, alice).post(`/voice/sessions/${id}/end`, { clientEstimatedSeconds: 30 }).expect(200);
    expect(end.body.session.status).toBe("ending");

    const row = await prisma.voiceSession.findUniqueOrThrow({ where: { id } });
    const cb = mock.buildCallback({ eventId: `${prefix}-cb1`, providerSessionId: row.providerSessionId!, usedSeconds: 42 });
    const hook = request(mockApp.getHttpServer()).post("/api/v1/voice/provider-callbacks/mock/usage").set(cb.headers).send(cb.rawBody.toString());
    const res = await hook.expect(200);
    expect(res.body.results[0].result).toBe("applied");
    // 同一回调重放
    const again = await request(mockApp.getHttpServer()).post("/api/v1/voice/provider-callbacks/mock/usage").set(cb.headers).send(cb.rawBody.toString()).expect(200);
    expect(again.body.results[0].result).toBe("duplicate");

    const fb = await as(mockApp, alice).post(`/voice/sessions/${id}/feedback`, { satisfaction: "unsatisfied" }).expect(200);
    expect(fb.body).toMatchObject({ status: "ended", userSatisfaction: "unsatisfied", usedSeconds: 42, usageState: "mock" });
  });

  it("回调：签名错 401；未启用的供应商 404；无需登录但不能伪造", async () => {
    await request(mockApp.getHttpServer()).post("/api/v1/voice/provider-callbacks/mock/usage").set("content-type", "application/json").send('{"mock":true,"eventId":"x","providerSessionId":"y"}').expect(401);
    await request(mockApp.getHttpServer()).post("/api/v1/voice/provider-callbacks/xiaozhi/usage").send("{}").expect(404);
    await request(unavailApp.getHttpServer()).post("/api/v1/voice/provider-callbacks/mock/usage").send("{}").expect(404);
  });

  it("设备：普通用户不能进后台；客服只读；运营可登记与停用", async () => {
    await as(mockApp, alice).get("/admin/xiaobu/devices").expect(403);
    await as(mockApp, bob, "CUSTOMER_SERVICE").get("/admin/xiaobu/devices").expect(200);
    await as(mockApp, bob, "CUSTOMER_SERVICE").post("/admin/xiaobu/devices", { serial: "SN123456", productSku: `${prefix}-sku` }).expect(403);
    await as(mockApp, bob, "FINANCE_ADMIN").post("/admin/xiaobu/devices", { serial: "SN123456", productSku: `${prefix}-sku` }).expect(403);

    const reg = await as(mockApp, "op", "OPERATION_ADMIN").post("/admin/xiaobu/devices", { serial: `SN${Date.now()}H`, productSku: `${prefix}-sku` }).expect(201);
    expect(JSON.stringify(reg.body)).not.toMatch(/serialHash|bindCodeHash/);
    const code = await as(mockApp, "op", "OPERATION_ADMIN").post(`/admin/xiaobu/devices/${reg.body.id}/bind-code`).expect(200);
    const bound = await as(mockApp, alice).post("/voice/devices/bind", { bindCode: code.body.bindCode }).expect(200);
    expect(bound.body).toMatchObject({ status: "bound", voiceReady: false, activationState: "pending_vendor" });

    // 不是自己的设备：看不到、解不了、转不了
    await as(mockApp, bob).get(`/voice/devices/${reg.body.id}/history`).expect(404);
    await as(mockApp, bob).post(`/voice/devices/${reg.body.id}/unbind`).expect(404);
    await as(mockApp, bob).post(`/voice/devices/${reg.body.id}/transfer`).expect(404);
    // 未激活：待开通
    const s = await as(mockApp, alice).post(`/voice/devices/${reg.body.id}/sessions`, { clientRequestId: rid() }).expect(201);
    expect(s.body).toMatchObject({ available: false });
    expect(s.body.userMessage).toMatch(/待开通/);

    const list = await as(mockApp, bob, "CUSTOMER_SERVICE").get(`/admin/xiaobu/devices?status=bound`).expect(200);
    const item = list.body.items.find((i: any) => i.id === reg.body.id);
    expect(item.currentUserMasked).toBe(`…${alice.slice(-6)}`);
    expect(JSON.stringify(list.body)).not.toContain(alice);
  });

  it("运营后台：客服能看会话与异常（脱敏），不能发放；财务不能发放；运营发放幂等", async () => {
    const sessions = await as(mockApp, "cs", "CUSTOMER_SERVICE").get("/admin/xiaobu/sessions?pageSize=50").expect(200);
    expect(JSON.stringify(sessions.body)).not.toContain(alice);
    await as(mockApp, "cs", "CUSTOMER_SERVICE").get("/admin/xiaobu/anomalies").expect(200);
    await as(mockApp, "cs", "CUSTOMER_SERVICE").get("/admin/xiaobu/usage").expect(403);
    const grant = { ownerType: "user", ownerId: alice, minutes: 5, reason: "测试补偿", requestId: `${prefix}-grant-1` };
    await as(mockApp, "cs", "CUSTOMER_SERVICE").post("/admin/xiaobu/quota/grant", grant).expect(403);
    await as(mockApp, "fin", "FINANCE_ADMIN").post("/admin/xiaobu/quota/grant", grant).expect(403);
    await as(mockApp, alice).get("/admin/xiaobu/provider").expect(403);
    const p = await as(mockApp, "op", "OPERATION_ADMIN").get("/admin/xiaobu/provider").expect(200);
    expect(p.body).toMatchObject({ providerId: "mock", isMock: true });
  });
});
