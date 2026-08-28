import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = new URL("../../apps/mobile/src/App.vue", import.meta.url);
const homeSource = new URL("../../apps/mobile/src/pages/index/index.vue", import.meta.url);
const routerSource = new URL("../../apps/mobile/src/utils/router.ts", import.meta.url);
const bottomNavSource = new URL(
  "../../apps/mobile/src/components/bottom-nav/bottom-nav.vue",
  import.meta.url,
);
const updateSource = new URL("../../apps/mobile/src/lib/app-update.ts", import.meta.url);
const manifestSource = new URL("../../apps/mobile/src/manifest.json", import.meta.url);

test("自定义底部主导航只替换当前页，不再重建整个页面栈", async () => {
  const [router, bottomNav] = await Promise.all([
    readFile(routerSource, "utf8"),
    readFile(bottomNavSource, "utf8"),
  ]);
  assert.match(router, /if \(MAIN_TABS\.includes\(path\)\) \{ uni\.redirectTo/);
  assert.doesNotMatch(router, /if \(MAIN_TABS\.includes\(path\)\) \{ uni\.reLaunch/);
  assert.match(bottomNav, /import \{ redirectTo \} from ['"]@\/utils\/router['"]/);
  assert.match(bottomNav, /function go\([\s\S]*redirectTo\(url\)/);
  assert.doesNotMatch(bottomNav, /import \{ reLaunch \}/);
});

test("首页与 App 启动阶段不再安装 iOS 定时 reLaunch 看门狗", async () => {
  const [source, home] = await Promise.all([
    readFile(appSource, "utf8"),
    readFile(homeSource, "utf8"),
  ]);
  assert.doesNotMatch(source, /repairIosStartupRoute|markIosStartupHomeReady/);
  assert.doesNotMatch(home, /ios-startup-recovery|markIosStartupHomeReady/);
  const onLaunchBlock = source.slice(source.indexOf("onLaunch("), source.indexOf("onShow("));
  assert.doesNotMatch(onLaunchBlock, /uni\.reLaunch\(\{\s*url: ['"]\/pages\/index\/index/);
});

test("启动更新检查不依赖 URLSearchParams，且 224 候选版本已冻结", async () => {
  const [update, manifestRaw] = await Promise.all([
    readFile(updateSource, "utf8"),
    readFile(manifestSource, "utf8"),
  ]);
  assert.doesNotMatch(update, /new URLSearchParams/);
  assert.match(update, /encodeURIComponent\(platform\)/);
  assert.match(update, /encodeURIComponent\(version\)/);
  assert.equal(JSON.parse(manifestRaw).versionCode, "224");
});
