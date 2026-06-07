CREATE TABLE "ContentSupply" (
    "id" TEXT NOT NULL, "contentId" TEXT NOT NULL, "contentType" TEXT NOT NULL,
    "priceMode" TEXT NOT NULL DEFAULT 'REVENUE_SPLIT', "priceConfig" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentSupply_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentSupply_contentId_contentType_key" ON "ContentSupply"("contentId", "contentType");
CREATE INDEX "ContentSupply_contentType_status_idx" ON "ContentSupply"("contentType", "status");

CREATE TABLE "TenantAccount" (
    "id" TEXT NOT NULL, "stationId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0, "totalRecharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalConsumed" DECIMAL(12,2) NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantAccount_stationId_key" ON "TenantAccount"("stationId");
ALTER TABLE "TenantAccount" ADD CONSTRAINT "TenantAccount_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE;

CREATE TABLE "TenantRecharge" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "amount" DECIMAL(10,2) NOT NULL,
    "payMethod" TEXT NOT NULL, "transactionId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantRecharge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenantRecharge_accountId_createdAt_idx" ON "TenantRecharge"("accountId", "createdAt");
ALTER TABLE "TenantRecharge" ADD CONSTRAINT "TenantRecharge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TenantAccount"("id") ON DELETE CASCADE;

CREATE TABLE "TenantConsumption" (
    "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "amount" DECIMAL(10,2) NOT NULL,
    "scene" TEXT NOT NULL, "procurementId" TEXT, "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantConsumption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenantConsumption_accountId_createdAt_idx" ON "TenantConsumption"("accountId", "createdAt");
ALTER TABLE "TenantConsumption" ADD CONSTRAINT "TenantConsumption_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TenantAccount"("id") ON DELETE CASCADE;

CREATE TABLE "TenantProcurement" (
    "id" TEXT NOT NULL, "stationId" TEXT NOT NULL, "supplyId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL, "contentType" TEXT NOT NULL, "priceMode" TEXT NOT NULL,
    "actualPrice" DECIMAL(10,2) NOT NULL, "splitRate" DECIMAL(5,4), "perUsePrice" DECIMAL(10,4),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expireAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TenantProcurement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantProcurement_stationId_supplyId_key" ON "TenantProcurement"("stationId", "supplyId");
ALTER TABLE "TenantProcurement" ADD CONSTRAINT "TenantProcurement_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE;
ALTER TABLE "TenantProcurement" ADD CONSTRAINT "TenantProcurement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "ContentSupply"("id");

CREATE TABLE "ContentSettlement" (
    "id" TEXT NOT NULL, "procurementId" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL, "tenantShare" DECIMAL(10,2), "platformShare" DECIMAL(10,2),
    "scene" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentSettlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentSettlement_tenantId_createdAt_idx" ON "ContentSettlement"("tenantId", "createdAt");
ALTER TABLE "ContentSettlement" ADD CONSTRAINT "ContentSettlement_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "TenantProcurement"("id") ON DELETE CASCADE;
