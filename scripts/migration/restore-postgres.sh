#!/usr/bin/env bash
set -Eeuo pipefail

: "${TARGET_DATABASE_URL:?必须设置 TARGET_DATABASE_URL}"
: "${BACKUP_FILE:?必须设置 BACKUP_FILE}"
: "${RESTORE_CONFIRM:?必须设置 RESTORE_CONFIRM 为目标数据库名}"
: "${MIGRATION_RESTORE_MODE:?必须设置 MIGRATION_RESTORE_MODE 为 rehearsal 或 final}"

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
manifest_file="${BACKUP_FILE%.dump}.manifest.txt"
if [[ -f "$checksum_file" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum --check "$(basename "$checksum_file")")
else
  echo "缺少 ${checksum_file}，拒绝执行未经校验的恢复" >&2
  exit 1
fi
test -f "$manifest_file" || {
  echo "缺少迁移清单：$manifest_file" >&2
  exit 1
}

manifest_value() {
  key="$1"
  sed -n "s/^${key}=//p" "$manifest_file" | head -n 1
}

source_database="$(manifest_value database_name)"
export_mode="$(manifest_value export_mode)"
consistent_snapshot="$(manifest_value consistent_snapshot)"
[[ -n "$source_database" ]] || {
  echo "迁移清单缺少源数据库名" >&2
  exit 1
}
case "$MIGRATION_RESTORE_MODE" in
  rehearsal)
    [[ "$export_mode" == "rehearsal" || "$export_mode" == "final" ]] || {
      echo "迁移清单的 export_mode 无效" >&2
      exit 1
    }
    ;;
  final)
    [[ "$export_mode" == "final" ]] || {
      echo "正式恢复只接受最终停写后生成的 final 归档，当前清单为 ${export_mode:-missing}" >&2
      exit 1
    }
    [[ "$consistent_snapshot" =~ ^[[:xdigit:]-]+$ ]] || {
      echo "正式恢复的迁移清单缺少有效一致性快照标识" >&2
      exit 1
    }
    ;;
  *)
    echo "MIGRATION_RESTORE_MODE 只允许 rehearsal 或 final" >&2
    exit 1
    ;;
esac

existing_tables="$(psql "$TARGET_DATABASE_URL" -X -Atqc \
  "select count(*) from pg_tables where schemaname='public'")"
if [[ "$existing_tables" != "0" ]]; then
  echo "目标库 public schema 已有 ${existing_tables} 张表，拒绝执行恢复。" >&2
  echo "迁移恢复只允许写入新建空库；请更换空目标库，不得通过环境变量跳过此保护。" >&2
  exit 1
fi

echo "开始把源库 ${source_database} 的 ${export_mode} 归档事务式恢复到空目标库 ${target_database}（不会删除数据库）"
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --single-transaction \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  "$BACKUP_FILE"

echo "恢复完成。请先运行 run-prisma-migrations.sh deploy，再运行 verify-postgres.sh；核验脚本会通过生产镜像执行 migrate status。"
