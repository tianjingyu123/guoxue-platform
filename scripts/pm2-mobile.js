// PM2 wrapper: 启动 V0 前端完整版 Next.js 开发服务器
const { spawn } = require("child_process");
const path = require("path");

const cwd = "C:/Users/Administrator/Desktop/V0前端完整版6.6日";

const child = spawn("npx", ["next", "dev", "-p", "5174", "-H", "0.0.0.0"], {
  cwd,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
