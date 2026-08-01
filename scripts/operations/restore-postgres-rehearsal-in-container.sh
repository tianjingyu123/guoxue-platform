#!/usr/bin/env bash
set -Eeuo pipefail

DUMP_FILE="${1:?必须传入 custom dump 文件路径}"
EXPECTED_TABLE_COUNT="${2:?必须传入源库 public 表数量}"
DRILL_ID="${3:-20260801}"

case "$DUMP_FILE" in
  /opt/guoxue/backups/rehearsal/*.dump) ;;
  *)
    echo "演练归档必须位于 /opt/guoxue/backups/rehearsal" >&2
    exit 64
    ;;
esac
[[ "$EXPECTED_TABLE_COUNT" =~ ^[1-9][0-9]*$ ]] || {
  echo "源库表数量必须为正整数" >&2
  exit 64
}
[[ "$DRILL_ID" =~ ^[A-Za-z0-9_-]+$ ]] || {
  echo "演练标识格式无效" >&2
  exit 64
}
test -f "$DUMP_FILE" || {
  echo "演练归档不存在：$DUMP_FILE" >&2
  exit 1
}

container="guoxue-restore-drill-${DRILL_ID}"
image="postgres:18.4"
label_key="rebugx.restore-drill"

if docker inspect "$container" >/dev/null 2>&1; then
  echo "同名演练容器已存在，拒绝接管：$container" >&2
  exit 1
fi

cleanup() {
  if docker inspect "$container" >/dev/null 2>&1; then
    actual_label="$(docker inspect -f "{{ index .Config.Labels \"$label_key\" }}" "$container")"
    if [[ "$actual_label" == "$DRILL_ID" ]]; then
      docker rm -f "$container" >/dev/null
      echo "TEMP_CONTAINER_REMOVED=$container"
    else
      echo "临时容器标签不匹配，拒绝删除：$container" >&2
    fi
  fi
}
trap cleanup EXIT

docker pull "$image" >/dev/null
docker run -d \
  --name "$container" \
  --label "$label_key=$DRILL_ID" \
  --network none \
  -e POSTGRES_PASSWORD=restore-drill-only \
  -e POSTGRES_DB=restore_drill \
  -v "$DUMP_FILE:/backup/source.dump:ro" \
  "$image" >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres -d restore_drill >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" = 1 || {
  echo "临时 PostgreSQL 未在 60 秒内就绪" >&2
  exit 1
}

docker exec "$container" pg_restore \
  --dbname=postgresql://postgres:restore-drill-only@localhost:5432/restore_drill \
  --single-transaction \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  /backup/source.dump

table_count="$(docker exec "$container" psql -U postgres -d restore_drill -X -Atqc \
  "select count(*) from pg_tables where schemaname='public'")"
migration_count="$(docker exec "$container" psql -U postgres -d restore_drill -X -Atqc \
  "select count(*) from public.\"_prisma_migrations\" where finished_at is not null and rolled_back_at is null")"
failed_migrations="$(docker exec "$container" psql -U postgres -d restore_drill -X -Atqc \
  "select count(*) from public.\"_prisma_migrations\" where finished_at is null and rolled_back_at is null")"
database_size="$(docker exec "$container" psql -U postgres -d restore_drill -X -Atqc \
  "select pg_database_size(current_database())")"

[[ "$table_count" == "$EXPECTED_TABLE_COUNT" ]] || {
  echo "恢复后表数不一致：expected=$EXPECTED_TABLE_COUNT actual=$table_count" >&2
  exit 1
}
[[ "$failed_migrations" == "0" ]] || {
  echo "恢复后存在未完成迁移：$failed_migrations" >&2
  exit 1
}

echo "RESTORE_DRILL_STATUS=OK"
echo "POSTGRES_IMAGE=$image"
echo "PUBLIC_TABLE_COUNT=$table_count"
echo "PRISMA_MIGRATIONS=$migration_count"
echo "FAILED_MIGRATIONS=$failed_migrations"
echo "RESTORED_DATABASE_SIZE_BYTES=$database_size"
