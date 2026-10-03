-- 自建迁移：BotConfig 加 runtime + systemPrompt（additive·董事长已同意 DDL）
-- 生产执行：cd /opt/guoxue/apps/server && npx prisma db execute --file prisma/sql/add-bot-runtime-systemprompt.sql --schema prisma/schema.prisma
-- IF NOT EXISTS 保证幂等可重复执行
ALTER TABLE "BotConfig" ADD COLUMN IF NOT EXISTS "runtime" TEXT NOT NULL DEFAULT 'coze';
ALTER TABLE "BotConfig" ADD COLUMN IF NOT EXISTS "systemPrompt" TEXT;
