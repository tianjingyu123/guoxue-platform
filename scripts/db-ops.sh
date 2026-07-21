#!/usr/bin/env bash
# ============================================================
# 国学平台 — 数据库运维统一脚本
# 用法:
#   bash scripts/db-ops.sh backup              # 全量备份
#   bash scripts/db-ops.sh restore <文件>       # 恢复备份
#   bash scripts/db-ops.sh verify <文件>        # 验证备份完整性
#   bash scripts/db-ops.sh schedule            # 配置 crontab 定时备份
#   bash scripts/db-ops.sh status              # 查看备份状态
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/docker/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-postgres}"
DB_USER="${DB_USER:-guoxue}"
DB_NAME="${DB_NAME:-guoxue}"
DB_PASSWORD="${DB_PASSWORD:-guoxue123}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
KEEP_DAYS="${KEEP_DAYS:-30}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cmd_backup() {
  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local file="$BACKUP_DIR/guoxue_${timestamp}.sql.gz"

  echo "[$(date '+%H:%M:%S')] 开始备份: $DB_NAME → $(basename "$file")"

  local start_ts
  start_ts=$(date +%s)

  if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl 2>/dev/null | gzip > "$file"; then
    local end_ts
    end_ts=$(date +%s)
    local size
    size=$(du -h "$file" | cut -f1)
    local duration=$((end_ts - start_ts))
    echo -e "[$(date '+%H:%M:%S')] ${GREEN}备份成功: $(basename "$file") (${size}, ${duration}s)${NC}"

    # 写入备份日志
    echo "$(date -Iseconds) | $(basename "$file") | ${size} | ${duration}s | SUCCESS" >> "$BACKUP_DIR/backup.log"
  else
    echo -e "[$(date '+%H:%M:%S')] ${RED}备份失败!${NC}"
    echo "$(date -Iseconds) | $(basename "$file") | - | - | FAILED" >> "$BACKUP_DIR/backup.log"
    return 1
  fi

  # 清理过期备份
  local deleted=0
  for f in $(find "$BACKUP_DIR" -name "guoxue_*.sql.gz" -mtime "+${KEEP_DAYS}" | sort); do
    rm -f "$f"
    deleted=$((deleted + 1))
  done

  local total
  total=$(find "$BACKUP_DIR" -name "guoxue_*.sql.gz" | wc -l)
  local total_size
  total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
  echo "[$(date '+%H:%M:%S')] 存量: ${total} 份, 占用 ${total_size}, 清理 ${deleted} 份过期"
}

cmd_restore() {
  local file="$1"

  if [ ! -f "$file" ]; then
    echo -e "${RED}备份文件不存在: $file${NC}"
    echo "可用备份:"
    ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (无)"
    exit 1
  fi

  echo -e "${YELLOW}⚠ 此操作将覆盖 '$DB_NAME' 数据库的全部数据!${NC}"
  echo "  备份文件: $file"
  echo -n "  输入 yes 确认: "
  read -r confirm
  if [ "$confirm" != "yes" ]; then
    echo "已取消"
    exit 0
  fi

  echo "[$(date '+%H:%M:%S')] 断开现有连接..."
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

  echo "[$(date '+%H:%M:%S')] 删除旧数据库..."
  docker exec "$CONTAINER_NAME" dropdb -U "$DB_USER" --if-exists "$DB_NAME" 2>/dev/null || true

  echo "[$(date '+%H:%M:%S')] 创建新数据库..."
  docker exec "$CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null

  echo "[$(date '+%H:%M:%S')] 恢复数据..."

  local start_ts
  start_ts=$(date +%s)

  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
  else
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$file" >/dev/null 2>&1
  fi

  local end_ts
  end_ts=$(date +%s)
  local duration=$((end_ts - start_ts))
  echo -e "[$(date '+%H:%M:%S')] ${GREEN}恢复完成 (${duration}s)${NC}"

  # 恢复文件已经包含备份时的完整 schema。这里仅做只读状态核验，
  # 禁止恢复后自动 db push，否则会删除不在当前 Prisma schema 中的保留对象。
  echo "[$(date '+%H:%M:%S')] 检查 Prisma 迁移状态（只读）..."
  cd "$ROOT"
  if ! npx prisma migrate status --schema=apps/server/prisma/schema.prisma; then
    echo -e "${YELLOW}恢复已完成，但迁移账本需要人工审计；未执行任何自动 schema 修改。${NC}"
  fi
}

cmd_verify() {
  local file="$1"

  if [ ! -f "$file" ]; then
    echo -e "${RED}备份文件不存在: $file${NC}"
    exit 1
  fi

  echo "[$(date '+%H:%M:%S')] 验证: $(basename "$file")"

  # 检查 gzip 完整性
  if [[ "$file" == *.gz ]]; then
    if gunzip -t "$file" 2>/dev/null; then
      echo -e "  ${GREEN}✓ gzip 完整性检查通过${NC}"
    else
      echo -e "  ${RED}✗ gzip 完整性检查失败${NC}"
      return 1
    fi

    # 检查 SQL 有效性（快速扫描开头）
    local head_bytes
    head_bytes=$(gunzip -c "$file" 2>/dev/null | head -c 200)
    if echo "$head_bytes" | grep -qi "CREATE\|INSERT\|COPY\|SET\|SELECT"; then
      echo -e "  ${GREEN}✓ SQL 内容检查通过${NC}"
    else
      echo -e "  ${RED}✗ SQL 内容异常${NC}"
      return 1
    fi

    local size
    size=$(du -h "$file" | cut -f1)
    echo -e "  ${GREEN}大小: ${size}${NC}"
  else
    echo -e "  ${YELLOW}非 gzip 格式，仅检查文件存在${NC}"
  fi

  echo -e "${GREEN}备份验证通过${NC}"
}

cmd_schedule() {
  local script_path
  script_path="$(cd "$(dirname "$0")" && pwd)/db-ops.sh"

  echo "配置定时备份..."
  echo ""
  echo "当前 crontab:"
  crontab -l 2>/dev/null || echo "  (空)"
  echo ""

  # 生成 crontab 条目（每天凌晨 3:07 执行，错开整点）
  local cron_entry="7 3 * * * bash $script_path backup >> /var/log/guoxue-backup.log 2>&1"

  if crontab -l 2>/dev/null | grep -q "$script_path"; then
    echo -e "  ${GREEN}已配置定时备份${NC}"
  else
    echo "将添加以下 crontab 条目:"
    echo "  $cron_entry"
    echo ""
    echo -n "确认添加? (yes/no): "
    read -r confirm
    if [ "$confirm" = "yes" ]; then
      (crontab -l 2>/dev/null || true; echo "$cron_entry") | crontab -
      echo -e "${GREEN}已添加定时备份 (每天 03:07)${NC}"
    else
      echo "已取消"
    fi
  fi
}

cmd_status() {
  echo "════════════════════════════════════════"
  echo "  数据库备份状态"
  echo "════════════════════════════════════════"
  echo ""
  echo "  备份目录: $BACKUP_DIR"

  if [ -d "$BACKUP_DIR" ]; then
    local count
    count=$(find "$BACKUP_DIR" -name "guoxue_*.sql.gz" 2>/dev/null | wc -l)
    local size
    size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  备份数量: $count 份"
    echo "  占用空间: $size"
    echo ""

    if [ "$count" -gt 0 ]; then
      echo "  最近 5 次备份:"
      ls -1t "$BACKUP_DIR"/guoxue_*.sql.gz 2>/dev/null | head -5 | while read -r f; do
        local fname fsize
        fname=$(basename "$f")
        fsize=$(du -h "$f" | cut -f1)
        echo "    $fname  ($fsize)"
      done

      # 检查最新备份距今多久
      local latest
      latest=$(ls -1t "$BACKUP_DIR"/guoxue_*.sql.gz 2>/dev/null | head -1)
      if [ -n "$latest" ]; then
        local age_hours
        age_hours=$(( ($(date +%s) - $(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null)) / 3600 ))
        echo ""
        if [ "$age_hours" -gt 24 ]; then
          echo -e "  ${RED}⚠ 最新备份距今 ${age_hours} 小时 (超过24小时!)${NC}"
        else
          echo -e "  ${GREEN}最新备份距今 ${age_hours} 小时${NC}"
        fi
      fi
    fi

    # 备份日志
    if [ -f "$BACKUP_DIR/backup.log" ]; then
      echo ""
      echo "  最近 5 条备份日志:"
      tail -5 "$BACKUP_DIR/backup.log"
    fi
  else
    echo -e "  ${YELLOW}备份目录不存在${NC}"
  fi

  echo ""
  echo "  定时任务:"
  crontab -l 2>/dev/null | grep -i "backup\|db-ops" || echo "  (未配置)"
}

# ── 主入口 ──
case "${1:-}" in
  backup)    cmd_backup ;;
  restore)   cmd_restore "${2:-}" ;;
  verify)    cmd_verify "${2:-}" ;;
  schedule)  cmd_schedule ;;
  status)    cmd_status ;;
  *)
    echo "用法: bash scripts/db-ops.sh <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  backup              全量备份数据库"
    echo "  restore <文件>       恢复数据库"
    echo "  verify <文件>        验证备份文件完整性"
    echo "  schedule            配置 crontab 定时备份"
    echo "  status              查看备份状态"
    ;;
esac
