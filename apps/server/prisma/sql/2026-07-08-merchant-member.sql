-- 块A·官方旗舰店多操作员：新增 MerchantMember 表（只增不删·幂等）。
-- 应用：cd apps/server && npx prisma db execute --file prisma/sql/2026-07-08-merchant-member.sql --schema prisma/schema.prisma
-- 说明：商品/订单归属仍以 Merchant.userId(owner) 为准；本表仅表达"某用户可以某店铺身份经营"(鉴权+审计)。

CREATE TABLE IF NOT EXISTS "MerchantMember" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MerchantMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantMember_merchantId_userId_key" ON "MerchantMember"("merchantId", "userId");
CREATE INDEX IF NOT EXISTS "MerchantMember_userId_status_idx" ON "MerchantMember"("userId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MerchantMember_merchantId_fkey'
  ) THEN
    ALTER TABLE "MerchantMember"
      ADD CONSTRAINT "MerchantMember_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
