-- 采购到货质检批次：区分合格入库与不合格拒收，并对每次验收做幂等留痕。
ALTER TYPE "InventoryReferenceType"
  ADD VALUE IF NOT EXISTS 'PURCHASE_RECEIPT';

ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN IF NOT EXISTS "rejectedQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "PurchaseReceipt" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "receiptNo" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "warehouseName" TEXT,
  "operatorId" TEXT NOT NULL,
  "remark" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PurchaseReceiptItem" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "purchaseOrderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuId" TEXT,
  "productTitle" TEXT NOT NULL,
  "skuLabel" TEXT,
  "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
  "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceiptItem_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseReceiptItem_purchaseOrderItemId_fkey"
    FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReceipt_receiptNo_key"
  ON "PurchaseReceipt"("receiptNo");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReceipt_merchantId_requestId_key"
  ON "PurchaseReceipt"("merchantId", "requestId");
CREATE INDEX IF NOT EXISTS "PurchaseReceipt_merchantId_receivedAt_idx"
  ON "PurchaseReceipt"("merchantId", "receivedAt");
CREATE INDEX IF NOT EXISTS "PurchaseReceipt_purchaseOrderId_receivedAt_idx"
  ON "PurchaseReceipt"("purchaseOrderId", "receivedAt");
CREATE INDEX IF NOT EXISTS "PurchaseReceiptItem_receiptId_idx"
  ON "PurchaseReceiptItem"("receiptId");
CREATE INDEX IF NOT EXISTS "PurchaseReceiptItem_purchaseOrderItemId_idx"
  ON "PurchaseReceiptItem"("purchaseOrderItemId");
CREATE INDEX IF NOT EXISTS "PurchaseReceiptItem_productId_skuId_idx"
  ON "PurchaseReceiptItem"("productId", "skuId");
