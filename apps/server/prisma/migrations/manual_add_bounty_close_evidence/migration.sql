-- 悬赏关闭必须保留原因、操作者与时间，便于资金核对和责任追溯。
ALTER TABLE "BountyQuestion"
  ADD COLUMN IF NOT EXISTS "closeReason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "closedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BountyQuestion_closedBy_closedAt_idx"
  ON "BountyQuestion"("closedBy", "closedAt");
