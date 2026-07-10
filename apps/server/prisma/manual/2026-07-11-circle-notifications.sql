-- 圈内通知中心（V0 待办 #36）：复用全局 Notification 表，补两列（幂等，可重复执行）
-- category: 圈内事件四分类 INTERACT(互动)/TRADE(交易)/GOVERN(圈务)/LIVE(直播)；非圈子通知为 NULL
-- circleId: 事件所属圈子（不建外键，避免阻塞圈子删除；仅用于展示与回查）
-- 应用方式（服务器）: cd apps/server && npx prisma db execute --file prisma/manual/2026-07-11-circle-notifications.sql --schema prisma/schema.prisma
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "circleId" TEXT;
CREATE INDEX IF NOT EXISTS "Notification_userId_category_createdAt_idx"
  ON "Notification"("userId", "category", "createdAt");
