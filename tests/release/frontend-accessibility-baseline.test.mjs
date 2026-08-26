import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("移动端首页频道支持键盘与辅助技术", async () => {
  const source = await read("apps/mobile/src/pages/index/index.vue");

  assert.match(source, /role="tablist"/u);
  assert.match(source, /role="tab"/u);
  assert.match(source, /:aria-selected=/u);
  assert.match(source, /:aria-disabled=/u);
  assert.match(source, /:tabindex=/u);
  assert.match(source, /@keydown\.enter=/u);
  assert.match(source, /@keydown\.space\.prevent=/u);
});

test("移动端核心入口支持键盘与辅助技术", async () => {
  const source = await read("apps/mobile/src/components/navigation/core-entry-grid.vue");

  assert.match(source, /role="navigation"/u);
  assert.match(source, /role="link"/u);
  assert.match(source, /tabindex="0"/u);
  assert.match(source, /:aria-label=/u);
  assert.match(source, /@keydown\.enter=/u);
  assert.match(source, /@keydown\.space\.prevent=/u);
});

test("管理端登录表单具备可识别标签与安全自动填充语义", async () => {
  const source = await read("apps/admin/src/views/Login.vue");

  assert.match(source, /<el-form-item label="手机号" prop="phone">/u);
  assert.match(source, /autocomplete="username"/u);
  assert.match(source, /<el-form-item label="密码" prop="password">/u);
  assert.match(source, /autocomplete="current-password"/u);
  assert.match(source, /native-type="submit"/u);
  assert.match(source, /@submit\.prevent="handleLogin"/u);
  assert.doesNotMatch(source, /@click="handleLogin"/u);
  assert.match(source, /prefers-reduced-motion: reduce/u);
});

test("管理端启动期品牌配置失败时静默使用内置默认值", async () => {
  const [apiSource, brandSource] = await Promise.all([
    read("apps/admin/src/api/index.ts"),
    read("apps/admin/src/lib/brand.ts"),
  ]);

  assert.match(apiSource, /SILENT_ERROR_REQUEST/u);
  assert.match(apiSource, /original as AdminRequestConfig/u);
  assert.match(apiSource, /getBrandConfig: \(\) => api\.get\("\/system\/public\/brand-config", SILENT_ERROR_REQUEST\)/u);
  assert.match(brandSource, /catch \{/u);
  assert.match(brandSource, /hydrating = null/u);
});

test("设置页公开展示三项法务入口并支持键盘操作", async () => {
  const source = await read("apps/mobile/src/pkg-mine/settings/index.vue");

  assert.match(source, /用户服务协议/u);
  assert.match(source, /隐私政策/u);
  assert.match(source, /儿童隐私保护/u);
  assert.match(source, /\/legal\/user-agreement/u);
  assert.match(source, /\/legal\/privacy-policy/u);
  assert.match(source, /\/legal\/child-privacy/u);
  assert.match(source, /role="link"/u);
  assert.match(source, /tabindex="0"/u);
  assert.match(source, /@keydown\.enter=/u);
  assert.match(source, /@keydown\.space\.prevent=/u);
});

test("通用原生导航栏同时使用系统状态栏与 CSS 安全区", async () => {
  const source = await read("apps/mobile/src/components/common/app-nav-bar.vue");

  assert.match(source, /uni\.getSystemInfoSync\(\)/u);
  assert.match(source, /systemInfo\.statusBarHeight/u);
  assert.match(source, /systemInfo\.safeAreaInsets\?\.top/u);
  assert.match(source, /systemInfo\.safeArea\?\.top/u);
  assert.match(source, /--app-nav-safe-top/u);
  assert.match(source, /max\(var\(--app-nav-safe-top, 0px\), env\(safe-area-inset-top\)\)/u);
});
