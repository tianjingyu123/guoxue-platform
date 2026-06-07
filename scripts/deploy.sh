#!/bin/bash
# ═════════════════════════════════════════════════════════
# 热卜国学 — 一键部署
# 用法: bash deploy.sh
# ═════════════════════════════════════════════════════════
set -e
echo "=== 1/5 安装依赖 ==="
cd /opt/guoxue 2>/dev/null || { echo "代码不存在，请先 git clone"; exit 1; }
pnpm install 2>&1 | tail -3

echo "=== 2/5 同步数据库 ==="
cd apps/server
DATABASE_URL="${DATABASE_URL:-postgresql://guoxue:guoxue123@127.0.0.1:5432/guoxue}" \
  node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -3

echo "=== 3/5 构建服务 ==="
cd /opt/guoxue
pnpm build:server 2>&1 | tail -3

echo "=== 4/5 启动 PM2 ==="
pm2 delete guoxue-api 2>/dev/null || true
pm2 start apps/server/dist/main.js --name guoxue-api
pm2 save

echo "=== 5/5 健康检查 ==="
sleep 8
curl -s http://localhost:3000/ && echo "" && echo "✅ 部署成功！"

# 设为开机自启
pm2 startup systemd -u root --hp /root 2>/dev/null || true
