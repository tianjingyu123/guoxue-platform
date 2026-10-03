-- 人工结案的记录与凭据使用独立增量迁移。
-- 不能改写已经进入 A 候选的 20260919090000 迁移，否则已执行环境不会补上新列。
-- 全部可空，A 升级到 B 时历史行保持 NULL。
ALTER TABLE "CommissionRecall" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "CommissionRecall" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;
ALTER TABLE "CommissionRecall" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
ALTER TABLE "CommissionRecall" ADD COLUMN IF NOT EXISTS "resolvedRevenueId" TEXT;
