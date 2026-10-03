-- 仅供空库初始化：在登记历史迁移前补齐 Prisma 无法表达的 CHECK。
-- 已有数据库继续执行原增量迁移，禁止用空库脚本替代。
ALTER TABLE "ManagedLeaseWriteFence" ADD CONSTRAINT "ManagedLeaseWriteFence_state_check" CHECK ("state" IN ('ACTIVE','FROZEN'));
ALTER TABLE "ManagedLeaseWriteFence" ADD CONSTRAINT "ManagedLeaseWriteFence_epoch_check" CHECK ("epoch">0);
ALTER TABLE "ManagedBrandRequest" ADD CONSTRAINT "ManagedBrandRequest_order_shape" CHECK (
  ("orderKind"='PRODUCT' AND "courseId" IS NULL AND "productId" IS NOT NULL AND "addressId" IS NOT NULL AND quantity>0)
  OR ("orderKind"='COURSE' AND "courseId" IS NOT NULL AND "productId" IS NULL AND "addressId" IS NULL AND quantity=1 AND "skuId" IS NULL AND "couponId" IS NULL)
);
