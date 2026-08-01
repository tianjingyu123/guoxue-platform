#!/usr/bin/env bash
# 兼容入口：旧版脚本会拉取固定分支、写死域名并自动初始化数据库，已禁用。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cat >&2 <<EOF
旧版 scripts/server-setup.sh 已停用，避免覆盖代码或误初始化生产数据库。

请先把已验证的固定发布包上传到服务器，并明确选择唯一部署架构后再执行。

自建 PostgreSQL / Redis、主机终止 TLS：
  sudo DOMAIN=api.example.com LETSENCRYPT_EMAIL=ops@example.com \
    DEPLOY_TARGET=standard DATABASE_MODE=prepare \
    ENV_FILE=/opt/guoxue/shared/.env.production \
    bash "${PROJECT_DIR}/docker/setup-server.sh"

腾讯云托管 PostgreSQL / Redis、CLB 终止 TLS：
  sudo DOMAIN=api.example.com DEPLOY_TARGET=tencent \
    DATABASE_MODE=prepare ENV_FILE=/opt/guoxue/shared/.env.production \
    bash "${PROJECT_DIR}/docker/setup-server.sh"

完成环境变量配置后，通过以下安全入口发布：
  cd "${PROJECT_DIR}/docker"
  DEPLOY_TARGET=standard ENV_FILE=/opt/guoxue/shared/.env.production bash ./deploy.sh

如果初始化时选择 tencent，上述发布命令也必须使用 DEPLOY_TARGET=tencent；
初始化、发布、健康检查、备份和回滚不得混用部署架构。
EOF

exit 78
