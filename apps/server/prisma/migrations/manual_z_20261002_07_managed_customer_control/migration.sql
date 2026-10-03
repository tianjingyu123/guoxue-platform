-- CreateTable
CREATE TABLE "ManagedCustomer" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "tradingSubject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
    "maintenanceCycle" TEXT NOT NULL DEFAULT 'ANNUAL',
    "maintenancePrice" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "exportUntil" TIMESTAMP(3) NOT NULL,
    "downloadTtlSeconds" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedDeployment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "spaceKey" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "databaseRole" TEXT NOT NULL,
    "credentialRef" TEXT NOT NULL,
    "authKeyFingerprint" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PLANNED',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedApplication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationSubject" TEXT NOT NULL,
    "stationId" TEXT,
    "allowedPlatforms" TEXT[],
    "brand" JSONB NOT NULL,
    "templateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ManagedApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedGrant" (
    "customerId" TEXT NOT NULL,
    "modules" TEXT[],
    "resources" JSONB NOT NULL,
    "circleLimit" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ManagedGrant_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "ManagedMembership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ManagedMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedAudit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedCustomer_requestKey_key" ON "ManagedCustomer"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDeployment_customerId_key" ON "ManagedDeployment"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDeployment_spaceKey_key" ON "ManagedDeployment"("spaceKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDeployment_databaseName_key" ON "ManagedDeployment"("databaseName");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDeployment_databaseRole_key" ON "ManagedDeployment"("databaseRole");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDeployment_authKeyFingerprint_key" ON "ManagedDeployment"("authKeyFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedApplication_applicationId_key" ON "ManagedApplication"("applicationId");

-- CreateIndex
CREATE INDEX "ManagedApplication_customerId_idx" ON "ManagedApplication"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedMembership_customerId_userId_key" ON "ManagedMembership"("customerId", "userId");

-- CreateIndex
CREATE INDEX "ManagedAudit_customerId_createdAt_idx" ON "ManagedAudit"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagedDeployment" ADD CONSTRAINT "ManagedDeployment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ManagedCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedApplication" ADD CONSTRAINT "ManagedApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ManagedCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedGrant" ADD CONSTRAINT "ManagedGrant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ManagedCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedMembership" ADD CONSTRAINT "ManagedMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ManagedCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedAudit" ADD CONSTRAINT "ManagedAudit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ManagedCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

