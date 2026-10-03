-- 讲座归档与缓存待办同事务；删除课程后仍可恢复列表缓存，不设级联外键。
CREATE TABLE "CourseCacheInvalidation" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "clearedAt" TIMESTAMP(3),
  CONSTRAINT "CourseCacheInvalidation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseCacheInvalidation_pending_idx" ON "CourseCacheInvalidation"("clearedAt", "createdAt", "id");
