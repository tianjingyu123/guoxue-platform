/**
 * 微信小程序分发包瘦身。
 *
 * H5 / App 构建继续保留完整静态资源；这里只清理微信构建产物中已有远端来源、
 * 动态生成或已无源码引用的副本，避免占用主包额度。
 */
import { existsSync, rmSync } from "node:fs";
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

let removed = 0;
for (const segments of redundantPaths) {
  const target = join(mpRoot, ...segments);
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  removed += 1;
}

if (removed > 0) {
  console.log(
    `已移除 ${removed} 项微信包冗余静态资源，运行时由静态托管或动态 Canvas 提供。`,
  );
}
