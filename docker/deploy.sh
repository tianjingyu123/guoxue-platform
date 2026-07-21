#!/bin/bash
# 国学平台 — 生产部署自动化脚本
# 用法: ./deploy.sh [--rollback] [--migrate] [--skip-health]
#
# 功能:
#   1. 部署前自动备份
#   2. 构建新镜像
#   3. 滚动更新服务
#   4. 数据库迁移
#   5. 部署后健康验证
#   6. 失败自动回滚
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()   { echo -e "${YELLOW}[warn]${NC} $1"; }
err()    { echo -e "${RED}[error]${NC} $1"; }
info()   { echo -e "${BLUE}[info]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
SKIP_MIGRATE="true"
MIGRATION_APPLIED="false"
SKIP_HEALTH="false"
ROLLBACK_MODE="false"

# ── 参数解析 ──
while [ $# -gt 0 ]; do
  case "$1" in
    --rollback)      ROLLBACK_MODE="true"; shift ;;
    --migrate)       SKIP_MIGRATE="false"; shift ;;
    --skip-migrate)  SKIP_MIGRATE="true"; shift ;;
    --skip-health)   SKIP_HEALTH="true"; shift ;;
    *)               err "未知参数: $1"; exit 1 ;;
  esac
done

cd "$SCRIPT_DIR"
if [ "$SKIP_MIGRATE" = "false" ] && [ "${ALLOW_PROD_DB_MIGRATION:-}" != "reviewed" ]; then
  err "数据库迁移需要双重确认：同时传入 --migrate 并设置 ALLOW_PROD_DB_MIGRATION=reviewed"
  exit 64
fi


log "════════════════════════════════════════════"
log "  国学平台 — 部署脚本"
log "════════════════════════════════════════════"
info "  项目目录: $PROJECT_DIR"
info "  当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ── 0. 检查 Docker 状态 ──
log "▸ 1/7 环境检查"

if ! docker info > /dev/null 2>&1; then
  err "Docker 未运行!"
  exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
  err "docker compose 不可用!"
  exit 1
fi

# 检查是否已有运行中的服务
RUNNING_BEFORE=$(docker compose $COMPOSE_FILES ps --status running -q 2>/dev/null | wc -l || echo 0)

# 记录当前 Git commit（用于回滚）
cd "$PROJECT_DIR"
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

info "  当前分支: $CURRENT_BRANCH"
info "  当前提交: $CURRENT_SHORT"
info "  运行中容器: $RUNNING_BEFORE"

# ── 紧急回滚模式 ──
if [ "$ROLLBACK_MODE" = "true" ]; then
  log "▸ 执行紧急回滚..."

  # 查找上一次备份
  LATEST_BACKUP=$(ls -t backups/guoxue_*.sql.gz 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    warn "建议恢复数据库至最近备份: $LATEST_BACKUP"
    read -p "是否恢复数据库备份? (y/n): " RESTORE_DB
    if [ "$RESTORE_DB" = "y" ]; then
      info "数据库恢复由 pg-restore.sh 手动执行以确保安全"
      info "请在当前窗口运行: ./pg-restore.sh $LATEST_BACKUP"
    fi
  fi

  # 回到上一个 good commit
  if [ -f /tmp/last-good-commit ]; then
    ROLLBACK_COMMIT=$(cat /tmp/last-good-commit)
    log "  回退到: $ROLLBACK_COMMIT"
    git checkout "$ROLLBACK_COMMIT"
  else
    err "找不到 /tmp/last-good-commit 文件，请手动回退"
    exit 1
  fi

  # 重建并启动
  docker compose $COMPOSE_FILES build server
  docker compose $COMPOSE_FILES up -d --no-deps server

  sleep 10
  ./health-check.sh
  exit 0
fi

# ── 1. 预备份 ──
log "▸ 2/7 部署前备份"
./pg-backup.sh
echo "$CURRENT_COMMIT" > /tmp/last-good-commit
log "  已记录当前版本为回滚点: $CURRENT_SHORT"

# 记录迁移状态（如果跳过迁移则跳过）
if [ "$SKIP_MIGRATE" = "false" ]; then
  docker compose $COMPOSE_FILES exec -T server sh -c "cd /app/apps/server && npx prisma migrate status 2>/dev/null" > /tmp/migration-state-before.txt 2>/dev/null || true
fi

# ── 2. 检查是否有新代码 ──
log "▸ 3/7 检查代码更新"
git fetch origin "$CURRENT_BRANCH" 2>/dev/null || warn "  无法 fetch remote (继续部署本地代码)"
NEW_COMMITS=$(git rev-list --count "$CURRENT_BRANCH...origin/$CURRENT_BRANCH" 2>/dev/null || echo "N/A")
info "  远程新提交数: $NEW_COMMITS"

# ── 3. 构建镜像 ──
log "▸ 4/7 构建新镜像"
docker compose $COMPOSE_FILES build server 2>&1 | tail -5
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  err "镜像构建失败! 回退..."
  # 不需要回退——旧镜像和旧代码都还在
  exit 1
fi
log "  ✓ 镜像构建成功"

# 数据库迁移必须在新服务启动前执行，避免新代码先读取尚未落地的字段。
# 默认跳过；只有显式双重确认后才会运行。
if [ "$SKIP_MIGRATE" = "false" ]; then
  log "▸ 5/7 执行已审查的数据库迁移"
  MIGRATE_OUTPUT=$(docker compose $COMPOSE_FILES run --rm --no-deps server \
    sh -c "cd /app/apps/server && npx prisma migrate deploy" 2>&1) || {
    err "数据库迁移失败，未启动新服务"
    warn "迁移输出: $MIGRATE_OUTPUT"
    exit 1
  }
  MIGRATION_APPLIED="true"
  SKIP_MIGRATE="true"
  log "  ✓ 已审查迁移执行完成"
fi

# ── 4. 滚动更新 ──
log "▸ 5/7 滚动更新服务"
if [ "$RUNNING_BEFORE" -gt 0 ]; then
  # 零停机更新：仅重建 server 容器
  docker compose $COMPOSE_FILES up -d --no-deps server
else
  # 首次启动
  docker compose $COMPOSE_FILES up -d
fi
log "  ✓ 服务更新指令已发送"

# ── 5. 等待健康 ──
WAITED=0
MAX_WAIT=60
if [ "$SKIP_HEALTH" = "false" ]; then
  log "▸ 6/7 等待服务健康检查..."
  while [ $WAITED -lt $MAX_WAIT ]; do
    sleep 3
    WAITED=$((WAITED + 3))

    HEALTH=$(curl -sf http://localhost:3000/api/v1/health/live 2>/dev/null || echo "")
    if [ "$(echo "$HEALTH" | grep -c 'alive' 2>/dev/null || echo 0)" -gt 0 ]; then
      log "  ✓ 服务存活 (${WAITED}s)"
      break
    fi

    info "  等待中... ${WAITED}s/$MAX_WAIT"
  done

  if [ $WAITED -ge $MAX_WAIT ]; then
    err "❌ 健康检查超时! 自动回滚..."

    # 回滚代码
    git checkout "$CURRENT_COMMIT"
    docker compose $COMPOSE_FILES build server
    docker compose $COMPOSE_FILES up -d --no-deps server

    # 恢复迁移状态
    if [ "$MIGRATION_APPLIED" = "true" ] && [ -f /tmp/migration-state-before.txt ]; then
      warn "  ⚠ 数据库迁移未自动回滚，请手动检查"
    fi

    err "已回滚到提交 $CURRENT_SHORT"
    exit 1
  fi
fi

log "▸ 7/7 数据库迁移 $([ "$MIGRATION_APPLIED" = "true" ] && echo '(已在启动前应用)' || echo '(安全默认：已跳过)')"

# ── 完成 ──
echo ""
log "════════════════════════════════════════════"
log "  ✅ 部署完成!"
log "════════════════════════════════════════════"
info "  当前版本: $(git rev-parse --short HEAD)"
info "  部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 执行完整健康检查
if [ "$SKIP_HEALTH" = "false" ]; then
  log "执行部署后验证..."
  ./health-check.sh
fi
