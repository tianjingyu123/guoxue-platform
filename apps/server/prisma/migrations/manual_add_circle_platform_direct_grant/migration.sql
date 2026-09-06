-- 圈子工作流之后执行；已有记录只获得申请来源默认值，不自动批准或开启任何能力。
ALTER TABLE "CircleCapabilityGrant" ADD COLUMN "source" VARCHAR(24) NOT NULL DEFAULT 'CIRCLE_APPLICATION';
-- 个人直授仅关联自己的 providerGrant，避免连带开通整圈；外键保留。
ALTER TABLE "CircleCapabilityQuota" ALTER COLUMN "circleGrantId" DROP NOT NULL;
ALTER TABLE "CircleCapabilityQuota" ALTER COLUMN "circleGrantRevision" DROP NOT NULL;
