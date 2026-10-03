-- CreateTable
CREATE TABLE "ManagedLeaseExportPage" (
    "exportId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,

    CONSTRAINT "ManagedLeaseExportPage_pkey" PRIMARY KEY ("exportId","collection","page")
);

-- CreateTable
CREATE TABLE "ManagedBrandRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "addressId" TEXT NOT NULL,
    "skuId" TEXT,
    "couponId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'WAITING_ORDER',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedBrandRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedBrandRequest_customerId_state_createdAt_idx" ON "ManagedBrandRequest"("customerId", "state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedBrandRequest_applicationId_buyerId_requestKey_key" ON "ManagedBrandRequest"("applicationId", "buyerId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedBrandRequest_buyerId_clientRequestId_key" ON "ManagedBrandRequest"("buyerId", "clientRequestId");

-- AddForeignKey
ALTER TABLE "ManagedLeaseExportPage" ADD CONSTRAINT "ManagedLeaseExportPage_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "ManagedLeaseExport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
