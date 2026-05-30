-- AlterTable: RiskAlert 增加 stationId 字段
ALTER TABLE "RiskAlert" ADD COLUMN "stationId" TEXT;

-- AlterTable: FraudDetection 增加 stationId 字段
ALTER TABLE "FraudDetection" ADD COLUMN "stationId" TEXT;

-- CreateIndex
CREATE INDEX "RiskAlert_stationId_status_idx" ON "RiskAlert"("stationId", "status");
CREATE INDEX "FraudDetection_stationId_status_idx" ON "FraudDetection"("stationId", "status");
