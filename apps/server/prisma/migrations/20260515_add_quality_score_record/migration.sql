-- AI 质量评分记录表
CREATE TABLE IF NOT EXISTS "QualityScoreRecord" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "contentSnippet" TEXT NOT NULL,
    "scene" TEXT,
    "context" TEXT,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "readability" DOUBLE PRECISION NOT NULL,
    "professionalism" DOUBLE PRECISION NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "QualityScoreRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QualityScoreRecord_scene_createdAt_idx" ON "QualityScoreRecord"("scene", "createdAt");
CREATE INDEX IF NOT EXISTS "QualityScoreRecord_overall_idx" ON "QualityScoreRecord"("overall");
CREATE INDEX IF NOT EXISTS "QualityScoreRecord_createdAt_idx" ON "QualityScoreRecord"("createdAt");
