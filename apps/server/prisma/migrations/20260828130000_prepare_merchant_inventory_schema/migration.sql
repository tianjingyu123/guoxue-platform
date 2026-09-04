-- 生产旧库缺少采购与库存基础对象，而后续供应商、到货迁移会直接引用这些对象。
-- 仅补充当前 Prisma 模型所需对象；不删除、不重命名，也不改写存量业务数据。

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryMovementType') THEN
    CREATE TYPE "InventoryMovementType" AS ENUM (
      'PURCHASE_IN', 'SALE_OUT', 'ORDER_CANCEL_RETURN', 'REFUND_RETURN',
      'ADJUST_IN', 'ADJUST_OUT', 'STOCKTAKE_GAIN', 'STOCKTAKE_LOSS'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReferenceType') THEN
    CREATE TYPE "InventoryReferenceType" AS ENUM (
      'PURCHASE_ORDER', 'PURCHASE_RECEIPT', 'ORDER', 'ADJUSTMENT', 'STOCKTAKE', 'RETURN'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderStatus') THEN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM (
      'DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'
    );
  END IF;
END $$;

-- 旧生产库同样缺少数字员工运营任务池；后续审批证据迁移会直接扩展此表。
-- 这里只创建审批证据加入前的基础形态，让后续迁移继续负责新增字段和唯一索引。
CREATE TABLE IF NOT EXISTS "OpsTask" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "title" TEXT NOT NULL,
  "executor" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB,
  "reviewReason" TEXT,
  "needsApproval" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpsTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OpsTask_status_priority_idx"
  ON "OpsTask"("status", "priority");
CREATE INDEX IF NOT EXISTS "OpsTask_type_status_idx"
  ON "OpsTask"("type", "status");
CREATE INDEX IF NOT EXISTS "OpsTask_createdAt_idx"
  ON "OpsTask"("createdAt");

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "beforeStock" INTEGER NOT NULL,
  "afterStock" INTEGER NOT NULL,
  "referenceType" "InventoryReferenceType" NOT NULL,
  "referenceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "operatorId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryMovement_idempotencyKey_key"
  ON "InventoryMovement"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "InventoryMovement_merchantId_createdAt_idx"
  ON "InventoryMovement"("merchantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_merchantId_productId_skuId_createdAt_idx"
  ON "InventoryMovement"("merchantId", "productId", "skuId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_referenceType_referenceId_idx"
  ON "InventoryMovement"("referenceType", "referenceId");

CREATE TABLE IF NOT EXISTS "InventoryAlertSetting" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "stockKey" TEXT NOT NULL,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryAlertSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryAlertSetting_merchantId_stockKey_key"
  ON "InventoryAlertSetting"("merchantId", "stockKey");
CREATE INDEX IF NOT EXISTS "InventoryAlertSetting_merchantId_enabled_idx"
  ON "InventoryAlertSetting"("merchantId", "enabled");
CREATE INDEX IF NOT EXISTS "InventoryAlertSetting_productId_skuId_idx"
  ON "InventoryAlertSetting"("productId", "skuId");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "supplierId" TEXT,
  "supplierName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "expectedAt" TIMESTAMP(3),
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_orderNo_key"
  ON "PurchaseOrder"("orderNo");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_merchantId_status_createdAt_idx"
  ON "PurchaseOrder"("merchantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_merchantId_supplierName_idx"
  ON "PurchaseOrder"("merchantId", "supplierName");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_createdAt_idx"
  ON "PurchaseOrder"("supplierId", "createdAt");

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "productTitle" TEXT NOT NULL,
  "skuLabel" TEXT,
  "quantity" INTEGER NOT NULL,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx"
  ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_skuId_idx"
  ON "PurchaseOrderItem"("productId", "skuId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderItem_purchaseOrderId_fkey'
  ) THEN
    ALTER TABLE "PurchaseOrderItem"
      ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey"
      FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
