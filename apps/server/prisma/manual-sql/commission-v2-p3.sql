-- ─────────────────────────────────────────────────────────────
-- 佣-V2-P3 内容场景归因 + 驿站赠"高级线下运营商"（幂等增量·可重复执行）
-- 拍板依据：docs/progress/董事长拍板记录-20260704晚.md §一-1（规则3/规则6）
-- 设计真源：docs/design/商品分佣与归因规则V2-设计方案-20260704.md §3.1/3.2
-- 执行方式：cd apps/server && npx prisma db execute --file prisma/manual-sql/commission-v2-p3.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Order 内容来源字段（规则6：直播间/文章/短视频购买记录内容来源·纯记录不改金额库存支付）
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sourceContentType" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sourceContentId" TEXT;

-- 2. StationOffline 赠送运营商回链（规则3：驿站 ACTIVE 时自动创建 Operator(channelType=OFFLINE) 并回链·幂等依据）
ALTER TABLE "StationOffline" ADD COLUMN IF NOT EXISTS "operatorId" TEXT;
