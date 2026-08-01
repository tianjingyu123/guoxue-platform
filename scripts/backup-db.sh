#!/usr/bin/env bash
# 兼容入口：统一委托给带并发锁、归档校验和恢复性验证的数据库值班脚本。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export KEEP_DAYS="${1:-${KEEP_DAYS:-30}}"
exec bash "$SCRIPT_DIR/db-ops.sh" backup
