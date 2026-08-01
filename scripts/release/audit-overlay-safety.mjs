#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const lockImplementation = "apps/mobile/src/composables/use-overlay-scroll-lock.ts";
const guardedOverlays = [
  "apps/mobile/src/components/common/ai-search-modal.vue",
  "apps/mobile/src/components/common/content-share-sheet.vue",
  "apps/mobile/src/components/common/name-card-poster.vue",
  "apps/mobile/src/components/common/purchase-sheet.vue",
  "apps/mobile/src/components/home/all-features-sheet.vue",
  "apps/mobile/src/components/live/gift-panel.vue",
  "apps/mobile/src/components/video/publish-guide-sheet.vue",
  "apps/mobile/src/components/wallet/insufficient-balance-dialog.vue",
  "apps/mobile/src/components/bazi/date-picker-modal.vue",
  "apps/mobile/src/components/bazi/group-picker-modal.vue",
  "apps/mobile/src/components/bazi/location-picker-modal.vue",
  "apps/mobile/src/components/bazi/notes-panel.vue",
  "apps/mobile/src/components/qimen/notes-panel.vue",
  "apps/mobile/src/pkg-classics/audiobooks/player.vue",
  "apps/mobile/src/pkg-classics/notes/index.vue",
  "apps/mobile/src/pkg-classics/reader/index.vue",
  "apps/mobile/src/pkg-circle/components/creation-assist-drawer.vue",
  "apps/mobile/src/pkg-course/detail/index.vue",
  "apps/mobile/src/pkg-course/home/index.vue",
  "apps/mobile/src/pkg-live/console/index.vue",
  "apps/mobile/src/pkg-live/create/index.vue",
  "apps/mobile/src/pkg-live/replays/index.vue",
  "apps/mobile/src/pkg-live/schedule/index.vue",
  "apps/mobile/src/pkg-live/watch/index.vue",
  "apps/mobile/src/pkg-mall/product/detail.vue",
  "apps/mobile/src/pkg-merchant/dashboard/index.vue",
  "apps/mobile/src/pkg-merchant/inventory/index.vue",
  "apps/mobile/src/pkg-merchant/order-detail/index.vue",
  "apps/mobile/src/pkg-video/detail/index.vue",
  "apps/mobile/src/pkg-workspace/cases/index.vue",
  "apps/mobile/src/pkg-workspace/components/client-manager.vue",
  "apps/mobile/src/pkg-workspace/components/consult-session.vue",
  "apps/mobile/src/pkg-workspace/components/report-studio.vue",
  "apps/mobile/src/pkg-workspace/components/workbench-home.vue",
  "apps/mobile/src/pkg-workspace/ledger/index.vue",
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const failures = [];
const lockSource = read(lockImplementation);
const implementationChecks = [
  ["使用引用计数保护叠加弹层", lockSource.includes("activeLocks += 1") && lockSource.includes("activeLocks -= 1")],
  ["保存并恢复 body/html 原始行内样式", lockSource.includes("snapshot: InlineSnapshot") && lockSource.includes("body.style.overflow = snapshot.bodyOverflow")],
  ["补偿桌面滚动条宽度，避免页面横向跳动", lockSource.includes("getScrollbarWidth") && lockSource.includes("body.style.paddingRight")],
  ["组件卸载时兜底释放锁", lockSource.includes("onBeforeUnmount") && lockSource.includes("unlockDocumentScroll()")],
];

for (const [name, pass] of implementationChecks) {
  if (!pass) failures.push(`${lockImplementation}：${name}`);
}

for (const file of guardedOverlays) {
  const content = read(file);
  if (!content.includes("useOverlayScrollLock")) {
    failures.push(`${file}：未接入共享页面滚动锁`);
  }
  if (!content.includes("@touchmove.self.prevent")) {
    failures.push(`${file}：遮罩未阻止触摸滑动穿透`);
  }
  if (!content.includes("@touchmove.stop")) {
    failures.push(`${file}：面板未隔离内部触摸滑动`);
  }
}

console.log("弹层滚动隔离发布审计");
console.log(`检查范围：${guardedOverlays.length} 个高频弹层文件 + 1 个共享滚动锁`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`失败：${failure}`);
  console.error(`发布门禁失败：${failures.length} 项弹层安全规则不满足。`);
  process.exit(1);
}

console.log("通过：高频弹层均具备 H5 页面锁、遮罩拦截与面板内部滚动隔离。");
