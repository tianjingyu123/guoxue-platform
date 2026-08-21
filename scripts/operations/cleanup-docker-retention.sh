#!/usr/bin/env bash
# 清理服务器本地 Docker 历史构建产物，同时保留当前运行镜像和最近回滚点。
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/opt/guoxue}"
ROLLBACK_IMAGE_KEEP="${ROLLBACK_IMAGE_KEEP:-2}"
BUILDER_CACHE_MAX_AGE="${BUILDER_CACHE_MAX_AGE:-168h}"
SERVER_IMAGE_REPOSITORY="${SERVER_IMAGE_REPOSITORY:-guoxue-server}"

log() { printf '[docker-cleanup] %s\n' "$*"; }
fail() { printf '[docker-cleanup] FAIL %s\n' "$*" >&2; exit 64; }

[[ "$ROLLBACK_IMAGE_KEEP" =~ ^[0-9]+$ ]] || fail "ROLLBACK_IMAGE_KEEP 必须是整数"
[ "$ROLLBACK_IMAGE_KEEP" -ge 2 ] && [ "$ROLLBACK_IMAGE_KEEP" -le 10 ] \
  || fail "ROLLBACK_IMAGE_KEEP 必须介于 2 和 10"
[[ "$BUILDER_CACHE_MAX_AGE" =~ ^[1-9][0-9]*[smh]$ ]] \
  || fail "BUILDER_CACHE_MAX_AGE 必须是 Docker 时长，例如 168h"
[[ "$SERVER_IMAGE_REPOSITORY" =~ ^[a-z0-9][a-z0-9._/-]*$ ]] \
  || fail "SERVER_IMAGE_REPOSITORY 格式无效"

for command_name in docker flock df sort grep tail; do
  command -v "$command_name" >/dev/null 2>&1 || fail "缺少必要命令：$command_name"
done
docker info >/dev/null 2>&1 || fail "Docker 未运行"

mkdir -p "$ROOT_DIR"
# 与固定包激活共用发布锁，避免清理与镜像构建/回滚并发。
exec 8>"$ROOT_DIR/.release-activation.lock"
flock -n 8 || fail "已有发布或回滚任务正在执行"
exec 9>"$ROOT_DIR/.docker-cleanup.lock"
flock -n 9 || fail "已有 Docker 清理任务正在执行"

log "清理前磁盘状态"
df -h "$ROOT_DIR"
df -ih "$ROOT_DIR"
docker system df
mapfile -t rollback_tags < <(
  docker image ls "$SERVER_IMAGE_REPOSITORY" \
    --format '{{.CreatedAt}}|{{.Tag}}' \
    | grep -E '\|rollback-[A-Za-z0-9._-]+$' \
    | sort -r \
    | while IFS='|' read -r _ tag; do printf '%s\n' "$tag"; done
)

for tag in "${rollback_tags[@]}"; do
  [[ "$tag" =~ ^rollback-[A-Za-z0-9._-]+$ ]] || fail "发现无效回滚标签：$tag"
done

if [ "${#rollback_tags[@]}" -gt "$ROLLBACK_IMAGE_KEEP" ]; then
  log "保留最近 $ROLLBACK_IMAGE_KEEP 个回滚镜像，移除 $(( ${#rollback_tags[@]} - ROLLBACK_IMAGE_KEEP )) 个旧标签"
  for tag in "${rollback_tags[@]:ROLLBACK_IMAGE_KEEP}"; do
    docker image rm "$SERVER_IMAGE_REPOSITORY:$tag"
  done
else
  log "回滚镜像仅 ${#rollback_tags[@]} 个，无需移除"
fi

log "清理超过 $BUILDER_CACHE_MAX_AGE 且未被使用的构建缓存"
docker builder prune -af --filter "until=$BUILDER_CACHE_MAX_AGE" | tail -n 30
log "清理悬空镜像；不清理容器、数据卷或网络"
docker image prune -f | tail -n 30

log "清理后磁盘状态"
df -h "$ROOT_DIR"
df -ih "$ROOT_DIR"
docker system df
