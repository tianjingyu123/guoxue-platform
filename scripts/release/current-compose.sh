#!/bin/bash
# systemd/值班入口：每次从权威 current 目录读取发布标识后再执行 Compose。
set -euo pipefail

PLATFORM_ROOT="${PLATFORM_ROOT:-/opt/guoxue}"
RUNTIME_DIR="${RUNTIME_DIR:-$PLATFORM_ROOT/current}"
ENV_FILE="${ENV_FILE:-$PLATFORM_ROOT/shared/.env.production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"

if [ "$#" -eq 0 ]; then
  echo "用法: $0 <compose-command> [args...]" >&2
  exit 64
fi

CURRENT_DIR=$(readlink -f "$RUNTIME_DIR" 2>/dev/null || true)
case "$CURRENT_DIR" in
  "$PLATFORM_ROOT"/releases/*) ;;
  *)
    echo "current 未指向受管发布目录: $CURRENT_DIR" >&2
    exit 64
    ;;
esac

if [ ! -f "$CURRENT_DIR/.release-id" ]; then
  echo "当前发布目录缺少 .release-id: $CURRENT_DIR" >&2
  exit 64
fi
RELEASE_ID=$(tr -d '\r\n' < "$CURRENT_DIR/.release-id")
if [[ ! "$RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]]; then
  echo "当前发布标识格式无效: $RELEASE_ID" >&2
  exit 64
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "生产环境文件不存在: $ENV_FILE" >&2
  exit 64
fi

export COMPOSE_PROJECT_NAME RELEASE_ID
COMPOSE=(
  docker compose
  -f "$CURRENT_DIR/docker/docker-compose.yml"
  -f "$CURRENT_DIR/docker/docker-compose.prod.yml"
  --env-file "$ENV_FILE"
)
if [ "$DEPLOY_TARGET" = "tencent" ]; then
  COMPOSE+=( -f "$CURRENT_DIR/docker/docker-compose.tencent.yml" )
elif [ "$DEPLOY_TARGET" != "standard" ]; then
  echo "DEPLOY_TARGET 仅允许 standard 或 tencent" >&2
  exit 64
fi

exec "${COMPOSE[@]}" "$@"
