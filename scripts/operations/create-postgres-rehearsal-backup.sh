#!/usr/bin/env bash
set -Eeuo pipefail

# 只读导出当前 PostgreSQL，生成恢复演练所需的 custom dump、对象清单与校验文件。
# 生产 env_file 可能包含 | 等 shell 元字符，禁止 source；只按精确键名读取 DATABASE_URL。

ENV_FILE="${1:-/opt/gx-role-hotfix-stage-20260731/docker/.env.production}"
BACKUP_ROOT="${2:-/opt/guoxue/backups/rehearsal}"

for command_name in pg_dump pg_restore psql sha256sum awk date install mv stat python3 sed tr basename chmod rm; do
  command -v "$command_name" >/dev/null || {
    echo "缺少命令：$command_name" >&2
    exit 1
  }
done

test -r "$ENV_FILE" || {
  echo "生产配置不可读：$ENV_FILE" >&2
  exit 1
}

case "$BACKUP_ROOT" in
  /opt/guoxue/backups/rehearsal|/opt/guoxue/backups/rehearsal/*) ;;
  *)
    echo "备份目录必须位于 /opt/guoxue/backups/rehearsal" >&2
    exit 64
    ;;
esac

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '
    $1 == wanted {
      if (seen++) exit 2
      print substr($0, index($0, "=") + 1)
    }
    END {
      if (seen != 1) exit 3
    }
  ' "$ENV_FILE"
}

DATABASE_URL="$(read_env_value DATABASE_URL)" || {
  echo "DATABASE_URL 缺失或重复，拒绝备份" >&2
  exit 1
}
test -n "$DATABASE_URL" || {
  echo "DATABASE_URL 为空，拒绝备份" >&2
  exit 1
}

# Prisma 接受 schema/connection_limit 等查询参数，libpq/pg_dump 不接受这些扩展参数。
# 仅移除明确属于 Prisma 的参数，保留 sslmode、connect_timeout 等 libpq 参数。
DATABASE_CLI_URL="$(printf '%s' "$DATABASE_URL" | python3 -c '
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

raw = sys.stdin.read().strip()
parts = urlsplit(raw)
blocked = {"schema", "connection_limit", "pool_timeout", "pgbouncer", "statement_cache_size"}
query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key not in blocked]
print(urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)))
')"
unset DATABASE_URL
test -n "$DATABASE_CLI_URL" || {
  echo "无法生成 pg_dump 可用的数据库连接串" >&2
  exit 1
}

database_name="$(psql "$DATABASE_CLI_URL" -X -Atqc 'select current_database()')"
server_version="$(psql "$DATABASE_CLI_URL" -X -Atqc 'show server_version')"
client_version="$(pg_dump --version | sed 's/^pg_dump (PostgreSQL) //')"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
safe_database="$(printf '%s' "$database_name" | tr -cd 'A-Za-z0-9_-')"
test -n "$safe_database" || {
  echo "数据库名无法安全映射为文件名" >&2
  exit 1
}

install -d -m 0750 "$BACKUP_ROOT"
prefix="$BACKUP_ROOT/${safe_database}-rehearsal-${timestamp}"
dump_file="${prefix}.dump"
temp_dump="${dump_file}.tmp"
list_file="${prefix}.list.txt"
manifest_file="${prefix}.manifest.txt"
checksum_file="${prefix}.sha256"

test ! -e "$dump_file" && test ! -e "$temp_dump" || {
  echo "同名备份已存在，拒绝覆盖" >&2
  exit 1
}

cleanup() {
  rm -f -- "$temp_dump"
}
trap cleanup EXIT

pg_dump "$DATABASE_CLI_URL" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --file="$temp_dump"

test -s "$temp_dump" || {
  echo "导出文件为空" >&2
  exit 1
}
mv "$temp_dump" "$dump_file"
pg_restore --list "$dump_file" >"$list_file"

{
  echo "export_mode=rehearsal"
  echo "database_name=$database_name"
  echo "exported_at_utc=$timestamp"
  echo "server_version=$server_version"
  echo "pg_dump_version=$client_version"
  echo "dump_file=$(basename "$dump_file")"
  echo "list_file=$(basename "$list_file")"
  echo "dump_size_bytes=$(stat -c %s "$dump_file")"
} >"$manifest_file"

(
  cd "$BACKUP_ROOT"
  sha256sum \
    "$(basename "$dump_file")" \
    "$(basename "$list_file")" \
    "$(basename "$manifest_file")" >"$(basename "$checksum_file")"
  sha256sum --check "$(basename "$checksum_file")"
)

chmod 0640 "$dump_file" "$list_file" "$manifest_file" "$checksum_file"
trap - EXIT

echo "BACKUP_STATUS=OK"
echo "DATABASE=$database_name"
echo "SERVER_VERSION=$server_version"
echo "CLIENT_VERSION=$client_version"
echo "DUMP_FILE=$dump_file"
echo "DUMP_SIZE_BYTES=$(stat -c %s "$dump_file")"
echo "CHECKSUM_FILE=$checksum_file"
