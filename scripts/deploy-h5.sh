#!/bin/bash
# 热卜国学 — H5 部署脚本
# 用法: bash scripts/deploy-h5.sh [host]
# 示例: bash scripts/deploy-h5.sh root@121.36.xxx.xxx
set -e

HOST="${1:-}"
H5_DIR="/opt/guoxue/h5"
NGINX_CONF="docker/nginx/h5.conf"

if [ -z "$HOST" ]; then
  echo "用法: bash scripts/deploy-h5.sh <服务器地址>"
  echo "示例: bash scripts/deploy-h5.sh root@121.36.xxx.xxx"
  exit 1
fi

echo "=== 1. 构建 H5 ==="
cd apps/mobile
pnpm build:h5 || npx vite build --mode production
cd ../..

echo "=== 2. 部署到 $HOST ==="
# 创建目录
ssh "$HOST" "mkdir -p $H5_DIR"

# 上传构建产物
rsync -avz --delete apps/mobile/dist/build/h5/ "$HOST:$H5_DIR/"

# 上传 Nginx 配置
scp "$NGINX_CONF" "$HOST:/etc/nginx/sites-available/guoxue-h5"

# 启用站点
ssh "$HOST" "
  ln -sf /etc/nginx/sites-available/guoxue-h5 /etc/nginx/sites-enabled/
  nginx -t && nginx -s reload
"

echo "=== 3. 验证 ==="
curl -sI "http://$HOST/" | head -5

echo ""
echo "✅ H5 部署完成！"
echo "   访问: http://$HOST"
