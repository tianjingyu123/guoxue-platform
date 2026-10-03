-- CreateTable
CREATE TABLE "ManagedLeaseAftercare" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseAftercare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseExport" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "manifest" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedLeaseExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseAudit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedLeaseAftercare_customerId_orderId_idx" ON "ManagedLeaseAftercare"("customerId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseAftercare_userId_requestKey_key" ON "ManagedLeaseAftercare"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "ManagedLeaseExport_customerId_userId_expiresAt_idx" ON "ManagedLeaseExport"("customerId", "userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ManagedLeaseAudit_customerId_createdAt_idx" ON "ManagedLeaseAudit"("customerId", "createdAt");

