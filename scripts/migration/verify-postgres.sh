#!/usr/bin/env bash
set -Eeuo pipefail

: "${TARGET_DATABASE_URL:?必须设置 TARGET_DATABASE_URL}"
: "${SOURCE_COUNTS_FILE:?必须设置 SOURCE_COUNTS_FILE}"

command -v psql >/dev/null || {
  echo "缺少命令：psql" >&2
  exit 1
}
test -f "$SOURCE_COUNTS_FILE" || {
  echo "源库表计数文件不存在：$SOURCE_COUNTS_FILE" >&2
  exit 1
}

psql "$TARGET_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'select 1' >/dev/null

missing_extensions=()
for extension in vector pg_trgm; do
  present="$(psql "$TARGET_DATABASE_URL" -X -Atqc \
    "select count(*) from pg_extension where extname='${extension}'")"
  [[ "$present" == "1" ]] || missing_extensions+=("$extension")
done
if (( ${#missing_extensions[@]} > 0 )); then
  echo "目标库缺少扩展：${missing_extensions[*]}" >&2
  exit 1
fi

mismatches=0
while IFS=$'\t' read -r table_name source_count; do
  [[ -n "$table_name" ]] || continue
  target_count="$(psql "$TARGET_DATABASE_URL" -X -Atqc "select count(*) from ${table_name}")"
  if [[ "$source_count" != "$target_count" ]]; then
    echo "计数不一致：${table_name} 源=${source_count} 目标=${target_count}" >&2
    mismatches=$((mismatches + 1))
  fi
done <"$SOURCE_COUNTS_FILE"

if (( mismatches > 0 )); then
  echo "数据库校验失败：${mismatches} 张表计数不一致" >&2
  exit 1
fi

echo "数据库校验通过：连接、必要扩展和全部 public 表计数一致"
