ALTER TABLE "MarketingPage" ADD COLUMN IF NOT EXISTS "stationId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketingPage_stationId_idx" ON "MarketingPage"("stationId");
