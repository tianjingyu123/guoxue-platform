-- 将已存在于 Prisma 模型和历史人工 SQL、但遗漏于正式迁移链的会员字段补齐。
-- 全部操作只做可重复的增量扩展，不删除或改写任何存量数据。

ALTER TYPE "MemberLevel" ADD VALUE IF NOT EXISTS 'QUARTERLY';

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "memberAutoRenew" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MemberConfig"
ADD COLUMN IF NOT EXISTS "monthlyPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "monthlyCouponId" TEXT,
ADD COLUMN IF NOT EXISTS "sort" INTEGER NOT NULL DEFAULT 0;
