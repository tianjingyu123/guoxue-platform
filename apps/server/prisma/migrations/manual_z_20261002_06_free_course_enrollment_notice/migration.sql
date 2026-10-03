-- 仅新免费订阅事务事实；不回填旧订单，不改变课程付费或访问规则。
CREATE TABLE "FreeCourseEnrollmentNotice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreeCourseEnrollmentNotice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FreeCourseEnrollmentNotice_id_fkey" FOREIGN KEY ("id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FreeCourseEnrollmentNotice_createdAt_id_idx" ON "FreeCourseEnrollmentNotice"("createdAt", "id");
