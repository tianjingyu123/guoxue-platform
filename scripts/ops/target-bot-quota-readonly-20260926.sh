#!/bin/sh
set -eu
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
  const parsed = new URL(process.env.DATABASE_URL);
  const identity = await db.$queryRawUnsafe('SELECT current_database()::text AS name, inet_server_addr()::text AS address, current_schema()::text AS schema');
  const tables = await db.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('BotQuotaReservation', 'BotQuotaPurchase') ORDER BY table_name");
  const migrations = await db.$queryRawUnsafe("SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM \"_prisma_migrations\" WHERE migration_name IN ('manual_z_20260926_09_bot_quota_reservation', 'manual_z_20260926_10_bot_quota_purchase_idempotency') ORDER BY migration_name");
  console.log(JSON.stringify({ databaseHost: parsed.hostname, databasePort: parsed.port || '5432', identity: identity[0], tables, migrations }));
})().catch(error => { console.error(JSON.stringify({ errorName: error.name, errorCode: error.code || null })); process.exitCode = 1; }).finally(async () => db.$disconnect());
'''
result = subprocess.run(['docker', 'exec', 'guoxue-server', 'node', '-e', program], text=True, capture_output=True, timeout=35)
if result.returncode:
    error = result.stderr
    known = next((name for name in ['MODULE_NOT_FOUND', 'SyntaxError', 'PrismaClientInitializationError', 'PrismaClientKnownRequestError', 'P2021', 'P1001'] if name in error), 'UNKNOWN')
    print(json.dumps({'node': socket.gethostname(), 'status': 'QUERY_FAILED', 'exitCode': result.returncode, 'errorClass': known}))
    raise SystemExit(1)
data = json.loads(result.stdout)
data['node'] = socket.gethostname()
print(json.dumps(data, ensure_ascii=False))
PY
