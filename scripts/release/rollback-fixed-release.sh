#!/usr/bin/env bash
# 将生产应用回退到一个已验真、曾经部署成功的固定版本。
# 只回退应用代码和容器，不自动逆向回滚数据库迁移。
set -euo pipefail

export LC_ALL=C

log() { printf '[rollback] %s\n' "$*"; }
fail() { printf '[rollback] FAIL %s\n' "$*" >&2; exit 64; }

if [ "$#" -ne 2 ]; then
  fail "用法：rollback-fixed-release.sh <release-id> <同值确认>"
fi

TARGET_RELEASE_ID="$1"
CONFIRMATION="$2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="${ROOT_DIR:-/opt/guoxue}"
RELEASES_DIR="$ROOT_DIR/releases"
PACKAGES_DIR="$ROOT_DIR/release-packages"
EVIDENCE_DIR="$ROOT_DIR/release-evidence"
SHARED_ENV_FILE="${ENV_FILE:-$ROOT_DIR/shared/.env.production}"
SHARED_SSL_DIR="${SHARED_SSL_DIR:-$ROOT_DIR/shared/nginx-ssl}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NODE_ROLE="${NODE_ROLE:-operations}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
SCHEMA_COMPATIBILITY="${ALLOW_SCHEMA_COMPATIBLE_ROLLBACK:-false}"
VERIFY_ONLY="${ROLLBACK_VERIFY_ONLY:-false}"

[[ "$TARGET_RELEASE_ID" =~ ^[A-Za-z0-9._-]{8,80}$ ]] || fail "目标发布标识格式无效"
[ "$CONFIRMATION" = "$TARGET_RELEASE_ID" ] || fail "回滚确认值必须与目标发布标识完全一致"
case "$DEPLOY_TARGET" in standard|tencent) ;; *) fail "DEPLOY_TARGET 仅允许 standard 或 tencent" ;; esac
case "$NODE_ROLE" in app|operations) ;; *) fail "NODE_ROLE 仅允许 app 或 operations" ;; esac
case "$SCHEMA_COMPATIBILITY" in false|reviewed) ;; *) fail "ALLOW_SCHEMA_COMPATIBLE_ROLLBACK 仅允许 false 或 reviewed" ;; esac
case "$VERIFY_ONLY" in true|false) ;; *) fail "ROLLBACK_VERIFY_ONLY 仅允许 true 或 false" ;; esac
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]{1,62}$ ]] || fail "COMPOSE_PROJECT_NAME 格式无效"

for command_name in bash node tar sha256sum realpath flock stat awk ln mv rm; do
  command -v "$command_name" >/dev/null 2>&1 || fail "缺少必要命令：$command_name"
done
if [ "$VERIFY_ONLY" = "false" ]; then
  command -v docker >/dev/null 2>&1 || fail "缺少必要命令：docker"
  docker info >/dev/null 2>&1 || fail "Docker 未运行"
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 不可用"
fi

exec 9>"$ROOT_DIR/.release-activation.lock"
flock -n 9 || fail "已有发布或回滚任务正在执行"

TARGET_DIR="$(realpath -e "$RELEASES_DIR/$TARGET_RELEASE_ID")"
RELEASES_REAL="$(realpath -e "$RELEASES_DIR")"
case "$TARGET_DIR" in "$RELEASES_REAL"/*) ;; *) fail "目标发布目录越界" ;; esac
[ "$(tr -d '\r\n' < "$TARGET_DIR/.release-id")" = "$TARGET_RELEASE_ID" ] \
  || fail "目标目录与发布标识不一致"

CURRENT_DIR="$(realpath -e "$ROOT_DIR/current")"
case "$CURRENT_DIR" in "$RELEASES_REAL"/*) ;; *) fail "当前发布目录越界" ;; esac
[ -f "$CURRENT_DIR/.release-id" ] || fail "当前发布目录缺少 .release-id"
CURRENT_RELEASE_ID="$(tr -d '\r\n' < "$CURRENT_DIR/.release-id")"
[[ "$CURRENT_RELEASE_ID" =~ ^[A-Za-z0-9._-]{8,80}$ ]] \
  || fail "当前发布标识格式无效，拒绝在异常发布状态下回滚"
[ "$CURRENT_DIR" = "$(realpath -e "$RELEASES_DIR/$CURRENT_RELEASE_ID")" ] \
  || fail "current 软链接与当前发布目录标识不一致，拒绝在异常发布状态下回滚"
[ "$CURRENT_RELEASE_ID" != "$TARGET_RELEASE_ID" ] || fail "目标版本已经是当前版本"
SCRIPT_DIR_REAL="$(realpath -e "$SCRIPT_DIR")"
[ "$SCRIPT_DIR_REAL" = "$CURRENT_DIR/scripts/release" ] \
  || fail "回滚入口不是当前可信版本内的脚本，拒绝使用临时或旧脚本执行生产回滚"

[ -f "$SHARED_ENV_FILE" ] || fail "缺少共享生产环境文件：$SHARED_ENV_FILE"
ENV_MODE="$(stat -c '%a' "$SHARED_ENV_FILE")"
case "$ENV_MODE" in 600|400) ;; *) fail "生产环境文件权限必须为 600 或 400，当前为 $ENV_MODE" ;; esac

HISTORY_FILE="$ROOT_DIR/release-history.tsv"
[ -s "$HISTORY_FILE" ] \
  || fail "缺少发布历史，无法证明目标版本曾成功上线，默认阻断回滚"
LAST_MIGRATION_LINE="$(awk -F '\t' '$5 == "true" { line = NR } END { print line + 0 }' "$HISTORY_FILE")"
TARGET_LAST_LINE="$(awk -F '\t' -v id="$TARGET_RELEASE_ID" '$3 == id { line = NR } END { print line + 0 }' "$HISTORY_FILE")"
[ "$TARGET_LAST_LINE" -gt 0 ] \
  || fail "发布历史中没有目标版本的成功记录，拒绝回滚到未知版本"
if [ "$LAST_MIGRATION_LINE" -gt "$TARGET_LAST_LINE" ] && [ "$SCHEMA_COMPATIBILITY" != "reviewed" ]; then
  fail "目标版本早于最近一次数据库迁移；完成架构兼容评审后设置 ALLOW_SCHEMA_COMPATIBLE_ROLLBACK=reviewed"
fi

REPORT_DIR="$EVIDENCE_DIR/rollback-$(date -u '+%Y%m%dT%H%M%SZ')-$TARGET_RELEASE_ID"
mkdir -p -m 0750 "$REPORT_DIR"
ARCHIVE_NAME="gx-deploy-91-$TARGET_RELEASE_ID.tar.gz"
ARCHIVE="$PACKAGES_DIR/$ARCHIVE_NAME"
CHECKSUM="$PACKAGES_DIR/$ARCHIVE_NAME.sha256"
[ -f "$ARCHIVE" ] || fail "缺少目标版本保留发布包：$ARCHIVE"
[ -f "$CHECKSUM" ] || fail "缺少目标版本保留发布包校验文件：$CHECKSUM"

node "$SCRIPT_DIR/verify-fixed-package.mjs" \
  "$ARCHIVE" "$CHECKSUM" --report "$REPORT_DIR/package-verification.json"
chmod 0600 "$REPORT_DIR/package-verification.json"

ARCHIVE_MANIFEST_HASH="$(tar -xOf "$ARCHIVE" ./RELEASE-MANIFEST.json | sha256sum | awk '{print $1}')"
TARGET_MANIFEST_HASH="$(sha256sum "$TARGET_DIR/RELEASE-MANIFEST.json" | awk '{print $1}')"
[ "$ARCHIVE_MANIFEST_HASH" = "$TARGET_MANIFEST_HASH" ] \
  || fail "已部署目录的发布清单与保留发布包不一致，拒绝回滚"

node "$SCRIPT_DIR/verify-release-directory.mjs" \
  "$TARGET_DIR" --shared-ssl "$SHARED_SSL_DIR" \
  --report "$REPORT_DIR/release-directory-verification.json"
chmod 0600 "$REPORT_DIR/release-directory-verification.json"

if [ "$VERIFY_ONLY" = "true" ]; then
  log "回滚只读演练通过：$TARGET_RELEASE_ID；未启动容器、未切换 current、未修改数据库"
  exit 0
fi

if [ "$NODE_ROLE" = "operations" ]; then
  log "运维节点：渲染并复核目标版本监控配置"
  node "$TARGET_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE"
  docker network create monitoring >/dev/null 2>&1 || true
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
    docker compose -f "$TARGET_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" config -q
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
    docker compose -f "$TARGET_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" up -d
else
  log "业务节点：跳过监控栈回滚，避免重复告警和复制运维密钥"
fi

log "健康部署目标版本：$TARGET_RELEASE_ID"
ENV_FILE="$SHARED_ENV_FILE" \
BACKUP_DIR="$BACKUP_DIR" \
RELEASE_ID="$TARGET_RELEASE_ID" \
DEPLOY_TARGET="$DEPLOY_TARGET" \
NODE_ROLE="$NODE_ROLE" \
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
  bash "$TARGET_DIR/docker/deploy.sh" --skip-migrate

CURRENT_ID_NEXT="$ROOT_DIR/current-release-id.next"
rm -f -- "$CURRENT_ID_NEXT"
ln -s "current/.release-id" "$CURRENT_ID_NEXT"
mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"
ln -sfn "$TARGET_DIR" "$ROOT_DIR/current.next"
mv -Tf "$ROOT_DIR/current.next" "$ROOT_DIR/current"
[ "$(tr -d '\r\n' < "$ROOT_DIR/current-release-id")" = "$TARGET_RELEASE_ID" ] \
  || fail "current 与 current-release-id 兼容指针不一致"
printf '%s\trollback\t%s\t%s\tfalse\t-\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$TARGET_RELEASE_ID" "$CURRENT_RELEASE_ID" \
  >> "$HISTORY_FILE"
chmod 0640 "$HISTORY_FILE"

log "回滚完成：$CURRENT_RELEASE_ID -> $TARGET_RELEASE_ID"
log "数据库未执行逆向迁移；共享配置、证书、备份和 Compose 数据卷保持不变"
