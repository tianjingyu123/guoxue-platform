-- AlterTable
ALTER TABLE "BountyQuestion" ADD COLUMN "stationId" TEXT;

-- CreateIndex
CREATE INDEX "BountyQuestion_stationId_idx" ON "BountyQuestion"("stationId");

-- AlterTable
ALTER TABLE "AudioCallRecord" ADD COLUMN "stationId" TEXT;

-- CreateIndex
CREATE INDEX "AudioCallRecord_stationId_idx" ON "AudioCallRecord"("stationId");
