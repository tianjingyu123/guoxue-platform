-- 商家履约日指标表（履-P1）：MerchantMetric
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260706_merchant_metric.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

CREATE TABLE IF NOT EXISTS "MerchantMetric" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "ordersCount" INTEGER NOT NULL DEFAULT 0,
  "shipOnTimeRate" DECIMAL(5,4),
  "avgShipHours" DECIMAL(8,2),
  "refundRate" DECIMAL(5,4),
  "returnRate" DECIMAL(5,4),
  "avgRating" DECIMAL(3,2),
  "complaintCount" INTEGER NOT NULL DEFAULT 0,
  "qcPassRate" DECIMAL(5,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MerchantMetric_merchantId_date_key" ON "MerchantMetric"("merchantId", "date");
CREATE INDEX IF NOT EXISTS "MerchantMetric_date_idx" ON "MerchantMetric"("date");
