// PM2 wrapper: 启动 NestJS API 生产服务（读取 root .env，执行 dist/main.js）
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const cwd = path.resolve(__dirname, "..");

// 按优先级加载 .env 文件到 process.env（PM2 重启时环境变量容易丢失）
function loadEnv(...files) {
  for (const envFile of files) {
    if (!fs.existsSync(envFile)) continue;
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
  }
}

loadEnv(path.join(cwd, ".env"), path.join(cwd, "apps", "server", ".env"));

const scriptPath = path.join(cwd, "apps", "server", "dist", "main.js");
if (!fs.existsSync(scriptPath)) {
  console.error(`[pm2-api] 找不到构建产物: ${scriptPath}`);
  console.error("[pm2-api] 请先执行构建: pnpm --filter @guoxue/server build");
  process.exit(1);
}

const child = spawn(process.execPath, [scriptPath], {
  cwd,
  stdio: "inherit",
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
