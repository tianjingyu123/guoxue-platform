#!/usr/bin/env bash
set -Eeuo pipefail

: "${TARGET_DATABASE_URL:?必须设置 TARGET_DATABASE_URL}"
: "${SOURCE_COUNTS_FILE:?必须设置 SOURCE_COUNTS_FILE}"
: "${MIGRATION_VERIFICATION_MODE:?必须设置 MIGRATION_VERIFICATION_MODE 为 rehearsal 或 final}"
: "${TARGET_RELEASE_ID:?必须设置 TARGET_RELEASE_ID}"
: "${MIGRATION_VERIFICATION_REPORT:?必须设置 MIGRATION_VERIFICATION_REPORT}"

for command in psql sha256sum node docker; do
  command -v "$command" >/dev/null || {
    echo "缺少命令：$command" >&2
    exit 1
  }
done
case "$MIGRATION_VERIFICATION_MODE" in
  rehearsal|final) ;;
  *)
    echo "MIGRATION_VERIFICATION_MODE 只允许 rehearsal 或 final" >&2
    exit 1
    ;;
esac
test -f "$SOURCE_COUNTS_FILE" || {
  echo "源库表计数文件不存在：$SOURCE_COUNTS_FILE" >&2
  exit 1
}

checksum_file="${SOURCE_CHECKSUM_FILE:-${SOURCE_COUNTS_FILE%.table-counts.tsv}.dump.sha256}"
manifest_file="${SOURCE_MANIFEST_FILE:-${SOURCE_COUNTS_FILE%.table-counts.tsv}.manifest.txt}"
test -f "$checksum_file" || {
  echo "迁移校验清单不存在：$checksum_file" >&2
  exit 1
}
test -f "$manifest_file" || {
  echo "迁移清单不存在：$manifest_file" >&2
  exit 1
}

checksum_dir="$(cd "$(dirname "$checksum_file")" && pwd -P)"
counts_dir="$(cd "$(dirname "$SOURCE_COUNTS_FILE")" && pwd -P)"
manifest_dir="$(cd "$(dirname "$manifest_file")" && pwd -P)"
if [[ "$counts_dir" != "$checksum_dir" || "$manifest_dir" != "$checksum_dir" ]]; then
  echo "归档、表计数、迁移清单和校验文件必须来自同一目录，拒绝串档核验" >&2
  exit 1
fi

counts_basename="$(basename "$SOURCE_COUNTS_FILE")"
manifest_basename="$(basename "$manifest_file")"
manifest_dump_basename="$(awk -F= '$1 == "dump_file" { print substr($0, index($0, "=") + 1) }' "$manifest_file")"
manifest_counts_basename="$(awk -F= '$1 == "counts_file" { print substr($0, index($0, "=") + 1) }' "$manifest_file")"
for archive_name in "$counts_basename" "$manifest_basename" "$manifest_dump_basename" "$manifest_counts_basename"; do
  [[ "$archive_name" =~ ^[A-Za-z0-9._-]+$ ]] || {
    echo "迁移归档文件名无效或清单字段重复：$archive_name" >&2
    exit 1
  }
done
[[ "$manifest_counts_basename" == "$counts_basename" ]] || {
  echo "源库表计数文件与迁移清单不属于同一归档" >&2
  exit 1
}
[[ "$manifest_dump_basename" == *.dump ]] || {
  echo "迁移清单中的 dump_file 无效" >&2
  exit 1
}
[[ "$manifest_basename" == "${manifest_dump_basename%.dump}.manifest.txt" ]] || {
  echo "迁移清单文件名与数据库归档不匹配" >&2
  exit 1
}

seen_dump=0
seen_counts=0
seen_manifest=0
checksum_entries=0
while IFS= read -r checksum_line; do
  [[ -n "$checksum_line" ]] || continue
  [[ "$checksum_line" =~ ^[A-Fa-f0-9]{64}[[:space:]][[:space:]\*]([A-Za-z0-9._-]+)$ ]] || {
    echo "迁移校验清单包含无效或跨目录条目" >&2
    exit 1
  }
  checksum_name="${BASH_REMATCH[1]}"
  checksum_entries=$((checksum_entries + 1))
  case "$checksum_name" in
    "$manifest_dump_basename") seen_dump=$((seen_dump + 1)) ;;
    "$counts_basename") seen_counts=$((seen_counts + 1)) ;;
    "$manifest_basename") seen_manifest=$((seen_manifest + 1)) ;;
    *)
      echo "迁移校验清单包含不属于当前归档的文件：$checksum_name" >&2
      exit 1
      ;;
  esac
done <"$checksum_file"
if (( checksum_entries != 3 || seen_dump != 1 || seen_counts != 1 || seen_manifest != 1 )); then
  echo "迁移校验清单必须且只能绑定当前归档、表计数和迁移清单各一份" >&2
  exit 1
fi
(
  cd "$checksum_dir"
  sha256sum --check "$(basename "$checksum_file")"
)

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd -P)"
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

if [[ "$(psql "$TARGET_DATABASE_URL" -X -Atqc \
  "select count(*) from pg_extension where extname='pg_stat_statements'")" != "1" ]]; then
  echo "警告：目标库未启用 pg_stat_statements；不阻断迁移，但上线前应在数据库服务商控制台启用。" >&2
fi

require_database_object() {
  label="$1"
  query="$2"
  present="$(psql "$TARGET_DATABASE_URL" -X -Atqc "$query")"
  if [[ "$present" != "1" ]]; then
    echo "目标库缺少关键运维对象：$label" >&2
    exit 1
  fi
}

# 这些对象无法完整表达在 Prisma schema 中，必须在 migrate deploy 后单独验证。
require_database_object \
  'CircleKnowledge.embedding vector(1536)' \
  "select count(*) from information_schema.columns where table_schema='public' and table_name='CircleKnowledge' and column_name='embedding' and udt_name='vector'"
require_database_object \
  'CircleKnowledge HNSW 向量索引' \
  "select count(*) from pg_indexes where schemaname='public' and indexname='CircleKnowledge_embedding_hnsw_idx'"
require_database_object \
  'Article 全文检索索引' \
  "select count(*) from pg_indexes where schemaname='public' and indexname='idx_article_fts'"
require_database_object \
  'Course 标签 GIN 索引' \
  "select count(*) from pg_indexes where schemaname='public' and indexname='Course_tags_gin_idx'"
require_database_object \
  'Article 标题模糊检索索引' \
  "select count(*) from pg_indexes where schemaname='public' and indexname='Article_title_trgm_idx'"
require_database_object \
  '最新运维对象修复迁移账本' \
  "select count(*) from \"_prisma_migrations\" where migration_name='20260730100000_repair_operational_database_objects' and finished_at is not null and rolled_back_at is null"

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

psql "$TARGET_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -f "$script_dir/verify-business-integrity.sql"

# 固定发布包不携带宿主机 node_modules。必须复用实际生产 server 镜像执行
# Prisma migrate status；任何待执行或失败迁移都会在证据生成前阻断。
bash "$script_dir/run-prisma-migrations.sh" status

target_database_name="$(psql "$TARGET_DATABASE_URL" -X -Atqc 'select current_database()')"
table_count="$(awk 'NF { count += 1 } END { print count + 0 }' "$SOURCE_COUNTS_FILE")"
node "$script_dir/write-postgres-verification-report.mjs" \
  --release-id "$TARGET_RELEASE_ID" \
  --verification-mode "$MIGRATION_VERIFICATION_MODE" \
  --source-counts-file "$SOURCE_COUNTS_FILE" \
  --source-checksum-file "$checksum_file" \
  --source-manifest-file "$manifest_file" \
  --target-database-name "$target_database_name" \
  --table-count "$table_count" \
  --prisma-migration-status passed \
  --report "$MIGRATION_VERIFICATION_REPORT"

echo "数据库校验通过：连接、必要扩展、关键运维对象和全部源库 public 表计数一致"
