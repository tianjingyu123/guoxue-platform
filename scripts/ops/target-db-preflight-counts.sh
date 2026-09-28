#!/bin/sh
set -eu

# 只在已运行的北京目标服务容器中执行固定 SELECT；不打印连接串或业务记录。
docker exec -i guoxue-server node <<'NODE'
const fs = require('fs');
const pnpmStore = '/app/node_modules/.pnpm';
const prismaPackage = fs.readdirSync(pnpmStore).find((name) => name.startsWith('@prisma+client@'));
if (!prismaPackage) throw new Error('PRISMA_PACKAGE_MISSING');
const { PrismaClient } = require(`${pnpmStore}/${prismaPackage}/node_modules/@prisma/client`);
const db = new PrismaClient();
(async () => {
  const identity = await db.$queryRawUnsafe('SELECT current_database() AS database, current_schema() AS schema');
  const counts = await db.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM "Order") AS orders,
      (SELECT count(*)::int FROM "Notification") AS notifications,
      (SELECT count(*)::int FROM "CircleRevenueRecord") AS circle_revenue,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed_migrations
  `);
  const columns = await db.$queryRawUnsafe(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (table_name, column_name) IN (
        ('Order', 'clientRequestId'),
        ('Order', 'requestFingerprint'),
        ('Notification', 'idempotencyKey'),
        ('CircleRevenueRecord', 'orderId'),
        ('CommissionRecall', 'resolvedRevenueId')
      )
    ORDER BY table_name, column_name
  `);
  console.log(JSON.stringify({ identity: identity[0], counts: counts[0], candidateColumnsPresent: columns }));
})().catch(() => {
  console.error('DB_PREFLIGHT_FAILED');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
NODE
