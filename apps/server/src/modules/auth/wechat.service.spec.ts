import { Test } from "@nestjs/testing";
import { WechatService } from "./wechat.service";

describe("WechatService", () => {
  let svc: WechatService;

  beforeAll(async () => {
    process.env.WECHAT_APP_ID = "wx-test-app-id";
    process.env.WECHAT_APP_SECRET = "test-secret";
    process.env.PUBLIC_H5_URL = "https://example.com/h5/";

    const mod = await Test.createTestingModule({
      providers: [WechatService],
    }).compile();
    svc = mod.get(WechatService);
  });

  afterEach(() => {
    delete process.env.WECHAT_LOGIN_CLIENTS_JSON;
    delete process.env.WECHAT_OPEN_PLATFORM_ID;
  });

  afterAll(() => {
    delete process.env.PUBLIC_H5_URL;
  });

  it("生成 OAuth URL（snsapi_userinfo）", () => {
    const url = svc.buildOAuthUrl("https://example.com/callback");
    expect(url).toContain("https://open.weixin.qq.com/connect/oauth2/authorize");
    expect(url).toContain("appid=wx-test-app-id");
    expect(url).toContain("scope=snsapi_userinfo");
    expect(url).toContain("#wechat_redirect");
  });

  it("生成 OAuth URL（snsapi_base）", () => {
    const url = svc.buildOAuthUrl("https://example.com/callback", "snsapi_base");
    expect(url).toContain("scope=snsapi_base");
  });

  it("redirect_uri 正确编码特殊字符", () => {
    const url = svc.buildOAuthUrl("https://example.com/callback?a=1&b=2");
    expect(url).not.toContain("callback?a=1"); // 应该被编码
  });

  it("携带前端一次性 state", () => {
    const url = svc.buildOAuthUrl("https://example.com/h5/pkg-auth/login/index", "snsapi_userinfo", undefined, "secure_state-123");
    expect(url).toContain("state=secure_state-123");
  });

  it("拒绝跳转到非本系统域名", () => {
    expect(() => svc.buildOAuthUrl("https://evil.example/callback")).toThrow("不在允许范围内");
  });

  it("拒绝不安全的 state", () => {
    expect(() => svc.buildOAuthUrl("https://example.com/callback", "snsapi_userinfo", undefined, "bad state&next=evil")).toThrow("state 无效");
  });

  it("小程序凭据在后台热更新后立即生效", async () => {
    const originalFetch = global.fetch;
    process.env.MINIPROGRAM_APP_ID = "wx-hot-mini";
    process.env.MINIPROGRAM_APP_SECRET = "hot-secret";
    const fetchMock = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        openid: "openid",
        session_key: "session-key",
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    try {
      await expect(svc.exchangeMiniCode("login-code")).resolves.toEqual({
        openId: "openid",
        sessionKey: "session-key",
      });
      expect(fetchMock.mock.calls[0][0]).toContain("appid=wx-hot-mini&secret=hot-secret");
    } finally {
      delete process.env.MINIPROGRAM_APP_ID;
      delete process.env.MINIPROGRAM_APP_SECRET;
      global.fetch = originalFetch;
    }
  });

  it("多小程序按 clientKey 选取凭据，并共享开放平台命名空间", () => {
    process.env.WECHAT_LOGIN_CLIENTS_JSON = JSON.stringify({
      miniA: { type: "miniprogram", appId: "wx-a", appSecret: "secret-a", openPlatformId: "rebu" },
      miniB: { type: "miniprogram", appId: "wx-b", appSecret: "secret-b", openPlatformId: "rebu" },
    });
    const a = svc.resolveLoginClient("miniprogram", "miniA");
    const b = svc.resolveLoginClient("miniprogram", "wx-b");
    expect(a.appId).toBe("wx-a");
    expect(b.clientKey).toBe("miniB");
    expect(a.unionNamespace).toBe("wechat-open:rebu");
    expect(b.unionNamespace).toBe(a.unionNamespace);
  });

  it("未配置开放平台时按 AppID 隔离 UnionID 命名空间", () => {
    process.env.WECHAT_LOGIN_CLIENTS_JSON = JSON.stringify({
      miniA: { type: "miniprogram", appId: "wx-a", appSecret: "secret-a" },
      miniB: { type: "miniprogram", appId: "wx-b", appSecret: "secret-b" },
    });
    const a = svc.resolveLoginClient("miniprogram", "miniA");
    const b = svc.resolveLoginClient("miniprogram", "miniB");
    expect(a.unionNamespace).toBe("wechat-open:isolated:wx-a");
    expect(b.unionNamespace).toBe("wechat-open:isolated:wx-b");
    expect(a.unionNamespace).not.toBe(b.unionNamespace);
  });

  it("多个同类型应用未指定 clientKey 时拒绝猜测", () => {
    process.env.WECHAT_LOGIN_CLIENTS_JSON = JSON.stringify({
      miniA: { type: "miniprogram", appId: "wx-a", appSecret: "secret-a" },
      miniB: { type: "miniprogram", appId: "wx-b", appSecret: "secret-b" },
    });
    expect(() => svc.resolveLoginClient("miniprogram")).toThrow("请提供 clientKey");
  });
});
