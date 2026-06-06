CREATE TABLE "CapabilityRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CapabilityRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CapabilityRequest_userId_idx" ON "CapabilityRequest"("userId");
CREATE INDEX "CapabilityRequest_status_idx" ON "CapabilityRequest"("status");
ALTER TABLE "CapabilityRequest" ADD CONSTRAINT "CapabilityRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
