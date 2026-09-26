#!/bin/sh
set -eu

# 只读查询运行容器所连目标库的订单表规模和索引信息，不输出连接参数或订单数据。
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
  const rows = await db.$queryRawUnsafe(`
    SELECT current_database()::text AS database,
      inet_server_addr()::text AS address,
      pg_relation_size(c.oid)::text AS heap_bytes,
      pg_indexes_size(c.oid)::text AS index_bytes,
      pg_total_relation_size(c.oid)::text AS total_bytes,
      c.reltuples::bigint::text AS estimated_rows,
      COALESCE(s.n_live_tup, 0)::text AS estimated_live_rows,
      COALESCE(s.n_dead_tup, 0)::text AS estimated_dead_rows,
      s.last_analyze::text AS last_analyze,
      s.last_autoanalyze::text AS last_autoanalyze
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = current_schema() AND c.relname = 'Order' AND c.relkind = 'r'
  `);
  const indexes = await db.$queryRawUnsafe(`
    SELECT v.indexname::text AS name,
      i.indisunique AS is_unique,
      pg_relation_size(i.indexrelid)::text AS bytes,
      pg_get_indexdef(i.indexrelid)::text AS definition
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_indexes v ON v.schemaname = n.nspname AND v.tablename = t.relname
      AND v.indexname = (SELECT relname FROM pg_class WHERE oid = i.indexrelid)
    WHERE n.nspname = current_schema() AND t.relname = 'Order'
    ORDER BY v.indexname
  `);
  const exactCount = await db.$queryRawUnsafe('SELECT count(*)::text AS count FROM "Order"');
  console.log(JSON.stringify({ table: rows[0] || null, exactOrderCount: exactCount[0].count, indexes }));
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
