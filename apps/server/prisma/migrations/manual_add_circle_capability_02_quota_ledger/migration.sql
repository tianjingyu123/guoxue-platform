-- 仅新增额度账本和操作回执；不回填、不启用能力、不改变原授权或业务数据。
-- 依赖 manual_add_circle_capability_01_workflow。
CREATE TYPE "CircleCapabilityQuotaState" AS ENUM ('HELD', 'ACTIVE', 'COMPLETED', 'RELEASED', 'EXPIRED');
CREATE TYPE "CircleCapabilityQuotaAction" AS ENUM ('RESERVE', 'ACTIVATE', 'COMPLETE', 'RELEASE', 'EXPIRE');

CREATE TABLE "CircleCapabilityQuota" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "capability" "CircleCapabilityType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "subjectUserId" TEXT,
  "businessType" VARCHAR(40) NOT NULL,
  "businessId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "units" INTEGER NOT NULL,
  "holdSeconds" INTEGER NOT NULL,
  "ownerId" TEXT NOT NULL,
  "circleGrantId" TEXT NOT NULL,
  "circleGrantRevision" INTEGER NOT NULL,
  "providerGrantId" TEXT,
  "providerGrantRevision" INTEGER,
  "policyRevision" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "state" "CircleCapabilityQuotaState" NOT NULL DEFAULT 'HELD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "holdUntil" TIMESTAMP(3) NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "terminalAt" TIMESTAMP(3),
  CONSTRAINT "CircleCapabilityQuota_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CircleCapabilityQuotaReceipt" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "operationKey" TEXT NOT NULL,
  "action" "CircleCapabilityQuotaAction" NOT NULL,
  "appliedRevision" INTEGER NOT NULL,
  "source" VARCHAR(24) NOT NULL,
  "actorId" TEXT,
  "evidenceRef" VARCHAR(128),
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleCapabilityQuotaReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleCapabilityQuota_requestKey_key" ON "CircleCapabilityQuota"("requestKey");
CREATE UNIQUE INDEX "CircleCapabilityQuota_business_key" ON "CircleCapabilityQuota"("businessType", "businessId");
CREATE INDEX "CircleCapabilityQuota_circleId_createdAt_idx" ON "CircleCapabilityQuota"("circleId", "createdAt");
CREATE INDEX "CircleCapabilityQuota_circle_usage_idx" ON "CircleCapabilityQuota"("circleGrantId", "state", "holdUntil");
CREATE INDEX "CircleCapabilityQuota_provider_usage_idx" ON "CircleCapabilityQuota"("providerGrantId", "state", "holdUntil");
CREATE UNIQUE INDEX "CircleCapabilityQuotaReceipt_operationKey_key" ON "CircleCapabilityQuotaReceipt"("operationKey");
CREATE UNIQUE INDEX "CircleCapabilityQuotaReceipt_revision_key" ON "CircleCapabilityQuotaReceipt"("reservationId", "appliedRevision");
CREATE INDEX "CircleCapabilityQuotaReceipt_createdAt_idx" ON "CircleCapabilityQuotaReceipt"("createdAt");
ALTER TABLE "CircleCapabilityQuota" ADD CONSTRAINT "CircleCapabilityQuota_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CircleCapabilityQuota" ADD CONSTRAINT "CircleCapabilityQuota_circleGrantId_fkey" FOREIGN KEY ("circleGrantId") REFERENCES "CircleCapabilityGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CircleCapabilityQuota" ADD CONSTRAINT "CircleCapabilityQuota_providerGrantId_fkey" FOREIGN KEY ("providerGrantId") REFERENCES "CircleCapabilityGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CircleCapabilityQuotaReceipt" ADD CONSTRAINT "CircleCapabilityQuotaReceipt_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CircleCapabilityQuota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
