#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${SOURCE_DATABASE_URL:?必须设置 SOURCE_DATABASE_URL}"
: "${MIGRATION_BACKUP_DIR:?必须设置 MIGRATION_BACKUP_DIR}"

for command in psql pg_dump pg_restore sha256sum; do
  command -v "$command" >/dev/null || {
    echo "缺少命令：$command" >&2
    exit 1
  }
done

mkdir -p "$MIGRATION_BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_name="$(psql "$SOURCE_DATABASE_URL" -X -Atqc 'select current_database()')"
safe_database_name="$(printf '%s' "$database_name" | tr -cd '[:alnum:]_-')"
prefix="${MIGRATION_BACKUP_DIR%/}/${safe_database_name}-${timestamp}"
dump_file="${prefix}.dump"
counts_file="${prefix}.table-counts.tsv"
manifest_file="${prefix}.manifest.txt"

echo "开始导出数据库 ${database_name}（不会修改源库）"
pg_dump "$SOURCE_DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$dump_file"

pg_restore --list "$dump_file" >/dev/null
(
  cd "$(dirname "$dump_file")"
  sha256sum "$(basename "$dump_file")" >"$(basename "$dump_file").sha256"
)

psql "$SOURCE_DATABASE_URL" -X -Atqc \
  "select format('%I.%I', schemaname, tablename)
   from pg_tables
   where schemaname = 'public'
   order by tablename" |
while IFS= read -r table_name; do
  count="$(psql "$SOURCE_DATABASE_URL" -X -Atqc "select count(*) from ${table_name}")"
  printf '%s\t%s\n' "$table_name" "$count"
done >"$counts_file"

{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'database_name=%s\n' "$database_name"
  printf 'server_version=%s\n' "$(psql "$SOURCE_DATABASE_URL" -X -Atqc 'show server_version')"
  printf 'dump_file=%s\n' "$(basename "$dump_file")"
  printf 'counts_file=%s\n' "$(basename "$counts_file")"
  printf 'prisma_migrations=%s\n' \
    "$(psql "$SOURCE_DATABASE_URL" -X -Atqc "select count(*) from \"_prisma_migrations\"" 2>/dev/null || printf 'not_available')"
  printf 'extensions=%s\n' \
    "$(psql "$SOURCE_DATABASE_URL" -X -Atqc "select string_agg(extname, ',' order by extname) from pg_extension")"
} >"$manifest_file"

echo "导出完成：$dump_file"
echo "校验文件：${dump_file}.sha256"
echo "表计数：$counts_file"
