// 管理后台部署脚本：构建 → 复制到 Nginx
// 用法: node scripts/deploy-admin.js

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ADMIN_DIR = path.resolve(__dirname, "../apps/admin");
const NGINX_HTML = "C:/nginx/html";

console.log("[1/3] 清理旧构建产物...");
const distDir = path.join(ADMIN_DIR, "dist");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log("[2/3] 构建管理后台...");
spawnSync("npx", ["vite", "build"], { cwd: ADMIN_DIR, stdio: "inherit" });

console.log("[3/3] 部署到 Nginx...");
if (fs.existsSync(NGINX_HTML)) {
  fs.rmSync(NGINX_HTML, { recursive: true, force: true });
}
fs.mkdirSync(NGINX_HTML, { recursive: true });

// 复制构建产物
const copyRecursive = (src, dest) => {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};
copyRecursive(distDir, NGINX_HTML);

console.log("部署完成! http://localhost");
