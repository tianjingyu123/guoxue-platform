import { ExecutionContext, Logger, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac } from "crypto";
import { TrtcCallbackGuard, getVerifiedTrtcCallback } from "./trtc-callback.guard";

describe("TrtcCallbackGuard", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function context(raw: string, body: Record<string, unknown>, headers: Record<string, unknown>): ExecutionContext {
    const req = { rawBody: Buffer.from(raw, "utf8"), body, headers, method: "POST", url: "/live/trtc/callback?secret=SYNTHETIC_PRIVATE" };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  it("按原始请求体 HMAC-SHA256 验证 TRTC 回调", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      TRTC_SDK_APP_ID: "1600030106",
      TRTC_CALLBACK_KEY: "callbackKey123",
    };
    const body = { EventType: 201, CallbackTs: Date.now(), EventInfo: { RoomId: "room_1" } };
    const raw = JSON.stringify(body, null, 2);
    const sign = createHmac("sha256", "callbackKey123").update(raw).digest("base64");

    expect(new TrtcCallbackGuard().canActivate(context(raw, body, { sign, sdkappid: "1600030106" }))).toBe(true);
  });

  it("拒绝把解析后的 JSON 重新序列化所得签名当作原文签名", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      TRTC_SDK_APP_ID: "1600030106",
      TRTC_CALLBACK_KEY: "callbackKey123",
    };
    const body = { EventType: 201, CallbackTs: Date.now(), EventInfo: { RoomId: "room_1" } };
    const raw = JSON.stringify(body, null, 2);
    const wrong = createHmac("sha256", "callbackKey123").update(JSON.stringify(body)).digest("base64");

    expect(() => new TrtcCallbackGuard().canActivate(context(raw, body, { sign: wrong, sdkappid: "1600030106" })))
      .toThrow(UnauthorizedException);
  });

  it("拒绝错误 SDKAppID 和超过时钟窗口的重放", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      TRTC_SDK_APP_ID: "1600030106",
      TENCENT_CALLBACK_KEY: "sharedKey123",
    };
    const body = { EventType: 201, CallbackTs: Date.now() - 10 * 60 * 1000, EventInfo: { RoomId: "room_1" } };
    const raw = JSON.stringify(body);
    const sign = createHmac("sha256", "sharedKey123").update(raw).digest("base64");

    expect(() => new TrtcCallbackGuard().canActivate(context(raw, body, { sign, sdkappid: "999" })))
      .toThrow(UnauthorizedException);
  });

  it("生产环境缺密钥时安全失败", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", TRTC_SDK_APP_ID: "1600030106" };
    delete process.env.TRTC_CALLBACK_KEY;
    delete process.env.TENCENT_CALLBACK_KEY;
    const body = { EventType: 201, CallbackTs: Date.now() };
    const raw = JSON.stringify(body);

    expect(() => new TrtcCallbackGuard().canActivate(context(raw, body, { sign: "x", sdkappid: "1600030106" })))
      .toThrow(UnauthorizedException);
  });
  const setup = () => { process.env = { ...originalEnv, NODE_ENV: "test", TRTC_SDK_APP_ID: "1600030106", TRTC_CALLBACK_KEY: "SYNTHETIC_KEY" }; };
  const signRaw = (raw: string) => createHmac("sha256", "SYNTHETIC_KEY").update(raw).digest("base64");
  it("独立咨询应用仅接受自己的回调密钥，公共直播仍可验签", () => {
    setup();
    process.env.CONSULT_TRTC_SDK_APP_ID = "1600068061";
    process.env.CONSULT_TRTC_CALLBACK_KEY = "SYNTHETIC_CONSULT_KEY";
    const raw = JSON.stringify({ CallbackTs: Date.now() });
    const sign = createHmac("sha256", "SYNTHETIC_CONSULT_KEY").update(raw).digest("base64");
    const ctx = context(raw, {}, { sign, sdkappid: "1600068061" });
    expect(new TrtcCallbackGuard().canActivate(ctx)).toBe(true);
    expect(getVerifiedTrtcCallback(ctx.switchToHttp().getRequest()).sdkAppId).toBe(1600068061);
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, {}, { sign: signRaw(raw), sdkappid: "1600068061" }))).toThrow(UnauthorizedException);
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, {}, { sign, sdkappid: "1600030106" }))).toThrow(UnauthorizedException);
    expect(new TrtcCallbackGuard().canActivate(context(raw, {}, { sign: signRaw(raw), sdkappid: "1600030106" }))).toBe(true);
  });
  it.each(["", "SYNTHETIC_KEY"])("咨询回调密钥缺失或复用时不回退公共密钥：%s", key => {
    setup(); process.env.CONSULT_TRTC_SDK_APP_ID = "1600068061"; process.env.CONSULT_TRTC_CALLBACK_KEY = key;
    const raw = JSON.stringify({ CallbackTs: Date.now() });
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, {}, { sign: signRaw(raw), sdkappid: "1600068061" }))).toThrow(UnauthorizedException);
  });
  it("非生产也必须验签，缺密钥不能构成可信媒体证据", () => {
    setup(); delete process.env.TRTC_CALLBACK_KEY; delete process.env.TENCENT_CALLBACK_KEY;
    expect(() => new TrtcCallbackGuard().canActivate(context("{}", {}, {}))).toThrow(UnauthorizedException);
  });
  it("时间窗只使用已签名原文，不接受解析对象篡改后的新时间", () => {
    setup(); const raw = JSON.stringify({ CallbackTs: Date.now() - 600000 });
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, { CallbackTs: Date.now() }, { sign: signRaw(raw), sdkappid: "1600030106" }))).toThrow(UnauthorizedException);
  });
  it("可信快照绑定原文摘要与应用，业务解析对象及返回快照变化不污染原证据", () => {
    setup(); const body = { CallbackTs: Date.now(), EventInfo: { RoomId: "consult_0123456789abcdef" } }, raw = JSON.stringify(body);
    const ctx = context(raw, { ...body, EventInfo: { RoomId: "forged" } }, { sign: signRaw(raw), sdkappid: "1600030106" });
    const req = ctx.switchToHttp().getRequest(); new TrtcCallbackGuard().canActivate(ctx);
    const verified = getVerifiedTrtcCallback(req);
    expect(verified).toMatchObject({ sdkAppId: 1600030106, bodyDigest: createHash("sha256").update(raw).digest("hex"), body });
    (verified.body.EventInfo as Record<string, unknown>).RoomId = "changed";
    expect(getVerifiedTrtcCallback(req).body).toEqual(body);
  });
  it("请求对象的伪造属性不能替代守卫记录，重新验证失败清除旧证明", () => {
    setup(); expect(() => getVerifiedTrtcCallback({ verifiedTrtcCallback: { sdkAppId: 1 } })).toThrow(UnauthorizedException);
    const raw = JSON.stringify({ CallbackTs: Date.now() }), ctx = context(raw, {}, { sign: signRaw(raw), sdkappid: "1600030106" });
    new TrtcCallbackGuard().canActivate(ctx);
    const req = ctx.switchToHttp().getRequest(); req.headers.sign = "bad";
    expect(() => new TrtcCallbackGuard().canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => getVerifiedTrtcCallback(req)).toThrow(UnauthorizedException);
  });
  it.each([null, [], "text", { CallbackTs: "123" }, { CallbackTs: 1.5 }])("非规范原始事件拒绝 %#", body => {
    setup(); const raw = JSON.stringify(body);
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, { CallbackTs: Date.now() }, { sign: signRaw(raw), sdkappid: "1600030106" }))).toThrow(UnauthorizedException);
  });
  it.each(["sign", "sdkappid"])("重复%s头拒绝且日志不回显请求URL", field => {
    setup(); const raw = JSON.stringify({ CallbackTs: Date.now() }), headers: Record<string, unknown> = { sign: signRaw(raw), sdkappid: "1600030106" };
    headers[field] = [headers[field], headers[field]];
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    expect(() => new TrtcCallbackGuard().canActivate(context(raw, {}, headers))).toThrow(UnauthorizedException);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SYNTHETIC_PRIVATE");
  });
});
