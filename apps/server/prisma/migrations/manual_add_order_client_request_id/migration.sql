-- 商品建单重试键；历史订单保持 NULL，PostgreSQL 唯一索引允许多条 NULL。
ALTER TABLE "Order" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Order" ADD COLUMN "requestFingerprint" TEXT;
CREATE UNIQUE INDEX "Order_userId_clientRequestId_key" ON "Order"("userId", "clientRequestId");
