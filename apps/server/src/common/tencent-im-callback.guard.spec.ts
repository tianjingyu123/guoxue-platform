import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { TencentImCallbackGuard } from "./tencent-im-callback.guard";

describe("TencentImCallbackGuard", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function context(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it("接受 SDKAppID、命令和 sha256(Token + RequestTime) 均匹配的回调", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      IM_APP_ID: "1400000000",
      IM_CALLBACK_TOKEN: "test-token",
    };
    const requestTime = String(Math.floor(Date.now() / 1000));
    const sign = createHash("sha256").update(`test-token${requestTime}`).digest("hex");
    const guard = new TencentImCallbackGuard();

    expect(guard.canActivate(context({
      body: { CallbackCommand: "State.StateChange" },
      headers: {},
      query: {
        SdkAppid: "1400000000",
        CallbackCommand: "State.StateChange",
        RequestTime: requestTime,
        Sign: sign,
      },
      method: "POST",
      url: "/im/callback",
    }))).toBe(true);
  });

  it("拒绝过期或被替换命令的回调", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      IM_APP_ID: "1400000000",
      IM_CALLBACK_TOKEN: "test-token",
    };
    const requestTime = String(Math.floor(Date.now() / 1000) - 61);
    const sign = createHash("sha256").update(`test-token${requestTime}`).digest("hex");
    const guard = new TencentImCallbackGuard();

    expect(() => guard.canActivate(context({
      body: { CallbackCommand: "C2C.CallbackAfterSendMsg" },
      headers: {},
      query: {
        SdkAppid: "1400000000",
        CallbackCommand: "State.StateChange",
        RequestTime: requestTime,
        Sign: sign,
      },
      method: "POST",
      url: "/im/callback",
    }))).toThrow(UnauthorizedException);
  });

  it("生产环境缺少 Token 时保持安全失败", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", IM_APP_ID: "1400000000" };
    delete process.env.IM_CALLBACK_TOKEN;
    const guard = new TencentImCallbackGuard();

    expect(() => guard.canActivate(context({ body: {}, query: {}, method: "POST", url: "/im/callback" })))
      .toThrow(UnauthorizedException);
  });

  it("Guard 已创建后热同步 IM Token 仍立即生效", () => {
    process.env = { ...originalEnv, NODE_ENV: "production" };
    delete process.env.IM_CALLBACK_TOKEN;
    delete process.env.IM_APP_ID;
    const guard = new TencentImCallbackGuard();
    process.env.IM_APP_ID = "1400000000";
    process.env.IM_CALLBACK_TOKEN = "hot-token";
    const requestTime = String(Math.floor(Date.now() / 1000));
    const sign = createHash("sha256").update(`hot-token${requestTime}`).digest("hex");

    expect(guard.canActivate(context({
      body: { CallbackCommand: "State.StateChange" },
      headers: {},
      query: {
        SdkAppid: "1400000000",
        CallbackCommand: "State.StateChange",
        RequestTime: requestTime,
        Sign: sign,
      },
      method: "POST",
      url: "/im/callback",
    }))).toBe(true);
  });

  it("接受腾讯云控制台仅在查询参数携带命令的 URL 校验请求", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      IM_APP_ID: "1400000000",
      IM_CALLBACK_TOKEN: "test-token",
    };
    const requestTime = String(Math.floor(Date.now() / 1000));
    const sign = createHash("sha256").update(`test-token${requestTime}`).digest("hex");
    const guard = new TencentImCallbackGuard();

    expect(guard.canActivate(context({
      body: {},
      headers: {},
      query: {
        SdkAppid: "1400000000",
        CallbackCommand: "State.StateChange",
        RequestTime: requestTime,
        Sign: sign,
      },
      method: "POST",
      url: "/im/callback",
    }))).toBe(true);
  });

  it("拒绝请求体与查询参数命令不一致的正式回调", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      IM_APP_ID: "1400000000",
      IM_CALLBACK_TOKEN: "test-token",
    };
    const requestTime = String(Math.floor(Date.now() / 1000));
    const sign = createHash("sha256").update(`test-token${requestTime}`).digest("hex");
    const guard = new TencentImCallbackGuard();

    expect(() => guard.canActivate(context({
      body: { CallbackCommand: "C2C.CallbackAfterSendMsg" },
      headers: {},
      query: {
        SdkAppid: "1400000000",
        CallbackCommand: "State.StateChange",
        RequestTime: requestTime,
        Sign: sign,
      },
      method: "POST",
      url: "/im/callback",
    }))).toThrow(UnauthorizedException);
  });
});
