// PM2 wrapper: 启动编译好的 NestJS API 服务器
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "apps", "server");

// 加载 .env 文件
const envFile = path.join(serverDir, ".env");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // 去掉引号
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

console.log(`[pm2-api-prod] Database configured`);
console.log(`[pm2-api-prod] Starting from ${path.join(serverDir, "dist", "main.js")}`);

const child = spawn("node", [path.join(serverDir, "dist", "main.js")], {
  cwd: serverDir,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
