-- CreateTable
CREATE TABLE "CourseQa" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseQa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseQa_courseId_status_idx" ON "CourseQa"("courseId", "status");

-- CreateIndex
CREATE INDEX "CourseQa_chapterId_idx" ON "CourseQa"("chapterId");

-- CreateIndex
CREATE INDEX "CourseQa_userId_idx" ON "CourseQa"("userId");

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQa" ADD CONSTRAINT "CourseQa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
