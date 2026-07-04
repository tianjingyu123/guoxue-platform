-- E3 多轮 AI 伴读带记忆：会话+消息两表（增量安全·只建表建索引）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_e3_companion_memory.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "ClassicCompanionSession" (
  id             TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "bookId"       TEXT NOT NULL,
  summary        TEXT,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClassicCompanionSession_userId_bookId_key" ON "ClassicCompanionSession"("userId", "bookId");

CREATE TABLE IF NOT EXISTS "ClassicCompanionMessage" (
  id          TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  "chapterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ClassicCompanionMessage_sessionId_createdAt_idx" ON "ClassicCompanionMessage"("sessionId", "createdAt");
