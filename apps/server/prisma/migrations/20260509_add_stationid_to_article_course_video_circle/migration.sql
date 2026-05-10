-- AlterTable
ALTER TABLE "Article" ADD COLUMN "stationId" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "stationId" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN "stationId" TEXT;

-- AlterTable
ALTER TABLE "Circle" ADD COLUMN "stationId" TEXT;

-- CreateIndex
CREATE INDEX "Article_stationId_idx" ON "Article"("stationId");

-- CreateIndex
CREATE INDEX "Course_stationId_idx" ON "Course"("stationId");

-- CreateIndex
CREATE INDEX "Video_stationId_idx" ON "Video"("stationId");

-- CreateIndex
CREATE INDEX "Circle_stationId_idx" ON "Circle"("stationId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
