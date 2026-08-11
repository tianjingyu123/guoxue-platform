import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { TencentCallbackGuard } from "./tencent-callback.guard";

describe("TencentCallbackGuard", () => {
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

  it("接受腾讯云直播放在 JSON 包体中的 sign/t", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", TENCENT_CALLBACK_KEY: "testKey123" };
    const t = String(Math.floor(Date.now() / 1000) + 600);
    const sign = createHash("md5").update(`testKey123${t}`).digest("hex");
    const guard = new TencentCallbackGuard();

    expect(
      guard.canActivate(
        context({ body: { event_type: 1, t, sign }, headers: {}, query: {}, method: "POST", url: "/live/callback" }),
      ),
    ).toBe(true);
  });

  it("拒绝已过期的直播回调，防止重放", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", TENCENT_CALLBACK_KEY: "testKey123" };
    const t = String(Math.floor(Date.now() / 1000) - 1);
    const sign = createHash("md5").update(`testKey123${t}`).digest("hex");
    const guard = new TencentCallbackGuard();

    expect(() =>
      guard.canActivate(
        context({ body: { t, sign }, headers: {}, query: {}, method: "POST", url: "/live/callback" }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("接受云点播放在 JSON 包体中的大写 Sign/T", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", TENCENT_CALLBACK_KEY: "testKey123" };
    const T = String(Math.floor(Date.now() / 1000) + 600);
    const Sign = createHash("md5").update(`testKey123${T}`).digest("hex");
    const guard = new TencentCallbackGuard();

    expect(
      guard.canActivate(
        context({ body: { EventType: "ProcedureStateChanged", T, Sign }, headers: {}, query: {}, method: "POST", url: "/videos/vod/callback" }),
      ),
    ).toBe(true);
  });

  it("生产环境未配置回调密钥时保持安全失败", () => {
    process.env = { ...originalEnv, NODE_ENV: "production" };
    delete process.env.TENCENT_CALLBACK_KEY;
    const guard = new TencentCallbackGuard();

    expect(() =>
      guard.canActivate(
        context({ body: {}, headers: {}, query: {}, method: "POST", url: "/live/callback" }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
