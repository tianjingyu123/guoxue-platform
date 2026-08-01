-- 直播板块三断点修复批（2026-07-11 董事长拍板·主播自主开播）
-- 幂等可重跑。生产执行顺序：本文件 → 部署新后端代码 → pm2 重启。
-- （flag 走 Redis 缓存 feature:live_start TTL 30s，SQL 后最迟 30 秒生效，无需清缓存）

-- ① 功能开关 live_start：主播开播端点 PUT /live/rooms/:id/start 的 FeatureFlagGuard 依赖。
--    此前全库无此 flag → 端点恒 404（摸底报告断点 3a）。幂等 upsert 为开启。
INSERT INTO "FeatureFlag" ("id", "key", "name", "description", "enabled", "percentage", "targetUserIds", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'live_start',
  '直播开播',
  '主播自主开播（房主校验·管理员保留）· 2026-07-11 拍板放开',
  true,
  100,
  '{}',
  now(),
  now()
)
ON CONFLICT ("key") DO UPDATE
SET "enabled" = true, "percentage" = 100, "updatedAt" = now();

-- ② LiveReview 建表补迁移（摸底报告断点 11：本地/生产库有表但迁移链无建表语句·新库重建必缺表 500）。
--    字段与 schema.prisma model LiveReview 及本地实际表结构一致（含 reply 主播回复列）。
CREATE TABLE IF NOT EXISTS "LiveReview" (
  "id"        TEXT NOT NULL,
  "roomId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "content"   TEXT NOT NULL,
  "reply"     TEXT,
  "flagged"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LiveReview_roomId_idx" ON "LiveReview"("roomId");
CREATE INDEX IF NOT EXISTS "LiveReview_userId_idx" ON "LiveReview"("userId");

-- ③ 存量库兜底：老库若建过 LiveReview 但缺 reply/flagged 列（回复评价端点 POST /live/reviews/:id/reply 依赖 reply）
ALTER TABLE "LiveReview" ADD COLUMN IF NOT EXISTS "reply" TEXT;
ALTER TABLE "LiveReview" ADD COLUMN IF NOT EXISTS "flagged" BOOLEAN NOT NULL DEFAULT false;
