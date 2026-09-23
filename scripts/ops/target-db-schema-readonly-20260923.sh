#!/bin/sh
set -eu
python3 - <<'PY'
import json, subprocess, socket

program = r'''
const { createRequire } = require('module');
const appRequire = createRequire('/app/apps/server/dist/main.js');
const { PrismaClient } = appRequire('@prisma/client');
const db = new PrismaClient();
(async () => {
  const parsed = new URL(process.env.DATABASE_URL);
  const identity = await db.$queryRawUnsafe("SELECT current_database()::text AS name, inet_server_addr()::text AS address, current_schema()::text AS schema");
  const columns = await db.$queryRawUnsafe("SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name IN ('Order', 'Circle', 'CircleIncome', 'PaipanReport') AND column_name IN ('clientRequestId', 'requestFingerprint', 'id', 'orderId', 'circleId', 'incomeUserId') ORDER BY table_name, column_name");
  const indexes = await db.$queryRawUnsafe("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'Order' AND indexdef LIKE '%clientRequestId%' ORDER BY indexname");
  const hasMigrations = await db.$queryRawUnsafe("SELECT to_regclass(current_schema() || '.\"_prisma_migrations\"') IS NOT NULL AS present");
  let migrations = [];
  if (hasMigrations[0].present) migrations = await db.$queryRawUnsafe('SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 12');
  console.log(JSON.stringify({ databaseHost: parsed.hostname, databasePort: parsed.port || '5432', identity: identity[0], columns, indexes, migrations }));
})().catch(error => { console.error(JSON.stringify({ errorName: error.name, errorCode: error.code || null })); process.exitCode = 1; }).finally(async () => db.$disconnect());
'''
result = subprocess.run(['docker', 'exec', 'guoxue-server', 'node', '-e', program], text=True, capture_output=True, timeout=35)
if result.returncode:
    error = result.stderr
    known = next((name for name in ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'SyntaxError', 'PrismaClientInitializationError', 'PrismaClientKnownRequestError', 'P2021', 'P1001'] if name in error), 'UNKNOWN')
    print(json.dumps({'node': socket.gethostname(), 'status': 'QUERY_FAILED', 'exitCode': result.returncode, 'errorClass': known}))
    raise SystemExit(1)
data = json.loads(result.stdout)
data['node'] = socket.gethostname()
print(json.dumps(data, ensure_ascii=False))
PY
