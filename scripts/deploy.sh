#!/bin/bash
set -e
cat >&2 <<'EOF'
[已停用] scripts/deploy.sh 是历史部署脚本，包含过时的进程名、端口与危险数据库同步逻辑。
请使用经过审查的原子部署流程；数据库只能先生成 diff、人工复核并备份后再迁移。
禁止在生产环境运行 prisma db push --accept-data-loss。
EOF
exit 64
