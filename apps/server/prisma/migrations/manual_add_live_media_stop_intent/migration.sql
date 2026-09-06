CREATE TABLE "LiveMediaStopIntent" (
  "roomId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "credentialRevision" INTEGER NOT NULL,
  "protectUntil" TIMESTAMP(3) NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'READY',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "resultAt" TIMESTAMP(3),
  "providerRequestId" TEXT,
  "verification" JSONB,
  "completion" JSONB,
  CONSTRAINT "LiveMediaStopIntent_pkey" PRIMARY KEY ("roomId", "provider")
);
CREATE UNIQUE INDEX "LiveMediaStopIntent_operationId_key" ON "LiveMediaStopIntent"("operationId");
CREATE INDEX "LiveMediaStopIntent_state_createdAt_idx" ON "LiveMediaStopIntent"("state", "createdAt");
ALTER TABLE "LiveMediaStopIntent" ADD CONSTRAINT "LiveMediaStopIntent_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
