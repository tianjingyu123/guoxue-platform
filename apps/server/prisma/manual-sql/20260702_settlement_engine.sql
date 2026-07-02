-- 统一结算引擎（T1）建表：SettlementRule + LedgerEntry
-- 执行方式（本地/生产一致）：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260702_settlement_engine.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行（IF NOT EXISTS）

CREATE TABLE IF NOT EXISTS "SettlementRule" (
  "id" TEXT NOT NULL,
  "scene" TEXT NOT NULL,
  "splits" JSONB NOT NULL,
  "bufferDays" INTEGER NOT NULL DEFAULT 7,
  "requireApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvalThreshold" DECIMAL(10,2),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "remark" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SettlementRule_scene_key" ON "SettlementRule"("scene");

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "scene" TEXT NOT NULL,
  "refType" TEXT NOT NULL,
  "refId" TEXT NOT NULL,
  "beneficiaryType" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "rate" DECIMAL(5,4) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "availableAt" TIMESTAMP(3) NOT NULL,
  "batchId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LedgerEntry_refType_refId_idx" ON "LedgerEntry"("refType", "refId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_beneficiaryType_beneficiaryId_status_idx" ON "LedgerEntry"("beneficiaryType", "beneficiaryId", "status");
CREATE INDEX IF NOT EXISTS "LedgerEntry_status_availableAt_idx" ON "LedgerEntry"("status", "availableAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_scene_createdAt_idx" ON "LedgerEntry"("scene", "createdAt");
