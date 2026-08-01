#!/usr/bin/env bash
# 国学平台 PostgreSQL 恢复脚本
# 用法: bash pg-restore.sh <备份文件路径>
# 仅用于本机 guoxue-postgres 容器；托管数据库请使用 scripts/migration/restore-postgres.sh。

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-postgres}"
DB_USER="${DB_USER:-guoxue}"
DB_NAME="${DB_NAME:-guoxue}"

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <备份文件路径>"
  echo "可用备份文件:"
  ls -1 "$SCRIPT_DIR/backups/" 2>/dev/null || echo "  (无备份文件)"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "错误: 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

command -v docker >/dev/null || {
  echo "缺少命令：docker" >&2
  exit 1
}
command -v sha256sum >/dev/null || {
  echo "缺少命令：sha256sum" >&2
  exit 1
}
docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || {
  echo "目标 PostgreSQL 容器不可用：$CONTAINER_NAME" >&2
  exit 1
}

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
[[ -f "$CHECKSUM_FILE" ]] || {
  echo "缺少校验文件：$CHECKSUM_FILE" >&2
  exit 1
}
(
  cd "$(dirname "$BACKUP_FILE")"
  sha256sum --check "$(basename "$CHECKSUM_FILE")"
)
docker exec -i "$CONTAINER_NAME" pg_restore --list <"$BACKUP_FILE" >/dev/null

confirm="${RESTORE_CONFIRM:-}"
if [[ -z "$confirm" ]]; then
  echo "警告：此操作将删除并重建本机容器数据库 '$DB_NAME'。"
  echo "备份文件：$BACKUP_FILE"
  read -r -p "请输入目标数据库名 '$DB_NAME' 继续：" confirm
fi
if [[ "$confirm" != "$DB_NAME" ]]; then
  echo "确认值与目标数据库名不一致，拒绝恢复" >&2
  exit 64
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复..."

# 销毁前再留一份当前库快照；若当前库已经不可备份，可显式设置
# SKIP_PRE_RESTORE_BACKUP=YES，但必须由操作者承担该风险。
if [[ "${SKIP_PRE_RESTORE_BACKUP:-NO}" != "YES" ]]; then
  BACKUP_DIR="${PRE_RESTORE_BACKUP_DIR:-$SCRIPT_DIR/backups/pre-restore}" \
    DATABASE_URL="" \
    ENV_FILE=/dev/null \
    bash "$SCRIPT_DIR/pg-backup.sh" 30
fi

docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  >/dev/null
docker exec "$CONTAINER_NAME" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
docker exec "$CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME"
docker exec -i "$CONTAINER_NAME" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  <"$BACKUP_FILE"

table_count="$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -X -Atqc \
  "select count(*) from pg_tables where schemaname='public'")"
if [[ "$table_count" == "0" ]]; then
  echo "恢复后 public schema 没有业务表，恢复失败" >&2
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成（public 表：$table_count）。"
echo "下一步：执行 prisma migrate deploy、verify-postgres.sh 和应用冒烟检查；本脚本不会擅自修改迁移账本。"
