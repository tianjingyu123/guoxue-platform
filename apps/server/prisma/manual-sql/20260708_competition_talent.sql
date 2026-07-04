-- 赛-P4 赛事人才沉淀（二期）：CompetitionTalent 新表（一人一档·收官重算·badges 判重幂等）
-- 增量安全（只增不删·IF NOT EXISTS 幂等可重跑）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260708_competition_talent.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "CompetitionTalent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bestRank" INTEGER,
    "totalCompetitions" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "talentScore" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionTalent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetitionTalent_userId_key" ON "CompetitionTalent"("userId");
CREATE INDEX IF NOT EXISTS "CompetitionTalent_talentScore_idx" ON "CompetitionTalent"("talentScore");

-- 外键（幂等：先查存在性）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompetitionTalent_userId_fkey'
  ) THEN
    ALTER TABLE "CompetitionTalent"
      ADD CONSTRAINT "CompetitionTalent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
