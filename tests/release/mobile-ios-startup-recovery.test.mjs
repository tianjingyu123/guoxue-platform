import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recoverySource = new URL(
  "../../apps/mobile/src/lib/ios-startup-recovery.ts",
  import.meta.url,
);
const appSource = new URL("../../apps/mobile/src/App.vue", import.meta.url);
const homeSource = new URL("../../apps/mobile/src/pages/index/index.vue", import.meta.url);
const updateSource = new URL("../../apps/mobile/src/lib/app-update.ts", import.meta.url);
const manifestSource = new URL("../../apps/mobile/src/manifest.json", import.meta.url);

test("iOS 冷启动恢复编译进 APP-PLUS，同一进程只执行一次且不形成首页循环", async () => {
  const source = await readFile(recoverySource, "utf8");
  assert.match(source, /#ifdef APP-PLUS/);
  assert.match(source, /platform !== "ios"/);
  assert.match(source, /appVersionCode/);
  assert.match(source, /shouldRecoverIosStartupRoute/);
  assert.match(source, /markIosStartupHomeReady/);
  assert.match(source, /startupHomeReady = true/);
  assert.match(source, /if \(pendingRecovery\) clearTimeout\(pendingRecovery\)/);
  assert.match(source, /getCurrentPages\(\)\.map/);
  assert.match(source, /normalized\.length === 0/);
  assert.match(source, /normalized\[normalized\.length - 1\] === HOME_ROUTE_KEY/);
  assert.match(source, /if \(homeReady\) return false/);
  assert.match(source, /if \(!shouldRecoverIosStartupRoute\(routes, startupHomeReady\)\)/);
  assert.match(source, /uni\.reLaunch\(\{/);
  assert.match(source, /url: HOME_ROUTE/);
  assert.match(source, /success:[\s\S]*setStorageSync\(IOS_STARTUP_RECOVERY_KEY, buildNumber\)/);
  assert.match(source, /attempts < 2/);
  assert.match(source, /startupRecoveryStarted/);
  assert.match(source, /if \(startupRecoveryStarted\) return/);
  assert.match(source, /recoveryInFlight/);
  assert.doesNotMatch(source, /RECOVERY_COOLDOWN_MS|lastRecoveryAt/);
  assert.doesNotMatch(source, /clearStorage|clearAuthSession|removeStorageSync/);
});

test("App 仅在冷启动接入 iOS 页面栈恢复，回到前台不得再次重建首页", async () => {
  const source = await readFile(appSource, "utf8");
  assert.match(source, /import \{ repairIosStartupRoute \}/);
  assert.match(source, /onLaunch\([\s\S]*repairIosStartupRoute\(\)/);
  const onShowBlock = source.slice(source.indexOf("onShow("), source.indexOf("onHide("));
  assert.doesNotMatch(onShowBlock, /repairIosStartupRoute\(\)/);
  assert.equal(source.match(/repairIosStartupRoute\(\)/g)?.length, 1);
});

test("首页真实挂载后立即取消 iOS 启动恢复，禁止正常首页闪现后再次重建", async () => {
  const source = await readFile(homeSource, "utf8");
  assert.match(source, /#ifdef APP-PLUS[\s\S]*import \{ markIosStartupHomeReady \}/);
  assert.match(source, /import \{ markIosStartupHomeReady \}/);
  assert.match(source, /onMounted\(\(\) => \{[\s\S]*#ifdef APP-PLUS[\s\S]*markIosStartupHomeReady\(\);[\s\S]*#endif[\s\S]*init\(\);/);
});

test("启动更新检查不依赖 URLSearchParams，且 223 版本号已冻结", async () => {
  const [update, manifestRaw] = await Promise.all([
    readFile(updateSource, "utf8"),
    readFile(manifestSource, "utf8"),
  ]);
  assert.doesNotMatch(update, /new URLSearchParams/);
  assert.match(update, /encodeURIComponent\(platform\)/);
  assert.match(update, /encodeURIComponent\(version\)/);
  assert.equal(JSON.parse(manifestRaw).versionCode, "223");
});
