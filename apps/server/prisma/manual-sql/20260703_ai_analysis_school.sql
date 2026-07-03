-- AI 师徒（T6 §三）：AiAnalysisRecord 加 school 列 + 复合索引
-- 用途：多流派虚拟师父点评（analyzeType=BAZI_SCHOOL，school=ziping/mangpai/xinpai）
-- 执行方式：由主线程统一执行（prisma db execute --file 或 psql），本文件只增不删，可重复执行（幂等）

ALTER TABLE "AiAnalysisRecord" ADD COLUMN IF NOT EXISTS "school" TEXT;

CREATE INDEX IF NOT EXISTS "AiAnalysisRecord_paipanRecordId_school_idx"
  ON "AiAnalysisRecord" ("paipanRecordId", "school");
