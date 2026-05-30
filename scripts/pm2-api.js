// PM2 wrapper: 启动 NestJS API 开发服务器
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const cwd = path.resolve(__dirname, "..");

// 加载 .env 文件到 process.env（PM2 重启时环境变量丢失）
const envFile = path.join(cwd, "apps", "server", ".env");
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
}

const child = spawn("pnpm", ["--filter", "@guoxue/server", "dev"], {
  cwd,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
