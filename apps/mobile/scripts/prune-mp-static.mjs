/**
 * 微信小程序分发包瘦身。
 *
 * H5 / App 构建继续保留完整静态资源；这里只清理微信构建产物中已有远端来源、
 * 动态生成或已无源码引用的副本，避免占用主包额度。
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const mpRoot = join(process.cwd(), "dist", "build", "mp-weixin");
const redundantPaths = [
  // 商品图与文章示例图均由生产静态域名提供。
  ["static", "images", "products"],
  ["static", "images", "articles"],
  // 旧占位图已无源码引用；分享二维码由 uqrcodejs 在 Canvas 动态生成。
  ["static", "placeholder.png"],
  ["static", "images", "poster-qrcode.webp"],
  // 只由 App 的 plus.webview.setJsFile 使用，小程序没有原生 WebView 预载桥。
  ["static", "legacy-paipan-preload.js"],
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
    `已移除 ${removed} 项微信包冗余资源（App 专用桥、远端图片或动态 Canvas 副本）。`,
  );
}

// uni-app 会把页面配置以便于阅读的缩进 JSON 写入产物。微信按原始字节计算包体，
// 因此在不改变语义的前提下压缩 JSON，可为主包保留稳定的功能增长余量。
let compacted = 0;
let savedBytes = 0;
function compactJson(directory) {
  for (const name of readdirSync(directory)) {
    const target = join(directory, name);
    if (statSync(target).isDirectory()) {
      compactJson(target);
      continue;
    }
    if (!name.endsWith(".json")) continue;

    const source = readFileSync(target, "utf8");
    const compact = JSON.stringify(JSON.parse(source));
    if (compact.length >= source.length) continue;
    writeFileSync(target, compact, "utf8");
    compacted += 1;
    savedBytes += Buffer.byteLength(source) - Buffer.byteLength(compact);
  }
}

compactJson(mpRoot);
console.log(`已压缩 ${compacted} 个小程序 JSON 配置，节省 ${(savedBytes / 1024).toFixed(1)} KB。`);
