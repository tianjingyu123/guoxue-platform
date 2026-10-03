#!/bin/sh
set -eu

# 仅在北京目标旧服务容器内执行固定 SELECT。只输出对象存在性和计数，不读取业务行或连接串。
docker exec -i guoxue-server node <<'NODE'
const fs = require('fs');
const store = '/app/node_modules/.pnpm';
const name = fs.readdirSync(store).find((entry) => entry.startsWith('@prisma+client@'));
if (!name) throw new Error('PRISMA_PACKAGE_MISSING');
const { PrismaClient } = require(`${store}/${name}/node_modules/@prisma/client`);
const db = new PrismaClient();
(async () => {
  const identity = await db.$queryRawUnsafe(
    `SELECT current_database() AS database, current_schema() AS schema, current_setting('server_version') AS pg_version`,
  );
  const tables = await db.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('BrandConfig', 'ImFallbackMessage', 'ImFallbackConversationPreference')
    ORDER BY table_name
  `);
  const columns = await db.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'BrandConfig'
      AND column_name = 'serviceWechatQrUrl'
  `);
  const indexes = await db.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'ImFallbackMessage_fromUserId_toUserId_createdAt_idx',
        'ImFallbackMessage_toUserId_fromUserId_createdAt_idx',
        'ImFallbackMessage_toUserId_readAt_createdAt_idx',
        'ImFallbackConversationPreference_userId_isPinned_updatedAt_idx'
      ) ORDER BY indexname
  `);
  const counts = await db.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM "BrandConfig") AS brand_config_rows,
      (SELECT count(*)::int FROM "BrandConfig" WHERE "serviceWechatQrUrl" <> '') AS brand_config_nonempty_qr,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed_migrations,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE migration_name = '20260928183000_add_im_fallback' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS im_migration_applied
  `);
  console.log(JSON.stringify({ identity: identity[0], tables, columns, indexes, counts: counts[0] }));
})().catch(() => {
  console.error('IM_MIGRATION_READONLY_CHECK_FAILED');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
NODE
