#!/usr/bin/env bash
# 国学平台 PostgreSQL 自动备份脚本
# 用法: bash pg-backup.sh [保留天数]
# 支持本机容器数据库和 DATABASE_URL 指向的托管/独立数据库。

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-postgres}"
DB_USER="${DB_USER:-guoxue}"
DB_NAME="${DB_NAME:-guoxue}"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.production}"
KEEP_DAYS="${1:-30}"
DEPLOY_TARGET="${DEPLOY_TARGET:-}"

case "$KEEP_DAYS" in
  ''|*[!0-9]*)
    echo "保留天数必须是非负整数：$KEEP_DAYS" >&2
    exit 64
    ;;
esac

case "$DEPLOY_TARGET" in
  standard|tencent) ;;
  *) echo "DEPLOY_TARGET 仅允许 standard 或 tencent" >&2; exit 64 ;;
esac
for command_name in sha256sum flock; do
  command -v "$command_name" >/dev/null || {
    echo "缺少命令：$command_name" >&2
    exit 1
  }
done

# 定时任务没有交互式 shell 环境，因此仅解析所需的单行 DATABASE_URL。
# 不 source 整份环境文件，避免多行私钥被 shell 误解释。
database_url="${DATABASE_URL:-}"
if [[ -z "$database_url" && -f "$ENV_FILE" ]]; then
  database_url="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | tail -1 | tr -d '\r')"
  database_url="${database_url#\"}"
  database_url="${database_url%\"}"
  database_url="${database_url#\'}"
  database_url="${database_url%\'}"
fi

# Prisma 在连接串中使用 schema 参数选择默认命名空间，但 libpq/pg_dump 不认识该参数。
# 备份客户端只移除 schema，必须保留 sslmode、sslrootcert 等托管数据库 TLS 参数。
database_cli_url="$database_url"
if [[ -n "$database_cli_url" ]]; then
  database_cli_url="$(printf '%s' "$database_cli_url" | sed -E \
    -e 's/([?&])schema=[^&]*&/\1/' \
    -e 's/([?&])schema=[^&]*$//' \
    -e 's/\?&/?/' \
    -e 's/\?$//')"
fi

mkdir -p "$BACKUP_DIR"
BACKUP_LOCK_FILE="${BACKUP_LOCK_FILE:-$BACKUP_DIR/.backup.lock}"
exec 9>"$BACKUP_LOCK_FILE"
flock -n 9 || {
  echo "已有数据库备份任务正在执行，拒绝并发生成归档" >&2
  exit 75
}
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/guoxue_${timestamp}.dump"
partial_file="${backup_file}.partial"
checksum_file="${backup_file}.sha256"
manifest_file="${backup_file}.manifest"

cleanup_partial() {
  rm -f -- "$partial_file"
}
trap cleanup_partial EXIT

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始生产备份..."
if [[ "$DEPLOY_TARGET" == "tencent" ]]; then
  [[ -n "$database_url" ]] || {
    echo "托管数据库备份必须从 ENV_FILE 或 DATABASE_URL 读取真实连接地址" >&2
    exit 1
  }
  for command_name in psql pg_dump pg_restore; do
    command -v "$command_name" >/dev/null || {
      echo "托管数据库备份缺少宿主机命令：$command_name" >&2
      exit 1
    }
  done
  # 使用宿主机锁定主版本的 PostgreSQL 客户端直接连接托管库；不依赖也不信任
  # 可能残留的 guoxue-postgres 容器，连接串只通过子进程环境传递。
  pg_dump "$database_cli_url" \
    --format=custom --compress=9 --no-owner --no-privileges \
    >"$partial_file"
  database_name="$(psql "$database_cli_url" -X -Atqc 'select current_database()')"
  pg_restore --list "$partial_file" >/dev/null
  source_mode="managed-database-url"
else
  command -v docker >/dev/null || {
    echo "缺少命令：docker" >&2
    exit 1
  }
  docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || {
    echo "PostgreSQL 客户端容器不可用：$CONTAINER_NAME" >&2
    exit 1
  }

  if [[ -n "$database_url" ]]; then
  # 通过始终存在的 pgvector 容器提供版本匹配的 PostgreSQL 客户端；
  # 连接串仅作为容器环境变量传入，不打印到日志。
    printf '%s\n' "$database_cli_url" | docker exec -i \
      "$CONTAINER_NAME" \
      sh -c 'IFS= read -r DATABASE_URL; export DATABASE_URL; exec pg_dump "$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges' \
      >"$partial_file"
    database_name="$(printf '%s\n' "$database_cli_url" | docker exec -i \
      "$CONTAINER_NAME" \
      sh -c 'IFS= read -r DATABASE_URL; export DATABASE_URL; exec psql "$DATABASE_URL" -X -Atqc "select current_database()"')"
    source_mode="database-url-via-container"
  else
    docker exec "$CONTAINER_NAME" \
      pg_dump -U "$DB_USER" -d "$DB_NAME" \
      --format=custom --compress=9 --no-owner --no-privileges \
      >"$partial_file"
    database_name="$DB_NAME"
    source_mode="local-container"
  fi
  docker exec -i "$CONTAINER_NAME" pg_restore --list <"$partial_file" >/dev/null
fi

test -s "$partial_file" || {
  echo "备份归档为空，拒绝登记成功" >&2
  exit 1
}
mv -- "$partial_file" "$backup_file"

{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'database_name=%s\n' "$database_name"
  printf 'source_mode=%s\n' "$source_mode"
  printf 'archive=%s\n' "$(basename "$backup_file")"
} >"$manifest_file"

(
  cd "$BACKUP_DIR"
  sha256sum \
    "$(basename "$backup_file")" \
    "$(basename "$manifest_file")" \
    >"$(basename "$checksum_file")"
)

size="$(du -h "$backup_file" | cut -f1)"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份成功：$(basename "$backup_file")（$size，来源 $source_mode）"

deleted_count=0
while IFS= read -r -d '' old_backup; do
  rm -f -- \
    "$old_backup" \
    "${old_backup}.sha256" \
    "${old_backup}.manifest"
  deleted_count=$((deleted_count + 1))
done < <(find "$BACKUP_DIR" -type f -name 'guoxue_*.dump' -mtime "+${KEEP_DAYS}" -print0)

total_count="$(find "$BACKUP_DIR" -type f -name 'guoxue_*.dump' | wc -l)"
total_size="$(du -sh "$BACKUP_DIR" | cut -f1)"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成：现存 $total_count 份，占用 $total_size，清理 $deleted_count 份过期归档"
