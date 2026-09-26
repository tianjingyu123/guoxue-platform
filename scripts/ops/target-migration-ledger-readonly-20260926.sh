#!/bin/sh
set -eu

# 只读取运行容器所连数据库的 Prisma 迁移账本，不打印 DATABASE_URL。
python3 - <<'PY'
import json
import socket
import subprocess

program = r'''
const { createRequire } = require('module');
const appRequire = createRequire('/app/apps/server/dist/main.js');
const { PrismaClient } = appRequire('@prisma/client');
const db = new PrismaClient();
(async () => {
  const identity = await db.$queryRawUnsafe("SELECT current_database()::text AS name, inet_server_addr()::text AS address, current_schema()::text AS schema");
  const exists = await db.$queryRawUnsafe("SELECT to_regclass(current_schema() || '.\"_prisma_migrations\"') IS NOT NULL AS present");
  const migrations = exists[0].present
    ? await db.$queryRawUnsafe('SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name')
    : [];
  console.log(JSON.stringify({ identity: identity[0], ledgerPresent: exists[0].present, migrations }));
})().catch(error => {
  console.error(JSON.stringify({ errorName: error.name, errorCode: error.code || null }));
  process.exitCode = 1;
}).finally(async () => db.$disconnect());
'''
result = subprocess.run(
    ['docker', 'exec', 'guoxue-server', 'node', '-e', program],
    text=True, capture_output=True, timeout=45,
)
if result.returncode:
    print(json.dumps({'node': socket.gethostname(), 'status': 'QUERY_FAILED', 'exitCode': result.returncode}))
    raise SystemExit(1)
data = json.loads(result.stdout)
data['node'] = socket.gethostname()
print(json.dumps(data, ensure_ascii=False))
PY
