-- 块B·加入审批：CircleJoinRequest 增加拒绝原因字段（只增不删·幂等）。
-- 应用：cd apps/server && npx prisma db execute --file prisma/sql/2026-07-08-circle-join-reject-reason.sql --schema prisma/schema.prisma
ALTER TABLE "CircleJoinRequest" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
