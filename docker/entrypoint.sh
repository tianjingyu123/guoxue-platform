#!/bin/sh
set -e

# 迁移/诊断容器需要执行显式命令。此路径只要求数据库连接串，
# 不启动业务服务，也不会隐式执行任何数据库迁移。
if [ "$#" -gt 0 ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[entrypoint] 自定义命令缺少 DATABASE_URL"
    exit 64
  fi
  echo "[entrypoint] 执行显式命令: $*"
  exec "$@"
fi

echo "[entrypoint] 检查必需环境变量..."
MISSING=""
for VAR in JWT_SECRET ENCRYPTION_KEY BIGSCREEN_SECRET DATABASE_URL; do
  eval "VAL=\${$VAR:-}"
  if [ -z "$VAL" ]; then
    MISSING="$MISSING  ✗ $VAR\n"
  fi
done
if [ -n "$MISSING" ]; then
  echo "╔══════════════════════════════════════════════╗"
  echo "║  缺少必需环境变量，容器无法启动              ║"
  echo "╠══════════════════════════════════════════════╣"
  printf "%b" "$MISSING"
  echo "╚══════════════════════════════════════════════╝"
  exit 1
fi
echo "[entrypoint] 环境变量检查通过"

MAX_WAIT=60
WAITED=0
INTERVAL=2

echo "[entrypoint] 等待数据库就绪..."

while [ $WAITED -lt $MAX_WAIT ]; do
  node -e "
    const net = require('net');
    const url = process.env.DATABASE_URL || '';
    // DATABASE_URL 格式: postgresql://user:pass@host:port/db
    const m = url.match(/@([^:]+):(\d+)/);
    if (!m) process.exit(1);
    const sock = net.createConnection({ host: m[1], port: parseInt(m[2]), timeout: 3000 });
    sock.on('connect', () => { sock.end(); process.exit(0); });
    sock.on('error', () => process.exit(1));
    sock.on('timeout', () => { sock.destroy(); process.exit(1); });
  " && break

  WAITED=$((WAITED + INTERVAL))
  echo "[entrypoint] 数据库未就绪, 已等待 ${WAITED}s / ${MAX_WAIT}s..."
  sleep $INTERVAL
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "[entrypoint] 数据库连接超时!"
  exit 1
fi

echo "[entrypoint] 数据库已就绪"

# ── 同步管理后台前端到共享卷（供 Nginx 托管）──
if [ -d /app/admin-dist ] && [ -d /app/admin-dist-shared ]; then
  echo "[entrypoint] 同步管理后台前端到共享卷..."
  cp -r /app/admin-dist/* /app/admin-dist-shared/
  echo "[entrypoint] 管理后台前端同步完成"
fi

# 服务启动默认绝不改数据库。只有部署流程已完成备份与人工复核后，
# 显式设置 RUN_DB_MIGRATIONS=reviewed 才允许执行迁移。
case "${RUN_DB_MIGRATIONS:-false}" in
  reviewed)
    echo "[entrypoint] 已确认迁移审查，执行数据库迁移..."
    npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma
    ;;
  false|0|"")
    echo "[entrypoint] 跳过数据库迁移（安全默认）"
    ;;
  *)
    echo "[entrypoint] RUN_DB_MIGRATIONS 值无效；仅允许 false 或 reviewed"
    exit 64
    ;;
esac

# ── 启动服务 ──
echo "[entrypoint] 启动服务..."
exec node apps/server/dist/main.js
