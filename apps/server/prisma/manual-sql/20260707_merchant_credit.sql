-- 商家信用评级（履-P2）：Merchant 增量列 + MerchantCreditLog 表
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260707_merchant_credit.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "creditScore" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "creditGrade" TEXT NOT NULL DEFAULT 'B';

CREATE TABLE IF NOT EXISTS "MerchantCreditLog" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "oldScore" INTEGER NOT NULL,
  "newScore" INTEGER NOT NULL,
  "factors" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantCreditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MerchantCreditLog_merchantId_idx" ON "MerchantCreditLog"("merchantId");
