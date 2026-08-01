#!/bin/bash
# 国学平台 — 云服务器一键初始化脚本
# 用法: 将已验收的固定发布包解压到 /opt/guoxue/releases/<release-id> 后执行：
#       sudo DOMAIN=api.example.com LETSENCRYPT_EMAIL=ops@example.com \
#         DEPLOY_TARGET=standard DATABASE_MODE=prepare \
#         ENV_FILE=/opt/guoxue/shared/.env.production bash docker/setup-server.sh
# 腾讯云托管数据库、Redis、CLB/TLS 模式必须改用 DEPLOY_TARGET=tencent，
# 且正式环境文件中的 DATABASE_URL / REDIS_URL 必须指向托管服务私网地址。
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$SOURCE_DIR}"
DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
SKIP_FIREWALL="${SKIP_FIREWALL:-false}"
SKIP_SWAP="${SKIP_SWAP:-false}"
DATABASE_MODE="${DATABASE_MODE:-prepare}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NODE_ROLE="${NODE_ROLE:-operations}"
POSTGRES_CLIENT_MAJOR="${POSTGRES_CLIENT_MAJOR:-16}"
PLATFORM_ROOT="${PLATFORM_ROOT:-/opt/guoxue}"
RUNTIME_DIR="$PLATFORM_ROOT/current"
ENV_FILE="${ENV_FILE:-$PLATFORM_ROOT/shared/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-$PLATFORM_ROOT/backups}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
export COMPOSE_PROJECT_NAME

if [ ! -f "$SOURCE_DIR/package.json" ] || [ ! -f "$SOURCE_DIR/docker/docker-compose.prod.yml" ]; then
  err "必须从已验收且已解压到 releases/<release-id> 的完整固定发布目录运行 docker/setup-server.sh"
  err "禁止通过 curl 管道或远程分支直接执行未验收脚本"
  exit 64
fi
if [ "$(cd "$INSTALL_DIR" 2>/dev/null && pwd || true)" != "$SOURCE_DIR" ]; then
  err "INSTALL_DIR 必须指向当前已验收的项目目录: $SOURCE_DIR"
  err "请先把固定发布包上传到目标目录，再从该目录运行脚本"
  exit 64
fi
RELEASE_ID="$(bash "$SOURCE_DIR/scripts/release/validate-release-layout.sh" "$INSTALL_DIR" "$PLATFORM_ROOT")"
export RELEASE_ID
log "固定发布目录与发布标识已核对: $RELEASE_ID"
if [ -z "$DOMAIN" ] || [[ "$DOMAIN" == *"example.com"* ]]; then
  err "必须通过 DOMAIN 指定已经解析到本机的新 API 域名"
  exit 64
fi
if [ "$DEPLOY_TARGET" = "standard" ] && { [ -z "$LETSENCRYPT_EMAIL" ] || [[ "$LETSENCRYPT_EMAIL" != *"@"* ]]; }; then
  err "必须通过 LETSENCRYPT_EMAIL 指定证书通知邮箱"
  exit 64
fi
case "$DATABASE_MODE" in
  prepare|empty|restored) ;;
  *) err "DATABASE_MODE 仅允许 prepare / empty / restored"; exit 64 ;;
esac
case "$DEPLOY_TARGET" in
  standard|tencent) ;;
  *) err "DEPLOY_TARGET 仅允许 standard / tencent"; exit 64 ;;
esac
case "$NODE_ROLE" in
  app|operations) ;;
  *) err "NODE_ROLE 仅允许 app / operations"; exit 64 ;;
esac

if [ "$EUID" -ne 0 ]; then
  err "请用 root 权限运行: sudo bash docker/setup-server.sh"
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

# 在任何系统变更前完成只读预检。Docker 和部分基础命令允许本轮尚未安装，
# 但容量、架构、DNS、端口和固定发布包身份必须先通过。
log "执行安装前只读主机预检..."
PROJECT_DIR="$INSTALL_DIR" \
  ENV_FILE="$ENV_FILE" \
  DOMAIN="$DOMAIN" \
  REQUIRE_DOCKER=false \
  REQUIRE_BASE_TOOLS=false \
  MIN_POSTGRES_CLIENT_VERSION="${POSTGRES_CLIENT_MAJOR}.0" \
  REQUIRE_TIME_SYNC=false \
  REQUIRE_RELEASE_MANIFEST=true \
  ALLOW_OCCUPIED_PORTS="${ALLOW_OCCUPIED_PORTS:-false}" \
  bash "$INSTALL_DIR/scripts/release/preflight-host.sh"

# ── 2. 基础配置 ──
log "基础系统配置..."

# 时区
timedatectl set-timezone Asia/Shanghai 2>/dev/null || true
timedatectl set-ntp true 2>/dev/null || warn "无法自动启用 NTP，请在完整预检前人工确认时钟同步"

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

# ── 3. 安装基础依赖与 Docker ──
log "安装主机预检和发布所需基础依赖..."
case "$OS" in
  ubuntu|debian)
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg openssl tar coreutils iproute2 util-linux findutils

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      -o /tmp/nodesource-repo.gpg.key
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg /tmp/nodesource-repo.gpg.key
    rm -f /tmp/nodesource-repo.gpg.key
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list

    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /tmp/postgresql-repo.asc
    gpg --dearmor --yes -o /etc/apt/keyrings/postgresql.gpg /tmp/postgresql-repo.asc
    rm -f /tmp/postgresql-repo.asc
    echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
      > /etc/apt/sources.list.d/postgresql-pgdg.list

    apt-get update -qq
    apt-get install -y -qq nodejs "postgresql-client-${POSTGRES_CLIENT_MAJOR}"
    ;;
  centos|rocky|rhel|almalinux)
    dnf install -y ca-certificates curl gnupg2 openssl tar coreutils iproute util-linux findutils 2>/dev/null || \
      yum install -y ca-certificates curl gnupg2 openssl tar coreutils iproute util-linux findutils 2>/dev/null
    dnf module reset -y nodejs postgresql >/dev/null 2>&1 || true
    dnf module enable -y nodejs:20 "postgresql:${POSTGRES_CLIENT_MAJOR}" >/dev/null 2>&1 || true
    dnf install -y nodejs postgresql 2>/dev/null || \
      yum install -y nodejs postgresql 2>/dev/null
    ;;
esac

NODE_VERSION="$(node --version 2>/dev/null | sed 's/^v//' || true)"
if [[ ! "$NODE_VERSION" =~ ^2[0-9]\. ]]; then
  err "Node.js 20+ 安装失败或版本不满足要求: ${NODE_VERSION:-unknown}"
  exit 1
fi
POSTGRES_CLIENT_VERSION="$(psql --version 2>/dev/null | sed -n 's/.* \([0-9][0-9.]*\).*/\1/p' | head -n 1)"
if [[ ! "$POSTGRES_CLIENT_VERSION" =~ ^${POSTGRES_CLIENT_MAJOR}([.]|$) ]]; then
  err "PostgreSQL 客户端主版本必须为 ${POSTGRES_CLIENT_MAJOR}: ${POSTGRES_CLIENT_VERSION:-unknown}"
  exit 1
fi
log "宿主机运行时: Node.js $NODE_VERSION / PostgreSQL client $POSTGRES_CLIENT_VERSION"

log "安装 Docker..."
if ! command -v docker &>/dev/null; then
  case "$OS" in
    ubuntu|debian)
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

for _ in $(seq 1 5); do
  [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)" = "yes" ] && break
  sleep 3
done

log "执行 Docker 安装后完整主机预检并生成脱敏机器证据..."
HOST_PREFLIGHT_ARGS=(
  --project-dir "$INSTALL_DIR"
  --env-file "$ENV_FILE"
  --release-id "$(tr -d '\r\n' < "$INSTALL_DIR/.release-id")"
  --report "$INSTALL_DIR/release-evidence/host-preflight-readiness.json"
)
case "${ALLOW_OCCUPIED_PORTS:-false}" in
  1|true|TRUE|yes|YES|on|ON)
    HOST_PREFLIGHT_ARGS+=(--allow-occupied-ports)
    ;;
esac
DOMAIN="$DOMAIN" \
  REQUIRE_DOCKER=true \
  REQUIRE_BASE_TOOLS=true \
  MIN_POSTGRES_CLIENT_VERSION="${POSTGRES_CLIENT_MAJOR}.0" \
  REQUIRE_TIME_SYNC=true \
  node -- "$INSTALL_DIR/scripts/release/audit-host-preflight.mjs" "${HOST_PREFLIGHT_ARGS[@]}"

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
mkdir -p "$INSTALL_DIR"/{docker/nginx/ssl,docker/backups,docker/monitoring,apps/server/logs,certs,release-evidence}
mkdir -p "$PLATFORM_ROOT"/{shared/nginx-ssl,releases,release-packages,incoming,release-evidence} "$BACKUP_DIR"
# 静态资源挂载目录
mkdir -p /var/guoxue/{uploads,static}

# ── 6. 固定发布包复核 ──
log "使用当前已上传并验收的固定发布包: $INSTALL_DIR"
log "发布标识: $RELEASE_ID"
if [ -d "$INSTALL_DIR/.git" ]; then
  RELEASE_COMMIT=$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || true)
  [ -n "$RELEASE_COMMIT" ] && log "发布提交: $RELEASE_COMMIT"
fi

# ── 7. 配置环境变量 ──
if [ ! -f "$ENV_FILE" ]; then
  log "生成完整 .env.production 模板..."
  mkdir -p "$(dirname "$ENV_FILE")"
  cp "$INSTALL_DIR/docker/.env.production.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  warn "已生成 $ENV_FILE；请填写全部真实配置后重新运行"
  warn "发布脚本会拒绝占位域名、弱密钥和未形成闭环的核心配置"
  exit 78
fi

log "校验生产环境变量与 Compose 配置..."
ENV_DIR="$(cd "$(dirname "$ENV_FILE")" && pwd)"
ENV_NAME="$(basename "$ENV_FILE")"
docker run --rm \
  -v "$INSTALL_DIR:/app:ro" \
  -v "$ENV_DIR:/runtime-env:ro" \
  -v "$INSTALL_DIR/release-evidence:/evidence" \
  -w /app \
  node:20-slim \
  node scripts/migration/check-env.mjs "/runtime-env/$ENV_NAME" --full \
    --deploy-target "$DEPLOY_TARGET" \
    --node-role "$NODE_ROLE" \
    --report /evidence/environment-readiness.json
chmod 600 "$INSTALL_DIR/release-evidence/environment-readiness.json"

CONFIG_DOMAIN=$(sed -n 's/^PUBLIC_DOMAIN=//p' "$ENV_FILE" | tail -1 | tr -d '\r')
if [ "$CONFIG_DOMAIN" != "$DOMAIN" ]; then
  err "DOMAIN($DOMAIN) 与 .env.production 的 PUBLIC_DOMAIN($CONFIG_DOMAIN) 不一致"
  exit 64
fi

cd "$INSTALL_DIR/docker"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file "$ENV_FILE")
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  COMPOSE+=( -f docker-compose.tencent.yml )
fi
"${COMPOSE[@]}" config -q

# ── 8. SSL 证书 ──
SSL_DIR="$PLATFORM_ROOT/shared/nginx-ssl"
if [ "$DEPLOY_TARGET" = "standard" ]; then
  rm -rf "$INSTALL_DIR/docker/nginx/ssl"
  ln -s "$SSL_DIR" "$INSTALL_DIR/docker/nginx/ssl"
fi
if [ "$DEPLOY_TARGET" = "standard" ] && [ ! -f "$SSL_DIR/fullchain.pem" ] && [ -n "$LETSENCRYPT_EMAIL" ]; then
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
    warn "可以稍后运行: bash docker/nginx/setup-ssl.sh"
  fi
fi

# ── 9. 拉取镜像并启动服务 ──
log "启动服务..."
cd "$INSTALL_DIR/docker"

# 创建 Docker 网络（如果不存在）
docker network create guoxue-net 2>/dev/null || true
docker network create monitoring 2>/dev/null || true

# 仅自建架构启动本地数据库与缓存。托管架构不得显式点名 profile 内的
# postgres/redis，否则 Docker Compose 会绕过 profile 并误启动本地空服务。
if [ "$DEPLOY_TARGET" = "standard" ]; then
  "${COMPOSE[@]}" up -d --build postgres redis
else
  log "托管架构：不启动本地 PostgreSQL / Redis，使用生产环境文件中的托管连接"
fi

# 数据库初始化必须显式选择，禁止把“新服务器”误判成“空数据库”。
if [ "$DATABASE_MODE" = "prepare" ]; then
  if [ "$DEPLOY_TARGET" = "standard" ]; then
    warn "本地 PostgreSQL / Redis 已启动，但尚未启动业务服务。"
  else
    warn "托管 PostgreSQL / Redis 未被本脚本修改，尚未启动业务服务。"
  fi
  warn "若要恢复旧库：托管/独立数据库使用 scripts/migration/restore-postgres.sh；本机容器库才使用 docker/pg-restore.sh。"
  warn "恢复后先执行 prisma migrate deploy 与 verify-postgres.sh，再以 DATABASE_MODE=restored 重跑。"
  warn "若确认创建全新空库：以 DATABASE_MODE=empty CONFIRM_EMPTY_DATABASE=YES 重跑。"
  exit 78
fi

if [ "$DATABASE_MODE" = "empty" ]; then
  if [ "${CONFIRM_EMPTY_DATABASE:-}" != "YES" ]; then
    err "创建全新空库必须同时设置 CONFIRM_EMPTY_DATABASE=YES"
    exit 64
  fi
  "${COMPOSE[@]}" run --rm --build -e CONFIRM_EMPTY_DATABASE=YES server \
    sh -c "cd /app/apps/server && sh prisma/migrations-deploy/bootstrap-empty-database.sh"
fi

"${COMPOSE[@]}" up -d --build

# ── 10. 等待健康检查 ──
log "等待服务就绪并确认运行版本..."
for i in $(seq 1 30); do
  sleep 2
  if "${COMPOSE[@]}" exec -T server node -e \
    "require('http').get('http://localhost:3000/api/v1/health/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" \
    > /dev/null 2>&1; then
    SETUP_RUNTIME_RELEASE_ID=$("${COMPOSE[@]}" exec -T server node -e \
      "require('http').get('http://localhost:3000/api/v1/health/live',r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const p=JSON.parse(b);const d=p&&p.data&&typeof p.data==='object'?p.data:p;if(d.status!=='alive')process.exit(1);process.stdout.write(String(d.releaseId||''))}catch{process.exit(1)}})}).on('error',()=>process.exit(1))" \
      2>/dev/null || echo "")
    if [ "$SETUP_RUNTIME_RELEASE_ID" = "$RELEASE_ID" ]; then
      log "✅ 服务已就绪且运行版本一致: $SETUP_RUNTIME_RELEASE_ID"
      break
    fi
    if [ -n "$SETUP_RUNTIME_RELEASE_ID" ]; then
      warn "服务已就绪，但运行版本不一致：期望 $RELEASE_ID，实际 $SETUP_RUNTIME_RELEASE_ID"
    fi
  fi
  if [ "$i" -eq 30 ]; then
    err "服务启动或运行版本确认超时，请检查: docker compose logs"
    exit 1
  fi
done

# ── 11. 数据库状态复核 ──
log "复核数据库迁移账本..."
docker exec guoxue-server \
  pnpm --dir /app/apps/server exec prisma migrate status

# ── 12. 仅在运维节点启动生产监控与值班告警 ──
if [ "$NODE_ROLE" = "operations" ]; then
  log "运维节点：渲染 Alertmanager 私密配置..."
  docker run --rm \
    -v "$INSTALL_DIR:/app" \
    -v "$ENV_DIR:/runtime-env:ro" \
    -w /app \
    node:20-slim \
    node scripts/release/render-monitoring-config.mjs "/runtime-env/$ENV_NAME"

  MONITORING_COMPOSE=(
    docker compose
    -f monitoring/docker-compose.yml
    --env-file "$ENV_FILE"
  )
  "${MONITORING_COMPOSE[@]}" config -q
  "${MONITORING_COMPOSE[@]}" up -d

  log "等待监控栈就绪..."
  for i in $(seq 1 30); do
    sleep 2
    if curl -fsS http://127.0.0.1:9090/-/ready >/dev/null 2>&1 \
      && curl -fsS http://127.0.0.1:9093/-/ready >/dev/null 2>&1 \
      && curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
      log "✅ Prometheus、Alertmanager、Grafana 已就绪"
      break
    fi
    if [ "$i" -eq 30 ]; then
      err "监控栈启动超时，请检查 docker compose -f monitoring/docker-compose.yml logs"
      exit 1
    fi
  done
else
  log "业务节点：跳过监控栈，避免重复告警和复制运维密钥"
fi

# ── 13. 配置自启动 ──
log "配置服务自启动..."
ln -sfn "$INSTALL_DIR" "$PLATFORM_ROOT/current.next"
mv -Tf "$PLATFORM_ROOT/current.next" "$RUNTIME_DIR"
cat > /etc/systemd/system/guoxue.service << SERVEOF
[Unit]
Description=国学平台 Docker Compose 服务
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
Environment=COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
Environment=DEPLOY_TARGET=$DEPLOY_TARGET
Environment=NODE_ROLE=$NODE_ROLE
Environment="PLATFORM_ROOT=$PLATFORM_ROOT"
Environment="RUNTIME_DIR=$RUNTIME_DIR"
Environment="ENV_FILE=$ENV_FILE"
WorkingDirectory=$RUNTIME_DIR/docker
ExecStart=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh up -d
ExecStop=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh down
ExecReload=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh restart server
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVEOF

if [ "$NODE_ROLE" = "operations" ]; then
  cat > /etc/systemd/system/guoxue-monitoring.service << SERVEOF
[Unit]
Description=国学平台生产监控与告警服务
Requires=docker.service guoxue.service
After=docker.service network-online.target guoxue.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
Environment=COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
WorkingDirectory=$RUNTIME_DIR/docker
ExecStart=/usr/bin/docker compose -f monitoring/docker-compose.yml --env-file $ENV_FILE up -d
ExecStop=/usr/bin/docker compose -f monitoring/docker-compose.yml --env-file $ENV_FILE down
ExecReload=/usr/bin/docker compose -f monitoring/docker-compose.yml --env-file $ENV_FILE restart
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVEOF
fi
systemctl daemon-reload
systemctl enable guoxue.service
if [ "$NODE_ROLE" = "operations" ]; then
  systemctl enable guoxue-monitoring.service
else
  systemctl disable --now guoxue-monitoring.service >/dev/null 2>&1 || true
fi

# ── 14. 仅由运维节点执行数据库备份与镜像清理 ──
BACKUP_SCRIPT="$RUNTIME_DIR/docker/pg-backup.sh"
TLS_RENEW_SCRIPT="$RUNTIME_DIR/docker/renew-ssl.sh"
EXISTING_CRON="$(crontab -l 2>/dev/null || true)"
FILTERED_CRON="$(
  printf '%s\n' "$EXISTING_CRON" \
    | grep -v '/var/log/guoxue-backup.log' \
    | grep -v '/var/log/guoxue-cleanup.log' \
    | grep -v '/var/log/guoxue-tls-renewal.log' \
    | grep -v 'certbot renew.*guoxue-nginx' \
    || true
)"
if [ "$NODE_ROLE" = "operations" ]; then
  log "运维节点：配置定时备份与安全镜像清理..."
  {
    printf '%s\n' "$FILTERED_CRON"
    echo "0 3 * * * DEPLOY_TARGET=$DEPLOY_TARGET ENV_FILE=$ENV_FILE BACKUP_DIR=$BACKUP_DIR bash $BACKUP_SCRIPT 30 >> /var/log/guoxue-backup.log 2>&1"
    # 只清理悬空镜像和过期构建缓存；禁止 system prune -a 删除旧版回滚镜像。
    echo "0 4 * * 0 ( docker image prune -f && docker builder prune -f --filter 'until=168h' ) >> /var/log/guoxue-cleanup.log 2>&1"
    if [ "$DEPLOY_TARGET" = "standard" ]; then
      echo "17 3 * * * DEPLOY_TARGET=standard PLATFORM_ROOT=$PLATFORM_ROOT ENV_FILE=$ENV_FILE DOMAIN=$DOMAIN bash $TLS_RENEW_SCRIPT >> /var/log/guoxue-tls-renewal.log 2>&1"
    fi
  } | sed '/^[[:space:]]*$/d' | crontab -
else
  log "业务节点：移除重复数据库备份计划，保留其他既有定时任务"
  {
    printf '%s\n' "$FILTERED_CRON"
    if [ "$DEPLOY_TARGET" = "standard" ]; then
      echo "17 3 * * * DEPLOY_TARGET=standard PLATFORM_ROOT=$PLATFORM_ROOT ENV_FILE=$ENV_FILE DOMAIN=$DOMAIN bash $TLS_RENEW_SCRIPT >> /var/log/guoxue-tls-renewal.log 2>&1"
    fi
  } | sed '/^[[:space:]]*$/d' | crontab -
fi

# ── 15. 显示状态 ──
echo ""
echo "══════════════════════════════════════════════════════"
log "部署完成！"
echo "══════════════════════════════════════════════════════"
echo "  API:       https://$DOMAIN/api/v1/health"
echo "  Swagger:   https://$DOMAIN/api-docs"
if [ "$NODE_ROLE" = "operations" ]; then
  echo "  Grafana:   https://$DOMAIN/grafana/ (内网)"
fi
echo "  节点角色:  $NODE_ROLE"
echo ""
echo "  管理命令:"
echo "    systemctl status guoxue       # 查看服务状态"
echo "    docker compose logs -f         # 查看日志"
if [ "$DEPLOY_TARGET" = "standard" ]; then
  echo "    docker exec -it guoxue-postgres psql -U guoxue  # 本地数据库"
else
  echo "    psql \"\$DATABASE_URL\"  # 托管数据库（先从受控环境注入连接串）"
fi
echo ""
echo "  当前版本: $RUNTIME_DIR -> $INSTALL_DIR"
if [ "$NODE_ROLE" = "operations" ]; then
  echo "  备份: $BACKUP_DIR/"
fi
echo "  环境变量: $ENV_FILE"
echo "══════════════════════════════════════════════════════"
