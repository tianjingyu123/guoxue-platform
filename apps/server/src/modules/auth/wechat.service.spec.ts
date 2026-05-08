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
});
