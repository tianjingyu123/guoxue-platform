-- AI 内容质量评分（T7）建表：ContentQualityScore
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_content_quality.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "ContentQualityScore" (
  "id" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "depth" INTEGER NOT NULL,
  "originality" INTEGER NOT NULL,
  "utility" INTEGER NOT NULL,
  "appeal" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "grade" TEXT NOT NULL,
  "reason" TEXT,
  "model" TEXT,
  "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentQualityScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContentQualityScore_targetType_targetId_key" ON "ContentQualityScore"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "ContentQualityScore_targetType_total_idx" ON "ContentQualityScore"("targetType", "total");
