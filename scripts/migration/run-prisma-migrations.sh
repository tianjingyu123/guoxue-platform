#!/usr/bin/env bash
# 使用生产 server 镜像执行 Prisma 迁移，避免固定发布包依赖宿主机 node_modules/pnpm。
set -Eeuo pipefail

action="${1:-status}"
case "$action" in
  deploy|status) ;;
  *)
    echo "用法: bash scripts/migration/run-prisma-migrations.sh deploy|status" >&2
    exit 64
    ;;
esac

: "${TARGET_DATABASE_URL:?必须设置 TARGET_DATABASE_URL}"
: "${TARGET_RELEASE_ID:?必须设置 TARGET_RELEASE_ID}"
[[ "$TARGET_RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]] || {
  echo "TARGET_RELEASE_ID 格式无效" >&2
  exit 64
}

if [[ "$action" == "deploy" && "${MIGRATION_DEPLOY_CONFIRM:-}" != "migrate:${TARGET_RELEASE_ID}" ]]; then
  echo "执行迁移必须设置 MIGRATION_DEPLOY_CONFIRM=migrate:${TARGET_RELEASE_ID}" >&2
  exit 64
fi

for command_name in docker bash; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "缺少命令：$command_name" >&2
    exit 1
  }
done
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 不可用" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd -P)"
env_file="${PRISMA_COMPOSE_ENV_FILE:-/opt/guoxue/shared/.env.production}"
if [[ ! -f "$env_file" && -f "$project_root/docker/.env.production" ]]; then
  env_file="$project_root/docker/.env.production"
fi
[[ -f "$env_file" ]] || {
  echo "生产环境文件不存在：$env_file" >&2
  exit 1
}

compose=(
  docker compose
  -f "$project_root/docker/docker-compose.yml"
  -f "$project_root/docker/docker-compose.prod.yml"
  --env-file "$env_file"
)

"${compose[@]}" config -q
"${compose[@]}" build server
DATABASE_URL="$TARGET_DATABASE_URL" "${compose[@]}" run --rm --no-deps \
  -e DATABASE_URL \
  -e PRISMA_HIDE_UPDATE_MESSAGE=1 \
  server \
  pnpm --dir /app/apps/server exec prisma migrate "$action" \
    --schema=apps/server/prisma/schema.prisma

echo "Prisma migrate $action 已通过生产 server 镜像执行完成（release=$TARGET_RELEASE_ID）"
