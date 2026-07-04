-- 课-P1 AI 获客内容套件：MarketingContent 生成记录表（增量安全·只建类型/表/索引·不删不改存量）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260705_marketing_content.sql --schema prisma/schema.prisma

DO $$ BEGIN
  CREATE TYPE "MarketingContentKind" AS ENUM ('SHORT_VIDEO', 'MOMENTS', 'XIAOHONGSHU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MarketingContent" (
  id            TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  kind          "MarketingContentKind" NOT NULL,
  topic         TEXT NOT NULL,
  content       TEXT NOT NULL,
  "passedAudit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MarketingContent_userId_createdAt_idx" ON "MarketingContent"("userId", "createdAt");
