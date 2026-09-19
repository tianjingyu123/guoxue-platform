#!/usr/bin/env bash
set -euo pipefail

node_name="${NODE_NAME:-unknown}"
now_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

server_id="$(docker ps --filter label=com.docker.compose.service=server --format '{{.ID}}' | head -n 1)"
nginx_id="$(docker ps --filter label=com.docker.compose.service=nginx --format '{{.ID}}' | head -n 1)"

if [[ -z "$server_id" || -z "$nginx_id" ]]; then
  echo "AUDIT_ERROR=required_container_missing"
  exit 2
fi

echo "AUDIT_BEGIN node=$node_name utc=$now_utc"

docker inspect "$server_id" --format 'SERVER image={{.Image}} status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} started={{.State.StartedAt}} restart={{.RestartCount}} compose_project={{index .Config.Labels "com.docker.compose.project"}} compose_service={{index .Config.Labels "com.docker.compose.service"}} compose_files={{index .Config.Labels "com.docker.compose.project.config_files"}} compose_workdir={{index .Config.Labels "com.docker.compose.project.working_dir"}}'
docker inspect "$nginx_id" --format 'NGINX image={{.Image}} status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} started={{.State.StartedAt}} restart={{.RestartCount}}'
docker inspect "$server_id" --format 'SERVER_EXPOSURE network_mode={{.HostConfig.NetworkMode}} exposed_ports={{json .Config.ExposedPorts}} published_ports={{json .HostConfig.PortBindings}}'
docker inspect "$nginx_id" --format 'NGINX_EXPOSURE network_mode={{.HostConfig.NetworkMode}} exposed_ports={{json .Config.ExposedPorts}} published_ports={{json .HostConfig.PortBindings}}'

echo "SERVER_ARTIFACTS_BEGIN"
docker exec "$server_id" sh -lc '
  find /app/apps/server/dist -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | sed "s#  -#  /app/apps/server/dist#"
  for f in /app/apps/server/dist/main.js /app/apps/server/prisma/schema.prisma /app/admin-dist-shared/index.html /app/h5-dist-shared/index.html; do
    if [ -f "$f" ]; then sha256sum "$f"; else echo "MISSING $f"; fi
  done
  main=/app/apps/server/dist/main.js
  if [ -f "$main" ]; then
    grep -ao "trust proxy" "$main" | head -n 1 | sed "s/.*/MAIN_MARKER trust_proxy=present/" || echo "MAIN_MARKER trust_proxy=absent"
    grep -ao "ValidationPipe" "$main" | head -n 1 | sed "s/.*/MAIN_MARKER validation_pipe=present/" || echo "MAIN_MARKER validation_pipe=absent"
    grep -ao "api\/v1" "$main" | head -n 1 | sed "s/.*/MAIN_MARKER api_prefix=present/" || echo "MAIN_MARKER api_prefix=absent"
  fi
'
echo "SERVER_ARTIFACTS_END"

echo "DATABASE_STRUCTURE_BEGIN"
docker exec -i "$server_id" sh -lc 'entry="$(find /app -path "*/@prisma/client/default.js" -type f -print -quit)"; if [ -z "$entry" ]; then echo "PRISMA_CLIENT_NOT_FOUND"; exit 4; fi; PRISMA_ENTRY="$entry" node -' <<'NODE'
const { PrismaClient } = require(process.env.PRISMA_ENTRY);
const prisma = new PrismaClient();
const required = {
  Feedback: ['id','userId','type','content','contact','images','status','result','createdAt','updatedAt'],
  User: ['interestGuideCompleted'],
  AppVersion: ['activePlatformKey'],
  AuditLog: [],
};
(async () => {
  const tables = Object.keys(required);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position`, tables,
  );
  const byTable = new Map();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, []);
    byTable.get(row.table_name).push(row.column_name);
  }
  for (const [table, cols] of Object.entries(required)) {
    const actual = byTable.get(table) || [];
    const missing = cols.filter((col) => !actual.includes(col));
    console.log(JSON.stringify({kind:'table', table, present:actual.length > 0, columnCount:actual.length, required:cols, missing}));
  }
  const migrationTable = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS present`,
  );
  const present = Boolean(migrationTable[0]?.present);
  let ledger = {
    present,
    total:null,
    finished:null,
    rolledBack:null,
    activeUnfinished:null,
    latestFinishedAt:null,
  };
  if (present) {
    const stats = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int AS finished,
              COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS "rolledBack",
              COUNT(*) FILTER (
                WHERE finished_at IS NULL AND rolled_back_at IS NULL
              )::int AS "activeUnfinished",
              MAX(finished_at)::text AS latest_finished_at
         FROM "_prisma_migrations"`,
    );
    ledger = {...ledger, ...stats[0], latestFinishedAt:stats[0]?.latest_finished_at || null};
    delete ledger.latest_finished_at;
  }
  console.log(JSON.stringify({kind:'migration_ledger', ...ledger}));
})().catch((error) => {
  console.log(JSON.stringify({kind:'database_error', name:error?.name || 'Error', code:error?.code || null}));
  process.exitCode = 3;
}).finally(() => prisma.$disconnect());
NODE
echo "DATABASE_STRUCTURE_END"

echo "NGINX_EFFECTIVE_BEGIN"
docker exec "$nginx_id" nginx -T 2>&1 | awk '
  /set_real_ip_from|real_ip_header|real_ip_recursive|server_name|location \/admin|location \/api|proxy_set_header (X-Real-IP|X-Forwarded-For)|root \/var\/www/ {print}
' | sed -E 's/[[:space:]]+/ /g' | sort -u
echo "NGINX_EFFECTIVE_END"

echo "ACCESS_TOPOLOGY_BEGIN"
docker exec "$nginx_id" sh -lc '
  files=$(find /var/log/nginx -maxdepth 1 -type f -name "*access*.log" 2>/dev/null | head -n 5)
  if [ -z "$files" ]; then echo "ACCESS_LOG status=unavailable"; exit 0; fi
  tail -n 2000 $files 2>/dev/null | awk '\''
    function cls(ip) {
      if (ip ~ /^127\./ || ip == "::1") return "loopback";
      if (ip ~ /^10\./ || ip ~ /^192\.168\./ || ip ~ /^172\.(1[6-9]|2[0-9]|3[01])\./) return "private";
      return "public_or_proxy";
    }
    NF {count[cls($1)]++; total++}
    END {
      printf "ACCESS_LOG total=%d loopback=%d private=%d public_or_proxy=%d\n", total+0, count["loopback"]+0, count["private"]+0, count["public_or_proxy"]+0;
    }
  '\''
'
echo "ACCESS_TOPOLOGY_END"

for host in pre-api.rebugx.cn api.rebugx.cn gx.yrydai.com; do
  code="$(docker exec "$nginx_id" sh -lc "wget -q -O /dev/null --server-response --header='Host: $host' http://127.0.0.1/h5/ 2>&1 | awk '/HTTP\// {c=\$2} END {print c}'" || true)"
  echo "LOCAL_HOST host=$host h5_status=${code:-unavailable}"
done

echo "AUDIT_END node=$node_name utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
