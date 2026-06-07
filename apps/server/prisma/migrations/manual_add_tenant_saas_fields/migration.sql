ALTER TABLE "Station" ADD COLUMN "tenantType" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Station" ADD COLUMN "schemaName" TEXT;
ALTER TABLE "Station" ADD COLUMN "dbConnString" TEXT;
ALTER TABLE "Station" ADD COLUMN "featureFlags" JSONB;
ALTER TABLE "Station" ADD COLUMN "apiDailyQuota" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Station" ADD COLUMN "dataRetentionDays" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "Station" ADD COLUMN "paymentConfig" JSONB;
ALTER TABLE "Station" ADD COLUMN "autoSuspendOnExpiry" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Station_tenantType_idx" ON "Station"("tenantType");
