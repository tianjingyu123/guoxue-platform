#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SERVER_DIR="${SERVER_DIR_OVERRIDE:-$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)}"
SCHEMA="$SERVER_DIR/prisma/schema.prisma"
BASELINE="$SCRIPT_DIR/full-baseline.sql"
MIGRATIONS_DIR="$SERVER_DIR/prisma/migrations"

if [ "${CONFIRM_EMPTY_DATABASE:-}" != "YES" ]; then
  echo "[db-bootstrap] 拒绝执行：必须显式设置 CONFIRM_EMPTY_DATABASE=YES"
  exit 64
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[db-bootstrap] 缺少 DATABASE_URL"
  exit 64
fi

if [ ! -f "$SCHEMA" ] || [ ! -f "$BASELINE" ]; then
  echo "[db-bootstrap] 缺少 schema.prisma 或 full-baseline.sql"
  exit 66
fi

cd "$SERVER_DIR"

echo "[db-bootstrap] 检查目标数据库是否为空..."
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `);
  if (rows.length > 0) {
    console.error(`[db-bootstrap] 目标库已有 ${rows.length} 张业务表，拒绝执行空库基线。`);
    console.error(`[db-bootstrap] 示例表：${rows.slice(0, 8).map((row) => row.table_name).join(', ')}`);
    process.exitCode = 65;
  }
}

main()
  .catch((error) => {
    console.error('[db-bootstrap] 空库检查失败：', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
NODE

echo "[db-bootstrap] 应用当前全量基线..."
npx prisma db execute --file "$BASELINE" --schema "$SCHEMA"

echo "[db-bootstrap] 在单个事务中登记全量基线覆盖的历史迁移..."
MIGRATIONS_DIR="$MIGRATIONS_DIR" node <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrationsDir = process.env.MIGRATIONS_DIR;
  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sqlPath = path.join(migrationsDir, entry.name, 'migration.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`迁移缺少 migration.sql：${entry.name}`);
      }
      const sql = fs.readFileSync(sqlPath);
      return {
        name: entry.name,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id" VARCHAR(36) PRIMARY KEY NOT NULL,
          "checksum" VARCHAR(64) NOT NULL,
          "finished_at" TIMESTAMPTZ,
          "migration_name" VARCHAR(255) NOT NULL,
          "logs" TEXT,
          "rolled_back_at" TIMESTAMPTZ,
          "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0
        )
      `);

      for (const migration of migrations) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
           SELECT $1, $2, now(), $3, NULL, NULL, now(), 0
           WHERE NOT EXISTS (
             SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $3
           )`,
          crypto.randomUUID(),
          migration.checksum,
          migration.name,
        );
      }

      const rows = await tx.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
      );
      if (rows[0]?.count !== migrations.length) {
        throw new Error(`迁移账本数量异常：期望 ${migrations.length}，实际 ${rows[0]?.count ?? 0}`);
      }
    },
    { maxWait: 10000, timeout: 60000 },
  );

  console.log(`[db-bootstrap] 已登记 ${migrations.length} 条历史迁移。`);
}

main()
  .catch((error) => {
    console.error('[db-bootstrap] 迁移账本登记失败：', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
NODE

echo "[db-bootstrap] 验证迁移账本..."
npx prisma migrate status --schema "$SCHEMA"

echo "[db-bootstrap] 空数据库初始化完成。"
