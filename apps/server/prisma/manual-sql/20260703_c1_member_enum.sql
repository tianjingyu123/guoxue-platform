-- C1 会员产品化 · 步骤1/2：枚举与增量列（先于 20260703_c1_member_plans_v2.sql 执行）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_c1_member_enum.sql --schema prisma/schema.prisma
-- 全部增量安全：不删不改存量数据

ALTER TYPE "MemberLevel" ADD VALUE IF NOT EXISTS 'QUARTERLY';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberAutoRenew" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MemberConfig" ADD COLUMN IF NOT EXISTS "monthlyPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MemberConfig" ADD COLUMN IF NOT EXISTS "monthlyCouponId" TEXT;
ALTER TABLE "MemberConfig" ADD COLUMN IF NOT EXISTS "sort" INTEGER NOT NULL DEFAULT 0;
