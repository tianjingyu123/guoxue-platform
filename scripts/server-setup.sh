#!/usr/bin/env bash
# 兼容入口：旧版脚本会拉取固定分支、写死域名并自动初始化数据库，已禁用。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cat >&2 <<EOF
旧版 scripts/server-setup.sh 已停用，避免覆盖代码或误初始化生产数据库。

请先把已验证的项目版本上传到服务器，再执行：
  sudo bash "${PROJECT_DIR}/docker/setup-server.sh"

完成环境变量配置后，通过以下安全入口发布：
  cd "${PROJECT_DIR}/docker"
  ./deploy.sh
EOF

exit 78
