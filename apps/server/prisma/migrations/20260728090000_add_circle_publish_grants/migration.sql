DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentityLevel') THEN
    CREATE TYPE "IdentityLevel" AS ENUM ('NONE', 'L1', 'L2');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CirclePublishScope') THEN
    CREATE TYPE "CirclePublishScope" AS ENUM ('SHORT_VIDEO', 'LIVE', 'COURSE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CirclePublishGrantStatus') THEN
    CREATE TYPE "CirclePublishGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FROZEN', 'REVOKED');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "identityLevel" "IdentityLevel" NOT NULL DEFAULT 'NONE';

UPDATE "User"
SET "identityLevel" = 'L1'
WHERE "identityVerified" = true
  AND "identityLevel" = 'NONE';

CREATE TABLE IF NOT EXISTS "CirclePublishGrant" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "scopes" "CirclePublishScope"[] NOT NULL,
  "status" "CirclePublishGrantStatus" NOT NULL DEFAULT 'PENDING',
  "channel" TEXT NOT NULL DEFAULT 'REGULAR',
  "externalPlatform" TEXT,
  "externalProfileUrl" TEXT,
  "externalFollowerCount" INTEGER,
  "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "eligibilitySnapshot" JSONB NOT NULL,
  "rejectReason" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "frozenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CirclePublishGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CirclePublishGrant_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CirclePublishGrant_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CirclePublishGrant_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CirclePublishGrant_circleId_status_createdAt_idx"
  ON "CirclePublishGrant"("circleId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CirclePublishGrant_applicantId_createdAt_idx"
  ON "CirclePublishGrant"("applicantId", "createdAt");
CREATE INDEX IF NOT EXISTS "CirclePublishGrant_status_createdAt_idx"
  ON "CirclePublishGrant"("status", "createdAt");
