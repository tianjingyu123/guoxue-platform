-- 约束完整性加固：库存防负 CHECK（2026-06-29 数据库优化）
-- 防应用层 bug 写入负库存（Prisma 不原生生成 CHECK，DB 层兜底）。
-- ⚠️ PointsProduct.stock 用 -1 作"不限量"哨兵(points.service.ts:100)，故用 >= -1 兼容，仅挡 <-1 真异常；
--    其余库存表无哨兵语义，用 >= 0。数据已验证满足（仅 PointsProduct 有 2 条 -1 合法哨兵）。
-- DROP+ADD 幂等可重跑。加 CHECK 不改 schema、不影响 Prisma（已有 8 个业务 CHECK 同理不在 schema）。
ALTER TABLE "PointsProduct" DROP CONSTRAINT IF EXISTS "chk_pointsproduct_stock_sentinel";
ALTER TABLE "PointsProduct" ADD CONSTRAINT "chk_pointsproduct_stock_sentinel" CHECK (stock >= -1);

ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "chk_productsku_stock_nonneg";
ALTER TABLE "ProductSku" ADD CONSTRAINT "chk_productsku_stock_nonneg" CHECK (stock >= 0);

ALTER TABLE "StationProduct" DROP CONSTRAINT IF EXISTS "chk_stationproduct_stock_nonneg";
ALTER TABLE "StationProduct" ADD CONSTRAINT "chk_stationproduct_stock_nonneg" CHECK (stock >= 0);

ALTER TABLE "FlashSaleItem" DROP CONSTRAINT IF EXISTS "chk_flashsaleitem_stock_nonneg";
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "chk_flashsaleitem_stock_nonneg" CHECK (stock >= 0);

ALTER TABLE "LiveFlashSale" DROP CONSTRAINT IF EXISTS "chk_liveflashsale_stock_nonneg";
ALTER TABLE "LiveFlashSale" ADD CONSTRAINT "chk_liveflashsale_stock_nonneg" CHECK (stock >= 0);
