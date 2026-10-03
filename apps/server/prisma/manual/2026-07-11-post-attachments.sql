-- 帖子附件（交互小件整改批·V0 门控模型「帖子/文件/问答」核心互动补齐）：Post 补 attachments 列（幂等可重跑）
-- 结构: [{ "name": "文件名.pdf", "size": 123456, "url": "https://..." }]
-- 代码经原生 SQL 访问（$executeRawUnsafe / $queryRawUnsafe），不依赖 prisma generate
-- 应用方式（服务器）: cd apps/server && npx prisma db execute --file prisma/manual/2026-07-11-post-attachments.sql --schema prisma/schema.prisma
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
