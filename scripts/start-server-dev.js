// 开发环境启动脚本 — 加载 .env 并启动 NestJS 编译后的服务器
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, "..", "apps", "server", ".env");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
  console.log("[startup] .env loaded");
}

require("../apps/server/dist/main.js");
