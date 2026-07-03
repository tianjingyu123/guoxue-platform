-- 会员专属精品课标记（2026-07-03 会员权益拍板）：Course.memberFree
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_course_member_free.sql --schema prisma/schema.prisma
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "memberFree" BOOLEAN NOT NULL DEFAULT false;
