#!/bin/bash
# 只读校验首次初始化所用固定发布目录，确保 systemd 重启后仍能从受管版本目录恢复。
set -euo pipefail

PROJECT_DIR="${1:-}"
PLATFORM_ROOT="${2:-/opt/guoxue}"

if [ -z "$PROJECT_DIR" ]; then
  echo "用法: $0 <project-dir> [platform-root]" >&2
  exit 64
fi
if [ ! -d "$PROJECT_DIR" ]; then
  echo "固定发布目录不存在: $PROJECT_DIR" >&2
  exit 64
fi

PROJECT_REAL="$(cd "$PROJECT_DIR" && pwd -P)"
RELEASE_ID_FILE="$PROJECT_REAL/.release-id"
if [ ! -f "$RELEASE_ID_FILE" ]; then
  echo "固定发布包缺少 .release-id: $PROJECT_REAL" >&2
  exit 64
fi

RELEASE_ID="$(tr -d '\r\n' < "$RELEASE_ID_FILE")"
if [[ ! "$RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]]; then
  echo "固定发布包 .release-id 格式无效" >&2
  exit 64
fi

RELEASES_DIR="$PLATFORM_ROOT/releases"
if [ ! -d "$RELEASES_DIR" ]; then
  echo "受管发布根目录不存在: $RELEASES_DIR" >&2
  exit 64
fi
RELEASES_REAL="$(cd "$RELEASES_DIR" && pwd -P)"
EXPECTED_REAL="$RELEASES_REAL/$RELEASE_ID"
if [ "$PROJECT_REAL" != "$EXPECTED_REAL" ]; then
  echo "首次初始化目录不受版本管理；期望: $EXPECTED_REAL" >&2
  echo "实际: $PROJECT_REAL" >&2
  exit 64
fi

printf '%s' "$RELEASE_ID"
