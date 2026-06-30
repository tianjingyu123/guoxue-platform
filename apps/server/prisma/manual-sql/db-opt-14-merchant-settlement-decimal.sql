-- db-opt-14: MerchantSettlement 金额字段 Int(元) → Decimal(12,2)
-- 背景：结算金额原以 Int 存「元」，generateSettlement 用 Math.round 截整到元丢分（¥1234.56 → 1235）。
-- 配套改动：
--   1) schema.prisma  MerchantSettlement.{totalRevenue,commission,settlementAmount,paidAmount} → @db.Decimal(12,2)
--   2) merchant-settlement.service.ts  generateSettlement/paySettlement 改为「分」整数运算，规整到分不丢分
-- 数据无损：现有整数值自动扩展为 numeric（1235 → 1235.00）。历史已丢的分不可恢复，但新结算单起不再丢分。
-- 执行（停机，用户终端）：pm2 stop → prisma generate → 本文件 → nest build → pm2 restart → 验证。
-- 表名取自 @@map("merchant_settlements")。

ALTER TABLE "merchant_settlements" ALTER COLUMN "totalRevenue"     TYPE numeric(12,2);
ALTER TABLE "merchant_settlements" ALTER COLUMN "commission"       TYPE numeric(12,2);
ALTER TABLE "merchant_settlements" ALTER COLUMN "settlementAmount" TYPE numeric(12,2);
ALTER TABLE "merchant_settlements" ALTER COLUMN "paidAmount"       TYPE numeric(12,2);
