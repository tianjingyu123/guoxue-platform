#!/usr/bin/env bash
set -Eeuo pipefail

: "${TARGET_DATABASE_URL:?必须设置 TARGET_DATABASE_URL}"
: "${BACKUP_FILE:?必须设置 BACKUP_FILE}"
: "${RESTORE_CONFIRM:?必须设置 RESTORE_CONFIRM 为目标数据库名}"

for command in psql pg_restore sha256sum; do
  command -v "$command" >/dev/null || {
    echo "缺少命令：$command" >&2
    exit 1
  }
done

test -f "$BACKUP_FILE" || {
  echo "备份文件不存在：$BACKUP_FILE" >&2
  exit 1
}

target_database="$(psql "$TARGET_DATABASE_URL" -X -Atqc 'select current_database()')"
if [[ "$RESTORE_CONFIRM" != "$target_database" ]]; then
  echo "确认值与目标数据库名不一致，拒绝恢复" >&2
  exit 1
fi

checksum_file="${BACKUP_FILE}.sha256"
if [[ -f "$checksum_file" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum --check "$(basename "$checksum_file")")
else
  echo "缺少 ${checksum_file}，拒绝执行未经校验的恢复" >&2
  exit 1
fi

existing_tables="$(psql "$TARGET_DATABASE_URL" -X -Atqc \
  "select count(*) from pg_tables where schemaname='public'")"
if [[ "$existing_tables" != "0" && "${ALLOW_NONEMPTY_TARGET:-false}" != "true" ]]; then
  echo "目标库 public schema 已有 ${existing_tables} 张表；默认拒绝覆盖。" >&2
  echo "请使用新建空库，或在人工确认后显式设置 ALLOW_NONEMPTY_TARGET=true。" >&2
  exit 1
fi

echo "开始恢复到空目标库 ${target_database}（不会删除数据库）"
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --jobs="${PG_RESTORE_JOBS:-2}" \
  "$BACKUP_FILE"

echo "恢复完成。请立即运行 verify-postgres.sh 和 Prisma migrate status。"
