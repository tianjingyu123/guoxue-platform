import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recoverySource = new URL(
  "../../apps/mobile/src/lib/ios-startup-recovery.ts",
  import.meta.url,
);
const appSource = new URL("../../apps/mobile/src/App.vue", import.meta.url);
const updateSource = new URL("../../apps/mobile/src/lib/app-update.ts", import.meta.url);
const manifestSource = new URL("../../apps/mobile/src/manifest.json", import.meta.url);

test("iOS 启动恢复编译进 APP-PLUS，首页或空栈恢复，其他业务页保持不动", async () => {
  const source = await readFile(recoverySource, "utf8");
  assert.match(source, /#ifdef APP-PLUS/);
  assert.match(source, /platform !== "ios"/);
  assert.match(source, /appVersionCode/);
  assert.match(source, /shouldRecoverIosStartupRoute/);
  assert.match(source, /getCurrentPages\(\)\.map/);
  assert.match(source, /normalized\.length === 0/);
  assert.match(source, /normalized\[normalized\.length - 1\] === HOME_ROUTE_KEY/);
  assert.match(source, /if \(!shouldRecoverIosStartupRoute\(routes\)\)/);
  assert.match(source, /uni\.reLaunch\(\{/);
  assert.match(source, /url: HOME_ROUTE/);
  assert.match(source, /success:[\s\S]*setStorageSync\(IOS_STARTUP_RECOVERY_KEY, buildNumber\)/);
  assert.match(source, /attempts < 2/);
  assert.match(source, /RECOVERY_COOLDOWN_MS/);
  assert.match(source, /recoveryInFlight/);
  assert.doesNotMatch(source, /clearStorage|clearAuthSession|removeStorageSync/);
});

test("App 冷启动和回到前台都接入 iOS 页面栈恢复", async () => {
  const source = await readFile(appSource, "utf8");
  assert.match(source, /import \{ repairIosStartupRoute \}/);
  assert.match(source, /onLaunch\([\s\S]*repairIosStartupRoute\(\)/);
  assert.match(source, /onShow\([\s\S]*repairIosStartupRoute\(\)/);
});

test("启动更新检查不依赖 URLSearchParams，且 220 版本号已冻结", async () => {
  const [update, manifestRaw] = await Promise.all([
    readFile(updateSource, "utf8"),
    readFile(manifestSource, "utf8"),
  ]);
  assert.doesNotMatch(update, /new URLSearchParams/);
  assert.match(update, /encodeURIComponent\(platform\)/);
  assert.match(update, /encodeURIComponent\(version\)/);
  assert.equal(JSON.parse(manifestRaw).versionCode, "220");
});
