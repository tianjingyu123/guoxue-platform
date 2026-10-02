-- CreateTable
CREATE TABLE "ManagedBrandOrder" (
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedBrandOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE INDEX "ManagedBrandOrder_customerId_applicationId_buyerId_idx" ON "ManagedBrandOrder"("customerId", "applicationId", "buyerId");

-- AddForeignKey
ALTER TABLE "ManagedBrandOrder" ADD CONSTRAINT "ManagedBrandOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

