-- 赛-P1 赛事创建系统（二期）：Competition 增量列 + CompetitionStage 新表
-- 增量安全（只增不删·IF NOT EXISTS 幂等可重跑）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260706_competition_stage.sql --schema prisma/schema.prisma

-- ── Competition 增量列 ──
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'QUIZ';
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "stagesConfig" JSONB;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "judgePanel" JSONB;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "voteWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.2;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "prizes" JSONB;
ALTER TABLE "Competition" ADD COLUMN IF NOT EXISTS "shareCommitmentRequired" BOOLEAN NOT NULL DEFAULT false;

-- ── CompetitionStage 新表 ──
CREATE TABLE IF NOT EXISTS "CompetitionStage" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'QUIZ',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "advanceRule" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionStage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionStage_competitionId_seq_key" ON "CompetitionStage"("competitionId", "seq");
CREATE INDEX IF NOT EXISTS "CompetitionStage_competitionId_status_idx" ON "CompetitionStage"("competitionId", "status");
CREATE INDEX IF NOT EXISTS "CompetitionStage_status_startAt_idx" ON "CompetitionStage"("status", "startAt");

-- 外键（幂等：先查存在性）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompetitionStage_competitionId_fkey'
  ) THEN
    ALTER TABLE "CompetitionStage"
      ADD CONSTRAINT "CompetitionStage_competitionId_fkey"
      FOREIGN KEY ("competitionId") REFERENCES "Competition"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
