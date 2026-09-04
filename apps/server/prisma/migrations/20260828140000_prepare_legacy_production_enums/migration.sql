-- 生产旧库长期缺失当前模型依赖的枚举和值。
-- 仅新增，不删除或重命名任何既有枚举值；IF NOT EXISTS 便于安全恢复。

-- CreateEnum
CREATE TYPE "TeamTaskType" AS ENUM ('PROMOTE', 'RECRUIT', 'SALES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TeamTaskStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MarketingContentKind" AS ENUM ('SHORT_VIDEO', 'MOMENTS', 'XIAOHONGSHU');

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
