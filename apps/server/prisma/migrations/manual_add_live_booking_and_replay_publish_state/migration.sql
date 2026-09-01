ALTER TABLE "LiveRoom"
  ADD COLUMN IF NOT EXISTS "replayStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "replayPublishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "replayPublishedBy" TEXT;

UPDATE "LiveRoom"
SET "replayStatus" = 'PUBLISHED',
    "replayPublishedAt" = COALESCE("endTime", "updatedAt")
WHERE "status" = 'REPLAY' AND "replayUrl" IS NOT NULL AND "replayStatus" = 'NONE';

CREATE TABLE IF NOT EXISTS "LiveBooking" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "remindedAt" TIMESTAMP(3),
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveBooking_roomId_userId_key" ON "LiveBooking"("roomId", "userId");
CREATE INDEX IF NOT EXISTS "LiveBooking_roomId_status_idx" ON "LiveBooking"("roomId", "status");
CREATE INDEX IF NOT EXISTS "LiveBooking_userId_status_createdAt_idx" ON "LiveBooking"("userId", "status", "createdAt");
