// PM2 wrapper: 启动 UniApp 移动端 H5 开发服务器
const { spawn } = require("child_process");
const path = require("path");

const cwd = path.resolve(__dirname, "..", "apps", "mobile");

const child = spawn("npx", ["uni", "--port", "5174", "--host", "0.0.0.0"], {
  cwd,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
