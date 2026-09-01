-- SKU 生命周期：停售规格只做逻辑停用，保留历史订单展示与退款库存冲正能力。
ALTER TABLE "ProductSku"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "ProductSku_productId_idx";

CREATE INDEX IF NOT EXISTS "ProductSku_productId_isActive_idx"
  ON "ProductSku"("productId", "isActive");
