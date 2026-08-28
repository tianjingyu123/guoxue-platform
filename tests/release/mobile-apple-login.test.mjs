import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestSource = new URL("../../apps/mobile/src/manifest.json", import.meta.url);
const loginPageSource = new URL("../../apps/mobile/src/pkg-auth/login/index.vue", import.meta.url);
const authDataSource = new URL("../../apps/mobile/src/lib/auth-data.ts", import.meta.url);
const controllerSource = new URL(
  "../../apps/server/src/modules/auth/auth.controller.ts",
  import.meta.url,
);
const verifierSource = new URL(
  "../../apps/server/src/modules/auth/apple-login.service.ts",
  import.meta.url,
);

test("iOS 包启用 Apple OAuth 与 Sign in with Apple entitlement", async () => {
  const manifest = JSON.parse(await readFile(manifestSource, "utf8"));
  assert.deepEqual(manifest["app-plus"].distribute.sdkConfigs.oauth.apple, {});
  assert.deepEqual(
    manifest["app-plus"].distribute.ios.capabilities.entitlements[
      "com.apple.developer.applesignin"
    ],
    ["Default"],
  );
});

test("iOS 登录页同级展示 Apple 登录并把 identityToken 交给服务端", async () => {
  const [page, authData] = await Promise.all([
    readFile(loginPageSource, "utf8"),
    readFile(authDataSource, "utf8"),
  ]);
  assert.match(page, /通过 Apple 登录/);
  assert.match(page, /provider: 'apple'/);
  assert.match(page, /result\.appleInfo\?\.identityToken/);
  assert.match(page, /authApi\.appleLogin/);
  assert.match(authData, /apiPost<RawAuthData>\('\/auth\/login\/apple'/);
  assert.doesNotMatch(authData, /setStorageSync[\s\S]{0,80}identityToken/);
});

test("服务端校验 Apple 签名、issuer 与本应用 audience", async () => {
  const [controller, verifier] = await Promise.all([
    readFile(controllerSource, "utf8"),
    readFile(verifierSource, "utf8"),
  ]);
  assert.match(controller, /@Post\("login\/apple"\)/);
  assert.match(verifier, /https:\/\/appleid\.apple\.com\/auth\/keys/);
  assert.match(verifier, /issuer: APPLE_ISSUER/);
  assert.match(verifier, /audience: this\.audience/);
  assert.match(verifier, /algorithms: \["RS256"\]/);
  assert.doesNotMatch(verifier, /logger|console\./);
});
