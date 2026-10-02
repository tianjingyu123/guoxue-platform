-- 仅新增成交快照列，不改既有资金流水、余额或历史事实。
ALTER TABLE "CirclePostRewardNotice"
  ADD COLUMN "sourceVersion" VARCHAR(32),
  ADD COLUMN "sourcePostId" TEXT,
  ADD COLUMN "sourceCircleId" TEXT,
  ADD COLUMN "sourceRecipientId" TEXT;
ALTER TABLE "CirclePostRewardNotice" ADD CONSTRAINT "CirclePostRewardNotice_source_snapshot_shape" CHECK (
  ("sourceVersion" IS NULL AND "sourcePostId" IS NULL AND "sourceCircleId" IS NULL AND "sourceRecipientId" IS NULL)
  OR ("sourceVersion" IS NOT NULL AND "sourceVersion" = 'POST_REWARD_LOCKED_V1' AND "sourcePostId" IS NOT NULL AND "sourceCircleId" IS NOT NULL AND "sourceRecipientId" IS NOT NULL)
);
