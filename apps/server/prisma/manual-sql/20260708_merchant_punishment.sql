-- 商家处罚记录表（履-P3）：MerchantPunishment
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260708_merchant_punishment.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

CREATE TABLE IF NOT EXISTS "MerchantPunishment" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "operatorId" TEXT NOT NULL,
  "revokedBy" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantPunishment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MerchantPunishment_merchantId_idx" ON "MerchantPunishment"("merchantId");
CREATE INDEX IF NOT EXISTS "MerchantPunishment_merchantId_status_idx" ON "MerchantPunishment"("merchantId", "status");
