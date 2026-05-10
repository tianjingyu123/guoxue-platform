#!/bin/sh
set -e

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

# ── 执行数据库迁移 ──
echo "[entrypoint] 执行数据库迁移..."
npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma

# ── 启动服务 ──
echo "[entrypoint] 启动服务..."
exec node apps/server/dist/main.js
