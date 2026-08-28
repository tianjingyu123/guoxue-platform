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
RELEASE_CHANNEL="${RELEASE_CHANNEL:-production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
MONITORING_COMPOSE_PROJECT_NAME="${MONITORING_COMPOSE_PROJECT_NAME:-monitoring}"
MONITORING_READY_ATTEMPTS="${MONITORING_READY_ATTEMPTS:-120}"
SCHEMA_COMPATIBILITY="${ALLOW_SCHEMA_COMPATIBLE_ROLLBACK:-false}"
VERIFY_ONLY="${ROLLBACK_VERIFY_ONLY:-false}"

[[ "$TARGET_RELEASE_ID" =~ ^[A-Za-z0-9._-]{8,80}$ ]] || fail "目标发布标识格式无效"
[ "$CONFIRMATION" = "$TARGET_RELEASE_ID" ] || fail "回滚确认值必须与目标发布标识完全一致"
case "$DEPLOY_TARGET" in standard|tencent) ;; *) fail "DEPLOY_TARGET 仅允许 standard 或 tencent" ;; esac
case "$NODE_ROLE" in app|operations) ;; *) fail "NODE_ROLE 仅允许 app 或 operations" ;; esac
case "$RELEASE_CHANNEL" in production|staging) ;; *) fail "RELEASE_CHANNEL 仅允许 production 或 staging" ;; esac
case "$SCHEMA_COMPATIBILITY" in false|reviewed) ;; *) fail "ALLOW_SCHEMA_COMPATIBLE_ROLLBACK 仅允许 false 或 reviewed" ;; esac
case "$VERIFY_ONLY" in true|false) ;; *) fail "ROLLBACK_VERIFY_ONLY 仅允许 true 或 false" ;; esac
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]{1,62}$ ]] || fail "COMPOSE_PROJECT_NAME 格式无效"
[[ "$MONITORING_COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]{1,62}$ ]] || fail "MONITORING_COMPOSE_PROJECT_NAME 格式无效"
[ "$MONITORING_COMPOSE_PROJECT_NAME" != "$COMPOSE_PROJECT_NAME" ] || fail "业务栈与监控栈必须使用不同的 Compose 项目名"
[[ "$MONITORING_READY_ATTEMPTS" =~ ^[0-9]+$ ]] \
  || fail "MONITORING_READY_ATTEMPTS 必须是正整数"
[ "$MONITORING_READY_ATTEMPTS" -ge 1 ] && [ "$MONITORING_READY_ATTEMPTS" -le 300 ] \
  || fail "MONITORING_READY_ATTEMPTS 必须在 1 到 300 之间"

for command_name in bash node tar sha256sum realpath flock stat awk ln mv rm curl seq; do
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
if [ "$CURRENT_RELEASE_ID" = "$TARGET_RELEASE_ID" ] && [ "$VERIFY_ONLY" != "true" ]; then
  fail "目标版本已经是当前版本"
fi
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

monitoring_http_code() {
  local url="$1" code
  code="$(curl -sS --connect-timeout 2 --max-time 5 -o /dev/null \
    -w '%{http_code}' "$url" 2>/dev/null || true)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  printf '%s' "$code"
}

probe_monitoring_endpoints() {
  PROMETHEUS_READY_CODE="$(monitoring_http_code http://127.0.0.1:9090/-/ready)"
  ALERTMANAGER_READY_CODE="$(monitoring_http_code http://127.0.0.1:9093/-/ready)"
  GRAFANA_READY_CODE="$(monitoring_http_code http://127.0.0.1:3001/api/health)"
  [[ "$PROMETHEUS_READY_CODE" =~ ^2[0-9]{2}$ ]] \
    && [[ "$ALERTMANAGER_READY_CODE" =~ ^2[0-9]{2}$ ]] \
    && [[ "$GRAFANA_READY_CODE" =~ ^2[0-9]{2}$ ]]
}

log_monitoring_endpoint_status() {
  log "监控端点状态：Prometheus=$PROMETHEUS_READY_CODE Alertmanager=$ALERTMANAGER_READY_CODE Grafana=$GRAFANA_READY_CODE"
}

wait_for_monitoring() {
  local attempt
  for ((attempt = 1; attempt <= MONITORING_READY_ATTEMPTS; attempt += 1)); do
    if probe_monitoring_endpoints; then
      log_monitoring_endpoint_status
      return 0
    fi
    if [ "$attempt" -eq 1 ] || [ $((attempt % 15)) -eq 0 ]; then
      log "等待监控栈就绪：$attempt/$MONITORING_READY_ATTEMPTS"
      log_monitoring_endpoint_status
    fi
    sleep 2
  done
  probe_monitoring_endpoints || true
  log "监控栈就绪等待超时：$MONITORING_READY_ATTEMPTS 次"
  log_monitoring_endpoint_status
  return 1
}

restore_current_monitoring() {
  node "$CURRENT_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE" || return 1
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$CURRENT_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" config -q || return 1
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$CURRENT_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" up -d \
    && wait_for_monitoring
}

stop_duplicate_monitoring_on_app() {
  local -a monitoring_container_ids=()
  mapfile -t monitoring_container_ids < <(
    docker ps -aq \
      --filter "label=com.docker.compose.project=$MONITORING_COMPOSE_PROJECT_NAME"
  )
  if [ "${#monitoring_container_ids[@]}" -gt 0 ]; then
    docker rm -f "${monitoring_container_ids[@]}" >/dev/null
  fi
  [ -z "$(docker ps -aq --filter "label=com.docker.compose.project=$MONITORING_COMPOSE_PROJECT_NAME")" ] \
    || fail "业务节点重复监控容器清理失败"
  log "业务节点：已停止重复监控栈，保留数据卷与镜像"
}

if [ "$NODE_ROLE" = "operations" ]; then
  log "运维节点：渲染并复核目标版本监控配置"
  node "$TARGET_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE"
  docker network create monitoring >/dev/null 2>&1 || true
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$TARGET_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" config -q
  node "$CURRENT_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE"
  if ! CURRENT_MONITORING_FINGERPRINT="$(node \
    "$CURRENT_DIR/scripts/release/monitoring-config-fingerprint.mjs" \
    "$CURRENT_DIR/docker/monitoring")"; then
    fail "无法计算当前监控配置指纹"
  fi
  if ! TARGET_MONITORING_FINGERPRINT="$(node \
    "$CURRENT_DIR/scripts/release/monitoring-config-fingerprint.mjs" \
    "$TARGET_DIR/docker/monitoring")"; then
    fail "无法计算目标监控配置指纹"
  fi
  MONITORING_CONFIG_UNCHANGED="false"
  if [ "$CURRENT_MONITORING_FINGERPRINT" = "$TARGET_MONITORING_FINGERPRINT" ]; then
    MONITORING_CONFIG_UNCHANGED="true"
  fi
  if [ "$MONITORING_CONFIG_UNCHANGED" = "true" ] && probe_monitoring_endpoints; then
    log_monitoring_endpoint_status
    log "监控配置指纹未变化且端点已就绪，跳过监控容器重建"
  else
    if [ "$MONITORING_CONFIG_UNCHANGED" = "true" ]; then
      log "监控配置指纹未变化，但现有端点未全部就绪，执行受控恢复"
      log_monitoring_endpoint_status
    else
      log "监控配置指纹已变化，应用目标监控配置"
    fi
    if ! COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
      docker compose -f "$TARGET_DIR/docker/monitoring/docker-compose.yml" \
        --env-file "$SHARED_ENV_FILE" up -d \
      || ! wait_for_monitoring; then
      restore_current_monitoring \
        || fail "目标版本监控栈启动失败，且无法恢复当前版本监控配置"
      fail "目标版本监控栈启动失败；已恢复当前版本监控配置"
    fi
  fi
else
  stop_duplicate_monitoring_on_app
  log "业务节点：跳过监控栈回滚启动，避免重复告警和复制运维密钥"
fi

log "健康部署目标版本：$TARGET_RELEASE_ID"
if ! ENV_FILE="$SHARED_ENV_FILE" \
  BACKUP_DIR="$BACKUP_DIR" \
  RELEASE_ID="$TARGET_RELEASE_ID" \
  DEPLOY_TARGET="$DEPLOY_TARGET" \
  NODE_ROLE="$NODE_ROLE" \
  RELEASE_CHANNEL="$RELEASE_CHANNEL" \
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
    bash "$TARGET_DIR/docker/deploy.sh" --skip-migrate; then
  if [ "$NODE_ROLE" = "operations" ]; then
    restore_current_monitoring \
      || fail "应用回滚失败，且无法恢复当前版本监控配置；保持发布阻断并人工处置"
  fi
  fail "应用回滚失败；当前版本与监控配置已保持或恢复"
fi

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
