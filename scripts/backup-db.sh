#!/bin/bash
# ═══════════════════════════════════════════════
# 数据库备份脚本 — PostgreSQL
# 用法: ./backup.sh [retention_days]
# ═══════════════════════════════════════════════
set -euo pipefail

RETENTION_DAYS=${1:-30}
BACKUP_DIR="${BACKUP_DIR:-/var/backups/guoxue}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-guoxue}"
DB_USER="${DB_USER:-guoxue}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

# ── 全量备份 ──
echo "[$(date)] 开始备份 $DB_NAME..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# ── 清理过期备份 ──
echo "[$(date)] 清理 ${RETENTION_DAYS} 天前的备份..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -delete

BACKUP_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] 备份完成: ${DB_NAME}_${TIMESTAMP}.dump (${BACKUP_SIZE})"

# ── 可选：上传到 COS ──
# coscli cp "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump" "cos://${COS_BUCKET}/backups/"
