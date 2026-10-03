ALTER TABLE "ManagedBrandRequest" ADD COLUMN "orderKind" VARCHAR(16) NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "ManagedBrandRequest" ADD COLUMN "courseId" TEXT;
ALTER TABLE "ManagedBrandRequest" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "ManagedBrandRequest" ALTER COLUMN "addressId" DROP NOT NULL;
ALTER TABLE "ManagedBrandRequest" ADD CONSTRAINT "ManagedBrandRequest_order_shape" CHECK (
  ("orderKind"='PRODUCT' AND "courseId" IS NULL AND "productId" IS NOT NULL AND "addressId" IS NOT NULL AND quantity>0)
  OR ("orderKind"='COURSE' AND "courseId" IS NOT NULL AND "productId" IS NULL AND "addressId" IS NULL AND quantity=1 AND "skuId" IS NULL AND "couponId" IS NULL)
);
