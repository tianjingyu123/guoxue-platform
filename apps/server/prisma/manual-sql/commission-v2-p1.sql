-- ─────────────────────────────────────────────────────────────
-- 佣-V2-P1 商品级佣金 + 运营商管理奖改制（幂等增量·可重复执行）
-- 拍板依据：docs/progress/董事长拍板记录-20260704晚.md §一-1
-- 设计真源：docs/design/商品分佣与归因规则V2-设计方案-20260704.md
-- 执行方式：cd apps/server && npx prisma db execute --file prisma/manual-sql/commission-v2-p1.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Product 逐品站长推广佣金率（0-1 小数·NULL=用类型默认 CommissionConfig.rateA）
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,4);

-- 2. Operator 渠道类型（ONLINE 线上 / OFFLINE 线下·驿站开通赠送"高级线下运营商"）
--    存量运营商全部落 ONLINE（默认值），mgmtRate 留 NULL（=按 channelType 默认 10%）
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "channelType" TEXT NOT NULL DEFAULT 'ONLINE';

-- 3. Operator 管理奖比率（基数=名下站长实得佣金额·NULL=按 channelType 默认 ONLINE 0.10 / OFFLINE 0.20）
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "mgmtRate" DECIMAL(5,4);

-- 4. 课程/讲座类推广佣金默认 20%（拍板§一-1 第7条·后台可调）
--    仅当现值 ≠ 0.20 时更新（幂等·后台改过 0.20 以外的值则本句会重置，属一次性迁移语义）
UPDATE "CommissionConfig"
SET "rateA" = 0.20,
    "description" = '站长推广佣金20%（2026-07-04拍板·后台可调）'
WHERE "configKey" IN ('course_basic', 'course_premium', 'course_high')
  AND "rateA" <> 0.20;
