/**
 * PM2 生产环境进程管理配置
 *
 * 用法:
 *   pm2 start ecosystem.config.js                  # 启动全部
 *   pm2 start ecosystem.config.js --only server     # 仅启动 server
 *   pm2 restart server                              # 滚动重启
 *   pm2 reload ecosystem.config.js                  # 零停机重载
 *   pm2 save && pm2 startup                         # 开机自启
 */
module.exports = {
  apps: [
    {
      name: "guoxue-server",
      script: "dist/main.js",
      cwd: __dirname,
      instances: process.env.PM2_INSTANCES || "max",
      exec_mode: "cluster",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "500M",
      kill_timeout: 10000,
      listen_timeout: 15000,
      wait_ready: true,

      // 环境变量
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",

      // 日志
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/guoxue/error.log",
      out_file: "/var/log/guoxue/out.log",
      merge_logs: true,
      log_type: "json",

      // 优雅关闭（先 SIGINT，超时后 SIGKILL）
      kill_retry_time: 3000,

      // 监控
      instance_var: "INSTANCE_ID",
    },
    {
      name: "guoxue-cron",
      script: "dist/modules/cron/cron-worker.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 5,
      restart_delay: 10000,
      max_memory_restart: "300M",
      kill_timeout: 8000,

      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",

      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/guoxue/cron-error.log",
      out_file: "/var/log/guoxue/cron-out.log",
      merge_logs: true,
    },
  ],

  // 部署配置（可选，远程服务器通过 SSH 部署）
  deploy: {
    production: {
      user: "deploy",
      host: process.env.DEPLOY_HOST || "your-server-ip",
      ref: "origin/main",
      repo: "git@github.com:your-org/guoxue-platform.git",
      path: "/opt/guoxue",
      "pre-deploy": "git fetch --all",
      // 数据库迁移必须独立备份、审查和授权，不能夹在 PM2 自动部署链中。
      "post-deploy": "pnpm install --frozen-lockfile && cd apps/server && npx prisma generate && pnpm build && pm2 reload ecosystem.config.js --only guoxue-server",
    },
  },
};
