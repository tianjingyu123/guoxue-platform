#!/bin/bash
set -e

# ═══════════════════════════════════════
# 热卜国学 — 一键部署（从零到上线）
# 用法: bash /opt/guoxue/scripts/deploy.sh
# ═══════════════════════════════════════

cd /opt/guoxue

echo "=== 1/4 安装依赖 ==="
pnpm install 2>&1 | tail -2

echo "=== 2/4 构建 ==="
pnpm --filter @guoxue/shared build
pnpm --filter @guoxue/bazi-engine build
pnpm --filter @guoxue/ziwei-engine build
pnpm build:server

echo "=== 3/4 同步数据库 ==="
cd apps/server
DATABASE_URL="postgresql://guoxue:guoxue123@127.0.0.1:5432/guoxue" \
  node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -2

echo "=== 4/4 启动 ==="
cd /opt/guoxue
cat > ecosystem.config.cjs << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'guoxue-api',
    script: 'apps/server/dist/main.js',
    cwd: '/opt/guoxue',
    env: {
      NODE_ENV: 'production', PORT: 3000,
      DATABASE_URL: 'postgresql://guoxue:guoxue123@127.0.0.1:5432/guoxue',
      REDIS_URL: 'redis://127.0.0.1:6379',
      JWT_SECRET: 'guoxue-prod-jwt-change-me',
      ENCRYPTION_KEY: 'guoxue-prod-encrypt-change-me',
      BIGSCREEN_SECRET: 'bigscreen-change-me',
      CORS_ORIGIN: '*'
    }
  }]
}
PM2EOF

pm2 delete guoxue-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=== 等待启动 ==="
sleep 10

echo "=== 健康检查 ==="
curl -s http://localhost:3000/ && echo "" && echo "✅ 服务正常运行！" || {
  echo "❌ 启动失败，查看日志: pm2 logs guoxue-api"
  exit 1
}
