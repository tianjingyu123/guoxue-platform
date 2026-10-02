-- AlterTable
ALTER TABLE "ManagedMembership" ADD COLUMN     "identityProvider" TEXT NOT NULL DEFAULT 'PLATFORM';

-- CreateTable
CREATE TABLE "ManagedLeaseIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedLeaseIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseRefresh" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "identityRevision" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedLeaseRefresh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedLeaseLoginThrottle" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedLeaseLoginThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseIdentity_userId_key" ON "ManagedLeaseIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseIdentity_username_key" ON "ManagedLeaseIdentity"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedLeaseRefresh_tokenHash_key" ON "ManagedLeaseRefresh"("tokenHash");

-- CreateIndex
CREATE INDEX "ManagedLeaseRefresh_identityId_expiresAt_idx" ON "ManagedLeaseRefresh"("identityId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ManagedLeaseIdentity" ADD CONSTRAINT "ManagedLeaseIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedLeaseRefresh" ADD CONSTRAINT "ManagedLeaseRefresh_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "ManagedLeaseIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

