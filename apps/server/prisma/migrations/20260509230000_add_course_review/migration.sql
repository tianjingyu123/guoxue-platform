-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseReview_courseId_createdAt_idx" ON "CourseReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseReview_userId_idx" ON "CourseReview"("userId");

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
