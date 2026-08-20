import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import { TrtcCallbackGuard } from "./trtc-callback.guard";

describe("TrtcCallbackGuard", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function context(raw: string, body: Record<string, unknown>, headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          rawBody: Buffer.from(raw, "utf8"), body, headers, method: "POST", url: "/live/trtc/callback",
        }),
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
});
