-- 课-P3 客户经营 CRM 建表：ClientBook + ClientServeLog + ClientReminder
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260707_client_crm.sql --schema prisma/schema.prisma
-- 只增不删，可重复执行（IF NOT EXISTS）；FK 内联在 CREATE TABLE 中（ON DELETE CASCADE：删客户档案连带删服务记录与提醒）

CREATE TABLE IF NOT EXISTS "ClientBook" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phoneEnc" TEXT,
  "birthEnc" TEXT,
  "gender" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceUserId" TEXT,
  "lastServeAt" TIMESTAMP(3),
  "serveCount" INTEGER NOT NULL DEFAULT 0,
  "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientBook_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClientBook_ownerId_sourceUserId_key" ON "ClientBook"("ownerId", "sourceUserId");
CREATE INDEX IF NOT EXISTS "ClientBook_ownerId_createdAt_idx" ON "ClientBook"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientBook_ownerId_lastServeAt_idx" ON "ClientBook"("ownerId", "lastServeAt");

CREATE TABLE IF NOT EXISTS "ClientServeLog" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(10,2),
  "summary" TEXT NOT NULL,
  "servedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientServeLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientServeLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientBook"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ClientServeLog_clientId_servedAt_idx" ON "ClientServeLog"("clientId", "servedAt");
CREATE INDEX IF NOT EXISTS "ClientServeLog_ownerId_servedAt_idx" ON "ClientServeLog"("ownerId", "servedAt");

CREATE TABLE IF NOT EXISTS "ClientReminder" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "aiDraft" TEXT,
  "doneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientReminder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientBook"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ClientReminder_ownerId_status_dueAt_idx" ON "ClientReminder"("ownerId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "ClientReminder_clientId_kind_dueAt_idx" ON "ClientReminder"("clientId", "kind", "dueAt");
