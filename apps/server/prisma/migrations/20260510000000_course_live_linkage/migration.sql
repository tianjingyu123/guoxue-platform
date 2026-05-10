-- AlterTable LiveRoom: 新增课程关联字段
ALTER TABLE "LiveRoom" ADD COLUMN "courseId" TEXT;

-- CreateIndex
CREATE INDEX "LiveRoom_courseId_idx" ON "LiveRoom"("courseId");

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
