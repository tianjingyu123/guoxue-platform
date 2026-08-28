import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
const pagesSource = new URL("../../apps/mobile/src/pages.json", import.meta.url);
const tabRuntimeSource = new URL("../../apps/mobile/src/lib/main-tab-runtime.ts", import.meta.url);
const paipanSource = new URL("../../apps/mobile/src/pages/paipan/index.vue", import.meta.url);
const mobileSourceRoot = new URL("../../apps/mobile/src/", import.meta.url);

async function readMobileSources(directory = mobileSourceRoot) {
  const sources = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) sources.push(...await readMobileSources(child));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".vue")) {
      sources.push(await readFile(child, "utf8"));
    }
  }
  return sources;
}

test("App 五个主入口使用原生 tabBar 与 switchTab，不再销毁主 WebView", async () => {
  const [router, bottomNav, pages, runtime, paipan] = await Promise.all([
    readFile(routerSource, "utf8"),
    readFile(bottomNavSource, "utf8"),
    readFile(pagesSource, "utf8"),
    readFile(tabRuntimeSource, "utf8"),
    readFile(paipanSource, "utf8"),
  ]);
  assert.match(router, /#ifdef APP-PLUS[\s\S]*beginMainTabSwitch\(path, target\)[\s\S]*uni\.switchTab\(\{ url: path/);
  assert.match(router, /#ifndef APP-PLUS[\s\S]*uni\.redirectTo\(\{ url: target/);
  assert.match(bottomNav, /import \{ navigateTo \} from ['"]@\/utils\/router['"]/);
  assert.match(bottomNav, /function go\([\s\S]*navigateTo\(url\)/);
  assert.match(bottomNav, /#ifndef APP-PLUS[\s\S]*class="bottom-nav"/);
  assert.match(bottomNav, /markMainTabReady\(ACTIVE_PATH\[props\.active\]/);
  assert.match(runtime, /switchTab 不支持 query/);
  assert.match(runtime, /页面切换未完成，已为您返回首页/);
  assert.match(runtime, /if \(source\.target === 'station' && source\.stationId\)/);
  assert.doesNotMatch(runtime, /query\.(mobile|token|key)|source\.(mobile|token|key)/i);
  assert.match(paipan, /consumeMainTabIntent\("\/pages\/paipan\/index"\)/);
  for (const route of [
    "pages/index/index",
    "pages/circles/index",
    "pages/paipan/index",
    "pages/discover/index",
    "pages/profile/index",
  ]) {
    assert.match(pages, new RegExp(`"pagePath": "${route.replaceAll("/", "\\/")}"`));
  }
});

test("App 业务代码不再绕过路由层销毁五个主 tab", async () => {
  const source = (await readMobileSources()).join("\n");
  const directMainPage = String.raw`/pages/(?:index|circles|paipan|discover|profile)/index`;
  assert.doesNotMatch(
    source,
    new RegExp(String.raw`uni\.(?:reLaunch|redirectTo|navigateTo)\(\s*\{\s*url:\s*["']${directMainPage}["']`, "u"),
  );
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

test("启动更新检查不依赖 URLSearchParams，且根修复候选使用新构建号 225", async () => {
  const [update, manifestRaw] = await Promise.all([
    readFile(updateSource, "utf8"),
    readFile(manifestSource, "utf8"),
  ]);
  assert.doesNotMatch(update, /new URLSearchParams/);
  assert.match(update, /encodeURIComponent\(platform\)/);
  assert.match(update, /encodeURIComponent\(version\)/);
  assert.equal(JSON.parse(manifestRaw).versionCode, "225");
});
