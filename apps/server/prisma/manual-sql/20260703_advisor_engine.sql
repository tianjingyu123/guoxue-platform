-- 智能商业顾问（T2-P1）建表：AdvisorRule + AdvisorInsight
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_advisor_engine.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

CREATE TABLE IF NOT EXISTS "AdvisorRule" (
  "id" TEXT NOT NULL,
  "roleType" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "condition" JSONB NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "suggestion" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvisorRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdvisorRule_ruleKey_key" ON "AdvisorRule"("ruleKey");
CREATE INDEX IF NOT EXISTS "AdvisorRule_roleType_enabled_idx" ON "AdvisorRule"("roleType", "enabled");

CREATE TABLE IF NOT EXISTS "AdvisorInsight" (
  "id" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "roleType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "facts" JSONB NOT NULL,
  "content" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "actedAt" TIMESTAMP(3),
  "feedback" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvisorInsight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdvisorInsight_roleType_subjectId_status_idx" ON "AdvisorInsight"("roleType", "subjectId", "status");
CREATE INDEX IF NOT EXISTS "AdvisorInsight_ruleKey_subjectId_createdAt_idx" ON "AdvisorInsight"("ruleKey", "subjectId", "createdAt");
