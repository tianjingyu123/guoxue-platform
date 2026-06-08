// PM2启动V0 Next.js前端完整版
const { spawn } = require("child_process");
const path = require("path");

const cwd = "C:/Users/Administrator/Desktop/V0前端完整版6.6日";
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

const child = spawn("node", [nextBin, "dev", "-p", "5174", "-H", "0.0.0.0"], {
  cwd,
  stdio: "inherit",
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
