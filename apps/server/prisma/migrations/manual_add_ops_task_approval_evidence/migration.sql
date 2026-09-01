-- AI 运营任务必须具备真实审批状态、来源幂等和回滚证据；不在迁移中执行任何业务动作。
ALTER TABLE "OpsTask"
  ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvalNote" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "rollbackData" JSONB,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

UPDATE "OpsTask"
SET "approvalStatus" = 'pending'
WHERE "needsApproval" = TRUE
  AND "approvalStatus" = 'not_required';

CREATE UNIQUE INDEX IF NOT EXISTS "OpsTask_sourceEventId_key" ON "OpsTask"("sourceEventId");
