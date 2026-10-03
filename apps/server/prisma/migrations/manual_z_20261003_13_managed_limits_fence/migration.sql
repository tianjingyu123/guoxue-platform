-- 只新增合同创建限额与客户库写围栏；不改变历史请求摘要、不更新既有业务记录。
ALTER TABLE "ManagedGrant" ADD COLUMN "creationLimits" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "ManagedLeaseWriteFence" (
  "customerId" TEXT NOT NULL,
  "spaceKey" TEXT NOT NULL,
  "writerRole" TEXT NOT NULL,
  "authKeyFingerprint" VARCHAR(64) NOT NULL,
  "state" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "epoch" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedLeaseWriteFence_pkey" PRIMARY KEY ("customerId"),
  CONSTRAINT "ManagedLeaseWriteFence_state_check" CHECK ("state" IN ('ACTIVE','FROZEN')),
  CONSTRAINT "ManagedLeaseWriteFence_epoch_check" CHECK ("epoch">0)
);
-- 具体固定客户标记及触发器由维护配置器在核对目标库身份后安装，客户账号只可SELECT。
