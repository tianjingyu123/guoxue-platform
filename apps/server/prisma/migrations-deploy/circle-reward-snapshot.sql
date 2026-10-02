-- 仅用于确认空库的完整基线初始化；已有数据库使用新增07增量迁移。
-- Prisma不能表达CHECK；必须在登记135条迁移前，与完整基线同事务创建。
ALTER TABLE "CirclePostRewardNotice" ADD CONSTRAINT "CirclePostRewardNotice_source_snapshot_shape" CHECK (
  ("sourceVersion" IS NULL AND "sourcePostId" IS NULL AND "sourceCircleId" IS NULL AND "sourceRecipientId" IS NULL)
  OR ("sourceVersion" IS NOT NULL AND "sourceVersion" = 'POST_REWARD_LOCKED_V1' AND "sourcePostId" IS NOT NULL AND "sourceCircleId" IS NOT NULL AND "sourceRecipientId" IS NOT NULL)
);
