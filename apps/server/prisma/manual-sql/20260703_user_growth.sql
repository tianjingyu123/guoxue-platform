-- 平台级成长体系（T4 游戏化）建表：UserGrowth + UserAchievement
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_user_growth.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行

CREATE TABLE IF NOT EXISTS "UserGrowth" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "totalExp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "maxStreak" INTEGER NOT NULL DEFAULT 0,
  "lastCheckinDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserGrowth_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserGrowth_userId_key" ON "UserGrowth"("userId");

CREATE TABLE IF NOT EXISTS "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_code_key" ON "UserAchievement"("userId", "code");
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_earnedAt_idx" ON "UserAchievement"("userId", "earnedAt");
