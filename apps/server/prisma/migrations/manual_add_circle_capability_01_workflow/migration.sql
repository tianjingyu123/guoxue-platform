-- 只新增独立圈内授权与审计，不回填批准、不转换旧授权/价格、不删除业务数据。
-- 新候选按目录字典序先建立工作流，再建立额度与派发表。
CREATE TYPE "CircleCapabilityType" AS ENUM ('LIVE', 'SHORT_VIDEO', 'AUDIO_QUESTION', 'VIDEO_QUESTION');
CREATE TYPE "CircleCapabilityGrantState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED');

CREATE TABLE "CircleCapabilityGrant" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "subjectUserId" TEXT,
  "subjectKey" VARCHAR(64) NOT NULL,
  "capability" "CircleCapabilityType" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "policyRevision" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "state" "CircleCapabilityGrantState" NOT NULL DEFAULT 'PENDING',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "maxUnits" INTEGER,
  "maxConcurrent" INTEGER,
  "eligibilitySnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CircleCapabilityGrant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CircleCapabilityAudit" (
  "id" TEXT NOT NULL,
  "grantId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" VARCHAR(24) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleCapabilityAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleCapabilityGrant_scope_sequence_key" ON "CircleCapabilityGrant"("circleId", "capability", "subjectKey", "sequence");
CREATE INDEX "CircleCapabilityGrant_scope_created_idx" ON "CircleCapabilityGrant"("circleId", "capability", "subjectKey", "createdAt");
CREATE INDEX "CircleCapabilityGrant_state_createdAt_idx" ON "CircleCapabilityGrant"("state", "createdAt");
CREATE INDEX "CircleCapabilityGrant_subjectUserId_createdAt_idx" ON "CircleCapabilityGrant"("subjectUserId", "createdAt");
CREATE UNIQUE INDEX "CircleCapabilityAudit_grantId_revision_key" ON "CircleCapabilityAudit"("grantId", "revision");
CREATE INDEX "CircleCapabilityAudit_actorId_createdAt_idx" ON "CircleCapabilityAudit"("actorId", "createdAt");
ALTER TABLE "CircleCapabilityGrant" ADD CONSTRAINT "CircleCapabilityGrant_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CircleCapabilityAudit" ADD CONSTRAINT "CircleCapabilityAudit_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CircleCapabilityGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
