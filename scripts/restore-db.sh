#!/bin/bash
# ═══════════════════════════════════════════════
# 数据库恢复脚本
# 用法: ./restore-db.sh <backup_file.dump>
# ═══════════════════════════════════════════════
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法: $0 <backup_file.dump>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-guoxue}"
DB_USER="${DB_USER:-guoxue}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "[$(date)] 警告: 将覆盖 $DB_NAME 数据库"
echo "按 Ctrl+C 取消，或等待 5 秒继续..."
sleep 5

# 断开所有连接
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<SQL
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
SQL

# 删除并重建数据库
PGPASSWORD="${DB_PASSWORD}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
PGPASSWORD="${DB_PASSWORD}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# 恢复
echo "[$(date)] 开始恢复..."
PGPASSWORD="${DB_PASSWORD}" pg_restore \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges \
  --jobs=4 \
  "$BACKUP_FILE"

echo "[$(date)] 恢复完成"
