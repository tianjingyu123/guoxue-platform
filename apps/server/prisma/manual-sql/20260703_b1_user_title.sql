-- B1 游戏化打磨：平台级称号表（可收集可佩戴·纯荣誉）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_b1_user_title.sql --schema prisma/schema.prisma
-- 增量安全：仅建表建索引

CREATE TABLE IF NOT EXISTS "UserTitle" (
  id        TEXT PRIMARY KEY,
  "userId"  TEXT NOT NULL,
  code      TEXT NOT NULL,
  equipped  BOOLEAN NOT NULL DEFAULT false,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserTitle_userId_code_key" ON "UserTitle"("userId", code);
CREATE INDEX IF NOT EXISTS "UserTitle_userId_equipped_idx" ON "UserTitle"("userId", equipped);
