-- ============================================================
-- 审计修复 Migration (2026-06-23)
-- 运行方式: psql $DATABASE_URL -f this_file.sql
-- ============================================================

-- 1. User 软删除字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- 2. LiveRoom 复合索引（首页热门直播查询）
CREATE INDEX IF NOT EXISTS "LiveRoom_status_viewCount_idx" ON "LiveRoom" ("status", "viewCount");

-- 3. Circle 复合索引（圈子列表按成员数排序）
CREATE INDEX IF NOT EXISTS "Circle_status_memberCount_idx" ON "Circle" ("status", "memberCount");
