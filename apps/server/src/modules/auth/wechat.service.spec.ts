import { Test } from "@nestjs/testing";
import { WechatService } from "./wechat.service";

describe("WechatService", () => {
  let svc: WechatService;

  beforeAll(async () => {
    process.env.WECHAT_APP_ID = "wx-test-app-id";
    process.env.WECHAT_APP_SECRET = "test-secret";

    const mod = await Test.createTestingModule({
      providers: [WechatService],
    }).compile();
    svc = mod.get(WechatService);
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
});
