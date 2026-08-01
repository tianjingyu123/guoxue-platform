#!/usr/bin/env bash
# 兼容入口：统一委托给要求校验和、归档验证及目标库同值确认的恢复链路。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "用法：bash scripts/restore-db.sh <backup_file.dump>" >&2
  exit 64
fi
exec bash "$SCRIPT_DIR/db-ops.sh" restore "$BACKUP_FILE"
