/**
 * 微信小程序分发包瘦身。
 *
 * H5 / App 构建继续保留完整静态资源；这里只清理微信构建产物中已有远端来源、
 * 动态生成或已无源码引用的副本，避免占用主包额度。
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const mpRoot = join(process.cwd(), "dist", "build", "mp-weixin");
const redundantPaths = [
  // 商品图与文章示例图均由生产静态域名提供。
  ["static", "images", "products"],
  ["static", "images", "articles"],
  // 旧占位图已无源码引用；分享二维码由 uqrcodejs 在 Canvas 动态生成。
  ["static", "placeholder.png"],
  ["static", "images", "poster-qrcode.webp"],
];

// 条件编译后只剩 `"use strict";` 且没有运行时内容的模块桩。
// 保留精确内容校验，避免未来模块恢复实现后被误删。
const emptyModulePaths = [
  ["utils", "content-detail-layer.js"],
  ["lib", "paipan", "jieqi.js"],
  ["lib", "paipan", "ganzhi.js"],
  ["composables", "useWebVitals.js"],
];

let removed = 0;
for (const segments of redundantPaths) {
  const target = join(mpRoot, ...segments);
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  removed += 1;
}

let removedEmptyModules = 0;
for (const segments of emptyModulePaths) {
  const target = join(mpRoot, ...segments);
  if (!existsSync(target)) continue;
  if (readFileSync(target, "utf8").trim() !== '"use strict";') continue;
  rmSync(target, { force: true });
  removedEmptyModules += 1;
}

if (removed > 0 || removedEmptyModules > 0) {
  console.log(
    `已移除 ${removed} 项微信包冗余静态资源及 ${removedEmptyModules} 个空模块桩。`,
  );
}
