#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${1:-/opt/gx-role-hotfix-stage-20260731/docker/.env.production}"
test -r "$ENV_FILE" || {
  echo "生产配置不可读：$ENV_FILE" >&2
  exit 1
}

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '
    $1 == wanted {
      if (seen++) exit 2
      print substr($0, index($0, "=") + 1)
    }
    END { if (seen != 1) exit 3 }
  ' "$ENV_FILE"
}

raw_url="$(read_env_value DATABASE_URL)" || {
  echo "DATABASE_URL 缺失或重复" >&2
  exit 1
}
cli_url="$(printf '%s' "$raw_url" | python3 -c '
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
parts = urlsplit(sys.stdin.read().strip())
blocked = {"schema", "connection_limit", "pool_timeout", "pgbouncer", "statement_cache_size"}
query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key not in blocked]
print(urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)))
')"
unset raw_url

psql "$cli_url" -X -At -F '|' <<'SQL'
select 'CURRENT_DATABASE', current_database();
select 'CURRENT_USER', current_user;
select 'SERVER_VERSION', current_setting('server_version');
select 'ROLE_CAN_CREATE_DB', rolcreatedb from pg_roles where rolname = current_user;
select 'ROLE_IS_SUPERUSER', rolsuper from pg_roles where rolname = current_user;
select 'DATABASE_SIZE_BYTES', pg_database_size(current_database());
select 'ACTIVE_CONNECTIONS', count(*) from pg_stat_activity where datname = current_database();
select 'EXTENSIONS', coalesce(string_agg(extname, ',' order by extname), '') from pg_extension;
select 'AVAILABLE_EXTENSIONS', coalesce(string_agg(name, ',' order by name), '') from pg_available_extensions where name in ('vector', 'pg_trgm', 'pg_stat_statements');
select 'PUBLIC_TABLE_COUNT', count(*) from pg_tables where schemaname = 'public';
select 'EMBEDDING_COLUMNS', count(*) from information_schema.columns where table_schema = 'public' and column_name = 'embedding';
select 'VECTOR_OR_TRGM_INDEXES', count(*) from pg_indexes where schemaname = 'public' and (indexdef ilike '%vector%' or indexdef ilike '%gin_trgm_ops%');
SQL

migration_table="$(psql "$cli_url" -X -Atqc "select coalesce(to_regclass('public._prisma_migrations')::text, '')")"
if [[ "$migration_table" == "_prisma_migrations" ]]; then
  psql "$cli_url" -X -At -F '|' -c \
    "select 'PRISMA_MIGRATIONS', count(*) from public.\"_prisma_migrations\" where finished_at is not null and rolled_back_at is null"
  psql "$cli_url" -X -At -F '|' -c \
    "select 'PRISMA_FAILED_OR_UNFINISHED', count(*) from public.\"_prisma_migrations\" where finished_at is null and rolled_back_at is null"
  psql "$cli_url" -X -At -F '|' -c \
    "select 'PRISMA_LATEST', migration_name from public.\"_prisma_migrations\" where finished_at is not null and rolled_back_at is null order by finished_at desc limit 12"
else
  echo "PRISMA_MIGRATIONS|MISSING_TABLE"
fi

echo "RESTORE_CAPABILITY_AUDIT=OK"
