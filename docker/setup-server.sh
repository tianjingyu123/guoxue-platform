#!/bin/bash
# 国学平台 — 云服务器一键初始化脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/<repo>/main/docker/setup-server.sh | bash -s -- [选项]
# 或:   chmod +x setup-server.sh && sudo ./setup-server.sh
#
# 支持: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Rocky 8+
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[err]${NC} $1"; }

# ── 参数解析 ──
REPO_URL="${REPO_URL:-https://github.com/<user>/guoxue-platform.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/guoxue}"
DOMAIN="${DOMAIN:-guoxue.ac.cn}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@guoxue.ac.cn}"
SKIP_FIREWALL="${SKIP_FIREWALL:-false}"
SKIP_SWAP="${SKIP_SWAP:-false}"

if [ "$EUID" -ne 0 ]; then
  err "请用 root 权限运行: sudo ./setup-server.sh"
  exit 1
fi

# ── 1. 检测操作系统 ──
log "检测操作系统..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  OS_VERSION=$VERSION_ID
else
  err "无法检测操作系统"
  exit 1
fi
log "操作系统: $OS $OS_VERSION"

# ── 2. 基础配置 ──
log "基础系统配置..."

# 时区
timedatectl set-timezone Asia/Shanghai 2>/dev/null || true

# Swap（如未配置）
if [ "$SKIP_SWAP" = "false" ] && ! swapon --show | grep -q .; then
  log "创建 2GB swap..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 内核参数优化
if ! grep -q "net.core.somaxconn" /etc/sysctl.conf 2>/dev/null; then
  cat >> /etc/sysctl.conf << 'SYSCTL'
# 国学平台 — 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
vm.dirty_ratio = 15
SYSCTL
  sysctl -p
fi

# ── 3. 安装 Docker ──
log "安装 Docker..."
if ! command -v docker &>/dev/null; then
  case "$OS" in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    centos|rocky|rhel|almalinux)
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || \
        yum config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || true
      dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || \
        yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null
      ;;
    *)
      err "不支持的操作系统: $OS"
      exit 1
      ;;
  esac
  systemctl enable docker
  systemctl start docker
  log "Docker 安装完成: $(docker --version)"
else
  log "Docker 已安装: $(docker --version)"
fi

# 验证 docker compose 可用
if ! docker compose version &>/dev/null; then
  err "docker compose 不可用，请确认 docker-compose-plugin 已安装"
  exit 1
fi
log "Docker Compose: $(docker compose version)"

# ── 4. 防火墙配置 ──
if [ "$SKIP_FIREWALL" = "false" ]; then
  log "配置防火墙..."
  if command -v ufw &>/dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log "UFW 已启用 (22/80/443)"
  elif command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=443/tcp
    firewall-cmd --reload
    log "firewalld 已配置"
  fi
fi

# ── 5. 创建目录结构 ──
log "创建目录结构..."
mkdir -p "$INSTALL_DIR"/{docker/nginx/ssl,docker/backups,docker/monitoring,apps/server/logs,certs}
# 静态资源挂载目录
mkdir -p /var/guoxue/{uploads,static}

# ── 6. 克隆 / 更新仓库 ──
if [ -d "$INSTALL_DIR/.git" ]; then
  log "仓库已存在，更新..."
  cd "$INSTALL_DIR"
  git fetch origin
  git checkout "$REPO_BRANCH"
  git pull origin "$REPO_BRANCH"
else
  log "克隆仓库: $REPO_URL ($REPO_BRANCH)"
  git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

# ── 7. 配置环境变量 ──
ENV_FILE="$INSTALL_DIR/docker/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  log "生成 .env.production 模板..."
  cat > "$ENV_FILE" << 'ENVEOF'
# ═══════════════════════════════════════════
# 国学平台 — 生产环境变量
# ═══════════════════════════════════════════
# 初始化后请修改所有 <CHANGE_ME> 占位符

# 基础设施
DB_PASSWORD=<CHANGE_ME>
JWT_SECRET=<CHANGE_ME>
ENCRYPTION_KEY=<CHANGE_ME>

# 腾讯云
TENCENT_SECRET_ID=<CHANGE_ME>
TENCENT_SECRET_KEY=<CHANGE_ME>
COS_BUCKET=<CHANGE_ME>
COS_REGION=ap-guangzhou
IM_APP_ID=<CHANGE_ME>
IM_ADMIN_KEY=<CHANGE_ME>

# 微信
WECHAT_APP_ID=<CHANGE_ME>
WECHAT_APP_SECRET=<CHANGE_ME>

# 域名
CORS_ORIGIN=https://<CHANGE_ME>
DOMAIN=<CHANGE_ME>
ENVEOF
  warn "请编辑 $ENV_FILE 填入真实配置后重新运行"
  warn "或设置环境变量后重新执行本脚本"
fi

# ── 8. SSL 证书 ──
SSL_DIR="$INSTALL_DIR/docker/nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ] && [ -n "$LETSENCRYPT_EMAIL" ]; then
  log "签发 SSL 证书 (Let's Encrypt)..."
  # 先用 standalone 模式获取证书
  if docker run --rm \
    -v "$SSL_DIR:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot:v3.2.0 \
    certonly --standalone --non-interactive --agree-tos \
    -m "$LETSENCRYPT_EMAIL" \
    -d "$DOMAIN"; then
    # 将证书复制到 nginx 期望的位置
    cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
    log "SSL 证书已签发"
  else
    warn "SSL 证书签发失败，请检查域名 DNS 解析"
    warn "可以稍后运行: docker/nginx/setup-ssl.sh"
  fi
fi

# ── 9. 拉取镜像并启动服务 ──
log "启动服务..."
cd "$INSTALL_DIR/docker"

# 创建 Docker 网络（如果不存在）
docker network create guoxue-net 2>/dev/null || true
docker network create monitoring 2>/dev/null || true

# 构建并启动
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --build

# ── 10. 等待健康检查 ──
log "等待服务就绪..."
for i in $(seq 1 30); do
  sleep 2
  if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    log "✅ 服务已就绪"
    break
  fi
  [ "$i" -eq 30 ] && err "服务启动超时，请检查: docker compose logs"
done

# ── 11. 数据库迁移 ──
log "执行数据库迁移..."
docker exec guoxue-server sh -c "cd /app/apps/server && npx prisma migrate deploy" || warn "迁移失败，请检查数据库连接"

# ── 12. 配置自启动 ──
log "配置服务自启动..."
cat > /etc/systemd/system/guoxue.service << SERVEOF
[Unit]
Description=国学平台 Docker Compose 服务
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR/docker
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml down
ExecReload=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml restart server
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVEOF
systemctl daemon-reload
systemctl enable guoxue.service

# ── 13. 配置定时任务 ──
log "配置定时备份..."
BACKUP_SCRIPT="$INSTALL_DIR/docker/pg-backup.sh"
(
  crontab -l 2>/dev/null || true
  echo "0 3 * * * $BACKUP_SCRIPT 30 >> /var/log/guoxue-backup.log 2>&1"
) | crontab -

# Docker 日志清理（每周日凌晨 4 点）
(
  crontab -l 2>/dev/null || true
  echo "0 4 * * 0 docker system prune -af --filter 'until=72h' >> /var/log/guoxue-cleanup.log 2>&1"
) | crontab -

# ── 14. 显示状态 ──
echo ""
echo "══════════════════════════════════════════════════════"
log "部署完成！"
echo "══════════════════════════════════════════════════════"
echo "  API:       https://$DOMAIN/api/v1/health"
echo "  Swagger:   https://$DOMAIN/api-docs"
echo "  Grafana:   https://$DOMAIN/grafana/ (内网)"
echo ""
echo "  管理命令:"
echo "    systemctl status guoxue       # 查看服务状态"
echo "    docker compose logs -f         # 查看日志"
echo "    docker exec -it guoxue-postgres psql -U guoxue  # 数据库"
echo ""
echo "  备份: $INSTALL_DIR/docker/backups/"
echo "  环境变量: $INSTALL_DIR/docker/.env.production"
echo "══════════════════════════════════════════════════════"
