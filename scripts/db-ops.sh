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
KEEP_DAYS="${KEEP_DAYS:-30}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cmd_backup() {
  ENV_FILE="${ENV_FILE:-$ROOT/docker/.env.production}" \
    BACKUP_DIR="$BACKUP_DIR" \
    CONTAINER_NAME="$CONTAINER_NAME" \
    DB_USER="$DB_USER" \
    DB_NAME="$DB_NAME" \
    bash "$ROOT/docker/pg-backup.sh" "$KEEP_DAYS"
}

cmd_restore() {
  local file="$1"

  BACKUP_DIR="$BACKUP_DIR" \
    CONTAINER_NAME="$CONTAINER_NAME" \
    DB_USER="$DB_USER" \
    DB_NAME="$DB_NAME" \
    bash "$ROOT/docker/pg-restore.sh" "$file"
}

cmd_verify() {
  local file="$1"

  if [ ! -f "$file" ]; then
    echo -e "${RED}备份文件不存在: $file${NC}"
    exit 1
  fi

  local checksum_file="${file}.sha256"
  if [ ! -f "$checksum_file" ]; then
    echo -e "${RED}缺少校验文件: $checksum_file${NC}"
    exit 1
  fi

  (
    cd "$(dirname "$file")"
    sha256sum --check "$(basename "$checksum_file")"
  )
  docker exec -i "$CONTAINER_NAME" pg_restore --list <"$file" >/dev/null

  local size
  size=$(du -h "$file" | cut -f1)
  echo -e "${GREEN}备份验证通过：SHA-256 与 custom archive 均有效（${size}）${NC}"
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
    count=$(find "$BACKUP_DIR" -name "guoxue_*.dump" 2>/dev/null | wc -l)
    local size
    size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "  备份数量: $count 份"
    echo "  占用空间: $size"
    echo ""

    if [ "$count" -gt 0 ]; then
      echo "  最近 5 次备份:"
      ls -1t "$BACKUP_DIR"/guoxue_*.dump 2>/dev/null | head -5 | while read -r f; do
        local fname fsize
        fname=$(basename "$f")
        fsize=$(du -h "$f" | cut -f1)
        echo "    $fname  ($fsize)"
      done

      # 检查最新备份距今多久
      local latest
      latest=$(ls -1t "$BACKUP_DIR"/guoxue_*.dump 2>/dev/null | head -1)
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
