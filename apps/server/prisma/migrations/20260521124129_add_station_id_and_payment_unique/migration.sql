-- Add stationId to LiveRoom for cross-station data isolation
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "stationId" TEXT;

-- Add foreign key (skip if already exists)
DO $$ BEGIN
  ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add index (skip if already exists)
CREATE INDEX IF NOT EXISTS "LiveRoom_stationId_idx" ON "LiveRoom"("stationId");

-- Change payTransactionId index to unique constraint for payment idempotency
-- Drop the existing index if it exists
DO $$ DECLARE idx_name text;
BEGIN
  SELECT indexname INTO idx_name FROM pg_indexes WHERE tablename = 'Order' AND indexname LIKE '%payTransactionId%';
  IF idx_name IS NOT NULL THEN
    EXECUTE 'DROP INDEX "' || idx_name || '"';
  END IF;
END $$;

-- Add unique constraint (skip if already exists)
DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_payTransactionId_key" UNIQUE ("payTransactionId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
