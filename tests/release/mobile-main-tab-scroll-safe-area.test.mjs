import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("个人中心滚动内容不能进入 Android 状态栏", () => {
  const source = read("apps/mobile/src/pages/profile/index.vue");

  assert.match(source, /class="status-bar-scrim"/u);
  assert.match(source, /:style="\{ height: statusBarHeight \+ 'px' \}"/u);
  assert.match(source, /\.status-bar-scrim\s*\{[\s\S]*position:\s*fixed;[\s\S]*top:\s*0;[\s\S]*z-index:\s*80;[\s\S]*pointer-events:\s*none;/u);
});

test("发现页搜索栏滚动后持续隔离系统状态栏", () => {
  const source = read("apps/mobile/src/pages/discover/index.vue");

  assert.match(source, /class="search-row"\s+:style="\{ paddingTop: statusBarHeight \+ 8 \+ 'px' \}"/u);
  assert.match(source, /\.search-row\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;[\s\S]*z-index:\s*40;[\s\S]*background:/u);
});
