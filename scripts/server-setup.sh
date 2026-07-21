#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 热卜国学 — 服务器一键部署脚本
# 适用: Ubuntu 22.04+ / Debian 12+
# 用法:
#   scp scripts/server-setup.sh root@你的IP:/root/
#   ssh root@你的IP "bash /root/server-setup.sh"
# ═══════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[setup]${NC} $1"; }
ok()  { echo -e "${GREEN}[  ok]${NC} $1"; }
err() { echo -e "${RED}[fail]${NC} $1"; exit 1; }

echo "╔══════════════════════════════════════════════╗"
echo "║  热卜国学平台 — 服务器一键部署              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. 基础环境
# ═══════════════════════════════════════════════════════════════
log "更新系统..."
apt-get update -qq && apt-get upgrade -y -qq && ok "系统更新完成"

log "安装基础工具..."
apt-get install -y -qq curl wget git vim htop nginx certbot python3-certbot-nginx ufw jq rsync
ok "基础工具安装完成"

log "安装 Docker..."
curl -fsSL https://get.docker.com | bash 2>&1 | tail -1
systemctl enable --now docker
ok "Docker $(docker -v 2>/dev/null | grep -o '[0-9]*\.[0-9]*\.[0-9]*')"

log "安装 Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &> /dev/null
apt-get install -y -qq nodejs
ok "Node $(node -v)"

log "安装 pnpm..."
npm install -g pnpm@latest &> /dev/null
ok "pnpm $(pnpm -v)"

# ═══════════════════════════════════════════════════════════════
# 2. 目录结构
# ═══════════════════════════════════════════════════════════════
log "创建目录..."
mkdir -p /opt/guoxue/{h5,backup,logs,uploads,static}
ok "目录创建完成"

# ═══════════════════════════════════════════════════════════════
# 3. 防火墙
# ═══════════════════════════════════════════════════════════════
log "配置防火墙..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
# API 端口仅内网
ufw allow from 127.0.0.1 to any port 3000
ok "防火墙配置完成"

# ═══════════════════════════════════════════════════════════════
# 4. 拉取代码
# ═══════════════════════════════════════════════════════════════
REPO_URL="https://github.com/tianjingyu123/guoxue-platform.git"
log "拉取代码..."
if [ -d "/opt/guoxue/.git" ]; then
  cd /opt/guoxue && git pull origin master 2>/dev/null && ok "代码已更新"
else
  git clone --depth 1 "$REPO_URL" /opt/guoxue 2>/dev/null || {
    echo "  ⚠ GitHub 克隆失败，请手动上传代码到 /opt/guoxue"
  }
  ok "代码已克隆"
fi

# ═══════════════════════════════════════════════════════════════
# 5. 配置环境变量
# ═══════════════════════════════════════════════════════════════
log "配置环境变量..."
ENV_FILE="/opt/guoxue/docker/.env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║  请输入生产环境配置                  ║"
  echo "  ╚══════════════════════════════════════╝"
  echo ""

  read -p "  PostgreSQL 连接: " DATABASE_URL
  read -p "  JWT 密钥: " JWT_SECRET
  read -p "  加密密钥: " ENCRYPTION_KEY
  read -p "  Redis 密码 (留空无密码): " REDIS_PASSWORD
  read -p "  DeepSeek Key (留空跳过): " DEEPSEEK_KEY
  read -p "  大屏密钥: " BIGSCREEN_SECRET

  cat > "$ENV_FILE" << ENVEOF
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL}
REDIS_URL=redis://${REDIS_PASSWORD:+default:${REDIS_PASSWORD}@}127.0.0.1:6379
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DEEPSEEK_API_KEY=${DEEPSEEK_KEY:-}
BIGSCREEN_SECRET=${BIGSCREEN_SECRET:-}
DOMAIN=guoxue.ac.cn
CORS_ORIGIN=https://guoxue.ac.cn,https://m.guoxue.ac.cn,https://admin.guoxue.ac.cn
PRISMA_SLOW_QUERY_MS=500
ENVEOF
  ok "环境变量已生成"
fi

# ═══════════════════════════════════════════════════════════════
# 6. 启动 Redis (Docker)
# ═══════════════════════════════════════════════════════════════
log "启动 Redis..."
docker rm -f guoxue-redis 2>/dev/null || true
docker network create guoxue-net 2>/dev/null || true
docker run -d \
  --name guoxue-redis \
  --restart unless-stopped \
  --network guoxue-net \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine \
  redis-server ${REDIS_PASSWORD:+--requirepass $REDIS_PASSWORD} --appendonly yes
ok "Redis 已启动"

# ═══════════════════════════════════════════════════════════════
# 7. 构建并启动
# ═══════════════════════════════════════════════════════════════
log "构建 Docker 镜像（约 3-5 分钟）..."
cd /opt/guoxue
docker build -f docker/Dockerfile -t guoxue-server:latest . 2>&1 | tail -3
ok "镜像构建完成"

log "初始化全新空数据库..."
docker run --rm \
  --network guoxue-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -e CONFIRM_EMPTY_DATABASE=YES \
  guoxue-server:latest \
  sh -c "cd /app/apps/server && sh prisma/migrations-deploy/bootstrap-empty-database.sh" 2>&1 | tail -5
ok "空数据库初始化完成"

log "启动服务..."
docker rm -f guoxue-server 2>/dev/null || true
docker run -d \
  --name guoxue-server \
  --restart unless-stopped \
  --network guoxue-net \
  -p 127.0.0.1:3000:3000 \
  --env-file "$ENV_FILE" \
  --memory 1G \
  guoxue-server:latest
ok "服务已启动"

# ═══════════════════════════════════════════════════════════════
# 8. Nginx 配置
# ═══════════════════════════════════════════════════════════════
log "配置 Nginx..."
cat > /etc/nginx/sites-available/guoxue << 'NGINX'
server {
    listen 80;
    server_name _;

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # H5 移动端
    root /opt/guoxue/h5;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 256;
}
NGINX

ln -sf /etc/nginx/sites-available/guoxue /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx 配置完成"

# ═══════════════════════════════════════════════════════════════
# 9. SSL 证书（如果有域名）
# ═══════════════════════════════════════════════════════════════
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "_" ]; then
  log "申请 SSL 证书..."
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "m.$DOMAIN" --non-interactive --agree-tos --email admin@${DOMAIN} 2>/dev/null || echo "  ⚠ SSL 待手动申请：certbot --nginx"
fi

# ═══════════════════════════════════════════════════════════════
# 10. 健康检查
# ═══════════════════════════════════════════════════════════════
log "健康检查..."
sleep 10
HEALTH=$(curl -s http://127.0.0.1:3000/api/v1/health/live 2>/dev/null || echo 'fail')
if echo "$HEALTH" | grep -q "alive"; then
  ok "✅ 服务健康 — 部署成功！"
  echo ""
  echo "  ╔══════════════════════════════════════════════╗"
  echo "  ║  热卜国学平台 — 部署成功！                   ║"
  echo "  ╠══════════════════════════════════════════════╣"
  echo "  ║  API:    内网 127.0.0.1:3000                ║"
  echo "  ║  健康:   /api/v1/health                     ║"
  echo "  ║  H5:     通过 Nginx 端口 80                 ║"
  echo "  ╚══════════════════════════════════════════════╝"
else
  echo "  ⚠ 服务启动中，查看日志: docker logs guoxue-server"
fi
