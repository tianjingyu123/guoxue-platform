/**
 * 小程序分发包瘦身：
 * 这组三张种子商品图由生产 H5 静态托管统一提供，接口返回完整 HTTPS 地址。
 * H5 / APP 构建仍保留原图；这里只清理微信小程序构建产物，避免同一资源重复入包。
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const productImageDir = join(
  process.cwd(),
  "dist",
  "build",
  "mp-weixin",
  "static",
  "images",
  "products",
);

if (existsSync(productImageDir)) {
  rmSync(productImageDir, { recursive: true, force: true });
  console.log("已移除小程序包内重复商品图，运行时由 H5 静态托管提供");
}
