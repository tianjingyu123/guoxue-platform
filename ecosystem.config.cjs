module.exports = {
  apps: [
    {
      name: "guoxue-api",
      script: "scripts/pm2-api.js",
      cwd: "D:/guoxue-platform",
      env: {
        NODE_ENV: "development",
        BULLMQ_DISABLED: "true",
        // 其他配置（DATABASE_URL/JWT_SECRET 等）由 scripts/pm2-api.js 从 .env 加载
      },
      watch: false,
      max_memory_restart: "2G",
      error_file: "D:/guoxue-platform/.pm2-logs/api-error.log",
      out_file: "D:/guoxue-platform/.pm2-logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
    },
    {
      name: "guoxue-nginx",
      script: "C:/nginx/nginx.exe",
      args: "-p C:/nginx",
      cwd: "C:/nginx",
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      max_memory_restart: "500M",
      error_file: "D:/guoxue-platform/.pm2-logs/nginx-error.log",
      out_file: "D:/guoxue-platform/.pm2-logs/nginx-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 5000,
    },
  ],
};
