-- T8 驿站 OMO P0（2026-07-03）：课后评价表 + 课程同学圈列
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_offline_omo_p0.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS 全覆盖，可重复执行；只增不删

-- 1. OfflineCourse 加同学圈关联列（建圈后回写，幂等依据；不加 FK——Circle 生命周期独立，圈子被清理时课程不应级联受阻）
ALTER TABLE "OfflineCourse" ADD COLUMN IF NOT EXISTS "circleId" TEXT;

-- 2. 课后评价表
CREATE TABLE IF NOT EXISTS "OfflineCourseReview" (
  "id"             TEXT NOT NULL,
  "courseId"       TEXT NOT NULL,
  "stationId"      TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "rating"         INTEGER NOT NULL,
  "content"        TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfflineCourseReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfflineCourseReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- 3. 唯一约束：一条报名记录只能评一次（防二评的数据库兜底）
CREATE UNIQUE INDEX IF NOT EXISTS "OfflineCourseReview_registrationId_key"
  ON "OfflineCourseReview"("registrationId");

-- 4. 查询索引（课程评价分页 / 驿站评分聚合 / 用户维度）
CREATE INDEX IF NOT EXISTS "OfflineCourseReview_courseId_createdAt_idx"
  ON "OfflineCourseReview"("courseId", "createdAt");
CREATE INDEX IF NOT EXISTS "OfflineCourseReview_stationId_idx"
  ON "OfflineCourseReview"("stationId");
CREATE INDEX IF NOT EXISTS "OfflineCourseReview_userId_idx"
  ON "OfflineCourseReview"("userId");

-- 5. 外键（与 schema.prisma 关系一致：删课级联删评价）——幂等加约束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OfflineCourseReview_courseId_fkey'
  ) THEN
    ALTER TABLE "OfflineCourseReview"
      ADD CONSTRAINT "OfflineCourseReview_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "OfflineCourse"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
