import { Controller, INestApplication, Post, Req, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHmac } from "crypto";
import { Request } from "express";
import request from "supertest";
import { getVerifiedTrtcCallback, TrtcCallbackGuard } from "../src/common/trtc-callback.guard";

@Controller("trtc-evidence-test")
class EvidenceController {
  @Post()
  @UseGuards(TrtcCallbackGuard)
  accept(@Req() req: Request) {
    const verified = getVerifiedTrtcCallback(req);
    return { sdkAppId: verified.sdkAppId, body: verified.body };
  }
}

describe("TRTC 原始报文真实HTTP传输（仅本机合成密钥）", () => {
  let app: INestApplication;
  const originalEnv = process.env;
  const secret = "SYNTHETIC_LOCAL_CALLBACK_KEY";
  const body = () => ({ EventGroupId: 1, EventType: 104, CallbackTs: Date.now(), EventInfo: {
    RoomId: "consult_0123456789abcdef", UserId: `c_${"a".repeat(30)}`, EventMsTs: Date.now(), Reason: 3 } });
  const sign = (raw: string) => createHmac("sha256", secret).update(raw).digest("base64");
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [EvidenceController], providers: [TrtcCallbackGuard] }).compile();
    app = module.createNestApplication({ rawBody: true, logger: false });
    await app.listen(0, "127.0.0.1");
  });
  beforeEach(() => { process.env = { ...originalEnv, NODE_ENV: "test", TRTC_SDK_APP_ID: "1600030106", TRTC_CALLBACK_KEY: secret }; });
  afterEach(() => { process.env = originalEnv; });
  afterAll(async () => { if (app) await app.close(); });
  it("真实Express解析后仍以原始字节验签，兼容无UniqueId的新策略", async () => {
    const event = body(), raw = JSON.stringify(event, null, 2);
    const result = await request(app.getHttpServer()).post("/trtc-evidence-test").set("Content-Type", "application/json")
      .set("SdkAppId", "1600030106").set("Sign", sign(raw)).send(raw).expect(201);
    expect(result.body).toEqual({ sdkAppId: 1600030106, body: event });
    expect(result.body.body.EventInfo).not.toHaveProperty("UniqueId");
  });
  it.each(["MISSING_SIGN", "TAMPERED_BODY", "OTHER_APP", "STALE_CALLBACK"])("真实HTTP拒绝 %s", async mode => {
    const event = body(); if (mode === "STALE_CALLBACK") event.CallbackTs -= 600000;
    const raw = JSON.stringify(event), sent = mode === "TAMPERED_BODY" ? raw.replace('"Reason":3', '"Reason":1') : raw;
    const req = request(app.getHttpServer()).post("/trtc-evidence-test").set("Content-Type", "application/json")
      .set("SdkAppId", mode === "OTHER_APP" ? "1600030107" : "1600030106");
    if (mode !== "MISSING_SIGN") req.set("Sign", sign(raw));
    await req.send(sent).expect(401);
  });
  it("真实非生产HTTP缺密钥仍拒绝，不写入可信标记", async () => {
    delete process.env.TRTC_CALLBACK_KEY; delete process.env.TENCENT_CALLBACK_KEY;
    const raw = JSON.stringify(body());
    await request(app.getHttpServer()).post("/trtc-evidence-test").set("Content-Type", "application/json")
      .set("SdkAppId", "1600030106").set("Sign", sign(raw)).send(raw).expect(401);
  });
});
