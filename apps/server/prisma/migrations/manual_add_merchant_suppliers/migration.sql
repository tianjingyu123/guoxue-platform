-- 商家供应商档案与采购单关联。
-- 采用 additive 迁移：历史采购单继续依赖 supplierName/contact 快照，新采购单可关联档案。
CREATE TABLE IF NOT EXISTS "MerchantSupplier" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "address" TEXT,
  "settlementTerms" TEXT,
  "leadTimeDays" INTEGER,
  "remark" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "purchaseCount" INTEGER NOT NULL DEFAULT 0,
  "totalPurchaseAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "lastPurchasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantSupplier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MerchantSupplier_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantSupplier_merchantId_name_key"
  ON "MerchantSupplier"("merchantId", "name");
CREATE INDEX IF NOT EXISTS "MerchantSupplier_merchantId_status_updatedAt_idx"
  ON "MerchantSupplier"("merchantId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "MerchantSupplier_merchantId_lastPurchasedAt_idx"
  ON "MerchantSupplier"("merchantId", "lastPurchasedAt");

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_createdAt_idx"
  ON "PurchaseOrder"("supplierId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PurchaseOrder_supplierId_fkey'
  ) THEN
    ALTER TABLE "PurchaseOrder"
      ADD CONSTRAINT "PurchaseOrder_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "MerchantSupplier"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
