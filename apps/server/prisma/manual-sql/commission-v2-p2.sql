-- ─────────────────────────────────────────────────────────────
-- 佣-V2-P2 渠道主体与临时链接（幂等增量·可重复执行）
-- 拍板依据：docs/progress/董事长拍板记录-20260704晚.md §一-1
-- 设计真源：docs/design/商品分佣与归因规则V2-设计方案-20260704.md §3.1/3.2/3.3
-- 执行方式：cd apps/server && npx prisma db execute --file prisma/manual-sql/commission-v2-p2.sql
-- ─────────────────────────────────────────────────────────────

-- 1. ChannelClick 渠道主体临时链接点击表
--    三类可锁佣渠道（STATION 分站 / CIRCLE 圈子 / OFFLINE_STATION 驿站）点击落库·7天窗·last-click 语义
CREATE TABLE IF NOT EXISTS "ChannelClick" (
  "id"                TEXT NOT NULL,
  "subjectType"       TEXT NOT NULL,
  "subjectId"         TEXT NOT NULL,
  "beneficiaryUserId" TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "targetType"        TEXT NOT NULL,
  "targetId"          TEXT,
  "clickedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChannelClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChannelClick_userId_targetType_targetId_clickedAt_idx"
  ON "ChannelClick"("userId", "targetType", "targetId", "clickedAt");

CREATE INDEX IF NOT EXISTS "ChannelClick_expiresAt_idx"
  ON "ChannelClick"("expiresAt");

-- 2. Order 临时归因渠道主体类型（分佣受益人路由依据：CIRCLE/OFFLINE_STATION 落 LedgerEntry·STATION 走现行 StationEarning）
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tempRefSubjectType" TEXT;
