-- 旧系统迁移批次与实体映射：为干跑、幂等重跑、差异追踪和定向回滚提供审计真源。
CREATE TABLE IF NOT EXISTS "LegacyMigrationBatch" (
  "id" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "batchKey" TEXT NOT NULL,
  "cutoffAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PREPARED',
  "sourceManifest" JSONB NOT NULL,
  "resultReport" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegacyMigrationBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LegacyMigrationMap" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "legacyId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "sourceChecksum" TEXT,
  "metadata" JSONB,
  "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyMigrationMap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegacyMigrationMap_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "LegacyMigrationBatch"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMigrationBatch_batchKey_key"
  ON "LegacyMigrationBatch"("batchKey");
CREATE INDEX IF NOT EXISTS "LegacyMigrationBatch_sourceSystem_status_idx"
  ON "LegacyMigrationBatch"("sourceSystem", "status");
CREATE INDEX IF NOT EXISTS "LegacyMigrationBatch_createdAt_idx"
  ON "LegacyMigrationBatch"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMigrationMap_sourceSystem_entityType_legacyId_key"
  ON "LegacyMigrationMap"("sourceSystem", "entityType", "legacyId");
CREATE INDEX IF NOT EXISTS "LegacyMigrationMap_batchId_entityType_idx"
  ON "LegacyMigrationMap"("batchId", "entityType");
CREATE INDEX IF NOT EXISTS "LegacyMigrationMap_sourceSystem_entityType_targetId_idx"
  ON "LegacyMigrationMap"("sourceSystem", "entityType", "targetId");
