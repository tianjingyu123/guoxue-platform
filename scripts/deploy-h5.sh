#!/usr/bin/env bash
# 兼容入口：H5 已纳入统一镜像、发布门禁与原子部署，不再允许单独绕过门禁上传。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cat >&2 <<EOF
旧版 scripts/deploy-h5.sh 已停用。

请使用统一发布入口，它会同时验证服务端、管理端与 H5：
  cd "${PROJECT_DIR}/docker"
  ./deploy.sh
EOF

exit 78
