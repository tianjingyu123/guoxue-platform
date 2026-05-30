// PM2 wrapper: 启动 Admin 管理后台开发服务器
// 等待 API 就绪后再启动，避免代理连接失败
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const cwd = path.resolve(__dirname, "..");
const API_URL = "http://localhost:3000/api/v1/health";
const MAX_WAIT = 60000;

function waitForApi(retries = 0) {
  const start = Date.now();
  http.get(API_URL, (res) => {
    if (res.statusCode === 200) {
      console.log(`[pm2-admin] API 已就绪 (等待 ${Date.now() - start}ms)，启动 Vite...`);
      startVite();
    } else {
      retry(retries);
    }
  }).on("error", () => {
    retry(retries);
  });
}

function retry(retries) {
  if (retries * 2000 > MAX_WAIT) {
    console.log("[pm2-admin] API 等待超时，直接启动 Vite...");
    startVite();
    return;
  }
  console.log(`[pm2-admin] 等待 API 就绪... (${retries + 1})`);
  setTimeout(() => waitForApi(retries + 1), 2000);
}

function startVite() {
  const child = spawn("pnpm", ["--filter", "@guoxue/admin", "dev"], {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

waitForApi();
