-- 运营看板天级聚合表（看-P1）：DashboardDaily
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260705_dashboard_daily.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

CREATE TABLE IF NOT EXISTS "DashboardDaily" (
  "id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DashboardDaily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DashboardDaily_date_key" ON "DashboardDaily"("date");
