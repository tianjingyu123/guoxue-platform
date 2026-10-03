#!/usr/bin/env bash
set -Eeuo pipefail

PREFIX="${1:?必须传入不带扩展名的备份前缀}"
case "$PREFIX" in
  /opt/guoxue/backups/rehearsal/*) ;;
  *)
    echo "备份前缀必须位于 /opt/guoxue/backups/rehearsal" >&2
    exit 64
    ;;
esac

dump_file="${PREFIX}.dump"
manifest_file="${PREFIX}.manifest.txt"
checksum_file="${PREFIX}.sha256"

for file in "$dump_file" "$manifest_file" "$checksum_file"; do
  test -f "$file" || {
    echo "缺少备份文件：$file" >&2
    exit 1
  }
done

backup_dir="$(dirname "$PREFIX")"
(
  cd "$backup_dir"
  sha256sum --check "$(basename "$checksum_file")"
)
pg_restore --list "$dump_file" >/dev/null

stat -c "FILE=%n MODE=%a OWNER=%U:%G SIZE=%s" \
  "$dump_file" "$manifest_file" "$checksum_file"
echo "RESTORE_LIST_STATUS=OK"
