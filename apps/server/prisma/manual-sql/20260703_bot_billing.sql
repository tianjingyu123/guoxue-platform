-- AI 智能体计费（2026-07-03 拍板）：BotConfig 计费字段 + 用户追问额度表
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_bot_billing.sql --schema prisma/schema.prisma

ALTER TABLE "BotConfig" ADD COLUMN IF NOT EXISTS "freeUses" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "BotConfig" ADD COLUMN IF NOT EXISTS "pricePer10Coin" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UserBotQuota" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "botConfigId" TEXT NOT NULL,
  "freeUsed" INTEGER NOT NULL DEFAULT 0,
  "paidRemaining" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBotQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBotQuota_userId_botConfigId_key" ON "UserBotQuota"("userId", "botConfigId");
