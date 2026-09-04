-- 生产旧库长期缺失当前模型依赖的枚举和值。
-- 仅新增，不删除或重命名任何既有枚举值；IF NOT EXISTS 便于安全恢复。

-- 真实生产库可能已经由手工 DDL 创建这些枚举，但尚未登记对应迁移。
-- 用存在性判断兼容该历史状态，避免重复创建中断后续增量迁移。
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamTaskType') THEN
    CREATE TYPE "TeamTaskType" AS ENUM ('PROMOTE', 'RECRUIT', 'SALES', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamTaskStatus') THEN
    CREATE TYPE "TeamTaskStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingContentKind') THEN
    CREATE TYPE "MarketingContentKind" AS ENUM ('SHORT_VIDEO', 'MOMENTS', 'XIAOHONGSHU');
  END IF;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'LIVE_QUALITY_PACKAGE';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'POST_REWARD';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'CONSULT_CALL_PREPAY';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'LIVE_GIFT_INCOME';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'EARNING_CONVERT';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'CASE_CONTRIBUTION';

-- AlterEnum
ALTER TYPE "CoinTransType" ADD VALUE IF NOT EXISTS 'INCOME';

-- AlterEnum
ALTER TYPE "EarningScene" ADD VALUE IF NOT EXISTS 'PEEK_ASKER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'CIRCLE_RENEW';
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'PRACTITIONER_PRO';

-- AlterEnum
ALTER TYPE "WebhookEvent" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_PAID';
