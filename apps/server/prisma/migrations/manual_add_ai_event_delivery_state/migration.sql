-- AI 事件跨节点可靠消费所需状态；只扩展投递元数据，不触发业务处理。
ALTER TABLE "AiEvent"
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AiEvent_status_processingStartedAt_idx"
  ON "AiEvent"("status", "processingStartedAt");
