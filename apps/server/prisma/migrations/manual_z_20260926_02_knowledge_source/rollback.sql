DROP INDEX IF EXISTS "PaipanReportKnowledge_sourceKind_idx";
ALTER TABLE "PaipanReportKnowledge"
  DROP COLUMN IF EXISTS "sourceKind",
  DROP COLUMN IF EXISTS "sourceRefs",
  DROP COLUMN IF EXISTS "restated",
  DROP COLUMN IF EXISTS "quotable";
