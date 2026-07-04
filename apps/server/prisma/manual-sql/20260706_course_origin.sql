-- 研-P1 研究院大师讲座知识库：Course.courseOrigin 课程来源标识
-- 值：INSTITUTE_LECTURE=研究院大师讲座归档（分享回放沉淀为付费知识库）；NULL=普通课程
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260706_course_origin.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行（IF NOT EXISTS）
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "courseOrigin" TEXT;
CREATE INDEX IF NOT EXISTS "Course_courseOrigin_idx" ON "Course"("courseOrigin");
