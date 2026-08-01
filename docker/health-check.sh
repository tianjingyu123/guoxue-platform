#!/bin/bash
# 国学平台 — 部署后健康检查验证脚本
# 用法: bash health-check.sh [--verbose]
# 退出码: 0=全部通过, 1=存在失败项
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  shift
  if "$@"; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
    return 0
  else
    echo -e "  ${RED}✗${NC} $label"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

check_ok() {
  local label="$1"
  local result="$2"
  if [ "$result" = "ok" ] || [ "$result" = "alive" ] || [ "$result" = "ready" ] || [ "$result" = "degraded" ]; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} $label ($result)"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo "════════════════════════════════════════════"
echo "  国学平台 — 健康检查验证"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.production}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
if [ -z "${BASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  BASE_URL=$(sed -n 's/^PUBLIC_API_URL=//p' "$ENV_FILE" | tail -1 | tr -d '\r')
fi
BASE_URL="${BASE_URL:-http://localhost}"

# ═══════════════ 1. 基础存活检查 ═══════════
echo "── 1. 基础存活 ──"

# Liveness（不依赖外部服务）
LIVE=$(curl -sf "$BASE_URL/api/v1/health/live" 2>/dev/null || echo '{"status":"fail"}')
LIVE_STATUS=$(echo "$LIVE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "fail")
check "存活检查 (liveness)" [ "$LIVE_STATUS" = "alive" ]

# Readiness（DB + Redis）
READY=$(curl -sf "$BASE_URL/api/v1/health/ready" 2>/dev/null || echo '{"status":"not_ready"}')
READY_STATUS=$(echo "$READY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "not_ready")
check "就绪检查 (readiness)" [ "$READY_STATUS" = "ready" ]

echo ""

# ═══════════════ 2. 完整健康报告 ═══════════
echo "── 2. 完整健康检查 ──"

HEALTH=$(curl -sf "$BASE_URL/api/v1/health" 2>/dev/null || echo '{}')
OVERALL=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "fail")

check_ok "整体状态" "$OVERALL"

# 检查各个依赖
for svc in db redis deepseek tencentCloud sms cos wechatPay wechatOpen liveStream im vod; do
  SVCS=$(echo "$HEALTH" | grep -o "\"$svc\":{[^}]*}" | head -1 || echo "")
  if [ -n "$SVCS" ]; then
    SVC_STATUS=$(echo "$SVCS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    case "$SVC_STATUS" in
      ok)         check_ok "$svc" "$SVC_STATUS" ;;
      degraded|unconfigured)
        echo -e "  ${YELLOW}⚠${NC} $svc: $SVC_STATUS"
        WARN=$((WARN + 1))
        ;;
      fail)
        echo -e "  ${RED}✗${NC} $svc: $SVC_STATUS"
        FAIL=$((FAIL + 1))
        ;;
      *)          echo -e "  ${YELLOW}?${NC} $svc: $SVC_STATUS" ;;
    esac
  fi
done

echo ""

# ═══════════════ 3. Docker 容器状态 ═══════════
echo "── 3. Docker 容器状态 ──"

cd "$SCRIPT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  COMPOSE+=( -f docker-compose.tencent.yml )
elif [ "$DEPLOY_TARGET" != "standard" ]; then
  echo -e "  ${RED}✗${NC} 未知部署架构: $DEPLOY_TARGET"
  exit 64
fi
if [ -f "$ENV_FILE" ]; then
  COMPOSE+=(--env-file "$ENV_FILE")
fi

CONTAINERS=$("${COMPOSE[@]}" ps --format json 2>/dev/null | grep -o '"Name":"[^"]*"' | cut -d'"' -f4 || echo "")
for c in $CONTAINERS; do
  HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$c" 2>/dev/null || echo "no-check")
  RUNNING=$(docker inspect --format='{{.State.Running}}' "$c" 2>/dev/null || echo "false")
  if [ "$RUNNING" = "true" ]; then
    if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "no-check" ]; then
      echo -e "  ${GREEN}✓${NC} $c (${HEALTH_STATUS})"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}✗${NC} $c (${HEALTH_STATUS})"
      FAIL=$((FAIL + 1))
    fi
  else
    echo -e "  ${RED}✗${NC} $c (not running)"
    FAIL=$((FAIL + 1))
  fi
done

echo ""

# ═══════════════ 4. 端口监听 ═══════════
echo "── 4. 端口监听 ──"

check_port() {
  local port="$1"
  local label="$2"
  if curl -sf -o /dev/null --max-time 3 "http://localhost:$port" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} 端口 $port — $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} 端口 $port — $label (无响应)"
    WARN=$((WARN + 1))
  fi
}

check_port 80   "Nginx HTTP"
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  echo -e "  ${GREEN}✓${NC} 端口 443 — 由腾讯云 CLB 终止 TLS，本机无需监听"
  PASS=$((PASS + 1))
else
  if curl -skf -o /dev/null --max-time 3 "https://localhost" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} 端口 443 — Nginx HTTPS"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} 端口 443 — Nginx HTTPS (无响应)"
    WARN=$((WARN + 1))
  fi
fi

echo ""

# ═══════════════ 5. 定时任务 ─═ ═════════════
echo "── 5. 定时任务 ──"

if [ "$DEPLOY_TARGET" = "tencent" ]; then
  echo -e "  ${GREEN}✓${NC} 数据库备份 — 使用腾讯云托管数据库自动备份"
  PASS=$((PASS + 1))
elif crontab -l 2>/dev/null | grep -q "pg-backup"; then
  echo -e "  ${GREEN}✓${NC} 数据库备份定时任务已配置"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}⚠${NC} 数据库备份定时任务未配置"
  WARN=$((WARN + 1))
fi

echo ""

# ═══════════════ 汇总 ═══════════════
echo "════════════════════════════════════════════"
TOTAL=$((PASS + FAIL + WARN))

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}✅ 健康检查通过${NC}  "
else
  echo -e "  ${RED}❌ 健康检查存在失败项!${NC}"
fi

echo "  ✓ 通过: $PASS"
echo "  ⚠ 警告: $WARN"
echo "  ✗ 失败: $FAIL"
echo "  总计: $TOTAL"
echo "════════════════════════════════════════════"

exit $FAIL
