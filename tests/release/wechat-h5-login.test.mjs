import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const loginPage = read("apps/mobile/src/pkg-auth/login/index.vue");
const authData = read("apps/mobile/src/lib/auth-data.ts");
const wechatService = read("apps/server/src/modules/auth/wechat.service.ts");
const authController = read("apps/server/src/modules/auth/auth.controller.ts");
const manifest = JSON.parse(read("apps/mobile/src/manifest.json"));
const thirdPartyServices = read("apps/server/src/config/third-party-services.ts");
const authService = read("apps/server/src/modules/auth/auth.service.ts");
const remoteConfig = read("apps/mobile/src/lib/remote-config.ts");

test("H5 与小程序公开微信登录入口，App 入口由运行时开关放行", () => {
  assert.match(loginPage, /v-if="showWechatLogin"/u);
  assert.match(loginPage, /#ifdef H5[\s\S]*showWechatLogin\.value = true/u);
  assert.match(loginPage, /#ifdef MP-WEIXIN[\s\S]*showWechatLogin\.value = true/u);
  assert.match(loginPage, /client_wechat_app_login/u);
  assert.match(remoteConfig, /client_wechat_app_login:\s*false/u);
  assert.match(loginPage, /<text class="third-label">微信登录<\/text>/u);
  assert.match(loginPage, /await startH5WechatLogin\(\)/u);
  assert.match(loginPage, /provider:\s*'weixin'/u);
});

test("小程序手机号快捷登录只在用户同意条款并主动授权后执行", () => {
  assert.match(loginPage, /#ifdef MP-WEIXIN[\s\S]*:open-type="agreedTerms \? 'getPhoneNumber' : ''"/u);
  assert.match(loginPage, /@getphonenumber="handleMiniPhoneLogin"/u);
  assert.match(loginPage, /if \(!agreedTerms\.value\)[\s\S]*请先阅读并同意用户协议和隐私政策/u);
  assert.match(loginPage, /const wxCode = await requestWechatLoginCode\(\)/u);
  assert.match(loginPage, /authApi\.miniPhoneLogin\([\s\S]*wxCode,[\s\S]*phoneCode/u);
  assert.match(authData, /\/auth\/login\/mini-phone/u);
  assert.match(authData, /clientKey:\s*getWechatClientKey\(\)/u);
  assert.match(authData, /referrerCode:\s*getTempReferrer\(\)/u);
  const buttonStart = loginPage.indexOf('<button\n          class="mini-phone-login-btn"');
  const buttonEnd = loginPage.indexOf('<!-- #endif -->', buttonStart);
  assert.ok(buttonStart >= 0 && buttonEnd > buttonStart);
  assert.match(loginPage.slice(buttonStart, buttonEnd), /:open-type="agreedTerms \? 'getPhoneNumber' : ''"/u);
});

test("H5 微信 OAuth 使用一次性 state、十分钟时限并在换码前清理地址栏", () => {
  assert.match(loginPage, /WECHAT_OAUTH_MAX_AGE_MS\s*=\s*10 \* 60 \* 1000/u);
  assert.match(loginPage, /crypto\?\.getRandomValues/u);
  assert.match(loginPage, /attempt\.state === receivedState/u);
  assert.match(loginPage, /clearWechatCallbackParams\(\)[\s\S]*authApi\.wechatLogin\(oauthCode, 'h5', \{ createIfMissing: !paipanEntry\.value \}\)/u);
  assert.match(loginPage, /searchParams\.delete\('code'\)/u);
  assert.match(loginPage, /sessionStorage\.removeItem\(WECHAT_OAUTH_ATTEMPT_KEY\)/u);
});

test("H5 非微信浏览器不发起公众号 OAuth，且第三方登录同样要求同意协议", () => {
  assert.match(loginPage, /MicroMessenger/u);
  assert.match(loginPage, /请在微信内打开本页后使用微信登录/u);
  assert.match(loginPage, /if \(!agreedTerms\.value\)[\s\S]*请先阅读并同意用户协议和隐私政策/u);
});

test("OAuth URL 由服务端生成，客户端不持有 AppSecret", () => {
  assert.match(authData, /\/auth\/wechat\/oauth-url/u);
  assert.match(authData, /redirectUri=\$\{encodeURIComponent\(redirectUri\)\}/u);
  assert.doesNotMatch(authData, /APP_SECRET|appSecret/u);
  assert.match(authController, /@Query\("state"\) state\?: string/u);
});

test("App 微信登录开关在服务端强制执行，关闭时不解析凭据", () => {
  const gateIndex = authService.indexOf("await this.assertWechatAppLoginEnabled(loginType)");
  const resolveIndex = authService.indexOf("this.wechat.resolveLoginClient(loginType");

  assert.match(authService, /WECHAT_APP_LOGIN_FEATURE\s*=\s*"client_wechat_app_login"/u);
  assert.match(authService, /loginType !== "app"/u);
  assert.match(authService, /ErrorCode\.NOT_FOUND/u);
  assert.ok(gateIndex >= 0 && resolveIndex > gateIndex);
});

test("APP 与 Harmony 微信登录模块已启用，且客户端不嵌入 AppSecret", () => {
  const appPlus = manifest["app-plus"];
  const weixinOAuth = appPlus?.distribute?.sdkConfigs?.oauth?.weixin;
  const harmonyOAuth = manifest["app-harmony"]?.distribute?.modules?.["uni-oauth"]?.weixin;

  assert.deepEqual(appPlus?.modules?.OAuth, {});
  assert.match(weixinOAuth?.appid || "", /^wx[0-9a-f]+$/u);
  assert.equal(weixinOAuth?.UniversalLinks, "https://api.rebugx.cn/h5/");
  assert.equal("appsecret" in (weixinOAuth || {}), false);
  assert.equal(harmonyOAuth?.appid, weixinOAuth?.appid);
});

test("后台开放平台卡片写入 APP 登录实际读取的独立变量", () => {
  const start = thirdPartyServices.indexOf('key: "wechat_open"');
  const end = thirdPartyServices.indexOf("\n  },", start);
  const wechatOpenSection = thirdPartyServices.slice(start, end);

  assert.match(thirdPartyServices, /WECHAT_OPEN_APP_ID/u);
  assert.match(thirdPartyServices, /WECHAT_OPEN_APP_SECRET/u);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(wechatOpenSection, /"WECHAT_APP_ID"/u);
});

test("服务端限制回调域名、HTTPS、scope 与 state", () => {
  assert.match(wechatService, /PUBLIC_H5_URL/u);
  assert.match(wechatService, /PUBLIC_API_URL/u);
  assert.match(wechatService, /allowedOrigins\.has\(parsed\.origin\)/u);
  assert.match(wechatService, /回调地址必须使用 HTTPS/u);
  assert.match(wechatService, /不支持的微信授权范围/u);
  assert.match(wechatService, /\^\[A-Za-z0-9_\.:-\]\{1,128\}\$/u);
});
