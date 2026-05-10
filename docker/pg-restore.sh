#!/bin/bash
# 国学平台 PostgreSQL 恢复脚本
# 用法: ./pg-restore.sh <备份文件路径>
# 示例: ./pg-restore.sh ./backups/guoxue_20260509_030000.sql.gz

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="${CONTAINER_NAME:-guoxue-postgres}"
DB_USER="${DB_USER:-guoxue}"
DB_NAME="${DB_NAME:-guoxue}"

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <备份文件路径>"
  echo "可用备份文件:"
  ls -1 "$SCRIPT_DIR/backups/" 2>/dev/null || echo "  (无备份文件)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

echo "警告: 此操作将覆盖当前数据库 '$DB_NAME' 的所有数据!"
echo "备份文件: $BACKUP_FILE"
echo "目标容器: $CONTAINER_NAME"
read -p "确认执行恢复? (输入 yes 继续): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "已取消"
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复..."

# 如果是 .gz 文件需要解压
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
else
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成"

# 迁移回滚说明:
# Prisma 迁移回滚步骤:
# 1. 查看迁移状态: npx prisma migrate status
# 2. 回滚到指定迁移: npx prisma migrate resolve --rolled-back <migration_name>
#    或者手动执行 SQL: psql -U guoxue -d guoxue -c "DELETE FROM _prisma_migrations WHERE migration_name='xxx';"
# 3. 重新部署目标版本
# 4. 注意: Prisma migrate 不直接支持 rollback，通常做法是新建正向迁移来撤销变更
