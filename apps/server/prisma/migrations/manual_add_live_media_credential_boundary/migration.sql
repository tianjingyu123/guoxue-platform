CREATE TABLE "LiveMediaCredentialBoundary" (
  "roomId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "LiveMediaCredentialBoundary_pkey" PRIMARY KEY ("roomId", "provider")
);
ALTER TABLE "LiveMediaCredentialBoundary" ADD CONSTRAINT "LiveMediaCredentialBoundary_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
