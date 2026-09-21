-- 回滚：议题归组与立场标注
DROP INDEX IF EXISTS "PaipanReportKnowledge_paipanType_stance_idx";
DROP INDEX IF EXISTS "PaipanReportKnowledge_debateKey_idx";
ALTER TABLE "PaipanReportKnowledge"
  DROP COLUMN IF EXISTS "stance",
  DROP COLUMN IF EXISTS "debateKey";
