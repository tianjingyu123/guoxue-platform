-- 商家进销存 additive migration（2026-07-19）
-- 仅生成随代码交付；上线前由运维窗口单独执行并核验，不在开发窗口擅自跑生产 DDL。

DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM (
    'PURCHASE_IN','SALE_OUT','ORDER_CANCEL_RETURN','REFUND_RETURN',
    'ADJUST_IN','ADJUST_OUT','STOCKTAKE_GAIN','STOCKTAKE_LOSS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryReferenceType" AS ENUM ('PURCHASE_ORDER','ORDER','ADJUSTMENT','STOCKTAKE','RETURN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" TEXT PRIMARY KEY,
  "merchantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "beforeStock" INTEGER NOT NULL,
  "afterStock" INTEGER NOT NULL,
  "referenceType" "InventoryReferenceType" NOT NULL,
  "referenceId" TEXT,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "operatorId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_stock_nonnegative" CHECK ("beforeStock" >= 0 AND "afterStock" >= 0),
  CONSTRAINT "InventoryMovement_quantity_nonzero" CHECK ("quantity" <> 0)
);
CREATE INDEX IF NOT EXISTS "InventoryMovement_merchantId_createdAt_idx" ON "InventoryMovement"("merchantId","createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_merchantId_productId_skuId_createdAt_idx" ON "InventoryMovement"("merchantId","productId","skuId","createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType","referenceId");

CREATE TABLE IF NOT EXISTS "InventoryAlertSetting" (
  "id" TEXT PRIMARY KEY,
  "merchantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "stockKey" TEXT NOT NULL,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryAlertSetting_threshold_nonnegative" CHECK ("lowStockThreshold" >= 0),
  CONSTRAINT "InventoryAlertSetting_merchantId_stockKey_key" UNIQUE ("merchantId","stockKey")
);
CREATE INDEX IF NOT EXISTS "InventoryAlertSetting_merchantId_enabled_idx" ON "InventoryAlertSetting"("merchantId","enabled");
CREATE INDEX IF NOT EXISTS "InventoryAlertSetting_productId_skuId_idx" ON "InventoryAlertSetting"("productId","skuId");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT PRIMARY KEY,
  "merchantId" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL UNIQUE,
  "supplierName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "expectedAt" TIMESTAMP(3),
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_merchantId_status_createdAt_idx" ON "PurchaseOrder"("merchantId","status","createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_merchantId_supplierName_idx" ON "PurchaseOrder"("merchantId","supplierName");

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id" TEXT PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "productTitle" TEXT NOT NULL,
  "skuLabel" TEXT,
  "quantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderItem_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "PurchaseOrderItem_received_valid" CHECK ("receivedQuantity" >= 0 AND "receivedQuantity" <= "quantity")
);
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_skuId_idx" ON "PurchaseOrderItem"("productId","skuId");
