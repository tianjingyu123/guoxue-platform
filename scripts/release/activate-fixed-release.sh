#!/usr/bin/env bash
# 在已完成主机初始化的新服务器上，验真、解压并激活一个固定发布包。
# 本脚本不下载代码、不读取远程分支，也不会替操作者猜测生产配置。
set -euo pipefail

export LC_ALL=C

log() { printf '[activate] %s\n' "$*"; }
fail() { printf '[activate] FAIL %s\n' "$*" >&2; exit 64; }

if [ "$#" -ne 2 ]; then
  fail "用法：activate-fixed-release.sh <tar.gz> <tar.gz.sha256>"
fi

ROOT_DIR="${ROOT_DIR:-/opt/guoxue}"
RELEASES_DIR="$ROOT_DIR/releases"
PACKAGES_DIR="$ROOT_DIR/release-packages"
EVIDENCE_DIR="$ROOT_DIR/release-evidence"
INCOMING_DIR="$ROOT_DIR/incoming"
SHARED_ENV_FILE="${ENV_FILE:-$ROOT_DIR/shared/.env.production}"
SHARED_SSL_DIR="${SHARED_SSL_DIR:-$ROOT_DIR/shared/nginx-ssl}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
EXPECTED_RELEASE_ID="${EXPECTED_RELEASE_ID:-}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
EXPECTED_CURRENT_RELEASE_ID="${EXPECTED_CURRENT_RELEASE_ID:-}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"
NODE_ROLE="${NODE_ROLE:-operations}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-production}"
RUN_MIGRATION="${RUN_MIGRATION:-false}"
MIGRATION_DEPLOY_CONFIRM="${MIGRATION_DEPLOY_CONFIRM:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"
MONITORING_COMPOSE_PROJECT_NAME="${MONITORING_COMPOSE_PROJECT_NAME:-monitoring}"
MONITORING_READY_ATTEMPTS="${MONITORING_READY_ATTEMPTS:-120}"

case "$DEPLOY_TARGET" in standard|tencent) ;; *) fail "DEPLOY_TARGET 仅允许 standard 或 tencent" ;; esac
case "$NODE_ROLE" in app|operations) ;; *) fail "NODE_ROLE 仅允许 app 或 operations" ;; esac
case "$RELEASE_CHANNEL" in production|staging) ;; *) fail "RELEASE_CHANNEL 仅允许 production 或 staging" ;; esac
case "$RUN_MIGRATION" in true|false) ;; *) fail "RUN_MIGRATION 仅允许 true 或 false" ;; esac
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]{1,62}$ ]] || fail "COMPOSE_PROJECT_NAME 格式无效"
[[ "$MONITORING_COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]{1,62}$ ]] || fail "MONITORING_COMPOSE_PROJECT_NAME 格式无效"
[ "$MONITORING_COMPOSE_PROJECT_NAME" != "$COMPOSE_PROJECT_NAME" ] || fail "业务栈与监控栈必须使用不同的 Compose 项目名"
[[ "$MONITORING_READY_ATTEMPTS" =~ ^[0-9]+$ ]] \
  || fail "MONITORING_READY_ATTEMPTS 必须是正整数"
[ "$MONITORING_READY_ATTEMPTS" -ge 1 ] && [ "$MONITORING_READY_ATTEMPTS" -le 300 ] \
  || fail "MONITORING_READY_ATTEMPTS 必须在 1 到 300 之间"
[[ "$EXPECTED_COMMIT" =~ ^[a-fA-F0-9]{40}$ ]] || fail "EXPECTED_COMMIT 必须是完整的 40 位提交 SHA，正式激活不得省略源提交身份"
if [ -n "$EXPECTED_CURRENT_RELEASE_ID" ]; then
  [[ "$EXPECTED_CURRENT_RELEASE_ID" =~ ^[A-Za-z0-9._-]{8,80}$ ]] \
    || fail "EXPECTED_CURRENT_RELEASE_ID 格式无效"
  [ -f "$ROOT_DIR/current/.release-id" ] \
    || fail "缺少当前固定版本，无法执行双节点滚动激活"
  [ "$(tr -d '\r\n' < "$ROOT_DIR/current/.release-id")" = "$EXPECTED_CURRENT_RELEASE_ID" ] \
    || fail "当前版本与滚动发布基线不一致"
fi

for command_name in bash node docker tar sha256sum realpath flock stat cmp ln mv rm curl seq; do
  command -v "$command_name" >/dev/null 2>&1 || fail "缺少必要命令：$command_name"
done
docker info >/dev/null 2>&1 || fail "Docker 未运行"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 不可用"

ARCHIVE="$(realpath -e "$1")"
CHECKSUM="$(realpath -e "$2")"
ARCHIVE_DIR="$(dirname "$ARCHIVE")"
ARCHIVE_NAME="$(basename "$ARCHIVE")"
CHECKSUM_NAME="$(basename "$CHECKSUM")"

mkdir -p "$RELEASES_DIR" "$PACKAGES_DIR" "$EVIDENCE_DIR" "$SHARED_SSL_DIR" "$BACKUP_DIR"
exec 9>"$ROOT_DIR/.release-activation.lock"
flock -n 9 || fail "已有发布任务正在执行"

log "校验发布包 SHA-256"
(
  cd "$ARCHIVE_DIR"
  sha256sum --check --strict "$CHECKSUM_NAME"
) || fail "发布包 SHA-256 校验失败"

log "预检 tar 路径与文件类型"
if ! LIST_OUTPUT="$(tar --quoting-style=literal -tzf "$ARCHIVE")"; then
  fail "无法读取 tar 目录"
fi
while IFS= read -r raw_entry; do
  entry="${raw_entry#./}"
  entry="${entry%/}"
  [ -z "$entry" ] && continue
  case "$entry" in
    /*|../*|*/../*|*\\*) fail "tar 包含不安全路径：$raw_entry" ;;
  esac
done <<< "$LIST_OUTPUT"

if ! TYPE_OUTPUT="$(tar --quoting-style=literal -tvzf "$ARCHIVE")"; then
  fail "无法读取 tar 文件类型"
fi
while IFS= read -r type_line; do
  case "${type_line:0:1}" in
    -|d) ;;
    *) fail "tar 包含链接或特殊文件：$type_line" ;;
  esac
done <<< "$TYPE_OUTPUT"

RELEASE_ID="$(tar -xOf "$ARCHIVE" ./.release-id 2>/dev/null | tr -d '\r\n')"
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9._-]{8,80}$ ]] || fail "发布包内 .release-id 无效"
if [ -n "$EXPECTED_RELEASE_ID" ] && [ "$EXPECTED_RELEASE_ID" != "$RELEASE_ID" ]; then
  fail "发布标识不匹配：期望 $EXPECTED_RELEASE_ID，实际 $RELEASE_ID"
fi
EXPECTED_ARCHIVE_NAME="gx-deploy-91-$RELEASE_ID.tar.gz"
if [ "$RUN_MIGRATION" = "true" ] && [ "$MIGRATION_DEPLOY_CONFIRM" != "migrate:$RELEASE_ID" ]; then
  fail "数据库迁移必须再次确认 MIGRATION_DEPLOY_CONFIRM=migrate:$RELEASE_ID"
fi
[ "$ARCHIVE_NAME" = "$EXPECTED_ARCHIVE_NAME" ] || fail "发布包文件名与发布标识不匹配"
[ "$CHECKSUM_NAME" = "$EXPECTED_ARCHIVE_NAME.sha256" ] || fail "校验文件名与发布标识不匹配"

FINAL_DIR="$RELEASES_DIR/$RELEASE_ID"
TEMP_DIR="$RELEASES_DIR/.candidate-$RELEASE_ID-$$"
CURRENT_NEXT="$ROOT_DIR/current.next"
case "$FINAL_DIR" in "$RELEASES_DIR"/*) ;; *) fail "发布目录越界" ;; esac
case "$TEMP_DIR" in "$RELEASES_DIR"/*) ;; *) fail "候选目录越界" ;; esac

cleanup() {
  if [ -n "${TEMP_DIR:-}" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf -- "$TEMP_DIR"
  fi
  if [ -n "${CURRENT_NEXT:-}" ]; then
    rm -f -- "$CURRENT_NEXT"
  fi
}
trap cleanup EXIT
mkdir -m 0750 "$TEMP_DIR"
tar --no-same-owner --no-same-permissions -xzf "$ARCHIVE" -C "$TEMP_DIR"

# 固定包以最小权限解压时，公开关联文件可能被收紧为 0600/0700。
# Nginx worker 以非 root 用户运行，绑定挂载后会因此把存在的文件误判为 404。
# 仅归一化这两个本应公开读取的精确文件，禁止放宽其他发布内容。
normalize_public_association_permissions() {
  local release_dir="$1"
  local association_dir="$release_dir/docker/nginx/well-known"
  local apple_file="$association_dir/apple-app-site-association"
  local android_file="$association_dir/assetlinks.json"

  [ -d "$association_dir" ] && [ ! -L "$association_dir" ] \
    || fail "关联文件目录缺失或不是可信普通目录：$association_dir"
  [ -f "$apple_file" ] && [ ! -L "$apple_file" ] \
    || fail "iOS 关联文件缺失或不是可信普通文件：$apple_file"
  [ -f "$android_file" ] && [ ! -L "$android_file" ] \
    || fail "Android 关联文件缺失或不是可信普通文件：$android_file"

  chmod 0755 "$association_dir"
  chmod 0644 "$apple_file" "$android_file"
  [ "$(stat -c '%a' "$association_dir")" = "755" ] \
    && [ "$(stat -c '%a' "$apple_file")" = "644" ] \
    && [ "$(stat -c '%a' "$android_file")" = "644" ] \
    || fail "公开关联文件权限归一化失败"
  log "公开关联文件权限已归一化：目录 0755，文件 0644"
}

REPORT_DIR="$EVIDENCE_DIR/$RELEASE_ID"
mkdir -p -m 0750 "$REPORT_DIR"
VERIFY_ARGS=(
  "$ARCHIVE"
  "$CHECKSUM"
  --report "$REPORT_DIR/package-verification.json"
  --expected-commit "$EXPECTED_COMMIT"
)
node "$TEMP_DIR/scripts/release/verify-fixed-package.mjs" "${VERIFY_ARGS[@]}"
chmod 0600 "$REPORT_DIR/package-verification.json"

PACKAGE_HASH="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
STORED_ARCHIVE="$PACKAGES_DIR/$EXPECTED_ARCHIVE_NAME"
STORED_CHECKSUM="$PACKAGES_DIR/$EXPECTED_ARCHIVE_NAME.sha256"
if [ -e "$STORED_ARCHIVE" ]; then
  [ -f "$STORED_ARCHIVE" ] || fail "保留发布包路径不是普通文件：$STORED_ARCHIVE"
  STORED_HASH="$(sha256sum "$STORED_ARCHIVE" | awk '{print $1}')"
  [ "$STORED_HASH" = "$PACKAGE_HASH" ] \
    || fail "同一发布标识已存在不同内容的保留发布包，拒绝覆盖"
else
  install -m 0640 "$ARCHIVE" "$STORED_ARCHIVE"
fi
printf '%s  %s\n' "$PACKAGE_HASH" "$EXPECTED_ARCHIVE_NAME" \
  > "$STORED_CHECKSUM.tmp"
chmod 0640 "$STORED_CHECKSUM.tmp"
mv -f "$STORED_CHECKSUM.tmp" "$STORED_CHECKSUM"

[ -f "$SHARED_ENV_FILE" ] || fail "缺少共享生产环境文件：$SHARED_ENV_FILE"
ENV_MODE="$(stat -c '%a' "$SHARED_ENV_FILE")"
case "$ENV_MODE" in 600|400) ;; *) fail "生产环境文件权限必须为 600 或 400，当前为 $ENV_MODE" ;; esac

log "校验服务器生产环境与 CI 客户端审计配置一致"
node "$TEMP_DIR/scripts/release/verify-client-config-binding.mjs" \
  "$TEMP_DIR/release-evidence/client-config-binding.json" \
  "$SHARED_ENV_FILE" \
  --expected-release-id "$RELEASE_ID" \
  --expected-commit "$EXPECTED_COMMIT" \
  --report "$REPORT_DIR/client-config-binding-verification.json"
chmod 0600 "$REPORT_DIR/client-config-binding-verification.json"

chmod +x "$TEMP_DIR/docker/deploy.sh" "$TEMP_DIR/scripts/release/preflight-host.sh"
rm -rf "$TEMP_DIR/docker/nginx/ssl"
ln -s "$SHARED_SSL_DIR" "$TEMP_DIR/docker/nginx/ssl"

log "正式落盘前复核候选目录完整性"
node "$TEMP_DIR/scripts/release/verify-release-directory.mjs" \
  "$TEMP_DIR" --shared-ssl "$SHARED_SSL_DIR"

if [ -e "$FINAL_DIR" ] || [ -L "$FINAL_DIR" ]; then
  [ -d "$FINAL_DIR" ] && [ ! -L "$FINAL_DIR" ] \
    || fail "已存在的发布路径不是可信普通目录：$FINAL_DIR"
  [ -f "$FINAL_DIR/.release-id" ] \
    || fail "已存在的发布目录缺少 .release-id：$FINAL_DIR"
  [ "$(tr -d '\r\n' < "$FINAL_DIR/.release-id")" = "$RELEASE_ID" ] \
    || fail "已存在的发布目录标识不匹配：$FINAL_DIR"
  cmp -s "$TEMP_DIR/RELEASE-MANIFEST.json" "$FINAL_DIR/RELEASE-MANIFEST.json" \
    || fail "同一发布标识已存在不同清单的正式目录，拒绝复用"
  log "检测到同一固定包留下的发布目录，逐文件复核后执行可重入恢复"
  node "$TEMP_DIR/scripts/release/verify-release-directory.mjs" \
    "$FINAL_DIR" --shared-ssl "$SHARED_SSL_DIR"
  rm -rf -- "$TEMP_DIR"
  TEMP_DIR=""
else
  mv "$TEMP_DIR" "$FINAL_DIR"
  TEMP_DIR=""
fi

log "复核正式发布目录完整性并生成证据"
node "$FINAL_DIR/scripts/release/verify-release-directory.mjs" \
  "$FINAL_DIR" --shared-ssl "$SHARED_SSL_DIR" \
  --report "$REPORT_DIR/release-directory-verification.json"
chmod 0600 "$REPORT_DIR/release-directory-verification.json"
normalize_public_association_permissions "$FINAL_DIR"

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
  [ -f "$ROOT_DIR/current/.release-id" ] || return 1
  local current_dir
  current_dir="$(realpath -e "$ROOT_DIR/current")" || return 1
  node "$current_dir/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE" || return 1
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$current_dir/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" config -q || return 1
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$current_dir/docker/monitoring/docker-compose.yml" \
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
  log "运维节点：渲染并复核监控告警配置"
  node "$FINAL_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE"
  docker network create monitoring >/dev/null 2>&1 || true
  COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
    docker compose -f "$FINAL_DIR/docker/monitoring/docker-compose.yml" \
      --env-file "$SHARED_ENV_FILE" config -q
  MONITORING_CONFIG_UNCHANGED="false"
  if [ -f "$ROOT_DIR/current/.release-id" ]; then
    CURRENT_MONITORING_DIR="$(realpath -e "$ROOT_DIR/current")"
    node "$CURRENT_MONITORING_DIR/scripts/release/render-monitoring-config.mjs" "$SHARED_ENV_FILE"
    if ! CURRENT_MONITORING_FINGERPRINT="$(node \
      "$FINAL_DIR/scripts/release/monitoring-config-fingerprint.mjs" \
      "$CURRENT_MONITORING_DIR/docker/monitoring")"; then
      fail "无法计算当前监控配置指纹"
    fi
    if ! FINAL_MONITORING_FINGERPRINT="$(node \
      "$FINAL_DIR/scripts/release/monitoring-config-fingerprint.mjs" \
      "$FINAL_DIR/docker/monitoring")"; then
      fail "无法计算候选监控配置指纹"
    fi
    if [ "$CURRENT_MONITORING_FINGERPRINT" = "$FINAL_MONITORING_FINGERPRINT" ]; then
      MONITORING_CONFIG_UNCHANGED="true"
    fi
  fi
  if [ "$MONITORING_CONFIG_UNCHANGED" = "true" ] && probe_monitoring_endpoints; then
    log_monitoring_endpoint_status
    log "监控配置指纹未变化且端点已就绪，跳过监控容器重建"
  else
    if [ "$MONITORING_CONFIG_UNCHANGED" = "true" ]; then
      log "监控配置指纹未变化，但现有端点未全部就绪，执行受控恢复"
      log_monitoring_endpoint_status
    else
      log "监控配置指纹已变化，应用新监控配置"
    fi
    if ! COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME" \
      docker compose -f "$FINAL_DIR/docker/monitoring/docker-compose.yml" \
        --env-file "$SHARED_ENV_FILE" up -d \
      || ! wait_for_monitoring; then
      restore_current_monitoring \
        || fail "新监控栈启动失败，且无法恢复当前版本监控配置"
      fail "新监控栈启动失败；已恢复当前版本监控配置"
    fi
  fi
else
  stop_duplicate_monitoring_on_app
  log "业务节点：跳过监控栈启动，避免重复告警和复制运维密钥"
fi

# 在启动新容器前预制权威 current 的候选软链。部署失败时 cleanup 会删除该候选，
# 部署成功后只需一次同文件系统原子重命名；已有正式目录可由同一固定包安全重试。
rm -f -- "$CURRENT_NEXT"
ln -s "$FINAL_DIR" "$CURRENT_NEXT"
[ "$(realpath -e "$CURRENT_NEXT")" = "$(realpath -e "$FINAL_DIR")" ] \
  || fail "current 候选软链未指向本次发布目录"

DEPLOY_ARGS=(--skip-migrate)
if [ "$RUN_MIGRATION" = "true" ]; then
  DEPLOY_ARGS=(--migrate)
  export ALLOW_PROD_DB_MIGRATION=reviewed
  if [ "$DEPLOY_TARGET" = "tencent" ]; then
    export MANAGED_DB_BACKUP_CONFIRMED=reviewed
  fi
fi

log "激活发布版本：$RELEASE_ID"
if [ -n "$EXPECTED_CURRENT_RELEASE_ID" ]; then
  [ "$(tr -d '\r\n' < "$ROOT_DIR/current/.release-id")" = "$EXPECTED_CURRENT_RELEASE_ID" ] \
    || fail "部署前当前版本已变化，拒绝并发或跨基线激活"
fi
if ! ENV_FILE="$SHARED_ENV_FILE" \
  BACKUP_DIR="$BACKUP_DIR" \
  RELEASE_ID="$RELEASE_ID" \
  DEPLOY_TARGET="$DEPLOY_TARGET" \
  NODE_ROLE="$NODE_ROLE" \
  RELEASE_CHANNEL="$RELEASE_CHANNEL" \
  COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
  MIGRATION_DEPLOY_CONFIRM="$MIGRATION_DEPLOY_CONFIRM" \
  bash "$FINAL_DIR/docker/deploy.sh" "${DEPLOY_ARGS[@]}"; then
  if [ "$NODE_ROLE" = "operations" ]; then
    restore_current_monitoring \
      || fail "部署失败，且无法恢复当前版本监控配置；保持发布阻断并人工处置"
  fi
  fail "部署失败；当前版本软链保持不变，候选目录保留供排障：$FINAL_DIR"
fi

PREVIOUS_RELEASE_ID=""
if [ -f "$ROOT_DIR/current/.release-id" ]; then
  PREVIOUS_RELEASE_ID="$(tr -d '\r\n' < "$ROOT_DIR/current/.release-id")"
fi
CURRENT_ID_NEXT="$ROOT_DIR/current-release-id.next"
rm -f -- "$CURRENT_ID_NEXT"
ln -s "current/.release-id" "$CURRENT_ID_NEXT"
mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"
mv -Tf "$CURRENT_NEXT" "$ROOT_DIR/current"
CURRENT_NEXT=""
if [ -d "$FINAL_DIR/release-evidence" ]; then
  cp -a "$FINAL_DIR/release-evidence/." "$REPORT_DIR/"
fi
[ "$(realpath -e "$ROOT_DIR/current")" = "$(realpath -e "$FINAL_DIR")" ] \
  || fail "current 权威软链未切换到本次发布目录"
[ "$(tr -d '\r\n' < "$ROOT_DIR/current-release-id")" = "$RELEASE_ID" ] \
  || fail "current 与 current-release-id 兼容指针不一致"
printf '%s\tactivate\t%s\t%s\t%s\t%s\n' \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$RELEASE_ID" "${PREVIOUS_RELEASE_ID:--}" \
  "$RUN_MIGRATION" "$PACKAGE_HASH" >> "$ROOT_DIR/release-history.tsv"
chmod 0640 "$ROOT_DIR/release-history.tsv"

# 上传暂存区只承担传输职责。失败时保留原包便于同一固定包重试；只有已经完成
# 正式目录验真、健康部署、current 原子切换和发布历史落盘后，才清理位于
# incoming 根目录的重复传输副本。来自其他目录的人工激活材料一律不删除。
cleanup_successful_incoming_transfer() {
  [ -d "$INCOMING_DIR" ] || return 0
  local incoming_real archive_parent checksum_parent
  incoming_real="$(realpath -e "$INCOMING_DIR")" || return 0
  archive_parent="$(realpath -e "$(dirname "$ARCHIVE")")" || return 0
  checksum_parent="$(realpath -e "$(dirname "$CHECKSUM")")" || return 0
  if [ "$archive_parent" = "$incoming_real" ] && [ "$checksum_parent" = "$incoming_real" ]; then
    if rm -f -- "$ARCHIVE" "$CHECKSUM"; then
      log "已清理成功发布的 incoming 传输副本；正式回滚包保留在 $PACKAGES_DIR"
    else
      log "警告：发布已成功，但 incoming 传输副本清理失败，请由值班人员复核"
    fi
  fi
  return 0
}

cleanup_successful_incoming_transfer
trap - EXIT

log "发布激活完成：$RELEASE_ID"
log "当前版本：$ROOT_DIR/current -> $FINAL_DIR"
