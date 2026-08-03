#!/usr/bin/env bash
# 新服务器只读预检：在安装或部署前验证容量、网络、运行时和发布包边界。
set -euo pipefail

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '[PASS] %s\n' "$1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '[FAIL] %s\n' "$1" >&2
}

is_true() {
  case "${1,,}" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

version_at_least() {
  local actual="$1"
  local minimum="$2"
  local actual_major actual_minor minimum_major minimum_minor
  actual_major="${actual%%.*}"
  actual_minor="${actual#*.}"
  actual_minor="${actual_minor%%.*}"
  minimum_major="${minimum%%.*}"
  minimum_minor="${minimum#*.}"
  minimum_minor="${minimum_minor%%.*}"
  [[ "$actual_major" =~ ^[0-9]+$ && "$actual_minor" =~ ^[0-9]+$ ]] || return 1
  (( actual_major > minimum_major || (actual_major == minimum_major && actual_minor >= minimum_minor) ))
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$REPO_ROOT}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/docker/.env.production}"
DOMAIN="${DOMAIN:-}"
MIN_CPU_CORES="${MIN_CPU_CORES:-2}"
MIN_MEMORY_MB="${MIN_MEMORY_MB:-4096}"
MIN_DISK_GB="${MIN_DISK_GB:-40}"
MIN_INODE_PERCENT="${MIN_INODE_PERCENT:-10}"
MIN_DOCKER_VERSION="${MIN_DOCKER_VERSION:-24.0}"
MIN_COMPOSE_VERSION="${MIN_COMPOSE_VERSION:-2.20}"
SUPPORTED_NODE_MAJORS="${SUPPORTED_NODE_MAJORS:-22 24}"
MIN_POSTGRES_CLIENT_VERSION="${MIN_POSTGRES_CLIENT_VERSION:-16.0}"
REQUIRE_DOCKER="${REQUIRE_DOCKER:-true}"
REQUIRE_RELEASE_MANIFEST="${REQUIRE_RELEASE_MANIFEST:-true}"
REQUIRE_BASE_TOOLS="${REQUIRE_BASE_TOOLS:-true}"
ALLOW_OCCUPIED_PORTS="${ALLOW_OCCUPIED_PORTS:-false}"
REQUIRE_TIME_SYNC="${REQUIRE_TIME_SYNC:-true}"

printf '国学平台新服务器只读预检\n'
printf '项目目录: %s\n' "$PROJECT_DIR"

if [ "$(uname -s 2>/dev/null || true)" = "Linux" ]; then
  pass "操作系统为 Linux"
else
  fail "生产主机必须使用 Linux"
fi

ARCH="$(uname -m 2>/dev/null || true)"
case "$ARCH" in
  x86_64|amd64|aarch64|arm64) pass "CPU 架构受支持: $ARCH" ;;
  *) fail "不支持的 CPU 架构: ${ARCH:-unknown}" ;;
esac

CPU_CORES="$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 0)"
if [[ "$CPU_CORES" =~ ^[0-9]+$ ]] && (( CPU_CORES >= MIN_CPU_CORES )); then
  pass "CPU 核数满足要求: ${CPU_CORES} 核"
else
  fail "CPU 不足: ${CPU_CORES:-0} 核，至少需要 ${MIN_CPU_CORES} 核"
fi

MEMORY_MB="$(awk '/MemAvailable:/ { print int($2 / 1024); found=1 } END { if (!found) print 0 }' /proc/meminfo 2>/dev/null || echo 0)"
if [[ "$MEMORY_MB" =~ ^[0-9]+$ ]] && (( MEMORY_MB >= MIN_MEMORY_MB )); then
  pass "可用内存满足要求: ${MEMORY_MB} MB"
else
  fail "可用内存不足: ${MEMORY_MB:-0} MB，至少需要 ${MIN_MEMORY_MB} MB"
fi

DISK_PATH="$PROJECT_DIR"
if [ ! -e "$DISK_PATH" ]; then
  DISK_PATH="$(dirname "$PROJECT_DIR")"
fi
while [ ! -e "$DISK_PATH" ] && [ "$DISK_PATH" != "/" ]; do
  DISK_PATH="$(dirname "$DISK_PATH")"
done
DISK_AVAILABLE_KB="$(df -Pk "$DISK_PATH" 2>/dev/null | awk 'NR == 2 { print $4 }')"
DISK_AVAILABLE_GB=$(( ${DISK_AVAILABLE_KB:-0} / 1024 / 1024 ))
if (( DISK_AVAILABLE_GB >= MIN_DISK_GB )); then
  pass "目标磁盘可用空间满足要求: ${DISK_AVAILABLE_GB} GB"
else
  fail "目标磁盘空间不足: ${DISK_AVAILABLE_GB} GB，至少需要 ${MIN_DISK_GB} GB"
fi

INODE_AVAILABLE_PERCENT="$(df -Pi "$DISK_PATH" 2>/dev/null | awk 'NR == 2 { gsub(/%/, "", $5); print 100 - $5 }')"
if [[ "$INODE_AVAILABLE_PERCENT" =~ ^[0-9]+$ ]] && (( INODE_AVAILABLE_PERCENT >= MIN_INODE_PERCENT )); then
  pass "inode 可用比例满足要求: ${INODE_AVAILABLE_PERCENT}%"
else
  fail "inode 可用比例不足: ${INODE_AVAILABLE_PERCENT:-0}%，至少需要 ${MIN_INODE_PERCENT}%"
fi

KERNEL_VERSION="$(uname -r 2>/dev/null | sed 's/[^0-9.].*$//' || true)"
if version_at_least "$KERNEL_VERSION" "5.4"; then
  pass "Linux 内核满足要求: $KERNEL_VERSION"
else
  fail "Linux 内核过旧或无法识别: ${KERNEL_VERSION:-unknown}，至少需要 5.4"
fi

if command -v timedatectl >/dev/null 2>&1; then
  TIME_SYNC="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)"
  if [ "$TIME_SYNC" = "yes" ]; then
    pass "系统时钟已通过 NTP 同步"
  elif is_true "$REQUIRE_TIME_SYNC"; then
    fail "系统时钟未确认 NTP 同步"
  else
    warn "系统时钟未确认 NTP 同步；安装完成后必须复核"
  fi
else
  warn "缺少 timedatectl，无法自动确认 NTP 同步"
fi

for command_name in bash awk df stat getent curl openssl tar sha256sum realpath flock cmp find comm; do
  if command -v "$command_name" >/dev/null 2>&1; then
    pass "基础命令可用: $command_name"
  elif is_true "$REQUIRE_BASE_TOOLS"; then
    fail "缺少基础命令: $command_name"
  else
    warn "缺少基础命令: $command_name；安装完成后必须复核"
  fi
done

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node --version 2>/dev/null | sed 's/^v//' || true)"
  NODE_MAJOR="${NODE_VERSION%%.*}"
  if [[ " $SUPPORTED_NODE_MAJORS " == *" $NODE_MAJOR "* ]]; then
    pass "Node.js 受支持的 LTS 运行时可用: $NODE_VERSION"
  else
    fail "Node.js 版本不受支持: ${NODE_VERSION:-unknown}，允许的 LTS 主版本: $SUPPORTED_NODE_MAJORS"
  fi
elif is_true "$REQUIRE_BASE_TOOLS"; then
  fail "缺少 Node.js；固定包验真、激活、回滚和证据生成需要 Node.js LTS（$SUPPORTED_NODE_MAJORS）"
else
  warn "缺少 Node.js；安装阶段必须补齐"
fi

for postgres_command in psql pg_restore; do
  if command -v "$postgres_command" >/dev/null 2>&1; then
    POSTGRES_CLIENT_VERSION="$($postgres_command --version 2>/dev/null | sed -n 's/.* \([0-9][0-9.]*\).*/\1/p' | head -n 1)"
    if version_at_least "$POSTGRES_CLIENT_VERSION" "$MIN_POSTGRES_CLIENT_VERSION"; then
      pass "PostgreSQL 客户端可用: $postgres_command $POSTGRES_CLIENT_VERSION"
    else
      fail "PostgreSQL 客户端版本过低或不可识别: $postgres_command ${POSTGRES_CLIENT_VERSION:-unknown}，至少需要 $MIN_POSTGRES_CLIENT_VERSION"
    fi
  elif is_true "$REQUIRE_BASE_TOOLS"; then
    fail "缺少 PostgreSQL 客户端命令: $postgres_command"
  else
    warn "缺少 PostgreSQL 客户端命令: $postgres_command；安装阶段必须补齐"
  fi
done

if [ -z "$DOMAIN" ] && [ -f "$ENV_FILE" ]; then
  DOMAIN="$(sed -n -e 's/^PUBLIC_DOMAIN=//p' -e 's/^DOMAIN=//p' "$ENV_FILE" | tail -n 1 | tr -d '\r' | sed 's/^https\?:\/\///; s/\/.*$//' || true)"
fi
if [ -n "$DOMAIN" ]; then
  if getent ahosts "$DOMAIN" >/dev/null 2>&1; then
    pass "域名 DNS 可解析: $DOMAIN"
  else
    fail "域名 DNS 无法解析: $DOMAIN"
  fi
else
  warn "尚未提供 DOMAIN，暂不执行 DNS 解析检查"
fi

if command -v ss >/dev/null 2>&1; then
  OCCUPIED_PORTS="$(ss -ltnH 2>/dev/null | awk '$4 ~ /:80$/ { seen[80]=1 } $4 ~ /:443$/ { seen[443]=1 } END { for (port in seen) print port }' | sort -n | paste -sd, -)"
  if [ -z "$OCCUPIED_PORTS" ]; then
    pass "公网入口端口 80/443 未被占用"
  elif is_true "$ALLOW_OCCUPIED_PORTS"; then
    warn "端口 ${OCCUPIED_PORTS} 已被占用；已通过 ALLOW_OCCUPIED_PORTS 显式放行"
  else
    fail "端口 ${OCCUPIED_PORTS} 已被占用；首次部署前必须释放或显式复核"
  fi
else
  warn "缺少 ss，无法自动检查 80/443 端口占用"
fi

if [ -f "$ENV_FILE" ]; then
  ENV_MODE="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || true)"
  if [[ "$ENV_MODE" =~ ^[0-7]{3,4}$ ]]; then
    ENV_PERMISSIONS=$((8#$ENV_MODE))
    if (( (ENV_PERMISSIONS & 077) == 0 )); then
      pass "生产环境文件权限安全: $ENV_MODE"
    else
      fail "生产环境文件权限过宽: $ENV_MODE，必须 chmod 600"
    fi
  else
    fail "无法读取生产环境文件权限"
  fi
else
  warn "生产环境文件尚未创建: $ENV_FILE"
fi

REQUIRED_PROJECT_FILES=(
  "package.json"
  "pnpm-lock.yaml"
  "docker/docker-compose.yml"
  "docker/docker-compose.prod.yml"
  "docker/deploy.sh"
  "scripts/migration/check-env.mjs"
)
for relative_path in "${REQUIRED_PROJECT_FILES[@]}"; do
  if [ -f "$PROJECT_DIR/$relative_path" ]; then
    pass "发布文件存在: $relative_path"
  else
    fail "发布文件缺失: $relative_path"
  fi
done

if is_true "$REQUIRE_RELEASE_MANIFEST"; then
  if [ -s "$PROJECT_DIR/.release-id" ] && [ -s "$PROJECT_DIR/RELEASE-MANIFEST.json" ]; then
    pass "固定发布包身份文件齐全"
  else
    fail "固定发布包缺少 .release-id 或 RELEASE-MANIFEST.json"
  fi
elif [ -s "$PROJECT_DIR/.release-id" ] && [ -s "$PROJECT_DIR/RELEASE-MANIFEST.json" ]; then
  pass "检测到固定发布包身份文件"
else
  warn "当前为源码工作树，尚未提供固定发布包身份文件"
fi

if is_true "$REQUIRE_DOCKER"; then
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    DOCKER_VERSION="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
    if version_at_least "$DOCKER_VERSION" "$MIN_DOCKER_VERSION"; then
      pass "Docker Server 可用: $DOCKER_VERSION"
    else
      fail "Docker Server 版本过低或不可识别: ${DOCKER_VERSION:-unknown}"
    fi
  else
    fail "Docker Server 不可用"
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION="$(docker compose version --short 2>/dev/null | sed 's/^v//' || true)"
    if version_at_least "$COMPOSE_VERSION" "$MIN_COMPOSE_VERSION"; then
      pass "Docker Compose 可用: $COMPOSE_VERSION"
    else
      fail "Docker Compose 版本过低或不可识别: ${COMPOSE_VERSION:-unknown}"
    fi
  else
    fail "Docker Compose 插件不可用"
  fi
else
  warn "本轮为 Docker 安装前预检，暂不要求 Docker 可用"
fi

printf '\n预检汇总: PASS=%d WARN=%d FAIL=%d\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"
if (( FAIL_COUNT > 0 )); then
  exit 1
fi
