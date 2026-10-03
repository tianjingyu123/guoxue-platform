import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), "utf8").then((value) => value.replaceAll("\r\n", "\n"));

test("统一候选保留客户端与后台两侧新增回归入口", async () => {
  const { scripts } = JSON.parse(await read("package.json"));
  for (const name of ["mobile-renderjs-runtime", "mobile-wechat-app-payment", "mobile-legacy-paipan-payment"]) {
    assert.ok(scripts["release:test-mobile-native-bundle"].includes(`${name}.test.mjs`));
  }
  for (const name of ["admin-console-governance", "admin-category-statistics", "admin-pending-queues", "admin-unified-integration"]) {
    assert.ok(scripts["release:test-admin-console"].includes(`${name}.test.mjs`));
  }
});

test("AI 决策账本路由与六类旧排盘隔离同时保留", async () => {
  const router = await read("apps/admin/src/router/index.ts");
  assert.match(router, /path: "ai\/decisions"/);
  assert.equal((router.match(/nativePaipan: true/g) ?? []).length, 6);
  assert.match(router, /to\.meta\?\.nativePaipan === true && \(await refreshPaipanMode\(\)\) !== "native"/);
});

test("AI 总览保留账本操作入口且失败重试支持键盘", async () => {
  const page = await read("apps/admin/src/views/ai/AiWorkspaceOverview.vue");
  assert.match(page, /\$router\.push\('\/ai\/decisions'\)/);
  assert.match(page, /"button",\s*\{ type: "button", class: "fallback-retry", onClick:/);
  assert.match(page, /fallback-retry:focus-visible/);
  assert.doesNotMatch(page, /AI 数字员工自动执行|近 90 天可回溯/);
});

test("全局搜索在弹窗就绪后聚焦，保留关闭归还与导航焦点时序", async () => {
  const palette = await read("apps/admin/src/components/AdminCommandPalette.vue");
  const layout = await read("apps/admin/src/views/Layout.vue");
  assert.match(palette, /@opened="focusSearchInput"/);
  assert.match(palette, /function focusSearchInput\(\)\s*\{[\s\S]*?nextTick\(\(\) => inputRef\.value\?\.focus\(\)\)/);
  const openWatcher = palette.match(/watch\(\s*\(\) => props\.modelValue,[\s\S]*?\n\);/)?.[0];
  assert.ok(openWatcher);
  assert.doesNotMatch(openWatcher, /inputRef|nextTick/, "不可在弹窗记录原焦点前抢先聚焦输入框");
  assert.match(palette, /@closed="reset"/);
  assert.match(palette, /if \(!dialogHasClosed\.value \|\| !pendingFocusPath\.value\) return/);
  assert.match(layout, /@navigated="focusMainContent"/);
});

test("桌面与移动 AI 工作区提示均保留人工审核边界", async () => {
  const layout = await read("apps/admin/src/views/Layout.vue");
  assert.equal((layout.match(/AI 辅助协作 · 关键操作人工审核/g) ?? []).length, 2);
  assert.doesNotMatch(layout, /自动执行 \+ 人工兜底/);
});
