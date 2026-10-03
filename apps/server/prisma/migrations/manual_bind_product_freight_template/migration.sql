-- 商品运费模板绑定与订单运费快照。历史商品保持 freightTemplateId=NULL，语义与现状一致：平台包邮。
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "freightTemplateId" TEXT;
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "freightTemplateId" TEXT,
  ADD COLUMN IF NOT EXISTS "freightSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "Product_freightTemplateId_idx" ON "Product"("freightTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_freightTemplateId_fkey') THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_freightTemplateId_fkey"
      FOREIGN KEY ("freightTemplateId") REFERENCES "FreightTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
