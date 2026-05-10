#!/bin/bash
# 国学平台 PostgreSQL 自动备份脚本
# 用法: ./pg-backup.sh [保留天数]
# 建议通过 crontab 定时执行: 0 3 * * * /opt/guoxue/docker/pg-backup.sh 30

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-postgres}"
DB_USER="${DB_USER:-guoxue}"
DB_NAME="${DB_NAME:-guoxue}"
KEEP_DAYS="${1:-30}"  # 默认保留30天

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成带时间戳的文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/guoxue_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份: $DB_NAME → $BACKUP_FILE"

# 执行 pg_dump 并压缩
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份成功: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份失败!" >&2
  exit 1
fi

# 清理过期备份
DELETED_COUNT=0
for f in $(find "$BACKUP_DIR" -name "guoxue_*.sql.gz" -mtime +$KEEP_DAYS | sort); do
  rm -f "$f"
  DELETED_COUNT=$((DELETED_COUNT + 1))
  echo "  清理过期备份: $(basename "$f")"
done

# 统计
TOTAL_COUNT=$(find "$BACKUP_DIR" -name "guoxue_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成 — 现存 $TOTAL_COUNT 份，占用 $TOTAL_SIZE，清理了 $DELETED_COUNT 份过期备份"
