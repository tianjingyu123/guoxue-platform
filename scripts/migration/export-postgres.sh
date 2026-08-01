#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${SOURCE_DATABASE_URL:?必须设置 SOURCE_DATABASE_URL}"
: "${MIGRATION_BACKUP_DIR:?必须设置 MIGRATION_BACKUP_DIR}"

for command in psql pg_dump pg_restore sha256sum mktemp; do
  command -v "$command" >/dev/null || {
    echo "缺少命令：$command" >&2
    exit 1
  }
done

mkdir -p "$MIGRATION_BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
database_name="$(psql "$SOURCE_DATABASE_URL" -X -Atqc 'select current_database()')"
safe_database_name="$(printf '%s' "$database_name" | tr -cd '[:alnum:]_-')"
export_mode="${MIGRATION_EXPORT_MODE:-rehearsal}"
case "$export_mode" in
  rehearsal) ;;
  final)
    [[ "${SOURCE_WRITES_FROZEN:-false}" == "true" ]] || {
      echo "最终导出前必须停止旧站全部写入，并显式设置 SOURCE_WRITES_FROZEN=true" >&2
      exit 1
    }
    [[ "${MIGRATION_FREEZE_CONFIRM:-}" == "$database_name" ]] || {
      echo "MIGRATION_FREEZE_CONFIRM 必须与源数据库名完全一致，拒绝把未确认的导出作为最终数据" >&2
      exit 1
    }
    ;;
  *)
    echo "MIGRATION_EXPORT_MODE 只允许 rehearsal 或 final" >&2
    exit 1
    ;;
esac
prefix="${MIGRATION_BACKUP_DIR%/}/${safe_database_name}-${timestamp}"
dump_file="${prefix}.dump"
counts_file="${prefix}.table-counts.tsv"
manifest_file="${prefix}.manifest.txt"

snapshot_dir="$(mktemp -d "${TMPDIR:-/tmp}/guoxue-db-export.XXXXXX")"
snapshot_output="$snapshot_dir/snapshot-id"
snapshot_ready_file="$snapshot_dir/ready"
snapshot_release_file="$snapshot_dir/release"
snapshot_keeper_sql="$snapshot_dir/keep-snapshot.sql"
snapshot_keeper_pid=""

cleanup_snapshot() {
  exit_code=$?
  trap - EXIT
  if [[ -n "$snapshot_keeper_pid" ]]; then
    : >"$snapshot_release_file"
    wait "$snapshot_keeper_pid" 2>/dev/null || true
  fi
  rm -f \
    "$snapshot_output" \
    "$snapshot_ready_file" \
    "$snapshot_release_file" \
    "$snapshot_keeper_sql"
  rmdir "$snapshot_dir" 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup_snapshot EXIT

cat >"$snapshot_keeper_sql" <<SQL
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
\\pset tuples_only on
\\pset format unaligned
\\o '$snapshot_output'
SELECT pg_export_snapshot();
\\o
\\! touch '$snapshot_ready_file'
\\! while [ ! -f '$snapshot_release_file' ]; do sleep 0.1; done
COMMIT;
SQL

psql "$SOURCE_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$snapshot_keeper_sql" >/dev/null &
snapshot_keeper_pid=$!
for _ in {1..300}; do
  [[ -f "$snapshot_ready_file" ]] && break
  kill -0 "$snapshot_keeper_pid" 2>/dev/null || {
    echo "无法建立 PostgreSQL 一致性快照" >&2
    wait "$snapshot_keeper_pid" || true
    snapshot_keeper_pid=""
    exit 1
  }
  sleep 0.1
done
[[ -s "$snapshot_output" && -f "$snapshot_ready_file" ]] || {
  echo "等待 PostgreSQL 一致性快照超时" >&2
  exit 1
}
snapshot_id="$(tr -d '[:space:]' <"$snapshot_output")"
[[ "$snapshot_id" =~ ^[[:xdigit:]-]+$ ]] || {
  echo "PostgreSQL 返回了无效的一致性快照标识" >&2
  exit 1
}

echo "开始导出数据库 ${database_name}（模式=${export_mode}，归档与计数共用一致性快照，不会修改源库）"
pg_dump "$SOURCE_DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --snapshot="$snapshot_id" \
  --file="$dump_file"

pg_restore --list "$dump_file" >/dev/null

psql "$SOURCE_DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -v snapshot_id="$snapshot_id" \
  >"$counts_file" <<'SQL'
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET TRANSACTION SNAPSHOT :'snapshot_id';
SELECT format(
  'SELECT %L || E''\\t'' || count(*) FROM %I.%I;',
  format('%I.%I', schemaname, tablename),
  schemaname,
  tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec
COMMIT;
SQL

: >"$snapshot_release_file"
wait "$snapshot_keeper_pid"
snapshot_keeper_pid=""
[[ -s "$counts_file" ]] || {
  echo "一致性快照未生成任何 public 表计数，拒绝输出迁移归档" >&2
  exit 1
}

{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'database_name=%s\n' "$database_name"
  printf 'export_mode=%s\n' "$export_mode"
  printf 'consistent_snapshot=%s\n' "$snapshot_id"
  printf 'server_version=%s\n' "$(psql "$SOURCE_DATABASE_URL" -X -Atqc 'show server_version')"
  printf 'dump_file=%s\n' "$(basename "$dump_file")"
  printf 'counts_file=%s\n' "$(basename "$counts_file")"
  printf 'prisma_migrations=%s\n' \
    "$(psql "$SOURCE_DATABASE_URL" -X -Atqc "select count(*) from \"_prisma_migrations\"" 2>/dev/null || printf 'not_available')"
  printf 'extensions=%s\n' \
    "$(psql "$SOURCE_DATABASE_URL" -X -Atqc "select string_agg(extname, ',' order by extname) from pg_extension")"
} >"$manifest_file"

# 一份校验清单同时保护数据库归档、表计数和环境清单，避免只校验 dump
# 却使用了被误改的计数文件做迁移验收。
(
  cd "$(dirname "$dump_file")"
  sha256sum \
    "$(basename "$dump_file")" \
    "$(basename "$counts_file")" \
    "$(basename "$manifest_file")" \
    >"$(basename "$dump_file").sha256"
)

echo "导出完成：$dump_file"
echo "校验文件：${dump_file}.sha256"
echo "表计数：$counts_file"
