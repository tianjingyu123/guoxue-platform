#!/bin/bash
# 国学平台 — 生产部署自动化脚本
# 用法: bash deploy.sh [--rollback] [--migrate] [--skip-health]
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
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
export COMPOSE_PROJECT_NAME
COMPOSE=(
  docker compose
  -f "$SCRIPT_DIR/docker-compose.yml"
  -f "$SCRIPT_DIR/docker-compose.prod.yml"
  --env-file "$ENV_FILE"
)
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NODE_ROLE="${NODE_ROLE:-operations}"
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  COMPOSE+=( -f "$SCRIPT_DIR/docker-compose.tencent.yml" )
elif [ "$DEPLOY_TARGET" != "standard" ]; then
  err "DEPLOY_TARGET 仅允许 standard 或 tencent"
  exit 64
fi
case "$NODE_ROLE" in
  app|operations) ;;
  *) err "NODE_ROLE 仅允许 app 或 operations"; exit 64 ;;
esac
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
if [ ! -f "$ENV_FILE" ]; then
  err "缺少生产环境文件: $ENV_FILE"
  info "请先复制并填写: cp .env.production.example .env.production"
  exit 2
fi

if [ "$SKIP_MIGRATE" = "false" ] && [ "${ALLOW_PROD_DB_MIGRATION:-}" != "reviewed" ]; then
  err "数据库迁移需要双重确认：同时传入 --migrate 并设置 ALLOW_PROD_DB_MIGRATION=reviewed"
  exit 64
fi
if [ "$SKIP_MIGRATE" = "false" ] && [ "${MIGRATION_DEPLOY_CONFIRM:-}" != "migrate:${RELEASE_ID:-}" ]; then
  err "数据库迁移必须绑定本次固定发布标识：MIGRATION_DEPLOY_CONFIRM=migrate:${RELEASE_ID:-<release-id>}"
  exit 64
fi
if [ "$SKIP_MIGRATE" = "false" ] &&
  [ "$DEPLOY_TARGET" = "tencent" ] &&
  [ "${MANAGED_DB_BACKUP_CONFIRMED:-}" != "reviewed" ]; then
  err "腾讯云托管数据库迁移前必须确认已有可恢复备份：MANAGED_DB_BACKUP_CONFIRMED=reviewed"
  exit 64
fi


log "════════════════════════════════════════════"
log "  国学平台 — 部署脚本"
log "════════════════════════════════════════════"
info "  项目目录: $PROJECT_DIR"
info "  部署架构: $DEPLOY_TARGET"
info "  节点角色: $NODE_ROLE"
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

log "  校验生产环境变量与 Compose 配置"
mkdir -p "$PROJECT_DIR/release-evidence"
ENV_REPORT="$PROJECT_DIR/release-evidence/environment-readiness.json"
if command -v node > /dev/null 2>&1; then
  node "$PROJECT_DIR/scripts/migration/check-env.mjs" "$ENV_FILE" --full \
    --deploy-target "$DEPLOY_TARGET" --node-role "$NODE_ROLE" --report "$ENV_REPORT"
else
  ENV_DIR="$(cd "$(dirname "$ENV_FILE")" && pwd)"
  ENV_NAME="$(basename "$ENV_FILE")"
  docker run --rm \
    -v "$PROJECT_DIR:/app:ro" \
    -v "$ENV_DIR:/runtime-env:ro" \
    -v "$PROJECT_DIR/release-evidence:/evidence" \
    -w /app \
    node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d \
    node scripts/migration/check-env.mjs "/runtime-env/$ENV_NAME" --full \
      --deploy-target "$DEPLOY_TARGET" \
      --node-role "$NODE_ROLE" \
      --report /evidence/environment-readiness.json
fi
chmod 600 "$ENV_REPORT"

PROJECT_DIR="$PROJECT_DIR" \
  ENV_FILE="$ENV_FILE" \
  REQUIRE_DOCKER=true \
  REQUIRE_BASE_TOOLS=true \
  REQUIRE_TIME_SYNC=true \
  REQUIRE_RELEASE_MANIFEST=true \
  ALLOW_OCCUPIED_PORTS=true \
  bash "$PROJECT_DIR/scripts/release/preflight-host.sh"
"${COMPOSE[@]}" config -q
log "  拉取并验收当前节点所需的锁定镜像"
node "$PROJECT_DIR/scripts/release/verify-container-images.mjs" \
  --project-dir "$PROJECT_DIR" \
  --node-role "$NODE_ROLE" \
  --report "$PROJECT_DIR/release-evidence/container-image-runtime-readiness.json"
chmod 600 "$PROJECT_DIR/release-evidence/container-image-runtime-readiness.json"

# 检查是否已有运行中的服务
RUNNING_BEFORE=$("${COMPOSE[@]}" ps --status running -q 2>/dev/null | wc -l || echo 0)

# 记录当前发布标识；固定发布包可以通过 RELEASE_ID 提供，不强制服务器保留 .git。
cd "$PROJECT_DIR"
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
PACKAGE_RELEASE_ID=""
if [ -f "$PROJECT_DIR/.release-id" ]; then
  PACKAGE_RELEASE_ID=$(tr -d '\r\n' < "$PROJECT_DIR/.release-id")
fi
RELEASE_ID="${RELEASE_ID:-${PACKAGE_RELEASE_ID:-$CURRENT_SHORT}}"

rollback_server_image() {
  local reason="$1"
  local rollback_release_id="${PREVIOUS_RELEASE_ID:-unversioned}"

  err "$reason，开始自动回滚运行实例..."
  if [ -z "${ROLLBACK_TAG:-}" ] || [ -z "${CURRENT_IMAGE_REF:-}" ]; then
    err "本次部署前没有可验证的旧镜像回滚点，无法自动回滚"
    return 1
  fi
  if ! docker image inspect "$ROLLBACK_TAG" > /dev/null 2>&1; then
    err "旧镜像回滚点不存在: $ROLLBACK_TAG"
    return 1
  fi
  if ! docker tag "$ROLLBACK_TAG" "$CURRENT_IMAGE_REF"; then
    err "恢复旧镜像标签失败: $CURRENT_IMAGE_REF"
    return 1
  fi
  if ! RELEASE_ID="$rollback_release_id" "${COMPOSE[@]}" up -d --no-deps server; then
    err "旧镜像容器重建失败"
    return 1
  fi

  local rollback_waited=0
  local rollback_runtime_release_id=""
  local rollback_container_health=""
  while [ "$rollback_waited" -lt 90 ]; do
    sleep 3
    rollback_waited=$((rollback_waited + 3))
    rollback_runtime_release_id=$("${COMPOSE[@]}" exec -T server node -e \
      "require('http').get('http://localhost:3000/api/v1/health/live',r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const p=JSON.parse(b);const d=p&&p.data&&typeof p.data==='object'?p.data:p;if(d.status!=='alive')process.exit(1);process.stdout.write(String(d.releaseId||''))}catch{process.exit(1)}})}).on('error',()=>process.exit(1))" \
      2>/dev/null || echo "")
    rollback_container_health=$(docker inspect --format \
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      guoxue-server 2>/dev/null || echo "")
    if [ "$rollback_runtime_release_id" = "$rollback_release_id" ] && \
      [ "$rollback_container_health" = "healthy" ]; then
      log "  ✓ 已回滚并确认旧运行版本与容器健康: $rollback_runtime_release_id"
      return 0
    fi
  done

  err "旧镜像已恢复，但 90 秒内未能同时确认运行版本与容器健康: $rollback_release_id"
  return 1
}

info "  当前分支: $CURRENT_BRANCH"
info "  当前提交: $CURRENT_SHORT"
info "  运行中容器: $RUNNING_BEFORE"

# ── 紧急回滚模式 ──
if [ "$ROLLBACK_MODE" = "true" ]; then
  log "▸ 执行紧急回滚..."

  if [ ! -s /tmp/guoxue-last-good-image ]; then
    err "找不到 /tmp/guoxue-last-good-image，拒绝猜测回滚目标"
    exit 1
  fi

  ROLLBACK_TAG=$(cat /tmp/guoxue-last-good-image)
  CURRENT_IMAGE_REF=$(cat /tmp/guoxue-current-image-ref 2>/dev/null || true)
  if [ -z "$CURRENT_IMAGE_REF" ]; then
    err "找不到原服务镜像引用，无法安全回滚"
    exit 1
  fi
  log "  回退镜像: $ROLLBACK_TAG"
  docker image inspect "$ROLLBACK_TAG" >/dev/null
  docker tag "$ROLLBACK_TAG" "$CURRENT_IMAGE_REF"
  "${COMPOSE[@]}" up -d --no-deps server

  DEPLOY_TARGET="$DEPLOY_TARGET" BASE_URL="${NODE_BASE_URL:-http://127.0.0.1}" \
    ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/health-check.sh"
  exit 0
fi

# ── 1. 预备份 ──
log "▸ 2/7 部署前备份"
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  if [ "$SKIP_MIGRATE" = "false" ]; then
    log "  已确认腾讯云托管数据库存在可恢复备份"
  else
    info "  本次为纯应用更新，不执行数据库迁移；托管数据库备份策略保持不变"
  fi
else
  bash "$SCRIPT_DIR/pg-backup.sh"
fi
echo "$CURRENT_COMMIT" > /tmp/last-good-commit
log "  已记录当前版本为回滚点: $CURRENT_SHORT"

# 记录迁移状态（如果跳过迁移则跳过）
if [ "$SKIP_MIGRATE" = "false" ]; then
  "${COMPOSE[@]}" exec -T server \
    pnpm --dir /app/apps/server exec prisma migrate status \
    > /tmp/migration-state-before.txt 2>/dev/null || true
fi

# ── 2. 固定发布版本复核 ──
log "▸ 3/7 复核固定发布版本"
if [ "$CURRENT_COMMIT" = "unknown" ] && { [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" = "unknown" ]; }; then
  err "无 .git 的生产发布包必须显式提供 RELEASE_ID"
  exit 64
fi
if [ "$CURRENT_COMMIT" != "unknown" ] && [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  err "检测到已跟踪文件存在未提交改动，拒绝部署非固定版本"
  git status --short --untracked-files=no
  exit 64
fi
info "  本次只部署固定发布包，不自动 fetch / pull: $RELEASE_ID"

# 构建会覆盖 Compose 默认镜像标签，因此必须先固定当前运行镜像。
CURRENT_CONTAINER=$(docker ps -q --filter 'name=^/guoxue-server$' | sed -n '1p')
if [ -n "$CURRENT_CONTAINER" ]; then
  CURRENT_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$CURRENT_CONTAINER")
  CURRENT_IMAGE_REF=$(docker inspect --format='{{.Config.Image}}' "$CURRENT_CONTAINER")
  PREVIOUS_RELEASE_ID=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' "$CURRENT_CONTAINER" | \
    sed -n 's/^RELEASE_ID=//p' | head -n 1)
  PREVIOUS_RELEASE_ID="${PREVIOUS_RELEASE_ID:-unversioned}"
  ROLLBACK_TAG="guoxue-server:rollback-$(date '+%Y%m%d%H%M%S')"
  docker tag "$CURRENT_IMAGE_ID" "$ROLLBACK_TAG"
  printf '%s\n' "$ROLLBACK_TAG" > /tmp/guoxue-last-good-image
  printf '%s\n' "$CURRENT_IMAGE_REF" > /tmp/guoxue-current-image-ref
  printf '%s\n' "$PREVIOUS_RELEASE_ID" > /tmp/guoxue-last-good-release-id
  log "  已固定旧镜像回滚点: $ROLLBACK_TAG ($PREVIOUS_RELEASE_ID)"
fi

# ── 3. 构建镜像 ──
log "▸ 4/7 构建新镜像"
"${COMPOSE[@]}" build server 2>&1 | tail -5
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
  MIGRATE_OUTPUT=$("${COMPOSE[@]}" run --rm --no-deps server \
    pnpm --dir /app/apps/server exec prisma migrate deploy 2>&1) || {
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
  "${COMPOSE[@]}" up -d --no-deps server
else
  # 首次启动
  "${COMPOSE[@]}" up -d
fi
log "  ✓ 服务更新指令已发送"

# ── 5. 等待健康 ──
WAITED=0
MAX_WAIT=120
HEALTH_READY="false"
if [ "$SKIP_HEALTH" = "false" ]; then
  log "▸ 6/7 等待服务健康检查..."
  while [ $WAITED -lt $MAX_WAIT ]; do
    sleep 3
    WAITED=$((WAITED + 3))

    HEALTH_RESULT=$("${COMPOSE[@]}" exec -T server node -e \
      "require('http').get('http://localhost:3000/api/v1/health/live',r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{const p=JSON.parse(b);const d=p&&p.data&&typeof p.data==='object'?p.data:p;process.stdout.write(String(d.status||'')+'\\t'+String(d.releaseId||''))}catch{process.exit(1)}})}).on('error',()=>process.exit(1))" \
      2>/dev/null || echo "")
    HEALTH_STATUS="${HEALTH_RESULT%%$'\t'*}"
    RUNTIME_RELEASE_ID=""
    if [[ "$HEALTH_RESULT" == *$'\t'* ]]; then
      RUNTIME_RELEASE_ID="${HEALTH_RESULT#*$'\t'}"
    fi
    CONTAINER_HEALTH_STATUS=$(docker inspect --format \
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      guoxue-server 2>/dev/null || echo "")
    if [ "$HEALTH_STATUS" = "alive" ] && \
      [ "$RUNTIME_RELEASE_ID" = "$RELEASE_ID" ] && \
      [ "$CONTAINER_HEALTH_STATUS" = "healthy" ]; then
      HEALTH_READY="true"
      log "  ✓ 服务存活、容器健康且运行版本一致 (${WAITED}s, $RUNTIME_RELEASE_ID)"
      break
    fi

    if [ "$HEALTH_STATUS" = "alive" ] && \
      [ "$RUNTIME_RELEASE_ID" = "$RELEASE_ID" ] && \
      [ "$CONTAINER_HEALTH_STATUS" != "healthy" ]; then
      info "  业务接口已就绪，等待 Docker 健康状态: ${CONTAINER_HEALTH_STATUS:-unknown}"
    fi

    if [ -n "$RUNTIME_RELEASE_ID" ] && [ "$RUNTIME_RELEASE_ID" != "$RELEASE_ID" ]; then
      warn "  服务已响应，但运行版本不一致：期望 $RELEASE_ID，实际 $RUNTIME_RELEASE_ID"
    fi

    info "  等待中... ${WAITED}s/$MAX_WAIT"
  done

  if [ "$HEALTH_READY" != "true" ]; then
    rollback_server_image "❌ 存活检查、容器健康或运行版本确认超时" || true

    # 恢复迁移状态
    if [ "$MIGRATION_APPLIED" = "true" ] && [ -f /tmp/migration-state-before.txt ]; then
      warn "  ⚠ 数据库迁移未自动回滚，请手动检查"
    fi

    err "本次部署失败，未切换为成功版本"
    exit 1
  fi
fi

log "▸ 7/7 数据库迁移 $([ "$MIGRATION_APPLIED" = "true" ] && echo '(已在启动前应用)' || echo '(安全默认：已跳过)')"

# 执行完整健康检查
if [ "$SKIP_HEALTH" = "false" ]; then
  log "执行部署后验证..."
  if ! DEPLOY_TARGET="$DEPLOY_TARGET" BASE_URL="${NODE_BASE_URL:-http://127.0.0.1}" \
    ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/health-check.sh"; then
    rollback_server_image "❌ 部署后完整健康验证失败" || true
    if [ "$MIGRATION_APPLIED" = "true" ] && [ -f /tmp/migration-state-before.txt ]; then
      warn "  ⚠ 数据库迁移未自动回滚，请按迁移记录人工复核"
    fi
    exit 1
  fi
fi

# ── 完成 ──
echo ""
log "════════════════════════════════════════════"
log "  ✅ 部署完成!"
log "════════════════════════════════════════════"
info "  当前版本: $RELEASE_ID"
info "  部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
